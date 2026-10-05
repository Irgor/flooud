import { createS3, type S3Client } from "@floud/s3";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
	const s3 = createS3();
	fastify.decorate("s3", s3);
	fastify.addHook("onClose", async () => {
		await s3.destroy();
	});

	const publicS3 = createS3(true);
	fastify.decorate("publicS3", publicS3);
	fastify.addHook("onClose", async () => {
		await publicS3.destroy();
	});
});

declare module "fastify" {
	interface FastifyInstance {
		s3: S3Client;
	}

	interface FastifyInstance {
		publicS3: S3Client;
	}
}
