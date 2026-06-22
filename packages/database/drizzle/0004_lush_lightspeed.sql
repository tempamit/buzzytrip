ALTER TABLE "media_assets" ADD COLUMN "credit_url" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "license_url" text;--> statement-breakpoint
UPDATE "media_assets"
SET "credit_url" = "source_url", "license_url" = "source_url"
WHERE "credit_url" IS NULL OR "license_url" IS NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "credit_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "license_url" SET NOT NULL;
