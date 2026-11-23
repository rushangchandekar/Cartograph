import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseClientWithToken } from "@/lib/supabase-client";
import styles from "./dashboard.module.css";

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
            projects(name)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to fetch analyses:", JSON.stringify(error, null, 2));
    }

    const analysesData = (analyses as SupabaseAnalysisRow[]) ?? [];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <div className={styles.orgBadge}>
                    <span className={styles.orgLabel}>Org</span>
                    <span className={styles.orgValue}>{organization?.name ?? orgId}</span>
                    <span className={styles.orgRole}>{orgRole}</span>
                </div>
            </header>

            {analysesData.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M9 12h6M9 16h6M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 8v8M15 8v8" strokeLinecap="round" />
                    </svg>
                    <h2 className={styles.emptyTitle}>No analyses</h2>
                    <p className={styles.emptyDesc}>
                        Your team has not run any repository analyses yet.
                        <br />
                        <span className={styles.emptyHint}>Run an analysis from the CLI or API to populate this list.</span>
                    </p>
                </div>
            ) : (
                <div className={styles.list} role="list">
                    {analysesData.map((analysis) => (
                        <AnalysisCard key={analysis.id} analysis={analysis} />
                    ))}
                </div>
            )}
        </div>
    );
}

function AnalysisCard({ analysis }: { analysis: SupabaseAnalysisRow }) {
    const repoName = analysis.repository_url.split("/").slice(-2).join("/");
    const projectName = analysis.projects?.[0]?.name ?? "—";

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    return (
        <article className={styles.card} role="listitem">
            <div className={styles.cardMain}>
                <div className={styles.repoRow}>
                    <span className={styles.repoName}>{repoName}</span>
                    <span className={styles.branch}>@{analysis.repository_branch}</span>
                    <span className={`${styles.status} ${styles[analysis.status]}`}>
                        {analysis.status}
                    </span>
                </div>
                <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>Project</span>
                        <span className={styles.metaValue}>{projectName}</span>
                    </span>
                    <span className={styles.metaItem}>
                        <span className={styles.metaLabel}>Created</span>
                        <span className={styles.metaValue}>{formatDate(analysis.created_at)}</span>
                    </span>
                    {analysis.completed_at && (
                        <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Completed</span>
                            <span className={styles.metaValue}>{formatDate(analysis.completed_at)}</span>
                        </span>
                    )}
                    {analysis.error_message && (
                        <span className={styles.metaItem} style={{ gridColumn: "1 / -1" }}>
                            <span className={styles.errorLabel}>Error</span>
                            <span className={styles.errorValue}>{analysis.error_message}</span>
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}