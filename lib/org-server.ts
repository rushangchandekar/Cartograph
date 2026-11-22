/**
 * Server-only organization helpers.
 */
import { auth as serverAuth } from "@clerk/nextjs/server";

export async function getServerOrg() {
  const { orgId } = await serverAuth();
  if (!orgId) return { orgId: null, organization: null };

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({ organizationId: orgId });

  return { orgId, organization };
}