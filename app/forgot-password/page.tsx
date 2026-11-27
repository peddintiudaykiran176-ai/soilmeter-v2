import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Reset password | SoilMeter M1",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <AuthForm mode="forgot" />
    </AuthLayout>
  );
}
