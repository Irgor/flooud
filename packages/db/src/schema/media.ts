import { mediaStatus } from '@floud/types';

import {
  bigint,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const pgEnumMediaStatus = pgEnum('media_status', mediaStatus);

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
  // ownerId: uuid('owner_id')
  //   .notNull()
  //   .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
