ALTER TABLE "soil_telemetry" DROP CONSTRAINT "soil_telemetry_user_id_user_id_fkey";--> statement-breakpoint
DROP INDEX "soil_telemetry_user_device_created_idx";--> statement-breakpoint
ALTER TABLE "soil_telemetry" DROP COLUMN "user_id";