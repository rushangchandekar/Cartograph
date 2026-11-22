import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseClientWithToken } from "@/lib/supabase-client";

interface AnalysisRow {
    id: string;
    project_id: string;
    repository_url: string;
    repository_branch: string;
    status: string;
    coverage_report: unknown;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    projects: {
        name: string;
    } | null;
}

interface SupabaseAnalysisRow {
    id: string;
    project_id: string;
    repository_url: string;
    repository_branch: string;
    status: string;
    coverage_report: unknown;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    projects: Array<{ name: string }> | null;
}

export default async function Dashboard() {
    const { userId, orgId, orgRole } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    if (!orgId) {
        redirect("/select-org");
    }

    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const organization = orgId ? await client.organizations.getOrganization({ organizationId: orgId }) : null;

    // Fetch analyses for this organization using RLS
    const supabase = await getSupabaseClientWithToken();
    const { data: analyses, error } = await supabase
        .from("analyses")
        .select(`
            id,
            project_id,
            repository_url,
            repository_branch,
            status,
            coverage_report,
            error_message,
            started_at,
            completed_at,
            created_at,
            updated_at,
            projects!inner(name)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to fetch analyses:", error);
    }

    const analysesData = (analyses as SupabaseAnalysisRow[]) ?? [];

    return (
        <div className="flex h-full flex-col p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                    Org: {organization?.name ?? orgId} ({orgRole})
                </div>
            </div>

            {analysesData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                    <svg className="h-12 w-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="text-lg font-medium mb-2">No analyses yet</h2>
                    <p className="text-sm max-w-xs text-center">
                        Your team hasn't run any repository analyses yet.
                        When you do, they'll appear here with their status and coverage.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {analysesData.map((analysis) => (
                        <AnalysisCard key={analysis.id} analysis={analysis} />
                    ))}
                </div>
            )}
        </div>
    );
}

function AnalysisCard({ analysis }: { analysis: SupabaseAnalysisRow }) {
    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    const statusLabels: Record<string, string> = {
        pending: "Pending",
        running: "Running",
        completed: "Completed",
        failed: "Failed",
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const repoName = analysis.repository_url.split("/").slice(-2).join("/");
    const projectName = analysis.projects?.[0]?.name ?? "—";

    return (
        <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {repoName}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[analysis.status] ?? "bg-zinc-100 text-zinc-800"}`}>
                        {statusLabels[analysis.status] ?? analysis.status}
                    </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>Branch: {analysis.repository_branch}</span>
                    <span>Project: {projectName}</span>
                    <span>Created: {formatDate(analysis.created_at)}</span>
                    {analysis.completed_at && (
                        <span>Completed: {formatDate(analysis.completed_at)}</span>
                    )}
                    {analysis.error_message && (
                        <span className="text-red-600 dark:text-red-400">Error: {analysis.error_message}</span>
                    )}
                </div>
            </div>
        </div>
    );
}