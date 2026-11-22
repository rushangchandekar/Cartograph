"use client";

import { createContext, useContext, ReactNode, useState, useLayoutEffect } from "react";
import { useOrganization, useOrganizationList } from "@clerk/react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

interface OrgContextValue {
  organization: Organization | null;
  organizations: Organization[];
  setActiveOrganization: (orgId: string) => void;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { organization, isLoaded: orgLoaded } = useOrganization({ memberships: true });
  const { userMemberships, isLoaded: listLoaded, setActive } = useOrganizationList({ userMemberships: true });
  const isLoading = !orgLoaded || !listLoaded;
  const memberships = userMemberships.data ?? [];

  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <>{children}</>;
  }

  return (
    <OrgContext.Provider
      value={{
        organization: (organization as unknown as Organization) ?? null,
        organizations: memberships.map((m) => m.organization as unknown as Organization),
        setActiveOrganization: (orgId: string) => setActive?.({ organization: orgId }),
        isLoading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}