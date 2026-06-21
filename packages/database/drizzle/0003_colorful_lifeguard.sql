CREATE TABLE "trend_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) NOT NULL,
	"display_name" varchar(180) NOT NULL,
	"normalized_name" varchar(180) NOT NULL,
	"observed_on" date NOT NULL,
	"metric_value" numeric(16, 3) NOT NULL,
	"rank" integer,
	"score" numeric(6, 3) NOT NULL,
	"source_url" text NOT NULL,
	"context" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trend_observations_provider_check" CHECK ("trend_observations"."provider" in ('google_trends', 'wikivoyage_pageviews', 'wikipedia_pageviews')),
	CONSTRAINT "trend_observations_metric_value_check" CHECK ("trend_observations"."metric_value" >= 0),
	CONSTRAINT "trend_observations_rank_check" CHECK ("trend_observations"."rank" is null or "trend_observations"."rank" > 0),
	CONSTRAINT "trend_observations_score_check" CHECK ("trend_observations"."score" >= 0 and "trend_observations"."score" <= 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "trend_observations_provider_name_day_unique" ON "trend_observations" USING btree ("provider","normalized_name","observed_on");--> statement-breakpoint
CREATE INDEX "trend_observations_day_provider_score_idx" ON "trend_observations" USING btree ("observed_on","provider","score");