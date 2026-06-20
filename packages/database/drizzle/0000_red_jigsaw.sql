CREATE TABLE "service_heartbeats" (
	"service" varchar(32) PRIMARY KEY NOT NULL,
	"status" varchar(24) DEFAULT 'ok' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
