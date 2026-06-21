CREATE TABLE "model_generation_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid,
	"guide_revision_id" uuid,
	"provider" varchar(20) NOT NULL,
	"model" varchar(120) NOT NULL,
	"prompt_version" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'started' NOT NULL,
	"error_code" varchar(80),
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"response_hash" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "model_generation_attempts_input_tokens_check" CHECK ("model_generation_attempts"."input_tokens" >= 0),
	CONSTRAINT "model_generation_attempts_output_tokens_check" CHECK ("model_generation_attempts"."output_tokens" >= 0),
	CONSTRAINT "model_generation_attempts_provider_check" CHECK ("model_generation_attempts"."provider" in ('gemini', 'groq')),
	CONSTRAINT "model_generation_attempts_status_check" CHECK ("model_generation_attempts"."status" in ('started', 'succeeded', 'failed', 'quality_rejected'))
);
--> statement-breakpoint
CREATE TABLE "model_usage_daily" (
	"provider" varchar(20) NOT NULL,
	"usage_date" date NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_usage_daily_provider_usage_date_pk" PRIMARY KEY("provider","usage_date"),
	CONSTRAINT "model_usage_daily_provider_check" CHECK ("model_usage_daily"."provider" in ('gemini', 'groq')),
	CONSTRAINT "model_usage_daily_request_count_check" CHECK ("model_usage_daily"."request_count" >= 0),
	CONSTRAINT "model_usage_daily_input_tokens_check" CHECK ("model_usage_daily"."input_tokens" >= 0),
	CONSTRAINT "model_usage_daily_output_tokens_check" CHECK ("model_usage_daily"."output_tokens" >= 0)
);
--> statement-breakpoint
ALTER TABLE "model_generation_attempts" ADD CONSTRAINT "model_generation_attempts_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_generation_attempts" ADD CONSTRAINT "model_generation_attempts_guide_revision_id_guide_revisions_id_fk" FOREIGN KEY ("guide_revision_id") REFERENCES "public"."guide_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_generation_attempts_provider_started_idx" ON "model_generation_attempts" USING btree ("provider","started_at");--> statement-breakpoint
CREATE INDEX "model_generation_attempts_destination_status_idx" ON "model_generation_attempts" USING btree ("destination_id","status");