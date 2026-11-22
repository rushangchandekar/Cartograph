"use client";

import { useOrganizationList } from "@clerk/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function SelectOrg() {
  const { userMemberships, isLoaded, createOrganization, setActive } = useOrganizationList({
    userMemberships: true,
  });
  const router = useRouter();

  useEffect(() => {
    // If user has only one org, auto-select it
    if (isLoaded && userMemberships.data && userMemberships.data.length === 1) {
      setActive?.({ organization: userMemberships.data[0].organization.id });
      router.push("/dashboard");
    }
  }, [isLoaded, userMemberships.data, setActive, router]);

  const handleCreateOrg = async () => {
    if (!createOrganization || !setActive) return;
    try {
      const org = await createOrganization({ name: "New Organization" });
      if (org) {
        setActive({ organization: org.id });
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-zinc-500">Loading…</div>
      </div>
    );
  }

  const memberships = userMemberships.data ?? [];

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">Select Organization</h1>

        {memberships.length > 0 && (
          <div className="space-y-3 mb-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
              Choose an organization to continue
            </p>
            {memberships.map((membership) => (
              <button
                key={membership.id}
                onClick={() => {
                  setActive?.({ organization: membership.organization.id });
                  router.push("/dashboard");
                }}
                className="w-full flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {membership.organization.imageUrl && (
                    <img
                      src={membership.organization.imageUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{membership.organization.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {membership.organization.slug}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
          <button
            onClick={handleCreateOrg}
            className="w-full flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create new organization
          </button>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
            Or <Link href="/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">go back</Link>
          </p>
        </div>
      </div>
    </div>
  );
}