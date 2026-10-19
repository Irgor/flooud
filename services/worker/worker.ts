import { createDb, schema } from '@floud/db';
import { createS3 } from '@floud/s3';
import { mediaStatus, renditionStatus } from '@floud/types';
import { Worker } from 'bullmq';
import { eq, inArray } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { processMedia } from './src/media.ts';

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

const { db } = createDb();
const s3 = createS3();

const mediaWorker = new Worker('media', processMedia(db, s3), {
  connection,
  concurrency: 1,
});

mediaWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed! Result:`, job.returnvalue);
});

mediaWorker.on('failed', async (job, err) => {
  if (!job) return;
  console.error(`Job ${job?.id} has failed with error: ${err.message}`);

  try {
    const isLast = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (isLast) {
      const media = await db.query.media.findFirst({
        where: eq(schema.media.id, job.data.mediaId),
        with: {
          renditions: true,
        },
      });

      if (!media) {
        return;
      }

      const failedRenditions = media.renditions
        .filter((rendition) => rendition.renditionStatus !== renditionStatus.READY)
        .map((rendition) => rendition.id);

      if (failedRenditions.length) {
        await db
          .update(schema.renditions)
          .set({
            renditionStatus: renditionStatus.FAILED,
          })
          .where(inArray(schema.renditions.id, failedRenditions));
      }

      const isMeadiaReady = media.renditions.some(
        (rendition) => rendition.renditionStatus === renditionStatus.READY,
      );
      if (isMeadiaReady) {
        await db
          .update(schema.media)
          .set({
            status: mediaStatus.READY,
          })
          .where(eq(schema.media.id, media.id));
      } else {
        await db
          .update(schema.media)
          .set({
            status: mediaStatus.FAILED,
          })
          .where(eq(schema.media.id, media.id));
      }
    }
  } catch (e) {
    console.log('[WORKER]: error while updating media status', e);
  }
});
