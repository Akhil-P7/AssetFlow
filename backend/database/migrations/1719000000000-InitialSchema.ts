import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration — creates all tables per Spec 01.
 * Uses TypeORM's synchronize: false approach with explicit SQL
 * to match the Postgres-specific features (CITEXT, TSTZRANGE,
 * exclusion constraints, partial unique indexes, triggers).
 */
export class InitialSchema1719000000000 implements MigrationInterface {
  name = 'InitialSchema1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────────────────────
    // 0. Extensions (also in docker/init-db.sql but safe to repeat)
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);

    // ──────────────────────────────────────────────────────
    // 1. Department (without FK to employee yet — circular ref)
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "department" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"                  VARCHAR(120) NOT NULL,
        "parent_department_id"  UUID,
        "department_head_id"    UUID,
        "status"                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_not_own_parent" CHECK (id <> parent_department_id),
        CONSTRAINT "fk_department_parent" FOREIGN KEY ("parent_department_id") REFERENCES "department"("id")
      )
    `);

    // ──────────────────────────────────────────────────────
    // 2. Employee
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employee" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"            VARCHAR(120) NOT NULL,
        "email"           VARCHAR(255) UNIQUE NOT NULL,
        "password_hash"   TEXT NOT NULL,
        "department_id"   UUID REFERENCES "department"("id"),
        "role"            VARCHAR(30) NOT NULL DEFAULT 'EMPLOYEE',
        "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Now add the department_head FK
    await queryRunner.query(`
      ALTER TABLE "department"
        ADD CONSTRAINT "fk_department_head" FOREIGN KEY ("department_head_id") REFERENCES "employee"("id")
    `);

    // ──────────────────────────────────────────────────────
    // 3. Refresh Token
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_token" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "employee_id"   UUID NOT NULL REFERENCES "employee"("id") ON DELETE CASCADE,
        "token_hash"    VARCHAR(255) UNIQUE NOT NULL,
        "expires_at"    TIMESTAMPTZ NOT NULL,
        "is_revoked"    BOOLEAN NOT NULL DEFAULT false,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ──────────────────────────────────────────────────────
    // 4. Asset Category
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset_category" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"          VARCHAR(120) NOT NULL UNIQUE,
        "custom_fields" JSONB NOT NULL DEFAULT '[]',
        "status"        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ──────────────────────────────────────────────────────
    // 5. Asset + sequence + indexes
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START 1`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "asset_tag"             VARCHAR(20) UNIQUE NOT NULL,
        "name"                  VARCHAR(160) NOT NULL,
        "category_id"           UUID NOT NULL REFERENCES "asset_category"("id"),
        "serial_number"         VARCHAR(120) UNIQUE,
        "acquisition_date"      DATE,
        "acquisition_cost"      NUMERIC(12,2),
        "condition"             VARCHAR(40) NOT NULL DEFAULT 'Good',
        "location"              VARCHAR(160),
        "department_id"         UUID REFERENCES "department"("id"),
        "is_bookable"           BOOLEAN NOT NULL DEFAULT FALSE,
        "status"                VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
        "qr_code_url"           TEXT,
        "photo_urls"            TEXT[] DEFAULT '{}',
        "document_urls"         TEXT[] DEFAULT '{}',
        "custom_field_values"   JSONB NOT NULL DEFAULT '{}',
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_asset_status" ON "asset"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_asset_category" ON "asset"("category_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_asset_department" ON "asset"("department_id")`);

    // ──────────────────────────────────────────────────────
    // 6. Allocation + partial unique index
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "allocation" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "asset_id"                UUID NOT NULL REFERENCES "asset"("id"),
        "employee_id"             UUID REFERENCES "employee"("id"),
        "department_id"           UUID REFERENCES "department"("id"),
        "allocated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expected_return_date"    DATE,
        "returned_at"             TIMESTAMPTZ,
        "return_condition_note"   TEXT,
        "status"                  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        "created_by"              UUID NOT NULL REFERENCES "employee"("id"),
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_holder_present" CHECK ("employee_id" IS NOT NULL OR "department_id" IS NOT NULL)
      )
    `);

    // Anti-double-allocation rule (Spec 01 §5.1)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_one_active_allocation_per_asset"
        ON "allocation" ("asset_id")
        WHERE status = 'ACTIVE'
    `);

    // ──────────────────────────────────────────────────────
    // 7. Transfer Request
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transfer_request" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "allocation_id"     UUID NOT NULL REFERENCES "allocation"("id"),
        "asset_id"          UUID NOT NULL REFERENCES "asset"("id"),
        "requested_by"      UUID NOT NULL REFERENCES "employee"("id"),
        "to_employee_id"    UUID REFERENCES "employee"("id"),
        "to_department_id"  UUID REFERENCES "department"("id"),
        "status"            VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
        "approved_by"       UUID REFERENCES "employee"("id"),
        "approved_at"       TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_transfer_target" CHECK ("to_employee_id" IS NOT NULL OR "to_department_id" IS NOT NULL)
      )
    `);

    // ──────────────────────────────────────────────────────
    // 8. Booking + exclusion constraint (Spec 01 §5.3)
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking" (
        "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "resource_id"               UUID NOT NULL REFERENCES "asset"("id"),
        "booked_by"                 UUID NOT NULL REFERENCES "employee"("id"),
        "booked_for_department_id"  UUID REFERENCES "department"("id"),
        "time_range"                TSTZRANGE NOT NULL,
        "status"                    VARCHAR(30) NOT NULL DEFAULT 'UPCOMING',
        "cancelled_reason"          TEXT,
        "created_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Overlap prevention (uses btree_gist extension)
    await queryRunner.query(`
      ALTER TABLE "booking"
        ADD CONSTRAINT "excl_no_overlap_per_resource"
        EXCLUDE USING gist (
          "resource_id" WITH =,
          "time_range" WITH &&
        ) WHERE (status IN ('UPCOMING', 'ONGOING'))
    `);

    // ──────────────────────────────────────────────────────
    // 9. Maintenance Request
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "maintenance_request" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "asset_id"          UUID NOT NULL REFERENCES "asset"("id"),
        "raised_by"         UUID NOT NULL REFERENCES "employee"("id"),
        "issue_description" TEXT NOT NULL,
        "priority"          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        "photo_url"         TEXT,
        "status"            VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "approved_by"       UUID REFERENCES "employee"("id"),
        "technician_name"   VARCHAR(120),
        "resolved_at"       TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_maintenance_asset" ON "maintenance_request"("asset_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_maintenance_status" ON "maintenance_request"("status")`);

    // ──────────────────────────────────────────────────────
    // 10. Audit Cycle + Assignment + Result
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_cycle" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "scope_department_id"   UUID REFERENCES "department"("id"),
        "scope_location"        VARCHAR(160),
        "start_date"            DATE NOT NULL,
        "end_date"              DATE NOT NULL,
        "status"                VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        "created_by"            UUID NOT NULL REFERENCES "employee"("id"),
        "closed_at"             TIMESTAMPTZ,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_date_range" CHECK ("end_date" >= "start_date")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_assignment" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "audit_cycle_id"    UUID NOT NULL REFERENCES "audit_cycle"("id"),
        "auditor_id"        UUID NOT NULL REFERENCES "employee"("id"),
        UNIQUE ("audit_cycle_id", "auditor_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_result" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "audit_cycle_id"    UUID NOT NULL REFERENCES "audit_cycle"("id"),
        "asset_id"          UUID NOT NULL REFERENCES "asset"("id"),
        "result"            VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "notes"             TEXT,
        "verified_by"       UUID REFERENCES "employee"("id"),
        "verified_at"       TIMESTAMPTZ,
        UNIQUE ("audit_cycle_id", "asset_id")
      )
    `);

    // Trigger: prevent editing results of closed audit cycles (Spec 01 §7)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_closed_audit_edit() RETURNS TRIGGER AS $$
      BEGIN
        IF (SELECT status FROM audit_cycle WHERE id = OLD.audit_cycle_id) = 'CLOSED' THEN
          RAISE EXCEPTION 'Cannot modify results of a closed audit cycle';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_lock_closed_audit
        BEFORE UPDATE ON "audit_result"
        FOR EACH ROW EXECUTE FUNCTION prevent_closed_audit_edit()
    `);

    // ──────────────────────────────────────────────────────
    // 11. Notification
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipient_id"  UUID NOT NULL REFERENCES "employee"("id"),
        "type"          VARCHAR(60) NOT NULL,
        "payload"       JSONB NOT NULL DEFAULT '{}',
        "read_at"       TIMESTAMPTZ,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notification_recipient_unread"
        ON "notification"("recipient_id")
        WHERE "read_at" IS NULL
    `);

    // ──────────────────────────────────────────────────────
    // 12. Activity Log
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_log" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id"      UUID REFERENCES "employee"("id"),
        "action"        VARCHAR(80) NOT NULL,
        "entity_type"   VARCHAR(60) NOT NULL,
        "entity_id"     UUID NOT NULL,
        "metadata"      JSONB NOT NULL DEFAULT '{}',
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_activity_entity" ON "activity_log"("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_activity_actor" ON "activity_log"("actor_id")`);

    // ──────────────────────────────────────────────────────
    // 13. Auto-update trigger for updated_at columns
    // ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    const tablesWithUpdatedAt = [
      'department', 'employee', 'asset_category', 'asset',
      'allocation', 'transfer_request', 'booking',
      'maintenance_request', 'audit_cycle',
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_updated_at"
          BEFORE UPDATE ON "${table}"
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    const tables = [
      'activity_log', 'notification', 'audit_result', 'audit_assignment',
      'audit_cycle', 'maintenance_request', 'booking', 'transfer_request',
      'allocation', 'asset', 'asset_category', 'refresh_token', 'employee', 'department',
    ];

    // Drop triggers first
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_lock_closed_audit" ON "audit_result"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_closed_audit_edit()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`);

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    await queryRunner.query(`DROP SEQUENCE IF EXISTS asset_tag_seq`);
  }
}
