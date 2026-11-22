-- Phase 2 — Initial schema with RLS
-- Eight tables: projects, analyses, files, edges, routes, explanations, file_roles, insights
-- All tables have org_id FK and RLS policies reading org claim from auth token

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (managed by Clerk, but we track it for FK references)
-- Note: Clerk manages organizations externally, we only store org_id for FKs
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects: top-level container for analyses
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analyses: a single analysis run on a repository
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_url TEXT NOT NULL,
    repository_branch TEXT DEFAULT 'main',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    coverage_report JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files: parsed files in an analysis
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    language TEXT,
    size_bytes INTEGER,
    loc INTEGER,
    hash TEXT, -- content hash for deduping
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edges: import relationships between files
CREATE TABLE edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    from_file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    to_file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL, -- static, dynamic, require, type-only
    specifier TEXT NOT NULL, -- the import specifier as written
    resolved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes: framework routes discovered in files
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    framework TEXT NOT NULL, -- nextjs, remix, etc.
    route_type TEXT NOT NULL, -- page, api, middleware, layout
    method TEXT, -- GET, POST, etc.
    path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explanations: AI-generated explanations for files
CREATE TABLE explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    detail TEXT,
    model TEXT NOT NULL,
    prompt_hash TEXT,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File roles: inferred roles for files (entry, route, component, util, config, test, etc.)
CREATE TABLE file_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- entry, route, component, utility, config, test, type, barrel, unknown
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights: cross-cutting insights about the codebase
CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, -- blast-radius, circular, fan-in, fan-out, unused, etc.
    title TEXT NOT NULL,
    description TEXT,
    payload JSONB NOT NULL,
    severity TEXT DEFAULT 'info', -- info, warning, critical
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_analyses_org_id ON analyses(org_id);
CREATE INDEX idx_analyses_project_id ON analyses(project_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_files_org_id ON files(org_id);
CREATE INDEX idx_files_analysis_id ON files(analysis_id);
CREATE INDEX idx_files_path ON files(path);
CREATE INDEX idx_edges_org_id ON edges(org_id);
CREATE INDEX idx_edges_analysis_id ON edges(analysis_id);
CREATE INDEX idx_edges_from_file ON edges(from_file_id);
CREATE INDEX idx_edges_to_file ON edges(to_file_id);
CREATE INDEX idx_routes_org_id ON routes(org_id);
CREATE INDEX idx_routes_analysis_id ON routes(analysis_id);
CREATE INDEX idx_routes_file_id ON routes(file_id);
CREATE INDEX idx_explanations_org_id ON explanations(org_id);
CREATE INDEX idx_explanations_analysis_id ON explanations(analysis_id);
CREATE INDEX idx_explanations_file_id ON explanations(file_id);
CREATE INDEX idx_file_roles_org_id ON file_roles(org_id);
CREATE INDEX idx_file_roles_analysis_id ON file_roles(analysis_id);
CREATE INDEX idx_file_roles_file_id ON file_roles(file_id);
CREATE INDEX idx_file_roles_role ON file_roles(role);
CREATE INDEX idx_insights_org_id ON insights(org_id);
CREATE INDEX idx_insights_analysis_id ON insights(analysis_id);
CREATE INDEX idx_insights_kind ON insights(kind);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Helper function to get organization ID from JWT claims
-- The token carries the org_id in the "org_id" claim (Clerk's default)
CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
BEGIN
    -- Try to get org_id from the JWT claims
    RETURN COALESCE(
        current_setting('request.jwt.claims.org_id', TRUE),
        current_setting('request.jwt.claims.org.id', TRUE),
        ''
    );
EXCEPTION WHEN OTHERS THEN
    RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations: users can only see their own organization
CREATE POLICY organizations_select ON organizations
    FOR SELECT USING (id = current_org_id());

-- Projects: users can only see projects in their organization
CREATE POLICY projects_select ON projects
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY projects_insert ON projects
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY projects_update ON projects
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY projects_delete ON projects
    FOR DELETE USING (org_id = current_org_id());

-- Analyses: users can only see analyses in their organization
CREATE POLICY analyses_select ON analyses
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY analyses_insert ON analyses
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY analyses_update ON analyses
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY analyses_delete ON analyses
    FOR DELETE USING (org_id = current_org_id());

-- Files: users can only see files in their organization
CREATE POLICY files_select ON files
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY files_insert ON files
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY files_update ON files
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY files_delete ON files
    FOR DELETE USING (org_id = current_org_id());

-- Edges: users can only see edges in their organization
CREATE POLICY edges_select ON edges
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY edges_insert ON edges
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY edges_update ON edges
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY edges_delete ON edges
    FOR DELETE USING (org_id = current_org_id());

-- Routes: users can only see routes in their organization
CREATE POLICY routes_select ON routes
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY routes_insert ON routes
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY routes_update ON routes
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY routes_delete ON routes
    FOR DELETE USING (org_id = current_org_id());

-- Explanations: users can only see explanations in their organization
CREATE POLICY explanations_select ON explanations
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY explanations_insert ON explanations
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY explanations_update ON explanations
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY explanations_delete ON explanations
    FOR DELETE USING (org_id = current_org_id());

-- File roles: users can only see file_roles in their organization
CREATE POLICY file_roles_select ON file_roles
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY file_roles_insert ON file_roles
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY file_roles_update ON file_roles
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY file_roles_delete ON file_roles
    FOR DELETE USING (org_id = current_org_id());

-- Insights: users can only see insights in their organization
CREATE POLICY insights_select ON insights
    FOR SELECT USING (org_id = current_org_id());

CREATE POLICY insights_insert ON insights
    FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY insights_update ON insights
    FOR UPDATE USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE POLICY insights_delete ON insights
    FOR DELETE USING (org_id = current_org_id());

-- ============================================================
-- SEED DATA (for dashboard empty state testing)
-- ============================================================

-- Note: In production, organizations are managed by Clerk.
-- We insert a placeholder that matches the Clerk org_id for testing.
-- The real org_id will come from Clerk at runtime.

-- Insert test organizations (these will be replaced by actual Clerk org IDs)
-- DO NOT use these IDs in production - they're for development only
INSERT INTO organizations (id, name, slug) VALUES
    ('org_test_1', 'Acme Corporation', 'acme-corp'),
    ('org_test_2', 'Globex Inc', 'globex-inc')
ON CONFLICT (id) DO NOTHING;

-- Insert a sample project for org_test_1
INSERT INTO projects (id, org_id, name, description)
SELECT uuid_generate_v4(), 'org_test_1', 'Main Website', 'Primary marketing website'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE org_id = 'org_test_1');

-- Insert a sample project for org_test_2
INSERT INTO projects (id, org_id, name, description)
SELECT uuid_generate_v4(), 'org_test_2', 'Internal Tools', 'Internal admin dashboard'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE org_id = 'org_test_2');

