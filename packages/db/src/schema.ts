import { relations } from 'drizzle-orm';
import {
  bigint,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
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

export const pgEnumRenditionStatus = pgEnum('status', ['pending', 'processing', 'ready', 'failed']);
export type RenditionStatus = (typeof pgEnumRenditionStatus.enumValues)[number];
export const renditionsStatus = Object.fromEntries(
  pgEnumRenditionStatus.enumValues.map((value) => [value.toUpperCase(), value]),
) as { [V in RenditionStatus as Uppercase<V>]: V };

export const renditions = pgTable(
  'renditions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    renditionStatus: pgEnumRenditionStatus('rendition_status').notNull().default('pending'),
    quality: integer('quality').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.mediaId, t.quality)],
);

export type Rendition = typeof renditions.$inferSelect;
export type NewRendition = typeof renditions.$inferInsert;

export const mediaRelations = relations(media, ({ many }) => ({ renditions: many(renditions) }));
export const renditionRelations = relations(renditions, ({ one }) => ({
  media: one(media, { fields: [renditions.mediaId], references: [media.id] }),
}));
