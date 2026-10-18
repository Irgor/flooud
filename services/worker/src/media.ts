import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import * as path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { type Db, schema } from '@floud/db';
import type { S3Client } from '@floud/s3';
import { bucketName, createGetCommand, PutObjectCommand } from '@floud/s3';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import ffmpeg from 'fluent-ffmpeg';

const qualities = [480, 720, 1080, 2160] as const;
type Quality = (typeof qualities)[number];
interface MediaJobData {
  mediaId: string;
}

export type Metadata = {
  resolution: string;
  codec: string;
  colorFormat: string;
  bitrateMbps: number;
  height: string;
  width: string;
  sizeBytes: number;
  aspectRatio: string;
  originalQuality: Quality;
};

export type hslPreset = {
  resolution: string;
  videoBitrate: string;
  maxBitrate: string;
  bufSize: string;
  audioBitrate: string;
};

export const HLS_QUALITY_PRESETS = {
  2160: {
    resolution: '3840x2160',
    videoBitrate: '14000k',
    maxBitrate: '15000k',
    bufSize: '21000k',
    audioBitrate: '320k',
  },
  1080: {
    resolution: '1920x1080',
    videoBitrate: '5000k',
    maxBitrate: '5350k',
    bufSize: '7500k',
    audioBitrate: '192k',
  },
  720: {
    resolution: '1280x720',
    videoBitrate: '2800k',
    maxBitrate: '3000k',
    bufSize: '4200k',
    audioBitrate: '128k',
  },
  480: {
    resolution: '854x480',
    videoBitrate: '1400k',
    maxBitrate: '1500k',
    bufSize: '2100k',
    audioBitrate: '128k',
  },
} as const;

export type QualityPresetKey = keyof typeof HLS_QUALITY_PRESETS;

const tempInputPath = (baseDir: string, type: string) =>
  path.join(`${baseDir}/`, `input-${Date.now()}.${type}`);
const createOutputDir = (baseDir: string, quality: number) =>
  path.join(`${baseDir}/`, `hls-${Date.now()}-time/${quality}`);

const createTargetFolder = (key: string, quality: number) => `playlist/${key}/${quality}p`;

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`[error] creating ${dirPath}:`, error);
  }
}

async function cleanUp(baseDir: string) {
  await rm(baseDir, { force: true, recursive: true });
}

function mapToQualityEnum(height: number, width: number): Quality {
  const min = Math.min(height, width);
  const possibilities = qualities.filter((quality) => quality <= min);
  if (!possibilities.length) {
    return Math.min(...qualities) as Quality;
  }

  return Math.max(...possibilities) as Quality;
}

function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function probeVideo(filePath: string): Promise<Metadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject({ success: false, error: err.message });
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

      if (!videoStream) {
        return reject({ success: false, error: 'video stream not loaded' });
      }

      const width = videoStream.width;
      const height = videoStream.height;

      if (!height || !width) {
        return reject({ success: false, error: 'video metadata not loaded' });
      }

      const originalQuality: Quality = mapToQualityEnum(height, width);

      const sizeBytes = metadata.format.size || 0;
      const bitRateInBits = metadata.format.bit_rate || 0;

      const aspectRatio =
        videoStream.display_aspect_ratio && videoStream.display_aspect_ratio !== '0:1'
          ? videoStream.display_aspect_ratio
          : calculateAspectRatio(width, height);

      resolve({
        sizeBytes,
        originalQuality,
        aspectRatio,
        codec: videoStream?.codec_name || 'unknown',
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
        height: videoStream ? `${videoStream.height}` : 'unknown',
        width: videoStream ? `${videoStream.width}` : 'unknown',
        colorFormat: videoStream?.pix_fmt || 'unknown',
        bitrateMbps: parseFloat((bitRateInBits / 1_000_000).toFixed(2)),
      });
    });
  });
}

