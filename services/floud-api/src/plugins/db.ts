import { createDb, type Db } from "@floud/db";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
	const { db, sql } = createDb();
	fastify.decorate("db", db);
	fastify.addHook("onClose", async () => {
		await sql.end();
	});
});

declare module "fastify" {
	interface FastifyInstance {
		db: Db;
	}
}
