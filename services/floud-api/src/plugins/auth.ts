import fp from 'fastify-plugin';
import { validateSession } from '../modules/auth/sessions.ts';
export default fp(async (fastify) => {
  fastify.decorateRequest('user', null);

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config.public) return;

    const token = request.cookies.session;
    if (!token) {
      return reply.code(401).send({ error: 'not authenticated' });
    }

    const userSession = await validateSession(fastify.db, token);
    if (!userSession) {
      return reply.code(401).send({ error: 'not authenticated' });
    }

    request.user = { email: userSession.email, id: userSession.id };
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; email: string } | null;
  }
  interface FastifyContextConfig {
    public?: boolean; // types route option `config: { public: true }`
  }
}
