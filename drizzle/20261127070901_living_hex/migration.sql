CREATE TABLE "soil_telemetry" (
	"id" bigserial PRIMARY KEY,
	"device_id" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"moisture" double precision,
	"created_at" timestamp with time zone DEFAULT now()
);
