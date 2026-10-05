import Fastify from "fastify";
import corsPlugin from "./plugins/cors.ts";
import db from "./plugins/db.ts";
import fastifyStatic from "./plugins/fastifyStatic.ts";
import multipartPlugin from "./plugins/multipart.ts";
import redis from "./plugins/redis.ts";
import s3 from "./plugins/s3.ts";
import mediaRoutes from "./routes/media.ts";

const fastify = Fastify({
	logger: true,
});

//plugins
fastify.register(corsPlugin);
fastify.register(multipartPlugin);
fastify.register(fastifyStatic);
fastify.register(db);
fastify.register(s3);
fastify.register(redis);

//routes
fastify.register(mediaRoutes);

fastify.get("/health", async () => {
	return { status: "healthy" };
});

export default fastify;
