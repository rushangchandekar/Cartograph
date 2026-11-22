import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId, orgId, orgRole } = await auth();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Cartograph
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Dependency map for public GitHub repos. Sign in to get started.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row w-full max-w-md">
          {userId ? (
            <Link
              href="/dashboard"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-white transition-colors hover:bg-zinc-700 md:w-[158px]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-white transition-colors hover:bg-zinc-700 md:w-[158px]"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-zinc-300 px-5 transition-colors hover:border-transparent hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 md:w-[158px]"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
        {userId && (
          <div className="mt-8 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
            <p>User ID: {userId}</p>
            {orgId && <p>Organization: {orgId} ({orgRole})</p>}
          </div>
        )}
      </main>
    </div>
  );
}