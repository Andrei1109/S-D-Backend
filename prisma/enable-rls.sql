-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================
--
-- WHY: Without RLS, Supabase exposes all tables through its public PostgREST
--      API. Anyone with the public "anon" key can read/write/delete data
--      directly, bypassing the backend API entirely.
--
-- HOW: We enable RLS on every table and create NO policies.
--      No policies = no access through PostgREST (anon/authenticated roles).
--      Prisma connects as the "postgres" role which BYPASSES RLS, so the
--      backend continues to work normally.
--
-- RUN THIS: In Supabase Dashboard → SQL Editor → paste & run.
-- ============================================================================

-- Admin users (passwords, emails)
ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;

-- Product catalog
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subcategories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

-- Orders & payments (PII: names, addresses, phones, emails)
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;

-- Prisma migrations table (if it exists)
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFY: Run this to confirm RLS is enabled on all tables
-- ============================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public';
