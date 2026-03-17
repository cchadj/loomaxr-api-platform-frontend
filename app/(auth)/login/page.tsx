"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { DevBanner } from "@/components/layout/dev-banner";

const schema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, devMode, user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Redirect once a user session is active (covers both JWT and dev-mode login)
  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await login(values.username, values.password);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  if (loading) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 gap-4">
      {devMode && <DevBanner />}
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">ComfyUI Platform</CardTitle>
        </CardHeader>
        <CardContent>
          {devMode && (
            <p className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
              Backend is in dev mode — credentials are bypassed server-side.
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input id="username" autoComplete="username" {...register("username")} />
              {errors.username && <p className="text-xs text-red-600">{errors.username.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
