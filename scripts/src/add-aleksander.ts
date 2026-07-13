/**
 * One-time migration: add Александр (GR-директор) to the people table.
 * Safe to re-run — skips if already present.
 */
import { eq } from "drizzle-orm";
import { db, peopleTable } from "@workspace/db";

async function main() {
  const existing = await db
    .select()
    .from(peopleTable)
    .where(eq(peopleTable.name, "Александр"));

  if (existing.length > 0) {
    console.log(`Александр already exists (id=${existing[0]!.id}) — skipping.`);
    process.exit(0);
  }

  const [ins] = await db
    .insert(peopleTable)
    .values({
      name: "Александр",
      role: "GR-директор",
      groupLabel: "Внешние связи",
      isInnerCircle: true,
      isAssistant: false,
      cLevel: "GR",
    })
    .returning();

  console.log(`✓ Inserted Александр (GR-директор), id=${ins!.id}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
