import { relations } from 'drizzle-orm/relations';
import { media } from './media.ts';
import { renditions } from './renditions.ts';

// export const userRelations = relations(users, ({ many }) => ({ media: many(media) }));
export const mediaRelations = relations(media, ({ many }) => ({
  renditions: many(renditions),
  // users: one(users, { fields: [media.ownerId], references: [users.id] }),
}));
export const renditionRelations = relations(renditions, ({ one }) => ({
  media: one(media, { fields: [renditions.mediaId], references: [media.id] }),
}));
