ALTER TABLE "soil_telemetry" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE INDEX "soil_telemetry_user_device_created_idx" ON "soil_telemetry" ("user_id","device_id","created_at");--> statement-breakpoint
ALTER TABLE "soil_telemetry" ADD CONSTRAINT "soil_telemetry_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;