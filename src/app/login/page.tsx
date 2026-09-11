"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_ACCOUNTS = [
  { role: "Student", email: "cse20231@campus.edu" },
  { role: "Faculty", email: "faculty.cse@campus.edu" },
  { role: "HOD", email: "hod.cse@campus.edu" },
  { role: "Admin", email: "admin@campus.edu" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    const roleRoutes: Record<string, string> = {
      student: "/student",
      faculty: "/faculty",
      hod: "/faculty",
      admin: "/admin",
    };
    router.push(roleRoutes[data.user.role] || "/");
  }

  function quickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-4">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CampusOS AI</h1>
          <p className="text-campus-200 text-sm mt-1">Sign in to your portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@campus.edu"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-3">Demo accounts (password: password123)</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    onClick={() => quickLogin(a.email)}
                    className="text-xs rounded-full border border-campus-200 px-3 py-1 text-campus-700 hover:bg-campus-50 transition-colors"
                  >
                    {a.role}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-campus-200 text-sm mt-4">
          <Link href="/" className="hover:text-white transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
