import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './src/schema.ts';

const createDb = () => {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  return { sql, db };
};

export type Db = ReturnType<typeof createDb>['db'];

export { createDb, schema };
