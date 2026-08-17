CREATE TYPE "public"."amount_mode" AS ENUM('fixed', 'variable');--> statement-breakpoint
CREATE TYPE "public"."bill_period_status" AS ENUM('upcoming', 'due', 'overdue', 'settled');--> statement-breakpoint
CREATE TYPE "public"."chore_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."funding_source" AS ENUM('house', 'individual');--> statement-breakpoint
CREATE TYPE "public"."furniture_status" AS ENUM('needed', 'researching', 'ordered', 'owned');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('bill_payment', 'furniture_contribution', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."rotation_strategy" AS ENUM('fixed', 'round_robin');--> statement-breakpoint
CREATE TYPE "public"."split_rule" AS ENUM('even', 'shares', 'custom');--> statement-breakpoint
CREATE TABLE "bill_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"due_date" date NOT NULL,
	"total_cents" integer,
	"status" "bill_period_status" DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"amount_owed_cents" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"marked_by" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"vendor" text,
	"category" text,
	"rrule" text NOT NULL,
	"start_date" date NOT NULL,
	"amount_mode" "amount_mode" DEFAULT 'fixed' NOT NULL,
	"default_amount_cents" integer,
	"split_rule" "split_rule" DEFAULT 'even' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chore_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"area" text,
	"rrule" text,
	"start_date" date NOT NULL,
	"effort_points" integer DEFAULT 1 NOT NULL,
	"rotation_strategy" "rotation_strategy" DEFAULT 'round_robin' NOT NULL,
	"fixed_assignee_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chore_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"assignee_id" uuid,
	"due_date" date NOT NULL,
	"status" "chore_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "furniture_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "furniture_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"room" text,
	"status" "furniture_status" DEFAULT 'needed' NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"estimated_cents" integer,
	"actual_cents" integer,
	"url" text,
	"image_url" text,
	"purchased_by" uuid,
	"funding_source" "funding_source" DEFAULT 'house' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"source_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_color" text DEFAULT '#6366f1' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_periods" ADD CONSTRAINT "bill_periods_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_period_id_bill_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."bill_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_marked_by_members_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_definitions" ADD CONSTRAINT "chore_definitions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_definitions" ADD CONSTRAINT "chore_definitions_fixed_assignee_id_members_id_fk" FOREIGN KEY ("fixed_assignee_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_instances" ADD CONSTRAINT "chore_instances_definition_id_chore_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."chore_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_instances" ADD CONSTRAINT "chore_instances_assignee_id_members_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_instances" ADD CONSTRAINT "chore_instances_completed_by_members_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_contributions" ADD CONSTRAINT "furniture_contributions_item_id_furniture_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."furniture_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_contributions" ADD CONSTRAINT "furniture_contributions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_purchased_by_members_id_fk" FOREIGN KEY ("purchased_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bill_period_bill_due_unique" ON "bill_periods" USING btree ("bill_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "bill_share_period_member_unique" ON "bill_shares" USING btree ("period_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chore_instance_def_due_unique" ON "chore_instances" USING btree ("definition_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_unique" ON "members" USING btree ("email");