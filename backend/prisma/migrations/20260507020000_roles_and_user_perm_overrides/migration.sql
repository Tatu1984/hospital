-- Move RBAC roles into the database and add per-user permission overrides.
--
-- Before this migration, roles were a TypeScript union in src/rbac.ts and
-- their permission lists were a hardcoded ROLE_PERMISSIONS map. This
-- locked admins out of creating new roles or tweaking existing ones —
-- changes required a code change + redeploy.
--
-- After: roles are rows in the `roles` table. The seeded system roles
-- (ADMIN, DOCTOR, NURSE, ...) are auto-inserted on first boot from the
-- hardcoded defaults, with isSystem=true so admins can't delete them.
-- Custom roles are UUIDs created through the admin UI.
--
-- Per-user overrides: extraPermissions and revokedPermissions arrays on
-- the User row let admins grant or deny a single permission for one user
-- without creating a whole new role. Revoke wins over grant.

CREATE TABLE IF NOT EXISTS "roles" (
  "id"          TEXT          PRIMARY KEY,
  "tenantId"    TEXT,
  "name"        TEXT          NOT NULL,
  "description" TEXT,
  "permissions" TEXT[]        NOT NULL DEFAULT '{}',
  "isSystem"    BOOLEAN       NOT NULL DEFAULT false,
  "isActive"    BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "roles_tenant_idx" ON "roles"("tenantId");

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "extraPermissions"   TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "revokedPermissions" TEXT[] NOT NULL DEFAULT '{}';
