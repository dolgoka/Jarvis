import { db, peopleTable, feedItemsTable, businessesTable } from "@workspace/db";

const PEOPLE = [
  { name: "Анна Петрова",     shortName: "Аня",    role: "Финансовый директор" },
  { name: "Александр Смирнов", shortName: "Саша",  role: "Коммерческий директор" },
  { name: "Николай Смирнов",  shortName: "Коля",   role: "Операционный директор" },
  { name: "Татьяна Орлова",   shortName: "Таня",   role: "Главный бухгалтер" },
  { name: "Алексей Громов",   shortName: "Лёша",   role: "Руководитель безопасности" },
  { name: "Виктор Зайцев",    shortName: "Витя",   role: "IT-директор" },
  { name: "Никита Поляков",   shortName: "Никита", role: "Менеджер проекта" },
  { name: "Дарья Фёдорова",   shortName: "Даша",   role: "HR-директор" },
  { name: "Дмитрий Козлов",   shortName: "Дима",   role: "Директор по маркетингу" },
  { name: "Кузьма Воронов",   shortName: "Кузя",   role: "Юрист" },
  { name: "Андрей Карелин",   shortName: "Андрей", role: "Технический директор" },
];

const FEED_TEMPLATES = [
  {
    bizName: "Профимонстерс",
    type: "task_stuck" as const,
    severity: "critical" as const,
    title: "Клиент «СтройГрупп» угрожает разрывом",
    body: "Задача по оформлению документов зависла 5 дней назад. Клиент звонил трижды, ждёт ответа сегодня до 15:00.",
    relatedPerson: "Саша Батов",
  },
  {
    bizName: "Адвокатура",
    type: "red_zone" as const,
    severity: "critical" as const,
    title: "ФНС запрашивает документы за 2023",
    body: "Пришло требование №А-2847 от налоговой. Срок подачи ответа — 3 рабочих дня. Нужны первичные договоры и акты.",
    relatedPerson: "Кузьма Воронов",
  },
  {
    bizName: "Адвокатура",
    type: "red_zone" as const,
    severity: "critical" as const,
    title: "Судебное заседание перенесено без предупреждения",
    body: "Дело №А40-18921 перенесли на неделю раньше. Клиент ещё не в курсе, нужно уведомить и подготовить позицию.",
    relatedPerson: null,
  },
  {
    bizName: "Дальстрой",
    type: "staff" as const,
    severity: "important" as const,
    title: "Прораб просит аванс 80 тыс. на объект",
    body: "Андрей говорит, что наличных на объекте нет, рабочие уходят в обед. Нужно решение до 12:00.",
    relatedPerson: "Андрей Карелин",
  },
  {
    bizName: "Аксиома",
    type: "staff" as const,
    severity: "important" as const,
    title: "Кандидат принял оффер, ждёт договор",
    body: "Кандидат на позицию старшего разработчика подтвердил выход 16 июня. Договор ещё не подготовлен.",
    relatedPerson: "Дарья Фёдорова",
  },
  {
    bizName: "Аксиома",
    type: "red_zone" as const,
    severity: "important" as const,
    title: "Основной сервер не отвечает 2 часа",
    body: "Витя сообщил: CRM недоступна с 06:20, клиенты жалуются. Резервный поднят, но основной нужно починить до открытия офиса.",
    relatedPerson: "Виктор Зайцев",
  },
  {
    bizName: "Профимонстерс",
    type: "routine" as const,
    severity: "info" as const,
    title: "Еженедельный финансовый отчёт готов",
    body: "Аня подготовила сводку за неделю: выручка +12%, расходы в норме. Отчёт ждёт согласования.",
    relatedPerson: "Анна Петрова",
  },
  {
    bizName: "Дальстрой",
    type: "routine" as const,
    severity: "info" as const,
    title: "Поставка стройматериалов перенесена",
    body: "Поставщик «БетонСтрой» сдвинул отгрузку на пятницу из-за логистики. Объект работает в штатном режиме.",
    relatedPerson: "Андрей Карелин",
  },
];

async function main() {
  console.log("🌱 Seeding morning feed data...\n");

  // ── 1. Upsert people ──────────────────────────────────────────────────────
  console.log("👥 Upserting people...");
  const existing = await db.select().from(peopleTable);
  const existingByName = new Map(existing.map(p => [p.name, p]));

  for (const person of PEOPLE) {
    const found = existingByName.get(person.name);
    if (!found) {
      await db.insert(peopleTable).values(person);
      console.log(`   + ${person.name} (${person.shortName})`);
    } else {
      await db.execute(
        `UPDATE people SET short_name = '${person.shortName}', role = '${person.role}' WHERE id = ${found.id}`
      );
      console.log(`   ~ ${person.name} (updated shortName & role)`);
    }
  }

  // ── 2. Get business IDs ───────────────────────────────────────────────────
  console.log("\n🏢 Looking up businesses...");
  const allBusinesses = await db.select().from(businessesTable);
  const bizNames = [...new Set(FEED_TEMPLATES.map(t => t.bizName))];
  const bizMap = new Map<string, number>();
  for (const name of bizNames) {
    const biz = allBusinesses.find(b => b.name.includes(name) || name.includes(b.name.split(" ")[0]!));
    if (biz) {
      bizMap.set(name, biz.id);
      console.log(`   ✓ ${name} → id=${biz.id} ("${biz.name}")`);
    } else {
      console.log(`   ⚠ ${name} not found — businessId will be null`);
    }
  }

  // ── 3. Clear and insert feed items ────────────────────────────────────────
  console.log("\n📋 Clearing existing feed items...");
  await db.execute("DELETE FROM feed_items");
  console.log("   Cleared.");

  console.log("\n📋 Inserting feed items...");
  for (const tpl of FEED_TEMPLATES) {
    const businessId = bizMap.get(tpl.bizName) ?? null;
    await db.insert(feedItemsTable).values({
      businessId,
      type: tpl.type,
      severity: tpl.severity,
      title: tpl.title,
      body: tpl.body,
      relatedPerson: tpl.relatedPerson,
      status: "pending",
    });
    const icon = tpl.severity === "critical" ? "🔴" : tpl.severity === "important" ? "🟡" : "⚪";
    console.log(`   ${icon} [${tpl.severity}] ${tpl.title}`);
  }

  console.log("\n✅ Seed complete!");
  console.log(`   👥 ${PEOPLE.length} people, 📋 ${FEED_TEMPLATES.length} feed items`);
}

main().catch(e => { console.error(e); process.exit(1); });
