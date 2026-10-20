import { renditionStatus } from '@floud/types';

import { integer, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { media } from './media.ts';

export const pgEnumRenditionStatus = pgEnum('status', renditionStatus);

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
