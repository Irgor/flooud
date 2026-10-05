import { Queue } from "bullmq";
import fp from "fastify-plugin";
import { Redis } from "ioredis";

export default fp(async (fastify) => {
	const connection = new Redis({
		host: process.env.REDIS_HOST,
		port: Number(process.env.REDIS_PORT),
		maxRetriesPerRequest: null,
	});

	const mediaQueue = new Queue("media", { connection });

	fastify.decorate("mediaQueue", mediaQueue);
	fastify.addHook("onClose", async () => {
		await mediaQueue.close();
	});
});

declare module "fastify" {
	interface FastifyInstance {
		mediaQueue: Queue;
	}
}
