import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

const PLANS: Record<string, { amount: number; name: string }> = {
  academic: { amount: 49900, name: "Academic Fees" },
  examination: { amount: 99900, name: "Examination Fees" },
  transport: { amount: 249900, name: "Transport Registration" },
};

export async function POST(req: NextRequest) {
  const session = await requireAuth(["student", "faculty", "hod", "admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  const planDetails = PLANS[plan];
  if (!planDetails) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  const hasPlaceholderKeys =
    !keyId ||
    !keySecret ||
    keyId === "rzp_test_your_key_id" ||
    keySecret === "your-razorpay-test-key-secret";

  if (hasPlaceholderKeys) {
    return NextResponse.json(
      {
        error: "Razorpay not configured",
        demo: true,
        orderId: `demo_order_${uuid().slice(0, 8)}`,
        amount: planDetails.amount,
        currency: "INR",
        plan: planDetails.name,
      },
      { status: 200 }
    );
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: planDetails.amount,
      currency: "INR",
      receipt: `rcpt_${uuid().slice(0, 8)}`,
      notes: { plan, userId: session.id },
    });

    await db.insert(subscriptions).values({
      id: uuid(),
      userId: session.id,
      plan,
      razorpayOrderId: order.id,
      amount: planDetails.amount,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      orderId: order.id,
      amount: planDetails.amount,
      currency: "INR",
      keyId,
      plan: planDetails.name,
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return NextResponse.json(
      { error: "Razorpay could not create the order. Check your test keys and account settings." },
      { status: 502 }
    );
  }
}