const processMedia = (db: Db, s3: S3Client) => async (job: Job<MediaJobData>) => {
  const baseDir = `/tmp/media-${job.data.mediaId}`;
  await ensureDir(baseDir);
  let inputPath = '';

  try {
    console.log(`[INFO] Job ${job.id} started ${new Date().toISOString()}`);

    // get media details from datbase
    console.log(`[DB] start media query on ${job.data.mediaId}`);
    const media = (
      await db.select().from(schema.media).where(eq(schema.media.id, job.data.mediaId))
    )?.[0];

    if (!media) {
      throw new Error('media not found');
    }
    console.log(`[DB] media data retrivied ${media.originalName}`);

    // set up path information
    inputPath = tempInputPath(baseDir, media.originalName.split('.').pop() ?? 'mp4');

    // get file from s3
    console.log(`[S3] get image from s3 ${media.storageKey}`);
    const command = createGetCommand(media.storageKey);
    const response = await s3.send(command);
    if (!response.Body) {
      await db
        .update(schema.media)
        .set({ status: schema.mediaStatus.FAILED })
        .where(eq(schema.media.id, job.data.mediaId));
      throw new Error('no s3 file found');
    }

    console.log(`[S3] media loaded from s3 ${response.$metadata.httpStatusCode}`);

    // write file locally
    console.log(`[INFO] writing file locally at ${inputPath}`);
    const s3Stream = response.Body as Readable;
    const fileStream = createWriteStream(inputPath);
    await pipeline(s3Stream, fileStream);
    console.log(`[INFO] file wrote locally success`);

    const metadata = await probeVideo(inputPath).catch((err) => {
      console.error('[ERROR]', err);
      throw new Error('video probe failed');
    });

    console.log({ metadata });

    // update media status to PROCESSING
    await db
      .update(schema.media)
      .set({
        status: schema.mediaStatus.PROCESSING,
        ...metadata,
      })
      .where(eq(schema.media.id, job.data.mediaId))
      .catch((e) => {
        console.error(e);
        throw new Error('failed to update video details');
      });

    const videoQualities = qualities.filter((quality) => quality <= metadata.originalQuality);

    // split file into 6 secs segement playlist and save into output dir
    for (const quality of videoQualities) {
      const config = HLS_QUALITY_PRESETS[quality];

      const currOutputDir = createOutputDir(baseDir, quality);
      await ensureDir(currOutputDir);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .on('start', () => console.log(`[FFMPEG] Start FFMPED transcode of ${quality}p`))
          .on('progress', (progress) =>
            console.log(`[FFMPEG] Processing: ${progress?.percent?.toFixed(2) ?? 0}% done`),
          )
          .on('end', resolve)
          .on('error', reject)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(config.resolution)
          .videoBitrate(config.videoBitrate)
          .audioBitrate(config.audioBitrate)
          .outputOptions([
            '-preset ultrafast',
            '-profile:v high',
            '-ac 2',
            '-crf 23',
            `-maxrate ${config.maxBitrate}`,
            `-bufsize ${config.bufSize}`,

            '-force_key_frames expr:gte(t,n_forced*6)',
            '-sc_threshold 0',

            '-f hls',
            '-hls_time 6',
            '-hls_playlist_type vod',
            `-hls_segment_filename ${path.join(currOutputDir, 'seg_%03d.ts')}`,
          ])
          .output(path.join(currOutputDir, `${quality}p.m3u8`))
          .run();
      }).catch(async () => {
        console.log('[ERROR] FFMPEG Failed processging video');
        await db
          .update(schema.media)
          .set({ status: schema.mediaStatus.FAILED })
          .where(eq(schema.media.id, job.data.mediaId));
        throw new Error('video encode failed');
      });

      // list all generated files from quality
      const files = await readdir(currOutputDir);

      for (const file of files) {
        const localFilePath = path.join(currOutputDir, file);

        const targetFolder = createTargetFolder(media.storageKey, quality);
        const s3Key = path.join(targetFolder, file).replace(/\\/g, '/');

        const fileBuffer = await readFile(localFilePath);

        // define content type based on file type
        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) {
          contentType = 'application/x-mpegURL';
        } else if (file.endsWith('.ts')) {
          contentType = 'video/MP2T';
        }

        // upload it back to S3
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: contentType,
          }),
        );

        console.log(`[UPLOAD]: ${s3Key}`);
      }
    }

    await db
      .update(schema.media)
      .set({ status: schema.mediaStatus.READY })
      .where(eq(schema.media.id, job.data.mediaId));
  } finally {
    await cleanUp(baseDir);
  }

  return { success: true };
};

export { type MediaJobData, processMedia };
