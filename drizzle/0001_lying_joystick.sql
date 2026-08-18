CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"succeeded" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "timezone" text DEFAULT 'Australia/Sydney' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;