"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthFormMode = "register" | "login" | "forgot" | "reset";

type AuthFormProps = {
  mode: AuthFormMode;
  resetToken?: string;
  notice?: string;
};

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-[#dce8df] bg-white px-4 text-sm text-[#102a43] outline-none transition placeholder:text-[#9aaa9e] focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-[#243b53]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          minLength={12}
          maxLength={128}
          className={`${inputClassName} pr-20`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#52715d] hover:bg-[#f0fdf4]"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthForm({ mode, resetToken, notice }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const hasPassword = mode === "register" || mode === "login" || mode === "reset";
  const title = {
    register: "Create your account",
    login: "Welcome back",
    forgot: "Reset your password",
    reset: "Choose a new password",
  }[mode];
  const description = {
    register: "Start keeping a closer eye on your soil.",
    login: "Sign in to your SoilMeter workspace.",
    forgot: "We’ll send a reset link if the address can receive email.",
    reset: "Choose a strong password you have not used before.",
  }[mode];

  function validate() {
    if (mode === "register" && name.trim().length < 2) {
      return "Enter your full name (at least 2 characters).";
    }
    if ((mode === "register" || mode === "login" || mode === "forgot") &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Enter a valid email address.";
    }
    if (mode === "register" && !acceptedTerms) {
      return "Accept the terms and conditions to create an account.";
    }
    if (mode === "register" || mode === "reset") {
      if (password.length < 12 || password.length > 128 ||
          !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return "Use 12–128 characters with an uppercase letter, a lowercase letter, and a number.";
      }
    }
    if (mode === "register" && password !== confirmPassword) {
      return "Your passwords do not match.";
    }
    if (mode === "login" && (!password || password.length > 128)) {
      return "Enter your password.";
    }
    if (mode === "reset" && !resetToken) {
      return "This password reset link is invalid or has expired. Request a new link.";
    }
    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    try {
      if (mode === "register") {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          termsAccepted: acceptedTerms,
        });
        if (result.error) {
          setError("We couldn’t create your account. Check your details and try again.");
          return;
        }
        router.replace("/login?registered=1");
        router.refresh();
        return;
      }

      if (mode === "login") {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          rememberMe,
          callbackURL: "/dashboard",
        });
        if (result.error) {
          setError("We couldn’t sign you in. Check your email and password, then try again.");
          return;
        }
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: "/reset-password",
        });
        if (result.error) {
          setError("We couldn’t process that request. Check your email configuration or try again later.");
          return;
        }
        setMessage("If an account can receive email at that address, a reset link is on its way.");
        return;
      }

      const result = await authClient.resetPassword({
        newPassword: password,
        token: resetToken!,
      });
      if (result.error) {
        setError("This reset link may have expired. Request a new password reset link.");
        return;
      }
      router.replace("/login?reset=1");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#14532d]">
          <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
            <path
              d="M12 20v-8m0 3c-4.5 0-7-2.5-7-7 4.5 0 7 2.5 7 7Zm0-3c0-4.5 2.5-7 7-7 0 4.5-2.5 7-7 7Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#102a43]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#627d6b]">{description}</p>
      </div>

      {notice && (
        <div role="status" className="mb-5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="mb-5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "register" && (
          <div>
            <label htmlFor="name" className="text-sm font-medium text-[#243b53]">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              className={inputClassName}
              placeholder="Your name"
            />
          </div>
        )}

        {(mode === "register" || mode === "login" || mode === "forgot") && (
          <div>
            <label htmlFor="email" className="text-sm font-medium text-[#243b53]">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
              className={inputClassName}
              placeholder="you@example.com"
            />
          </div>
        )}

        {hasPassword && (
          <PasswordInput
            id="password"
            label={mode === "reset" ? "New password" : "Password"}
            value={password}
            onChange={setPassword}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        )}

        {mode === "register" && (
          <>
            <PasswordInput
              id="confirm-password"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            <label className="flex items-start gap-3 text-sm leading-6 text-[#52675a]">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 size-4 rounded border-[#b8cbbd] accent-[#16a34a]"
              />
              <span>I accept the SoilMeter terms and conditions and privacy policy.</span>
            </label>
          </>
        )}

        {mode === "login" && (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-[#52675a]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-4 rounded border-[#b8cbbd] accent-[#16a34a]"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm font-semibold text-[#166534] hover:text-[#14532d]">
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#14532d] px-5 text-sm font-semibold text-white transition hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16a34a] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {pending && (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          )}
          {pending
            ? "Please wait…"
            : {
                register: "Create account",
                login: "Sign in",
                forgot: "Send reset link",
                reset: "Save new password",
              }[mode]}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#718074]">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#166534] hover:text-[#14532d]">
              Sign in
            </Link>
          </>
        ) : mode === "login" ? (
          <>
            New to SoilMeter?{" "}
            <Link href="/register" className="font-semibold text-[#166534] hover:text-[#14532d]">
              Create an account
            </Link>
          </>
        ) : (
          <Link href="/login" className="font-semibold text-[#166534] hover:text-[#14532d]">
            Back to sign in
          </Link>
        )}
      </p>
    </div>
  );
}
