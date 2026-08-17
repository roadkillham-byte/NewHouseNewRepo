import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarColor: text("avatar_color").notNull().default("#6366f1"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("members_email_unique").on(t.email)],
);

// ---------------------------------------------------------------------------
// Chores
// ---------------------------------------------------------------------------

export const rotationStrategyEnum = pgEnum("rotation_strategy", ["fixed", "round_robin"]);
export const choreStatusEnum = pgEnum("chore_status", ["pending", "done", "skipped"]);

export const choreDefinitions = pgTable("chore_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  area: text("area"), // room / area of the house, freeform
  // RFC 5545 RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO". Null = one-off task
  // (used for the move-in checklist and other single-occurrence items).
  rrule: text("rrule"),
  // First date the rule applies from. Required even for one-off tasks so the
  // recurrence engine has a stable anchor.
  startDate: date("start_date", { mode: "date" }).notNull(),
  effortPoints: integer("effort_points").notNull().default(1),
  rotationStrategy: rotationStrategyEnum("rotation_strategy").notNull().default("round_robin"),
  // Fixed assignee when rotationStrategy = 'fixed'. Null for round_robin
  // (assignment is computed by the recurrence engine at materialise time).
  fixedAssigneeId: uuid("fixed_assignee_id").references(() => members.id, {
    onDelete: "set null",
  }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const choreInstances = pgTable(
  "chore_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => choreDefinitions.id, { onDelete: "cascade" }),
    assigneeId: uuid("assignee_id").references(() => members.id, { onDelete: "set null" }),
    dueDate: date("due_date", { mode: "date" }).notNull(),
    status: choreStatusEnum("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => members.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("chore_instance_def_due_unique").on(t.definitionId, t.dueDate)],
);

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

export const amountModeEnum = pgEnum("amount_mode", ["fixed", "variable"]);
export const splitRuleEnum = pgEnum("split_rule", ["even", "shares", "custom"]);
export const billPeriodStatusEnum = pgEnum("bill_period_status", [
  "upcoming",
  "due",
  "overdue",
  "settled",
]);

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  vendor: text("vendor"),
  category: text("category"), // e.g. "electricity", "internet", "rent"
  rrule: text("rrule").notNull(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  amountMode: amountModeEnum("amount_mode").notNull().default("fixed"),
  defaultAmountCents: integer("default_amount_cents"), // required when amountMode = 'fixed'
  splitRule: splitRuleEnum("split_rule").notNull().default("even"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const billPeriods = pgTable(
  "bill_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    periodStart: date("period_start", { mode: "date" }).notNull(),
    periodEnd: date("period_end", { mode: "date" }).notNull(),
    dueDate: date("due_date", { mode: "date" }).notNull(),
    // Total for the period. For fixed bills this is copied from
    // defaultAmountCents at materialise time; for variable bills it starts
    // null until someone enters the actual amount.
    totalCents: integer("total_cents"),
    status: billPeriodStatusEnum("status").notNull().default("upcoming"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("bill_period_bill_due_unique").on(t.billId, t.dueDate)],
);

export const billShares = pgTable(
  "bill_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => billPeriods.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    amountOwedCents: integer("amount_owed_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    markedBy: uuid("marked_by").references(() => members.id, { onDelete: "set null" }),
    note: text("note"),
  },
  (t) => [uniqueIndex("bill_share_period_member_unique").on(t.periodId, t.memberId)],
);

// ---------------------------------------------------------------------------
// Furnishing
// ---------------------------------------------------------------------------

export const furnitureStatusEnum = pgEnum("furniture_status", [
  "needed",
  "researching",
  "ordered",
  "owned",
]);
export const fundingSourceEnum = pgEnum("funding_source", ["house", "individual"]);

export const furnitureItems = pgTable("furniture_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  room: text("room"),
  status: furnitureStatusEnum("status").notNull().default("needed"),
  priority: integer("priority").notNull().default(2), // 1 = high, 2 = medium, 3 = low
  estimatedCents: integer("estimated_cents"),
  actualCents: integer("actual_cents"),
  url: text("url"),
  imageUrl: text("image_url"),
  purchasedBy: uuid("purchased_by").references(() => members.id, { onDelete: "set null" }),
  fundingSource: fundingSourceEnum("funding_source").notNull().default("house"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const furnitureContributions = pgTable("furniture_contributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => furnitureItems.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Ledger — single source of truth for "who owes whom"
// ---------------------------------------------------------------------------

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "bill_payment",
  "furniture_contribution",
  "adjustment",
]);

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  type: ledgerEntryTypeEnum("type").notNull(),
  amountCents: integer("amount_cents").notNull(), // positive = paid in, negative = owed
  // Loose pointer to the originating row (bill_shares.id or
  // furniture_contributions.id). Not a FK — the source table varies by type,
  // and history must survive the source row being edited or deleted.
  sourceId: uuid("source_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(members),
  choreDefinitions: many(choreDefinitions),
  bills: many(bills),
  furnitureItems: many(furnitureItems),
  ledgerEntries: many(ledgerEntries),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  household: one(households, {
    fields: [members.householdId],
    references: [households.id],
  }),
  assignedChoreInstances: many(choreInstances),
  billShares: many(billShares),
  furnitureContributions: many(furnitureContributions),
  ledgerEntries: many(ledgerEntries),
}));

export const choreDefinitionsRelations = relations(choreDefinitions, ({ one, many }) => ({
  household: one(households, {
    fields: [choreDefinitions.householdId],
    references: [households.id],
  }),
  fixedAssignee: one(members, {
    fields: [choreDefinitions.fixedAssigneeId],
    references: [members.id],
  }),
  instances: many(choreInstances),
}));

export const choreInstancesRelations = relations(choreInstances, ({ one }) => ({
  definition: one(choreDefinitions, {
    fields: [choreInstances.definitionId],
    references: [choreDefinitions.id],
  }),
  assignee: one(members, {
    fields: [choreInstances.assigneeId],
    references: [members.id],
  }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  household: one(households, {
    fields: [bills.householdId],
    references: [households.id],
  }),
  periods: many(billPeriods),
}));

export const billPeriodsRelations = relations(billPeriods, ({ one, many }) => ({
  bill: one(bills, {
    fields: [billPeriods.billId],
    references: [bills.id],
  }),
  shares: many(billShares),
}));

export const billSharesRelations = relations(billShares, ({ one }) => ({
  period: one(billPeriods, {
    fields: [billShares.periodId],
    references: [billPeriods.id],
  }),
  member: one(members, {
    fields: [billShares.memberId],
    references: [members.id],
  }),
}));

export const furnitureItemsRelations = relations(furnitureItems, ({ one, many }) => ({
  household: one(households, {
    fields: [furnitureItems.householdId],
    references: [households.id],
  }),
  purchasedByMember: one(members, {
    fields: [furnitureItems.purchasedBy],
    references: [members.id],
  }),
  contributions: many(furnitureContributions),
}));

export const furnitureContributionsRelations = relations(furnitureContributions, ({ one }) => ({
  item: one(furnitureItems, {
    fields: [furnitureContributions.itemId],
    references: [furnitureItems.id],
  }),
  member: one(members, {
    fields: [furnitureContributions.memberId],
    references: [members.id],
  }),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  household: one(households, {
    fields: [ledgerEntries.householdId],
    references: [households.id],
  }),
  member: one(members, {
    fields: [ledgerEntries.memberId],
    references: [members.id],
  }),
}));