-- Insert sample analyses for org_test_1
INSERT INTO analyses (id, org_id, project_id, repository_url, repository_branch, status, created_at)
SELECT
    uuid_generate_v4(),
    'org_test_1',
    p.id,
    'https://github.com/acme/main-site',
    'main',
    'completed',
    NOW() - INTERVAL '2 days'
FROM projects p WHERE p.org_id = 'org_test_1' AND p.name = 'Main Website'
ON CONFLICT DO NOTHING;

INSERT INTO analyses (id, org_id, project_id, repository_url, repository_branch, status, created_at)
SELECT
    uuid_generate_v4(),
    'org_test_1',
    p.id,
    'https://github.com/acme/api',
    'main',
    'running',
    NOW() - INTERVAL '1 hour'
FROM projects p WHERE p.org_id = 'org_test_1' AND p.name = 'Main Website'
ON CONFLICT DO NOTHING;

-- Insert sample analyses for org_test_2
INSERT INTO analyses (id, org_id, project_id, repository_url, repository_branch, status, created_at)
SELECT
    uuid_generate_v4(),
    'org_test_2',
    p.id,
    'https://github.com/globex/admin-dashboard',
    'main',
    'completed',
    NOW() - INTERVAL '5 days'
FROM projects p WHERE p.org_id = 'org_test_2' AND p.name = 'Internal Tools'
ON CONFLICT DO NOTHING;

-- Grant permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;