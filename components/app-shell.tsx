"use client";

import { ThemeProvider } from "@/lib/theme-provider";
import { OrgProvider } from "@/lib/org-context";
import { OrgSwitcher } from "@/components/org-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  Show,
} from "@clerk/react";
import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <OrgProvider>
        <div className="flex h-full flex-col">
          <header className="flex h-12 items-center justify-between gap-3 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Cartograph
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton mode="modal" />
                <SignUpButton mode="modal" />
              </Show>
              <Show when="signed-in">
                <OrgSwitcher />
                <ThemeToggle />
                <UserButton showName={false} />
              </Show>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </OrgProvider>
    </ThemeProvider>
  );
}