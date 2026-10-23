import { relations } from 'drizzle-orm/relations';
import { media } from './media.ts';
import { renditions } from './renditions.ts';
import { sessions, users } from './users.ts';

export const mediaRelations = relations(media, ({ many }) => ({
  renditions: many(renditions),
  // users: one(users, { fields: [media.ownerId], references: [users.id] }),
}));
export const renditionRelations = relations(renditions, ({ one }) => ({
  media: one(media, { fields: [renditions.mediaId], references: [media.id] }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  users: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
