import { fastifyCookie } from '@fastify/cookie';
import fp from 'fastify-plugin';

export default fp(async (fastify) => {
  fastify.register(fastifyCookie, {
    secret: 'rpfr80uQwbL0cWs73Nm8owMqcEZCWf5YUNB62hr9Zfc',
    parseOptions: {},
  });
});
