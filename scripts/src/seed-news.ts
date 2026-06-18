import { db, businessesTable, newsItemsTable } from "@workspace/db";

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
  const pacific    = findId("Pacific Trade");
  const skyline    = findId("SkyLine");
  const severny    = findId("Северный");
  const helios     = findId("Helios");
  const atlas      = findId("Atlas");
  const azure      = findId("Azure");
  const silkroad   = findId("SilkRoad");
  const tajenergo  = findId("TajEnergo");
  const siam       = findId("Siam");

  await db.delete(newsItemsTable);

  const now = new Date();
  const hoursAgo  = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const pastSnooze = (h: number) => new Date(now.getTime() - h * 3_600_000);

  await db.insert(newsItemsTable).values([

    // ── CRITICAL ──────────────────────────────────────────────────────────────

    {
      severity:     "critical",
      type:         "urgent",
      title:        "Burn rate вышел за красную линию",
      body:         "AutoDrive Systems: расход кассы в мае составил €720 000 — на 10 % выше прогноза. При текущей скорости runway сократится до 11 месяцев. Требуется немедленное решение по оптимизации R&D-команды или ускорению Series A.",
      businessId:   autodrive,
      sourceLabel:  "CFO-отчёт",
      authorName:   "Михаил Фишер",
      isUrgentFlag: true,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(1),
    },

    {
      severity:     "critical",
      type:         "hr",
      title:        "Ключевой архитектор уходит через 2 недели",
      body:         "NovaTech Solutions: ведущий архитектор AI-модуля уведомил о выходе 28 июня. Он единственный носитель знаний о критическом компоненте message-pipeline. Риск задержки релиза v3 на 6–8 недель без экстренного knowledge transfer.",
      businessId:   novatech,
      sourceLabel:  "HR-система",
      authorName:   "Анна Шнайдер",
      isUrgentFlag: true,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(2),
    },

    {
      severity:     "critical",
      type:         "urgent",
      title:        "Инцидент безопасности на объекте — возможен простой",
      body:         "SkyLine Construction: вчера на объекте Marina Tower зафиксирован предаварийный инцидент с башенным краном (смещение рельса). Инспектор ГОСТехнадзора назначен на сегодня. До выдачи разрешения работы приостановлены — потенциальный штраф и 3-дневный простой.",
      businessId:   skyline,
      sourceLabel:  "HSE-отдел",
      authorName:   "Рустам Назаров",
      isUrgentFlag: true,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(3),
    },

    // ── ATTENTION ─────────────────────────────────────────────────────────────

    {
      severity:     "attention",
      type:         "corporate",
      title:        "Маржа за июнь ниже планового порога",
      body:         "Pacific Trade Partners: маржа за июнь составила 3.2 % при плановом пороге 5 %. Волатильность пальмового масла и каучука давит на P&L. Требуется пересмотр контрактного портфеля и пересогласование с поставщиками.",
      businessId:   pacific,
      sourceLabel:  "Финансовый контроль",
      authorName:   "Чэнь Юй",
      isUrgentFlag: false,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(4),
    },

    {
      severity:     "attention",
      type:         "task",
      title:        "Просрочен дедлайн по аудиторскому пакету Q2",
      body:         "Meridian Capital Group: внешний аудитор запросил пакет документов за Q2 ещё 5 дней назад. Комплаенс-офицер не подтвердил получение. Дедлайн подачи — сегодня в 17:00 GST. Требуется немедленная эскалация.",
      businessId:   meridian,
      sourceLabel:  "Комплаенс-портал",
      authorName:   "Алексей Козлов",
      isUrgentFlag: false,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(5),
    },

    {
      severity:     "attention",
      type:         "hr",
      title:        "Зарплаты 312 субподрядчиков не перечислены в срок",
      body:         "SkyLine Construction: из-за технической ошибки в ERP зарплаты субподрядчиков на Marina Tower не перечислены вчера. Проблема локализована в модуле платёжных поручений. Банк подтвердил перечисление завтра до 12:00.",
      businessId:   skyline,
      sourceLabel:  "ERP-система",
      authorName:   "Дина Касымова",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(6),
    },

    {
      severity:     "attention",
      type:         "task",
      title:        "Требуется подпись: изменения в совете директоров",
      body:         "AutoDrive Systems GmbH: документы на изменение состава совета директоров готовы к подписанию. Нотариус ждёт назначения времени. Дедлайн подачи в торговый реестр Мюнхена — 15 июля. Промедление влечёт штраф €1 200.",
      businessId:   autodrive,
      sourceLabel:  "Юридический отдел",
      authorName:   "Томас Мюллер",
      isUrgentFlag: false,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(9),
    },

    {
      severity:     "attention",
      type:         "hr",
      title:        "Закрыт найм нового GM Azure Hospitality",
      body:         "Azure Hospitality Group: после 6-недельного поиска подписан оффер с кандидатом на позицию Генерального менеджера флагманского отеля. Выход — 1 августа. Требуется согласование плана onboarding и брифинг по текущим KPI.",
      businessId:   azure,
      sourceLabel:  "HR-система",
      authorName:   "Карина Воронова",
      isUrgentFlag: false,
      actionable:   true,
      status:       "new",
      createdAt:    hoursAgo(7),
    },

    {
      severity:     "attention",
      type:         "corporate",
      title:        "Регуляторное одобрение нового фонда отложено на 10 дней",
      body:         "Северный Капитал: ЦБ запросил дополнительные разъяснения по структуре фонда — срок ответа 10 рабочих дней. Привлечение LP на сумму ₽2.8 B заморожено до решения регулятора. Юридический отдел готовит ответный пакет.",
      businessId:   severny,
      sourceLabel:  "Юридический отдел",
      authorName:   "Ирина Соколова",
      isUrgentFlag: false,
      actionable:   true,
      status:       "snoozed",
      snoozedUntil: pastSnooze(1),
      createdAt:    hoursAgo(10),
    },

    // ── INFO ──────────────────────────────────────────────────────────────────

    {
      severity:     "info",
      type:         "corporate",
      title:        "NovaTech подписала партнёрство с EU-дистрибьютором",
      body:         "Заключён рамочный договор с Axcel GmbH (Берлин) — 12-месячный пилот с потенциалом $3.2 M ARR. Ожидается первый коммерческий контракт в течение 30 дней. Команда Sales запускает процесс KYC.",
      businessId:   novatech,
      sourceLabel:  "Sales CRM",
      authorName:   "Джон Марш",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(8),
    },

    {
      severity:     "info",
      type:         "corporate",
      title:        "Atlas Digital: выручка Q2 превысила план на 12 %",
      body:         "Atlas Digital Agency завершила II квартал с выручкой $1.84 M — на 12 % выше прогноза $1.64 M. Основной драйвер — два крупных ретейн-контракта, закрытых в мае. Маржинальность EBITDA составила 34 %.",
      businessId:   atlas,
      sourceLabel:  "Финансовый отчёт",
      authorName:   "Даниэль Кросс",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(11),
    },

    {
      severity:     "info",
      type:         "task",
      title:        "SilkRoad: таможенное оформление партии одобрено",
      body:         "SilkRoad Logistics: груз на сумму $2.1 M прошёл таможенное оформление в порту Джибути без задержек. ETA на склад получателя — 19 июня. Все документы COO и фитосертификаты в порядке.",
      businessId:   silkroad,
      sourceLabel:  "Логистическая платформа",
      authorName:   "Лю Вэй",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(13),
    },

    {
      severity:     "info",
      type:         "corporate",
      title:        "TajEnergo получила разрешение на расширение сети",
      body:         "TajEnergo JSC: министерство энергетики выдало лицензию на строительство 80 км новой ЛЭП-220 в Хатлонской области. Проект стоимостью $14 M запускается в Q3. Финансирование через АБР подтверждено.",
      businessId:   tajenergo,
      sourceLabel:  "Операционный отдел",
      authorName:   "Шохрух Рахимов",
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(15),
    },

    {
      severity:     "info",
      type:         "task",
      title:        "Helios: страховые полисы объектов Лимассол продлены",
      body:         "Helios Real Estate: страховые полисы на все 4 объекта в Лимассоле продлены на 2 года. Страховая сумма увеличена на 15 % — €214 M совокупно. Документы загружены в хранилище. Уведомление банка-залогодержателя отправлено.",
      businessId:   helios,
      sourceLabel:  "Юридический отдел",
      authorName:   "Никос Пападопулос",
      isUrgentFlag: false,
      actionable:   false,
      status:       "snoozed",
      snoozedUntil: pastSnooze(2),
      createdAt:    hoursAgo(18),
    },

    // ── EXTERNAL (max 1–2) ─────────────────────────────────────────────────────

    {
      severity:     "critical",
      type:         "external",
      title:        "Reuters: G7 обсуждают новые санкции на финансовые активы",
      body:         "G7 рассматривают дополнительные ограничения на финансовые операции с рядом российских активов. Потенциальное влияние на Северный Капитал АО — под мониторингом. Решение ожидается к концу месяца.",
      businessId:   null,
      sourceLabel:  "Reuters",
      authorName:   null,
      isUrgentFlag: false,
      actionable:   false,
      status:       "new",
      createdAt:    hoursAgo(2),
    },

  ]);

  const count = await db.select().from(newsItemsTable);
  console.log(`✓ Seeded ${count.length} news items`);
  process.exit(0);
}

seedNews().catch(e => { console.error(e); process.exit(1); });
