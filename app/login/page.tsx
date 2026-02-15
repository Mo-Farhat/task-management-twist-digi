"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import NextLink from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setFieldErrors(data.errors);
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 px-6 pt-6">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-default-500 text-sm">Sign in to your account</p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onValueChange={setEmail}
              isInvalid={!!fieldErrors.email}
              errorMessage={fieldErrors.email?.join(", ")}
              isRequired
              autoComplete="email"
              id="login-email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onValueChange={setPassword}
              isInvalid={!!fieldErrors.password}
              errorMessage={fieldErrors.password?.join(", ")}
              isRequired
              autoComplete="current-password"
              id="login-password"
            />

            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              className="w-full mt-2"
              size="lg"
              id="login-submit"
            >
              Sign In
            </Button>

            <p className="text-center text-sm text-default-500">
              Don&apos;t have an account?{" "}
              <Link as={NextLink} href="/register" size="sm">
                Sign up
              </Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
