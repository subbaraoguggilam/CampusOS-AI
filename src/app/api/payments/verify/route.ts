import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, demo } =
    await req.json();

  if (demo) {
    await db
      .update(users)
      .set({ subscriptionStatus: "pro" })
      .where(eq(users.id, session.id));
    return NextResponse.json({ success: true, message: "Demo payment verified" });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpayOrderId, razorpay_order_id));

  if (!sub || sub.userId !== session.id) {
    return NextResponse.json({ error: "Payment order does not belong to this account" }, { status: 403 });
  }

  await db
    .update(subscriptions)
    .set({ status: "completed", razorpayPaymentId: razorpay_payment_id })
    .where(eq(subscriptions.razorpayOrderId, razorpay_order_id));

  await db
    .update(users)
    .set({ subscriptionStatus: sub.plan })
    .where(eq(users.id, session.id));

  return NextResponse.json({ success: true, message: "Payment verified successfully" });
}
