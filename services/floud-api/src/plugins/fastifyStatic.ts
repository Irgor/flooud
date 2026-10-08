import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import fp from 'fastify-plugin';

export default fp(async (fastify) => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'output');
  fastify.register(fastifyStatic, { root });
});
