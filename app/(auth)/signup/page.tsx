"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "../actions";

export default function SignupPage() {
  const [role, setRole] = useState<"user" | "company">("user");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    setSuccess("");
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else if (result?.success) {
      setSuccess(result.success);
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Join Mantis as a company or user
        </p>
      </div>

      <form action={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm text-primary">
            {success}
          </div>
        )}

        {/* Role selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            I am a…
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(["user", "company"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-md border px-4 py-2.5 text-sm font-medium capitalize transition-all ${
                  role === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <input type="hidden" name="role" value={role} />
        </div>

        {role === "company" && (
          <div className="space-y-1.5">
            <Label htmlFor="company_name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Company name
            </Label>
            <Input
              id="company_name"
              name="company_name"
              placeholder="Acme Corp"
              required={role === "company"}
              className="bg-input border-border focus-visible:ring-primary h-10"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="bg-input border-border focus-visible:ring-primary h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Min. 6 characters"
            minLength={6}
            required
            className="bg-input border-border focus-visible:ring-primary h-10"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-primary transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
