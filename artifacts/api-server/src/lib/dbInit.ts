import { execSync } from "child_process";
import { resolve } from "path";
import { count } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";
import { logger } from "./logger";

const WORKSPACE_ROOT = resolve(process.cwd(), "../..");

function run(cmd: string) {
  logger.info(`[dbInit] ${cmd}`);
  execSync(cmd, { cwd: WORKSPACE_ROOT, stdio: "inherit" });
}

export async function initDb(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    logger.warn("[dbInit] DATABASE_URL not set — skipping DB init");
    return;
  }

  const isReplit = !!process.env["REPL_ID"];
  const isDev = process.env["NODE_ENV"] === "development";

  if (!isReplit && !isDev) {
    logger.info("[dbInit] Production env — schema & seed handled by deploy pipeline");
    return;
  }

  logger.info("[dbInit] Pushing schema...");
  try {
    run("pnpm --filter @workspace/db run push-force");
  } catch (err) {
    logger.error({ err }, "[dbInit] Schema push failed");
    throw err;
  }

  const [row] = await db.select({ n: count() }).from(businessesTable);
  const existing = row?.n ?? 0;

  if (existing > 0) {
    logger.info({ existing }, "[dbInit] DB already seeded — skipping seed");
    return;
  }

  logger.info("[dbInit] DB empty — seeding...");
  try {
    run("pnpm --filter @workspace/scripts run seed:all");
    logger.info("[dbInit] Seed complete");
  } catch (err) {
    logger.error({ err }, "[dbInit] Seed failed");
    throw err;
  }
}
