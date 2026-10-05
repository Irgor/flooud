import { createDb } from "@floud/db";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { createS3 } from "../../packages/s3/s3.ts";
import { processMedia } from "./src/media.ts";

const connection = new Redis({
	host: process.env.REDIS_HOST,
	port: Number(process.env.REDIS_PORT),
	maxRetriesPerRequest: null,
});

const { db } = createDb();
const s3 = createS3();

const mediaWorker = new Worker("media", processMedia(db, s3), {
	connection,
	concurrency: 1,
});

mediaWorker.on("completed", (job) => {
	console.log(`Job ${job.id} has completed! Result:`, job.returnvalue);
});

mediaWorker.on("failed", (job, err) => {
	console.error(`Job ${job?.id} has failed with error: ${err.message}`);
});
