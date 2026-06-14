import { count } from "drizzle-orm";
import { db, peopleTable, tasksTable } from "@workspace/db";

const PEOPLE = [
  {
    name: "Ассистент",
    role: "Ассистент",
    groupLabel: "Операционный штаб",
    isInnerCircle: true,
    isAssistant: true,
  },
  {
    name: "Зам / развитие",
    role: "Зам / развитие",
    groupLabel: "Операционный штаб",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Методолог",
    role: "Методолог",
    groupLabel: "Операционный штаб",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Юрист",
    role: "Юрист",
    groupLabel: "Правовое поле",
    isInnerCircle: false,
    isAssistant: false,
  },
  {
    name: "Юрист-партнёр",
    role: "Юрист-партнёр",
    groupLabel: "Правовое поле",
    isInnerCircle: false,
    isAssistant: false,
  },
  {
    name: "Безопасность",
    role: "Безопасность",
    groupLabel: "Безопасность",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "IT-директор",
    role: "IT-директор",
    groupLabel: "Технологии",
    isInnerCircle: false,
    isAssistant: false,
  },
  {
    name: "ИО коммерческого",
    role: "ИО коммерческого",
    groupLabel: "Коммерция",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Финдиректор",
    role: "Финдиректор",
    groupLabel: "Финансы",
    isInnerCircle: true,
    isAssistant: false,
  },
  {
    name: "Внешний партнёр",
    role: "Внешний партнёр",
    groupLabel: "Внешние",
    isInnerCircle: false,
    isAssistant: false,
  },
];

async function seed() {
  const [row] = await db.select({ n: count() }).from(peopleTable);
  if ((row?.n ?? 0) > 0) {
    console.log(`People already seeded (${row!.n} rows) — skipping.`);
    process.exit(0);
  }

  console.log("Seeding people (roles only, no real names)...");
  for (const p of PEOPLE) {
    const [ins] = await db.insert(peopleTable).values(p).returning();
    const ic = ins!.isInnerCircle ? " ★" : "";
    const ast = ins!.isAssistant ? " [default]" : "";
    console.log(`  ${ins!.id}: ${ins!.role}${ic}${ast}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
