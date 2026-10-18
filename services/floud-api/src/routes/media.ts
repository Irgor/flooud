import { randomUUID } from 'node:crypto';
import { Upload } from '@aws-sdk/lib-storage';
import { schema } from '@floud/db';
import { bucketName, createGetCommand, createPreSignedUrl, TIME_IN_SECONDS } from '@floud/s3';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

const qualities = [480, 720, 1080, 2160] as const;
type Quality = (typeof qualities)[number];

const qualityHeaderConfig = {
  480: {
    bandwidth: '1628000',
    average_bandwidth: '1528000',
    resolution: '854x480',
    codecs: 'avc1.64001f,mp4a.40.2',
  },
  720: {
    bandwidth: '3128000',
    average_bandwidth: '2928000',
    resolution: '1280x720',
    codecs: 'avc1.64001f,mp4a.40.2',
  },
  1080: {
    bandwidth: '5542000',
    average_bandwidth: '5192000',
    resolution: '1920x1080',
    codecs: 'avc1.640028,mp4a.40.2',
  },
  2160: {
    bandwidth: '15320000',
    average_bandwidth: '14320000',
    resolution: '3840x2160',
    codecs: 'avc1.640033,mp4a.40.2',
  },
} as const;

function segmentQualityHeader(quality: Quality) {
  const config = qualityHeaderConfig[quality];
  return `#EXT-X-STREAM-INF:BANDWIDTH=${config.bandwidth},AVERAGE-BANDWIDTH=${config.average_bandwidth},RESOLUTION=${config.resolution}`;
}

export default async function mediaRoutes(fastify: FastifyInstance) {
  fastify.post('/media', async (request, reply) => {
    const data = await request.file();
    if (!data?.file) {
      return { missing: 'file' };
    }

    if (data.file.truncated) {
      return reply.code(413).send({ error: 'file too large' });
    }

    const filename = `${randomUUID()}_${data.filename}`;

    const up = new Upload({
      client: fastify.s3,
      params: {
        Bucket: bucketName,
        Key: filename,
        Body: data.file,
        ContentType: data.mimetype,
      },
    });
    await up.done();

    const [row] = await fastify.db
      .insert(schema.media)
      .values({
        storageKey: filename,
        originalName: data.filename,
        mime: data.mimetype,
        status: schema.mediaStatus.UPLOADING,
      })
      .returning();

    if (!row) {
      reply.code(500).send({ success: false, message: 'unexpected error' });
      return;
    }

    await fastify.mediaQueue.add(
      `transcode-${row.id}`,
      {
        mediaId: row.id,
      },
      {
        attempts: 3,
        backoff: 5000,
        removeOnComplete: true,
      },
    );

    reply.code(202).send(row);
    return;
  });

  fastify.get('/media', async () => {
    const medias = await fastify.db.query.media.findMany({
      with: {
        renditions: true,
      },
    });

    const playable = (renditions: schema.Rendition[]): boolean => {
      return renditions.some(
        (rendition) => rendition.renditionStatus === schema.renditionsStatus.READY,
      );
    };
    const response = medias.map((media) => ({ ...media, playable: playable(media.renditions) }));

    return response;
  });

  fastify.get('/media/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const media = await fastify.db.select().from(schema.media).where(eq(schema.media.id, id));

    if (!media[0]) {
      reply.code(404).send({ error: 'media id not found' });
      return;
    }

    return media[0];
  });

  fastify.get('/stream/:key/master.m3u8', async (request, reply) => {
    const { key } = request.params as { key: string };

    const media = await fastify.db.query.media.findFirst({
      where: eq(schema.media.storageKey, key),
      with: {
        renditions: true,
      },
    });

    if (!media) {
      reply.code(404).send({ error: 'media key not found' });
      return;
    }

    const mediaAvilableQualities = media.renditions
      .filter((rendition) => rendition.renditionStatus === schema.renditionsStatus.READY)
      .map((rendition) => rendition.quality as Quality);

    if (!mediaAvilableQualities.length) {
      reply.code(400).send({ error: 'media not playable yet' });
      return;
    }

    const output = [];
    output.push(`#EXTM3U`);
    output.push(`#EXT-X-VERSION:3`);
    output.push(`#EXT-X-INDEPENDENT-SEGMENTS`);

    mediaAvilableQualities.forEach((quality) => {
      const segmentHeader = segmentQualityHeader(quality);
      output.push(segmentHeader);
      output.push(`${quality}p/${quality}p.m3u8`);
    });

    reply.type('application/x-mpegURL');

    return output.join(`\n`);
  });

  fastify.get('/stream/:key/:quality/:head', async (request, reply) => {
    const { key, quality, head } = request.params as {
      key: string;
      quality: string;
      head: string;
    };

    const basePath = `playlist/${key}/${quality}`;
    const playlistPath = `${basePath}/${head}`;

    const getCommand = createGetCommand(playlistPath);
    const response = await fastify.s3.send(getCommand);
    if (!response.Body) {
      reply.code(500).send({ error: 'file not found' });
      return;
    }

    const rawOutput = await response.Body.transformToString();
    const lines = rawOutput.split(`\n`);
    const linesWithPreSignedSegments = await Promise.all(
      lines.map(async (line) => {
        line = line.trim();

        if (!line || line.length === 0 || line.startsWith('#')) {
          return line;
        }

        const segmentKey = `${basePath}/${line}`;
        const getSegementComand = createGetCommand(segmentKey);
        const preSignedSegementUrl = createPreSignedUrl(
          fastify.publicS3,
          getSegementComand,
          TIME_IN_SECONDS.HOUR * 2,
        );

        return preSignedSegementUrl;
      }),
    );

    reply.type('application/x-mpegURL');

    return linesWithPreSignedSegments.join(`\n`);
  });
}
