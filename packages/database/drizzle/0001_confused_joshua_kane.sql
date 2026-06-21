CREATE TABLE "content_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_sequence" bigserial NOT NULL,
	"destination_id" uuid NOT NULL,
	"guide_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'published' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destination_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"normalized_alias" varchar(180) NOT NULL,
	"locale" varchar(12) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destination_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"slug" varchar(180) NOT NULL,
	"content_angle" varchar(180) NOT NULL,
	"trip_theme" varchar(80) NOT NULL,
	"audiences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(160) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"country_name" varchar(100) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"destination_type" varchar(32) NOT NULL,
	"state_or_region" varchar(120),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_country_code_check" CHECK (char_length("destinations"."country_code") = 2),
	CONSTRAINT "destinations_scope_check" CHECK ("destinations"."scope" in ('india', 'international'))
);
--> statement-breakpoint
CREATE TABLE "guide_revision_media" (
	"revision_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"role" varchar(16) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"caption" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_revision_media_revision_id_media_asset_id_pk" PRIMARY KEY("revision_id","media_asset_id"),
	CONSTRAINT "guide_revision_media_sort_order_check" CHECK ("guide_revision_media"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "guide_revision_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"section_key" varchar(80) NOT NULL,
	"claim_summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"excerpt" text NOT NULL,
	"content" jsonb NOT NULL,
	"seo" jsonb NOT NULL,
	"content_fingerprint" varchar(64) NOT NULL,
	"prompt_version" varchar(40) NOT NULL,
	"model_provider" varchar(40),
	"model_name" varchar(100),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"quality_report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	CONSTRAINT "guide_revisions_revision_number_check" CHECK ("guide_revisions"."revision_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) NOT NULL,
	"external_id" varchar(180),
	"source_url" text NOT NULL,
	"storage_key" varchar(300) NOT NULL,
	"public_url" text NOT NULL,
	"alt_text" varchar(240) NOT NULL,
	"credit_text" varchar(240) NOT NULL,
	"license" varchar(100) NOT NULL,
	"width" integer,
	"height" integer,
	"checksum" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_width_check" CHECK ("media_assets"."width" is null or "media_assets"."width" > 0),
	CONSTRAINT "media_assets_height_check" CHECK ("media_assets"."height" is null or "media_assets"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "research_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"publisher" varchar(160) NOT NULL,
	"title" varchar(240) NOT NULL,
	"source_type" varchar(24) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid,
	"display_name" varchar(180) NOT NULL,
	"normalized_name" varchar(180) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"country_name" varchar(100) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"provider" varchar(40) NOT NULL,
	"trend_score" numeric(8, 3) NOT NULL,
	"observed_on" date NOT NULL,
	"status" varchar(20) DEFAULT 'discovered' NOT NULL,
	"raw_signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trend_candidates_scope_check" CHECK ("trend_candidates"."scope" in ('india', 'international'))
);
--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_guide_id_destination_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."destination_guides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_revision_id_guide_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."guide_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_aliases" ADD CONSTRAINT "destination_aliases_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_guides" ADD CONSTRAINT "destination_guides_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_revision_media" ADD CONSTRAINT "guide_revision_media_revision_id_guide_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."guide_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_revision_media" ADD CONSTRAINT "guide_revision_media_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_revision_sources" ADD CONSTRAINT "guide_revision_sources_revision_id_guide_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."guide_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_revision_sources" ADD CONSTRAINT "guide_revision_sources_source_id_research_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."research_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_revisions" ADD CONSTRAINT "guide_revisions_guide_id_destination_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."destination_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_candidates" ADD CONSTRAINT "trend_candidates_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_publications_sequence_unique" ON "content_publications" USING btree ("publication_sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "content_publications_revision_unique" ON "content_publications" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "content_publications_recent_idx" ON "content_publications" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "content_publications_destination_recent_idx" ON "content_publications" USING btree ("destination_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "destination_aliases_destination_alias_locale_unique" ON "destination_aliases" USING btree ("destination_id","normalized_alias","locale");--> statement-breakpoint
CREATE INDEX "destination_aliases_lookup_idx" ON "destination_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "destination_guides_slug_unique" ON "destination_guides" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "destination_guides_destination_status_idx" ON "destination_guides" USING btree ("destination_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_unique" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "destinations_scope_status_idx" ON "destinations" USING btree ("scope","status");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_revision_media_position_unique" ON "guide_revision_media" USING btree ("revision_id","role","sort_order");--> statement-breakpoint
CREATE INDEX "guide_revision_sources_revision_idx" ON "guide_revision_sources" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "guide_revision_sources_source_idx" ON "guide_revision_sources" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_revisions_guide_number_unique" ON "guide_revisions" USING btree ("guide_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_revisions_content_fingerprint_unique" ON "guide_revisions" USING btree ("content_fingerprint");--> statement-breakpoint
CREATE INDEX "guide_revisions_guide_status_idx" ON "guide_revisions" USING btree ("guide_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_key_unique" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_provider_external_id_unique" ON "media_assets" USING btree ("provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "research_sources_url_unique" ON "research_sources" USING btree ("url");--> statement-breakpoint
CREATE INDEX "research_sources_status_fetched_idx" ON "research_sources" USING btree ("status","fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trend_candidates_provider_destination_day_unique" ON "trend_candidates" USING btree ("provider","normalized_name","country_code","observed_on");--> statement-breakpoint
CREATE INDEX "trend_candidates_selection_idx" ON "trend_candidates" USING btree ("observed_on","scope","status");