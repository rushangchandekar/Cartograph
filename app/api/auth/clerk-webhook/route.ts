import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkWebhookEvent;

  try {
    const verified = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
    evt = verified as unknown as ClerkWebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle organization events
  if (evt.type === "organizationInvitation.created") {
    // Invitation created - user will receive email from Clerk
    console.log("Organization invitation created:", evt.data);
  }

  return NextResponse.json({ received: true });
}