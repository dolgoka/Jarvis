import { db, businessesTable, newsItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seedNews() {
  const businesses = await db.select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable);

  if (businesses.length === 0) {
    console.error("No businesses found — run the main seed first");
    process.exit(1);
  }

  const findId = (namePart: string): number | null =>
    businesses.find(b => b.name.toLowerCase().includes(namePart.toLowerCase()))?.id ?? null;

  const autodrive  = findId("AutoDrive");
  const novatech   = findId("NovaTech");
  const meridian   = findId("Meridian");
  const pacific    = findId("Pacific");
  const skyline    = findId("SkyLine");
  const severny    = findId("Северный");

  await db.delete(newsItemsTable);

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const snoozedUntil = (h: number) => new Date(now.getTime() + h * 3_600_000);

  await db.insert(newsItemsTable).values([
    {
      severity:     "critical",
      type:         "urgent",
      title:        "Burn rate вышел за красную линию",
      body:         "AutoDrive Systems: расход денег в мае составил €720 000 — на 10 % выше прогноза. При текущей скорости runway сократится до 11 месяцев. Требуется немедленное решение по оптимизации R&D-команды или ускорению Series A.",
      businessId:   autodrive,
      sourceLabel:  "CFO-отчёт",
      isUrgentFlag: true,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(1),
    },
    {
      severity:     "critical",
      type:         "hr",
      title:        "Ключевой разработчик подал заявление об уходе",
      body:         "NovaTech Solutions: ведущий архитектор AI-модуля уведомил о выходе через 2 недели. Он единственный носитель знаний о критическом компоненте. Риск задержки релиза v3 на 6–8 недель.",
      businessId:   novatech,
      sourceLabel:  "HR-система",
      isUrgentFlag: true,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(2),
    },
    {
      severity:     "attention",
      type:         "corporate",
      title:        "Квартальный отчёт: маржа ниже цели",
      body:         "Pacific Trade Partners: маржа за июнь составила 3.2 % при плановом пороге 5 %. Волатильность пальмового масла и каучука продолжает давить на P&L. Требуется пересмотр контрактного портфеля.",
      businessId:   pacific,
      sourceLabel:  "Финансовый контроль",
      isUrgentFlag: false,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(3),
    },
    {
      severity:     "attention",
      type:         "task",
      title:        "Просрочен дедлайн по аудиту",
      body:         "Meridian Capital Group: внешний аудитор запросил пакет документов за Q2 ещё 5 дней назад. Комплаенс-офицер не подтвердил получение. Дедлайн подачи — завтра в 17:00 GST.",
      businessId:   meridian,
      sourceLabel:  "Комплаенс-портал",
      isUrgentFlag: false,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(4),
    },
    {
      severity:     "attention",
      type:         "hr",
      title:        "Задержка зарплаты на объекте Marina Tower",
      body:         "SkyLine Construction: из-за технической ошибки в ERP зарплаты 312 субподрядчиков на объекте Marina Tower не перечислены в срок. Проблема выявлена, перечисление запланировано на завтра.",
      businessId:   skyline,
      sourceLabel:  "ERP-система",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(5),
    },
    {
      severity:     "attention",
      type:         "corporate",
      title:        "Регуляторное одобрение нового фонда отложено",
      body:         "Северный Капитал: ЦБ запросил дополнительные разъяснения по структуре фонда. Срок ответа — 10 рабочих дней. Привлечение LP на сумму ₽2.8 B заморожено до решения.",
      businessId:   severny,
      sourceLabel:  "Юридический отдел",
      isUrgentFlag: false,
      actionable:   true,
      status:       "snoozed",
      snoozedUntil: snoozedUntil(-1),
      createdAt:    hoursAgo(8),
    },
    {
      severity:     "info",
      type:         "corporate",
      title:        "NovaTech подписала партнёрство с EU-дистрибьютором",
      body:         "Заключён рамочный договор с Axcel GmbH (Берлин) — 12-месячный пилот с потенциалом $3.2 M ARR. Ожидается первый коммерческий контракт в течение 30 дней.",
      businessId:   novatech,
      sourceLabel:  "Sales CRM",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(6),
    },
    {
      severity:     "info",
      type:         "task",
      title:        "Обновлена страховка объектов Limassol",
      body:         "Helios Real Estate: страховые полисы на все 4 объекта в Лимассоле продлены на 2 года. Страховая сумма увеличена на 15 % — €214 M совокупно. Документы загружены в хранилище.",
      businessId:   findId("Helios"),
      sourceLabel:  "Юридический отдел",
      isUrgentFlag: false,
      actionable:   false,
      status:       "snoozed",
      snoozedUntil: snoozedUntil(-2),
      createdAt:    hoursAgo(12),
    },
    {
      severity:     "critical",
      type:         "external",
      title:        "Reuters: новые санкции могут затронуть российский рынок",
      body:         "G7 обсуждают дополнительные ограничения на финансовые операции с российскими активами. Потенциальное влияние на Северный Капитал АО — под наблюдением. Решение ожидается к концу месяца.",
      businessId:   null,
      sourceLabel:  "Reuters",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(2),
    },
    {
      severity:     "info",
      type:         "corporate",
      title:        "Meridian Capital: закрыта сделка по ОАЭ-портфелю",
      body:         "Успешно закрыта сделка по покупке торгового центра Al Reem Island за $47 M. IRR прогнозируется 18.5 %. Актив передан в фонд RE Fund III.",
      businessId:   meridian,
      sourceLabel:  "Инвестиционный комитет",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(7),
    },
    {
      severity:     "attention",
      type:         "task",
      title:        "Требуется подпись на корпоративных изменениях",
      body:         "AutoDrive Systems GmbH: документы на изменение состава совета директоров готовы к подписанию. Нотариус ждёт назначения времени. Дедлайн подачи в торговый реестр — 15 июля.",
      businessId:   autodrive,
      sourceLabel:  "Юридический отдел",
      isUrgentFlag: false,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(9),
    },
  ]);

  const count = await db.select().from(newsItemsTable);
  console.log(`✓ Seeded ${count.length} news items`);
  process.exit(0);
}

seedNews().catch(e => { console.error(e); process.exit(1); });
