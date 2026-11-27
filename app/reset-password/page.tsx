import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Choose a new password | SoilMeter M1",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default function ResetPasswordPage(props: ResetPasswordPageProps) {
  return (
    <AuthLayout>
      <Suspense
        fallback={<p className="text-sm text-[#627d6b]">Loading password reset…</p>}
      >
        <ResetPasswordForm searchParams={props.searchParams} />
      </Suspense>
    </AuthLayout>
  );
}

async function ResetPasswordForm({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return <AuthForm mode="reset" resetToken={token} />;
}
