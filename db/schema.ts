import {
  boolean,
  bigint,
  bigserial,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("user"),
    termsAccepted: boolean("termsAccepted").notNull().default(false),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("user_email_unique").on(table.email),
    check(
      "user_role_valid",
      sql`${table.role} IN ('super_admin', 'admin', 'user')`,
    ),
    check("user_terms_accepted", sql`${table.termsAccepted} = true`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = pgTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  count: integer("count").notNull(),
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
}, (table) => [uniqueIndex("rate_limit_key_unique").on(table.key)]);

export const soilTelemetry = pgTable("soil_telemetry", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  message: text("message").notNull(),
  moisture: doublePrecision("moisture"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 128 }).notNull(),
    fieldName: varchar("field_name", { length: 120 }).notNull(),
    cropType: varchar("crop_type", { length: 80 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "devices_device_id_length",
      sql`char_length(btrim(${table.deviceId})) BETWEEN 2 AND 128`,
    ),
    check(
      "devices_field_name_length",
      sql`char_length(btrim(${table.fieldName})) BETWEEN 2 AND 120`,
    ),
    check(
      "devices_crop_type_length",
      sql`char_length(btrim(${table.cropType})) BETWEEN 1 AND 80`,
    ),
    check(
      "devices_coordinates_pair",
      sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL)`,
    ),
    check(
      "devices_latitude_bounds",
      sql`${table.latitude} IS NULL OR ${table.latitude} BETWEEN -90 AND 90`,
    ),
    check(
      "devices_longitude_bounds",
      sql`${table.longitude} IS NULL OR ${table.longitude} BETWEEN -180 AND 180`,
    ),
    check(
      "devices_status_valid",
      sql`${table.status} IN ('pending', 'verified', 'inactive')`,
    ),
    uniqueIndex("devices_device_id_unique").on(table.deviceId),
    index("devices_user_id_idx").on(table.userId),
  ],
);

export const dashboardPreferences = pgTable(
  "dashboard_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    timezone: text("timezone"),
    theme: text("theme").notNull().default("system"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "dashboard_preferences_theme_valid",
      sql`${table.theme} IN ('light', 'dark', 'system')`,
    ),
  ],
);

export const schema = {
  
  user,
  session,
  account,
  verification,
  rateLimit,
  soilTelemetry,
  devices,
  dashboardPreferences,
};
