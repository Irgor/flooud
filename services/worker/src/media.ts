import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import * as path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { type Db, schema } from '@floud/db';
import type { S3Client } from '@floud/s3';
import { bucketName, createGetCommand, PutObjectCommand } from '@floud/s3';
import {
  HLS_QUALITY_PRESETS,
  type Metadata,
  mediaStatus,
  type Quality,
  qualities,
  type RenditionStatus,
  renditionStatus,
} from '@floud/types';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import ffmpeg from 'fluent-ffmpeg';

interface MediaJobData {
  mediaId: string;
}

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
    const media = await db.query.media.findFirst({
      where: eq(schema.media.id, job.data.mediaId),
      with: {
        renditions: true,
      },
    });

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
        .set({ status: mediaStatus.FAILED })
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

    let metadata: Metadata;
    let originalQuality: Quality | null = null;
    if (!media.originalQuality) {
      metadata = await probeVideo(inputPath).catch((err) => {
        console.error('[ERROR]', err);
        throw new Error('video probe failed');
      });

      await db
        .update(schema.media)
        .set({
          ...metadata,
        })
        .where(eq(schema.media.id, job.data.mediaId))
        .catch((e) => {
          console.error(e);
          throw new Error('failed to update video details');
        });
      originalQuality = metadata.originalQuality;
    } else {
      originalQuality = media.originalQuality as Quality;
    }

    // update media status to PROCESSING
    await db
      .update(schema.media)
      .set({
        status: mediaStatus.PROCESSING,
      })
      .where(eq(schema.media.id, job.data.mediaId))
      .catch((e) => {
        console.error(e);
        throw new Error('failed to update video details');
      });

    const videoQualities = qualities.filter((quality) => quality <= originalQuality);

    const createdRenditions = await db
      .insert(schema.renditions)
      .values(videoQualities.map((quality) => ({ mediaId: media.id, quality })))
      .onConflictDoNothing({ target: [schema.renditions.mediaId, schema.renditions.quality] })
      .returning({
        id: schema.renditions.id,
        quality: schema.renditions.quality,
        renditionStatus: schema.renditions.renditionStatus,
      });

    const renditions = media.renditions.length ? media.renditions : createdRenditions;

    const missingVideoQualities = renditions.filter(
      (rendition) =>
        rendition.renditionStatus === renditionStatus.PROCESSING ||
        rendition.renditionStatus === renditionStatus.PENDING ||
        rendition.renditionStatus === renditionStatus.FAILED,
    );

    let anyFailed = false;
    // split file into 6 secs segement playlist and save into output dir
    for (const rendition of missingVideoQualities) {
      let failed = false;
      const quality = rendition.quality as Quality;

      const config = HLS_QUALITY_PRESETS[quality];

      const currOutputDir = createOutputDir(baseDir, quality);
      await ensureDir(currOutputDir);

      await updateRenditionStatus(db, renditionStatus.PROCESSING, rendition.id);
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .on('start', () => {
            console.log(`[FFMPEG] Start FFMPED transcode of ${quality}p`);
          })
          .on('progress', (progress) => {
            console.log(`[FFMPEG] Processing: ${progress?.percent?.toFixed(2) ?? 0}% done`);
          })
          .on('end', resolve)
          .on('error', reject)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(config.resolution)
          .audioBitrate(`${config.audioBitrate}k`)
          .outputOptions([
            '-preset ultrafast',
            '-profile:v high',
            '-ac 2',
            '-crf 23',
            `-maxrate ${config.maxBitrate}k`,
            `-bufsize ${config.bufSize}k`,

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
        await updateRenditionStatus(db, renditionStatus.FAILED, rendition.id);
        failed = true;
        anyFailed = true;
      });

      if (failed) {
        continue;
      }

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

      await updateRenditionStatus(db, renditionStatus.READY, rendition.id);
    }

    if (anyFailed) {
      throw new Error('one or multiple renditions failed transocde');
    }

    await db
      .update(schema.media)
      .set({ status: mediaStatus.READY })
      .where(eq(schema.media.id, media.id));
  } finally {
    await cleanUp(baseDir);
  }

  return { success: true };
};

async function updateRenditionStatus(db: Db, status: RenditionStatus, qualityId: string) {
  await db
    .update(schema.renditions)
    .set({
      renditionStatus: status,
    })
    .where(eq(schema.renditions.id, qualityId));
}

export { type MediaJobData, processMedia };
