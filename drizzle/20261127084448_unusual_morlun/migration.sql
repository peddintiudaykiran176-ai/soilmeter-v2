CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"device_id" varchar(128) NOT NULL,
	"field_name" varchar(120) NOT NULL,
	"crop_type" varchar(80) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_id_length" CHECK (char_length(btrim("device_id")) BETWEEN 2 AND 128),
	CONSTRAINT "devices_field_name_length" CHECK (char_length(btrim("field_name")) BETWEEN 2 AND 120),
	CONSTRAINT "devices_crop_type_length" CHECK (char_length(btrim("crop_type")) BETWEEN 1 AND 80),
	CONSTRAINT "devices_coordinates_pair" CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)),
	CONSTRAINT "devices_latitude_bounds" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
	CONSTRAINT "devices_longitude_bounds" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
	CONSTRAINT "devices_status_valid" CHECK ("status" IN ('pending', 'verified', 'inactive'))
);
--> statement-breakpoint
INSERT INTO "devices" (
	"user_id",
	"device_id",
	"field_name",
	"crop_type",
	"latitude",
	"longitude",
	"status",
	"created_at",
	"updated_at"
)
SELECT
	"user_id",
	"device_id",
	COALESCE(NULLIF(BTRIM("field_name"), ''), 'Unknown field'),
	'Unspecified',
	NULL,
	NULL,
	'pending',
	"created_at",
	"created_at"
FROM "dashboard_devices";--> statement-breakpoint
DROP TABLE "dashboard_devices";--> statement-breakpoint
ALTER TABLE "soil_telemetry" ALTER COLUMN "device_id" SET DATA TYPE varchar(128) USING "device_id"::varchar(128);--> statement-breakpoint
CREATE UNIQUE INDEX "devices_device_id_unique" ON "devices" ("device_id");--> statement-breakpoint
CREATE INDEX "devices_user_id_idx" ON "devices" ("user_id");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;