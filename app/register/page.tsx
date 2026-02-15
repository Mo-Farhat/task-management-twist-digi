"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import NextLink from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ["Passwords do not match"] });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setFieldErrors(data.errors);
        setError(data.error || "Registration failed");
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
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-default-500 text-sm">Start managing your tasks securely</p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={name}
              onValueChange={setName}
              isInvalid={!!fieldErrors.name}
              errorMessage={fieldErrors.name?.join(", ")}
              isRequired
              autoComplete="name"
              id="register-name"
            />

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
              id="register-email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min 8 chars, uppercase, lowercase, digit"
              value={password}
              onValueChange={setPassword}
              isInvalid={!!fieldErrors.password}
              errorMessage={fieldErrors.password?.join(", ")}
              isRequired
              autoComplete="new-password"
              id="register-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              isInvalid={!!fieldErrors.confirmPassword}
              errorMessage={fieldErrors.confirmPassword?.join(", ")}
              isRequired
              autoComplete="new-password"
              id="register-confirm-password"
            />

            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              className="w-full mt-2"
              size="lg"
              id="register-submit"
            >
              Create Account
            </Button>

            <p className="text-center text-sm text-default-500">
              Already have an account?{" "}
              <Link as={NextLink} href="/login" size="sm">
                Sign in
              </Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
