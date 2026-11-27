import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Sign in | SoilMeter v1",
};

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string;
    reset?: string;
  }>;
};

export default function LoginPage(props: LoginPageProps) {
  return (
    <AuthLayout>
      <Suspense
        fallback={<p className="text-sm text-[#627d6b]">Loading sign in…</p>}
      >
        <LoginForm searchParams={props.searchParams} />
      </Suspense>
    </AuthLayout>
  );
}

async function LoginForm({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const notice = params.registered
    ? "Account created. You can now sign in."
    : params.reset
      ? "Your password was updated. Sign in with your new password."
      : undefined;

  return <AuthForm mode="login" notice={notice} />;
}
