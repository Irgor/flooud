import { Type } from '@fastify/type-provider-typebox';
import type { FastifyTypeboxInstance } from '../../types.ts';
import { hash, verify } from '@node-rs/argon2';
import { schema } from '@floud/db';
import { createHash, randomBytes } from 'node:crypto';
import { eq, gt, and } from 'drizzle-orm';

const userAuthSchema = {
  body: Type.Object({
    email: Type.String({ format: 'email' }),
    password: Type.String(),
  }),
};

const newToken = () => randomBytes(32).toString('base64url');
const toSessionId = (token: string) => createHash('sha256').update(token).digest('hex');

const DUMMY_HASH = await hash(newToken());

const SESSION_TIME_IN_DAYS = 7;

async function createSession(fastify: FastifyTypeboxInstance, userId: string) {
  const sessionToken = newToken();
  const sessionId = toSessionId(sessionToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TIME_IN_DAYS);

  await fastify.db.insert(schema.sessions).values({
    id: sessionId,
    userId: userId,
    expiresAt,
  });

  return { sessionToken, expiresAt };
}

export default async function authRoutes(fastify: FastifyTypeboxInstance) {
  fastify.post('/signup', { schema: userAuthSchema }, async (request, reply) => {
    const { email, password } = request.body;

    const normalizedEmail = email.trim().toLocaleLowerCase();
    if (!normalizedEmail.match(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`)) {
      reply.code(400).send({ error: 'email malformed', field: 'email' });
      return;
    }

    if (password.length < 8 || password.length > 30) {
      reply.code(400).send({ error: 'inalid password' });
      return;
    }

    const passwordHash = await hash(password);

    try {
      const [row] = await fastify.db
        .insert(schema.users)
        .values({
          email: normalizedEmail,
          passwordHash,
        })
        .returning();

      if (!row) {
        reply.code(500).send({ error: 'error while creating the user idk' });
        return;
      }

      const { sessionToken, expiresAt } = await createSession(fastify, row.id);

      reply
        .code(201)
        .setCookie('session', sessionToken, {
          sameSite: 'lax',
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          expires: expiresAt,
        })
        .send({ email: row.email, id: row.id });
    } catch (e) {
      reply.code(409).send({ error: 'invalid email or password' });
    }
  });

  fastify.get('/me', async (request, reply) => {
    const token = request.cookies.session;
    if (!token) {
      reply.code(401).send({ error: 'no token found' });
      return;
    }

    const sessionId = toSessionId(token);
    const session = await fastify.db.query.sessions.findFirst({
      where: and(eq(schema.sessions.id, sessionId), gt(schema.sessions.expiresAt, new Date())),
      with: {
        users: true,
      },
    });

    if (!session) {
      reply.code(401).send({ error: 'no session available' });
      return;
    }

    reply
      .code(200)
      .send({ email: session.users.email, id: session.userId, expires: session.expiresAt });
  });

  fastify.post('/login', { schema: userAuthSchema }, async (request, reply) => {
    const token = request.cookies.session;

    if (token) {
      const sessionId = toSessionId(token);
      await fastify.db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    }

    const { email, password } = request.body;

    const normalizedEmail = email.trim().toLocaleLowerCase();
    if (!normalizedEmail.match(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`)) {
      reply.code(400).send({ error: 'email malformed', field: 'email' });
      return;
    }

    const user = await fastify.db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    });

    const ok = await verify(user?.passwordHash ?? DUMMY_HASH, password);

    if (!user || !ok) {
      reply.code(401).send({ error: 'invalid email or password' });
      return;
    }

    const { sessionToken, expiresAt } = await createSession(fastify, user.id);

    reply
      .code(201)
      .setCookie('session', sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: expiresAt,
      })
      .send({ email: user.email, id: user.id });
  });

  fastify.post('/logout', async (request, reply) => {
    const token = request.cookies.session;

    if (token) {
      const sessionId = toSessionId(token);
      await fastify.db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    }

    reply
      .clearCookie('session', {
        sameSite: 'lax',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
      .code(204)
      .send();
  });
}
