import { db, tasksTable, peopleTable } from "@workspace/db";

const DEMO_TITLES = [
  "[DEMO-PM] Не принята — требует реакции",
  "[DEMO-PM] В работе — зависла без движения",
  "[DEMO-PM] Критическая задержка — нужна эскалация",
];

async function main() {
  const allTasks = await db.select({ title: tasksTable.title }).from(tasksTable);
  const existing = new Set(allTasks.map(t => t.title));
  const missing  = DEMO_TITLES.filter(t => !existing.has(t));

  if (missing.length === 0) {
    console.log("Demo stuck tasks already seeded — skipping");
    return;
  }

  const people = await db.select().from(peopleTable);
  if (people.length === 0) {
    console.error("No people in DB — run seed:tasks first");
    process.exit(1);
  }
  const assignee = people[0]!;

  const now = Date.now();
  const configs: [string, Date, "sent" | "in_progress"][] = [
    [DEMO_TITLES[0]!, new Date(now - 10 * 3_600_000), "sent"],
    [DEMO_TITLES[1]!, new Date(now - 30 * 3_600_000), "in_progress"],
    [DEMO_TITLES[2]!, new Date(now - 52 * 3_600_000), "in_progress"],
  ];

  for (const [title, lastActivityAt, status] of configs) {
    if (!existing.has(title)) {
      await db.insert(tasksTable).values({
        title,
        body: "Демонстрационная задача для ИИ-PM монитора C5.",
        assigneeId: assignee.id,
        watchers: [],
        priority: "medium",
        status,
        createdBy: "owner",
        lastActivityAt,
      });
      console.log(`Inserted: ${title}`);
    }
  }
  console.log("Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
