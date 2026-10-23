import authRoutes from './routes/auth.ts';
import corsPlugin from './plugins/cors.ts';
import db from './plugins/db.ts';
import Fastify from 'fastify';
import fastifyStatic from './plugins/fastifyStatic.ts';
import mediaRoutes from './routes/media.ts';
import multipartPlugin from './plugins/multipart.ts';
import redis from './plugins/redis.ts';
import s3 from './plugins/s3.ts';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import cookies from './plugins/cookies.ts';

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

//plugins
fastify.register(corsPlugin);
fastify.register(multipartPlugin);
fastify.register(fastifyStatic);
fastify.register(db);
fastify.register(s3);
fastify.register(redis);
fastify.register(cookies);

//routes
fastify.register(mediaRoutes, { prefix: '/api' });
fastify.register(authRoutes, { prefix: '/api/auth' });

fastify.get('/health', async () => {
  return { status: 'healthy' };
});

export default fastify;
