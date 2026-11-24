import { createHash, randomBytes } from 'crypto';
import { schema, type Db } from '@floud/db';
import { and, eq, gt } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';

export const newToken = () => randomBytes(32).toString('base64url');
export const toSessionId = (token: string) => createHash('sha256').update(token).digest('hex');

export const DUMMY_HASH = await hash(newToken());
export const SESSION_TIME_IN_DAYS = 7;

export async function validateSession(
  db: Db,
  token: string | undefined,
): Promise<{ email: string; id: string; expiresAt: Date } | null> {
  if (!token) {
    return null;
  }

  const sessionId = toSessionId(token);
  const session = await db.query.sessions.findFirst({
    where: and(eq(schema.sessions.id, sessionId), gt(schema.sessions.expiresAt, new Date())),
    with: {
      users: { columns: { id: true, email: true } },
    },
  });

  return session ? { ...session.users, expiresAt: session.expiresAt } : null;
}
