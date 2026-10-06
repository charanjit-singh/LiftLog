import {
  AnyVersionExerciseDescriptorJSON,
  AnyVersionFeedIdentityJSON,
  AnyVersionFollowedFeedUserJSON,
  AnyVersionFollowerFeedUserJSON,
  AnyVersionFollowRequestInboxMessageJSON,
  AnyVersionPendingFeedUserJSON,
  AnyVersionProgramBlueprintJSON,
  AnyVersionReceivedReactionJSON,
  AnyVersionSentReactionJSON,
  AnyVersionSessionJSON,
  AnyVersionSessionUserEventJSON,
} from '@/models/storage/versions/any';
import { BackendFeature, BackendKind } from '@/models/backend';
import { sql } from 'drizzle-orm';
import { check, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { MealType } from '@/models/tracking';

export const sessionsSchema = sqliteTable(
  'session',
  {
    id: text().primaryKey(),
    // The workout currently in progress, if any. At most one row may be active.
    active: integer({ mode: 'boolean' }).notNull().default(false),
    payload: text('payload', { mode: 'json' }).$type<AnyVersionSessionJSON>().notNull(),
  },
  (table) => [
    uniqueIndex('single_active_session')
      .on(table.active)
      .where(sql`${table.active} = 1`),
  ],
);

export const exercisesSchema = sqliteTable('exercise', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionExerciseDescriptorJSON>().notNull(),
});

export const programsSchema = sqliteTable(
  'program',
  {
    id: text().primaryKey(),
    active: integer({ mode: 'boolean' }).notNull(),
    payload: text('payload', { mode: 'json' }).$type<AnyVersionProgramBlueprintJSON>().notNull(),
  },
  (table) => [
    uniqueIndex('single_active_program')
      .on(table.active)
      .where(sql`${table.active} = 1`),
  ],
);

export const feedIdentitySchema = sqliteTable(
  'feed_identity',
  {
    id: integer().primaryKey(),
    payload: text('payload', { mode: 'json' }).$type<AnyVersionFeedIdentityJSON>().notNull(),
  },
  () => [check('single_feed_identity', sql`id = 0`)],
);

export const feedFollowedUsersSchema = sqliteTable('feed_followed_user', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionFollowedFeedUserJSON>().notNull(),
});
export const feedPendingUsersSchema = sqliteTable('feed_pending_user', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionPendingFeedUserJSON>().notNull(),
});
export const feedItemsSchema = sqliteTable('feed_items', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionSessionUserEventJSON>().notNull(),
});

export const feedFollowerUsersSchema = sqliteTable('feed_follower_user', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionFollowerFeedUserJSON>().notNull(),
});

export const feedFollowRequestsSchema = sqliteTable('feed_follow_request', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionFollowRequestInboxMessageJSON>().notNull(),
});

// id is the reactionId, so a redelivered cheer upserts over itself instead of inflating the count.
export const feedReactionsSchema = sqliteTable('feed_reaction', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionReceivedReactionJSON>().notNull(),
});

export const feedSentReactionsSchema = sqliteTable('feed_sent_reaction', {
  id: text().primaryKey(),
  payload: text('payload', { mode: 'json' }).$type<AnyVersionSentReactionJSON>().notNull(),
});

export const feedRevokedFollowSecretsSchema = sqliteTable('feed_revoked_follow_secrets', {
  secret: text().primaryKey(),
});
export const feedUnpublishedSessionsSchema = sqliteTable('feed_unpublished_sessions', {
  sessionId: text().primaryKey(),
});

// Just a table we can use to keep track of which data migrations have been run
export const dataMigrationsSchema = sqliteTable('data_migration', {
  id: text().primaryKey(),
});

export const backendsSchema = sqliteTable('backend', {
  id: text().primaryKey(),
  name: text().notNull(),
  url: text().notNull(),
  kind: text().$type<BackendKind>().notNull(),
});

export const backendHeadersSchema = sqliteTable(
  'backend_header',
  {
    backendId: text()
      .notNull()
      .references(() => backendsSchema.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    value: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.backendId, table.name] })],
);

// A missing row means the feature has no backend and does not run.
export const backendAssignmentsSchema = sqliteTable('backend_assignment', {
  feature: text().$type<BackendFeature>().primaryKey(),
  backendId: text().notNull(),
});

// Plain columns rather than a JSON payload: a membership is a handful of scalars, so there is no
// versioned shape to migrate. Dates are ISO local dates (yyyy-MM-dd); a null end date means ongoing.
export const gymMembershipsSchema = sqliteTable('gym_membership', {
  id: text().primaryKey(),
  name: text().notNull(),
  startDate: text().notNull(),
  endDate: text(),
  notes: text().notNull().default(''),
});

// The daily trackers (water, food, smoking) use plain columns like `gym_membership`: each row is a few
// scalars with no versioned shape. `date` is the day the entry belongs to (yyyy-MM-dd), `loggedAt` an ISO instant.
export const waterLogSchema = sqliteTable('water_log', {
  id: text().primaryKey(),
  date: text().notNull(),
  ml: integer().notNull(),
  loggedAt: text().notNull(),
});

export const smokingLogSchema = sqliteTable('smoking_log', {
  id: text().primaryKey(),
  date: text().notNull(),
  loggedAt: text().notNull(),
});

export const foodLogSchema = sqliteTable('food_log', {
  id: text().primaryKey(),
  date: text().notNull(),
  meal: text().$type<MealType>().notNull(),
  name: text().notNull(),
  calories: integer().notNull(),
  protein: real().notNull(),
  carbs: real().notNull(),
  fat: real().notNull(),
  loggedAt: text().notNull(),
});

export const savedFoodSchema = sqliteTable('saved_food', {
  id: text().primaryKey(),
  name: text().notNull(),
  calories: integer().notNull(),
  protein: real().notNull(),
  carbs: real().notNull(),
  fat: real().notNull(),
  lastUsedAt: text().notNull(),
  useCount: integer().notNull(),
});
