import {
	bigint,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const pgEnumMediaStatus = pgEnum("media_status", [
	"uploading",
	"processing",
	"ready",
	"failed",
]);

export type MediaStatus = (typeof pgEnumMediaStatus.enumValues)[number];
export const mediaStatus = Object.fromEntries(
	pgEnumMediaStatus.enumValues.map((value) => [value.toUpperCase(), value]),
) as { [V in MediaStatus as Uppercase<V>]: V };

export const media = pgTable("medias", {
	id: uuid("id").defaultRandom().primaryKey(),
	storageKey: text("storage_key").notNull(),
	originalName: text("original_name").notNull(),
	mime: text("mime").notNull(),
	width: integer("width"),
	height: integer("height"),
	original_quality: integer("original_quality").notNull(),
	sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
	status: pgEnumMediaStatus("status").notNull().default("uploading"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
