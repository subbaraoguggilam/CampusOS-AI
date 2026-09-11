"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, BusFront, GraduationCap } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PAYMENT_TYPES = [
  {
    id: "academic",
    name: "Pay Academic Fees",
    description: "Pay tuition fee, hostel fee and transport fees",
    icon: Landmark,
  },
  {
    id: "examination",
    name: "Pay Examination Fees",
    description: "Pay regular and supplementary examination fees",
    icon: GraduationCap,
  },
  {
    id: "transport",
    name: "Transport Registration",
    description: "Register for bus service and select seats",
    icon: BusFront,
  },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function SubscriptionPage() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [gatewayReady, setGatewayReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setGatewayReady(true);
    script.onerror = () => setMessage("Unable to load Razorpay checkout. Check your network and try again.");
    document.body.appendChild(script);

    return () => script.remove();
  }, []);

  async function subscribe(planId: string) {
    setLoading(planId);
    setMessage("");

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Unable to create payment order");

      if (data.demo) {
        const verifyResponse = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demo: true }),
        });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) throw new Error(verifyData.error || "Unable to activate subscription");
        setMessage("Demo mode: Payment recorded. Add Razorpay test keys to .env.local to use the test checkout.");
        return;
      }

      if (!gatewayReady || !window.Razorpay) {
        throw new Error("Payment gateway is still loading. Please try again.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "CampusOS AI",
        description: data.plan,
        order_id: data.orderId,
        handler: async (response: Record<string, string>) => {
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verifyData.error || "Payment verification failed");
            setMessage("Payment successful! Your subscription is now active.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification failed");
          } finally {
            setLoading(null);
          }
        },
        modal: { ondismiss: () => setLoading(null) },
        theme: { color: "#0070c4" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be started");
      setLoading(null);
    }
  }

  if (!user) return null;

  return (
    <DashboardLayout
      role="student"
      userName={user.name}
      title="Payments"
      subtitle="Select the type of fee to continue"
    >
      {message && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {PAYMENT_TYPES.map((payment) => { const Icon = payment.icon; return <Card key={payment.id} className="text-center"><CardHeader><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-campus-700"><Icon className="h-9 w-9" /></div><CardTitle className="text-base">{payment.name}</CardTitle></CardHeader><CardContent><p className="min-h-12 text-sm leading-6 text-gray-500">{payment.description}</p><Button className="mt-4 w-full" onClick={() => subscribe(payment.id)} disabled={loading === payment.id}><CreditCard className="h-4 w-4" />{loading === payment.id ? "Processing..." : "Continue"}</Button></CardContent></Card>; })}
      </div>
    </DashboardLayout>
  );
}
