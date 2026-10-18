import {
  bigint,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  doublePrecision,
} from 'drizzle-orm/pg-core';

export const pgEnumMediaStatus = pgEnum('media_status', [
  'uploading',
  'processing',
  'ready',
  'failed',
]);

export type MediaStatus = (typeof pgEnumMediaStatus.enumValues)[number];
export const mediaStatus = Object.fromEntries(
  pgEnumMediaStatus.enumValues.map((value) => [value.toUpperCase(), value]),
) as { [V in MediaStatus as Uppercase<V>]: V };

export const media = pgTable('medias', {
  id: uuid('id').defaultRandom().primaryKey(),
  storageKey: text('storage_key').notNull(),
  originalName: text('original_name').notNull(),
  mime: text('mime').notNull(),
  width: text('width'),
  height: text('height'),
  resolution: text('resolution'),
  codec: text('codec'),
  colorFormat: text('color_format'),
  bitrateMbps: doublePrecision('bitrate_mbps'),
  aspectRatio: text('aspect_ratio'),
  originalQuality: integer('original_quality'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  status: pgEnumMediaStatus('status').notNull().default('uploading'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
