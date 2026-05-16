import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { bookings } from "./bookings";
import { providerProfiles } from "./providers";
import { reviewStatusEnum, reviewReportReasonEnum } from "./enums";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    /** 1..5 inclusive — enforced at the application layer. */
    rating: integer("rating").notNull(),
    comment: text("comment"),
    /** Optional praise tags chosen by the customer (punctual, professional, …). */
    tags: text("tags").array(),
    /** Optional photo URLs (/uploads/review/…) attached by the customer. */
    photos: text("photos").array(),
    status: reviewStatusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    bookingUq: uniqueIndex("reviews_booking_uq").on(t.bookingId),
    providerIdx: index("reviews_provider_idx").on(t.providerId),
    customerIdx: index("reviews_customer_idx").on(t.customerId),
    statusIdx: index("reviews_status_idx").on(t.status),
  }),
);

export const reviewReplies = pgTable(
  "review_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    reviewUq: uniqueIndex("review_replies_review_uq").on(t.reviewId),
  }),
);

export const reviewReports = pgTable(
  "review_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    /** Nullable so the report row outlives reporter-account deletion. */
    reporterId: uuid("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: reviewReportReasonEnum("reason").notNull(),
    details: text("details"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionAction: text("resolution_action"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    reviewIdx: index("review_reports_review_idx").on(t.reviewId),
    reporterReviewUq: uniqueIndex("review_reports_reporter_review_uq").on(
      t.reporterId,
      t.reviewId,
    ),
  }),
);

export type Review = typeof reviews.$inferSelect;
export type ReviewReply = typeof reviewReplies.$inferSelect;
export type ReviewReport = typeof reviewReports.$inferSelect;
