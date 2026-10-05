import { defineConfig } from "drizzle-kit";

(() => {
	console.log({ url: process.env.FLOUD_DATABASE_URL });
})();

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema.ts",
	out: "./src/migrations",
	dbCredentials: { url: process.env.FLOUD_DATABASE_URL! },
});
