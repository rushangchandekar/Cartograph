"use client";

import { useOrganization, useOrganizationList } from "@clerk/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OrgSwitcher() {
  const { organization, isLoaded: orgLoaded } = useOrganization({ memberships: true });
  const { userMemberships, isLoaded: listLoaded, setActive } = useOrganizationList({ userMemberships: true });

  if (!orgLoaded || !listLoaded) {
    return <SelectTrigger className="w-[180px] text-sm" disabled>Loading…</SelectTrigger>;
  }

  const memberships = userMemberships.data ?? [];

  return (
    <Select value={organization?.id ?? ""} onValueChange={(orgId) => setActive({ organization: orgId })}>
      <SelectTrigger className="w-[180px] text-sm">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((membership) => (
          <SelectItem key={membership.id} value={membership.organization.id}>
            {membership.organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}