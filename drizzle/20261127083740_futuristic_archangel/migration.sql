CREATE TABLE "dashboard_devices" (
	"user_id" text NOT NULL,
	"device_id" varchar(50) NOT NULL,
	"field_name" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_devices_user_device_unique" ON "dashboard_devices" ("user_id","device_id");--> statement-breakpoint
ALTER TABLE "dashboard_devices" ADD CONSTRAINT "dashboard_devices_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;