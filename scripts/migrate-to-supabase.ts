/**
 * SQLite(dev.db) → Supabase(PostgreSQL) 데이터 마이그레이션 스크립트
 *
 * 사용법:
 *   1. .env에 SUPABASE_DATABASE_URL 설정
 *      예: SUPABASE_DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
 *   2. npx tsx scripts/migrate-to-supabase.ts
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

// 소스: SQLite (기존 DATABASE_URL 사용)
const sqlite = new PrismaClient();

// Supabase PostgreSQL 직접 연결
const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL;
if (!SUPABASE_URL) {
  console.error("❌ .env에 SUPABASE_DATABASE_URL을 설정해주세요.");
  console.error(
    '   예: SUPABASE_DATABASE_URL="postgresql://postgres.[ref]:[pw]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"'
  );
  process.exit(1);
}

async function run() {
  // ── 1. SQLite에서 전체 데이터 읽기 ──
  console.log("📖 SQLite 데이터 읽는 중...");

  const users = await sqlite.user.findMany();
  const locations = await sqlite.location.findMany();
  const teams = await sqlite.team.findMany();
  const employees = await sqlite.employee.findMany();
  const auditLogs = await sqlite.auditLog.findMany();

  console.log(
    `   User: ${users.length}, Location: ${locations.length}, Team: ${teams.length}, Employee: ${employees.length}, AuditLog: ${auditLogs.length}`
  );

  await sqlite.$disconnect();

  // ── 2. PostgreSQL에 연결 ──
  // pg 없이 fetch 기반 Supabase REST도 가능하지만,
  // 시퀀스 리셋 등을 위해 raw SQL이 필요하므로 pg 사용
  let pg: typeof import("pg");
  try {
    pg = await import("pg");
  } catch {
    console.error("❌ pg 패키지가 필요합니다. 설치해주세요:");
    console.error("   npm install pg @types/pg");
    process.exit(1);
  }

  const pool = new pg.default.Pool({ connectionString: SUPABASE_URL });
  const client = await pool.connect();

  try {
    console.log("🔗 Supabase PostgreSQL 연결됨");

    // ── 3. 테이블 생성 (없으면) ──
    console.log("🏗️  테이블 생성 중...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id          SERIAL PRIMARY KEY,
        email       TEXT NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        name        TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'EMPLOYEE',
        "pendingRole" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "Location" (
        id      SERIAL PRIMARY KEY,
        company TEXT NOT NULL,
        name    TEXT NOT NULL,
        type    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "Team" (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        "imageUrl"  TEXT,
        "imageStyle" TEXT,
        category    TEXT,
        "locationId" INT NOT NULL REFERENCES "Location"(id)
      );

      CREATE TABLE IF NOT EXISTS "AuditLog" (
        id          SERIAL PRIMARY KEY,
        action      TEXT NOT NULL,
        "userId"    INT NOT NULL,
        "targetType" TEXT NOT NULL,
        "targetId"  INT NOT NULL,
        detail      TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "Employee" (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        "nameEn"    TEXT,
        email       TEXT NOT NULL UNIQUE,
        phone       TEXT,
        "phoneWork" TEXT,
        "emailWork" TEXT,
        position    TEXT NOT NULL,
        role        TEXT NOT NULL,
        "teamId"    INT NOT NULL REFERENCES "Team"(id),
        "resumePath" TEXT,
        "photoUrl"  TEXT,
        "joinDate"  TEXT,
        "resumeData" TEXT,
        status      TEXT NOT NULL DEFAULT 'ACTIVE',
        "userId"    INT UNIQUE REFERENCES "User"(id),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── 4. 기존 데이터 삭제 (FK 순서 역순) ──
    console.log("🗑️  기존 데이터 초기화 중...");
    await client.query(`
      TRUNCATE "Employee", "AuditLog", "Team", "Location", "User" CASCADE;
    `);

    // ── 5. 데이터 삽입 ──
    console.log("📤 데이터 삽입 중...");

    // User
    for (const u of users) {
      await client.query(
        `INSERT INTO "User" (id, email, password, name, role, "pendingRole", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.id, u.email, u.password, u.name, u.role, u.pendingRole, u.createdAt]
      );
    }
    console.log(`   ✅ User: ${users.length}건`);

    // Location
    for (const l of locations) {
      await client.query(
        `INSERT INTO "Location" (id, company, name, type)
         VALUES ($1, $2, $3, $4)`,
        [l.id, l.company, l.name, l.type]
      );
    }
    console.log(`   ✅ Location: ${locations.length}건`);

    // Team
    for (const t of teams) {
      await client.query(
        `INSERT INTO "Team" (id, name, description, "imageUrl", "imageStyle", category, "locationId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          t.id,
          t.name,
          t.description,
          t.imageUrl,
          t.imageStyle,
          t.category,
          t.locationId,
        ]
      );
    }
    console.log(`   ✅ Team: ${teams.length}건`);

    // Employee
    for (const e of employees) {
      await client.query(
        `INSERT INTO "Employee" (id, name, "nameEn", email, phone, "phoneWork", "emailWork", position, role, "teamId", "resumePath", "photoUrl", "joinDate", "resumeData", status, "userId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          e.id,
          e.name,
          e.nameEn,
          e.email,
          e.phone,
          e.phoneWork,
          e.emailWork,
          e.position,
          e.role,
          e.teamId,
          e.resumePath,
          e.photoUrl,
          e.joinDate,
          e.resumeData,
          e.status,
          e.userId,
          e.createdAt,
          e.updatedAt,
        ]
      );
    }
    console.log(`   ✅ Employee: ${employees.length}건`);

    // AuditLog
    for (const a of auditLogs) {
      await client.query(
        `INSERT INTO "AuditLog" (id, action, "userId", "targetType", "targetId", detail, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          a.id,
          a.action,
          a.userId,
          a.targetType,
          a.targetId,
          a.detail,
          a.createdAt,
        ]
      );
    }
    console.log(`   ✅ AuditLog: ${auditLogs.length}건`);

    // ── 6. 시퀀스 리셋 (다음 INSERT가 올바른 ID부터 시작하도록) ──
    console.log("🔄 시퀀스 리셋 중...");
    const tables = ["User", "Location", "Team", "Employee", "AuditLog"];
    for (const table of tables) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('"${table}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${table}"), 0)
        );
      `);
    }

    console.log("\n🎉 마이그레이션 완료!");
    console.log("   Supabase에 모든 데이터가 이전되었습니다.");
  } catch (err) {
    console.error("❌ 마이그레이션 실패:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
