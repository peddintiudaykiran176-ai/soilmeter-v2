ALTER TABLE "soil_telemetry" DROP CONSTRAINT "soil_telemetry_latitude_range";--> statement-breakpoint
ALTER TABLE "soil_telemetry" DROP CONSTRAINT "soil_telemetry_longitude_range";--> statement-breakpoint
ALTER TABLE "soil_telemetry" DROP CONSTRAINT "soil_telemetry_coordinates_pair";--> statement-breakpoint
ALTER TABLE "soil_telemetry" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "soil_telemetry" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "soil_telemetry" DROP COLUMN "field_name";