/**
 * Database Migration Runner
 *
 * Runs SQL migration files against the database
 * Usage: pnpm migrate [optional: specific migration file]
 * Example: pnpm migrate 015_identity_providers.sql
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

// Error codes that indicate the object already exists (safe to skip)
const SKIP_ERROR_CODES = [
  "42P07", // duplicate_table
  "42710", // duplicate_object
  "42P16", // invalid_table_definition (constraint already exists)
  "23505", // unique_violation (for some cases)
];

async function runMigrations() {
  console.log("🚀 Running database migrations...\n");

  // Check if a specific migration file was requested
  const specificFile = process.argv[2];

  try {
    // Get all SQL files, sorted by name
    let files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // If specific file requested, only run that one
    if (specificFile) {
      if (!files.includes(specificFile)) {
        console.error(`❌ Migration file not found: ${specificFile}`);
        console.log("Available migrations:", files.join(", "));
        process.exit(1);
      }
      files = [specificFile];
      console.log(`🎯 Running specific migration: ${specificFile}\n`);
    }

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      console.log(`📄 Running: ${file}`);

      try {
        await pool.query(sql);
        console.log(`   ✅ Success\n`);
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        // Check if this is a "skip-safe" error
        if (
          (error.code && SKIP_ERROR_CODES.includes(error.code)) ||
          error.message?.includes("already exists") ||
          error.message?.includes("duplicate key")
        ) {
          console.log(`   ⏭️  Skipped (already exists)\n`);
        } else if (error.code === "42501") {
          // Permission denied - likely Neon with existing tables
          console.log(
            `   ⚠️  Permission warning (tables may already exist via Prisma)\n`
          );
          if (specificFile) {
            // If running specific migration, this is a real error
            throw error;
          }
          // Otherwise continue to next migration
        } else {
          throw error;
        }
      }
    }

    console.log("✅ All migrations complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
