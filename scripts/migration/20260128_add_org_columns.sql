-- ============================================
-- MIGRATION: Add missing columns to organizations table
-- Date: 2026-01-28
-- Author: Production Fix
-- ============================================
-- This migration adds:
-- 1. slug column (TEXT, UNIQUE) - for organization-friendly URLs
-- 2. active column (BOOLEAN, NOT NULL, DEFAULT true) - for activation status
-- ============================================

-- Start transaction for safety
BEGIN;

-- ============================================
-- 1. Add slug column if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'slug'
    ) THEN
        -- Add the column
        ALTER TABLE organizations ADD COLUMN slug TEXT;

        -- Generate slugs from existing organization names
        -- Remove special chars, convert to lowercase, replace spaces with hyphens
        UPDATE organizations
        SET slug = LOWER(REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(name, '[^a-zA-Z0-9\u00C0-\u00FF\s]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        ))
        WHERE slug IS NULL;

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

        -- Try to add unique constraint
        BEGIN
            ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);
        EXCEPTION WHEN unique_violation THEN
            -- Handle duplicates by appending UUID suffix
            WITH duplicates AS (
                SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
                FROM organizations
                WHERE slug IN (
                    SELECT slug FROM organizations GROUP BY slug HAVING COUNT(*) > 1
                )
            )
            UPDATE organizations o
            SET slug = d.slug || '-' || SUBSTRING(o.id::TEXT, 1, 8)
            FROM duplicates d
            WHERE o.id = d.id AND d.rn > 1;

            -- Try unique constraint again
            ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);
        END;

        RAISE NOTICE 'Column slug added successfully';
    ELSE
        RAISE NOTICE 'Column slug already exists';
    END IF;
END $$;

-- ============================================
-- 2. Add active column if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'active'
    ) THEN
        ALTER TABLE organizations ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Column active added successfully';
    ELSE
        RAISE NOTICE 'Column active already exists';
    END IF;
END $$;

-- ============================================
-- 3. Update any existing organizations that might have null values
-- ============================================
UPDATE organizations SET active = true WHERE active IS NULL;

-- ============================================
-- 4. Verify the changes
-- ============================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('slug', 'active')
ORDER BY column_name;

-- ============================================
-- 5. Sample data check
-- ============================================
SELECT id, name, slug, active
FROM organizations
LIMIT 5;

-- Commit transaction
COMMIT;

-- Success message
SELECT 'Migration completed successfully! Organizations table now has slug and active columns.' as status;
