CREATE TABLE "dashboard_preferences" (
	"user_id" text PRIMARY KEY,
	"timezone" text,
	"theme" text DEFAULT 'system' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_preferences_theme_valid" CHECK ("theme" IN ('light', 'dark', 'system'))
);
--> statement-breakpoint
ALTER TABLE "soil_telemetry" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "soil_telemetry" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "soil_telemetry" ADD COLUMN "field_name" varchar(100);--> statement-breakpoint
ALTER TABLE "dashboard_preferences" ADD CONSTRAINT "dashboard_preferences_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "soil_telemetry" ADD CONSTRAINT "soil_telemetry_latitude_range" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90));--> statement-breakpoint
ALTER TABLE "soil_telemetry" ADD CONSTRAINT "soil_telemetry_longitude_range" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));