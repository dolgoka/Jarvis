import { count } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";

const NOTES = [
  {
    body: "Пересмотреть структуру холдинга — вынести операционные активы Азии в отдельный контур. Требует юридической проработки.",
    source: "text" as const,
    pinned: true,
  },
  {
    body: "AutoDrive Systems: runway тает, нужно либо bridge-финансирование до конца квартала, либо стоп. Подготовить сценарный анализ.",
    source: "text" as const,
    pinned: true,
  },
  {
    body: "Разогнать идею с единым дашбордом для менеджеров — они видят только свой узел, а не портфель целиком. Хорошая точка роста.",
    source: "voice" as const,
    pinned: false,
  },
  {
    body: "SilkRoad: контракты под угрозой — возможно, стоит рассмотреть M&A как выход вместо спасения операционки.",
    source: "text" as const,
    pinned: false,
  },
  {
    body: "Северный Капитал: задержка регулятора затягивается. Уточнить у юриста возможность параллельного старта через партнёрскую структуру.",
    source: "voice" as const,
    pinned: false,
  },
];

export async function seedNotes() {
  const [row] = await db.select({ n: count() }).from(notesTable);
  const existing = row?.n ?? 0;

  if (existing > 0) {
    console.log(`Notes: already seeded (${existing} rows) — skipping`);
    return;
  }

  console.log("Seeding notes...");
  for (const note of NOTES) {
    await db.insert(notesTable).values(note);
    console.log(`  + ${note.body.slice(0, 60)}…`);
  }
  console.log("Notes seeded.");
}

async function main() {
  await seedNotes();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
