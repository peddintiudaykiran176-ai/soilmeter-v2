import "server-only";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/index";
import { schema } from "@/db/schema";
import { isEmailDeliveryConfigured, sendAuthEmail } from "@/lib/email";

type AuthEnvironment = {
  secret: string;
  baseURL: string;
  baseOrigin: string;
  clientIpHeader: string;
};

function getAuthEnvironment(): AuthEnvironment {
  const secret = process.env.BETTER_AUTH_SECRET;
  const configuredBaseURL = process.env.BETTER_AUTH_URL?.trim();
  const clientIpHeader =
    process.env.AUTH_CLIENT_IP_HEADER?.trim().toLowerCase() ?? "";

  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set to at least 32 characters.");
  }
  if (!configuredBaseURL) {
    throw new Error("BETTER_AUTH_URL must be set to the canonical application URL.");
  }
  if (clientIpHeader && !/^[a-z0-9-]+$/.test(clientIpHeader)) {
    throw new Error("AUTH_CLIENT_IP_HEADER must be a valid HTTP header name.");
  }

  let parsedBaseURL: URL;
  try {
    parsedBaseURL = new URL(configuredBaseURL);
  } catch {
    throw new Error(
      "BETTER_AUTH_URL must be a valid absolute URL, such as the HTTPS URL of your deployed app.",
    );
  }

  if (
    (parsedBaseURL.protocol !== "http:" &&
      parsedBaseURL.protocol !== "https:") ||
    (process.env.NODE_ENV === "production" &&
      parsedBaseURL.protocol !== "https:") ||
    parsedBaseURL.username ||
    parsedBaseURL.password ||
    parsedBaseURL.search ||
    parsedBaseURL.hash
  ) {
    throw new Error(
      "BETTER_AUTH_URL must be an absolute HTTP(S) URL without credentials, query parameters, or a fragment; production requires HTTPS.",
    );
  }

  return {
    secret,
    baseURL: parsedBaseURL.origin,
    baseOrigin: parsedBaseURL.origin,
    clientIpHeader,
  };
}

export function getAuthBaseOrigin() {
  return getAuthEnvironment().baseOrigin;
}

function validatePassword(password: unknown) {
  return (
    typeof password === "string" &&
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

function createAuth() {
  const { secret, baseURL, baseOrigin, clientIpHeader } = getAuthEnvironment();
  const trustedOrigins = [
    baseOrigin,
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000"]
      : []),
  ];

  return betterAuth({
    appName: "SoilMeter M1",
    baseURL,
    secret,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: "Reset your SoilMeter password",
          heading: "Reset your password",
          url,
          action: "Reset password",
        });
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
        termsAccepted: {
          type: "boolean",
          required: true,
          defaultValue: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      ipAddress: {
        ipAddressHeaders: [clientIpHeader || "x-forwarded-for"],
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path === "/sign-up/email") {
          const name = context.body?.name;
          const email = context.body?.email;
          if (
            typeof name !== "string" ||
            name.trim().length < 2 ||
            name.trim().length > 100 ||
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            context.body?.termsAccepted !== true
          ) {
            throw new APIError("BAD_REQUEST", {
              message: "Enter a valid name and email address, and accept the terms.",
            });
          }
          if (!validatePassword(context.body?.password)) {
            throw new APIError("BAD_REQUEST", {
              message:
                "Use 12–128 characters with at least one uppercase letter, lowercase letter, and number.",
            });
          }
        }

        if (
          context.path === "/reset-password" &&
          !validatePassword(context.body?.newPassword)
        ) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Use 12–128 characters with at least one uppercase letter, lowercase letter, and number.",
          });
        }

        if (context.path === "/request-password-reset") {
          if (!isEmailDeliveryConfigured()) {
            throw new APIError("SERVICE_UNAVAILABLE", {
              message: "Email delivery is temporarily unavailable.",
            });
          }
        }

        if (
          context.path === "/update-user" &&
          context.body?.termsAccepted === false
        ) {
          throw new APIError("BAD_REQUEST", {
            message: "Terms acceptance cannot be revoked from profile settings.",
          });
        }
      }),
    },
    plugins: [nextCookies()],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}
