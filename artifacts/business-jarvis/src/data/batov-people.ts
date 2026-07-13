export interface PartnerTheme {
  title: string;
  status: "active" | "done" | "hold";
}

export interface PartnerTimelineEntry {
  date: string; // ISO date
  text: string;
}

export interface BatovPartner {
  id: string;
  name: string;
  company: string;
  role: string;
  birthday: string;              // ISO date  e.g. "1974-02-18"
  nation: string;                // страна / нация
  religiousNote: string;         // ближайший религ. праздник / деталь
  lastContactOnline: string;     // ISO date
  lastContactInPerson: string;   // ISO date
  introducedBy: string;          // кто познакомил
  avoidWith: string[];           // имена тех, с кем НЕ пересекать
  themes: PartnerTheme[];
  timeline: PartnerTimelineEntry[];
  projects: string[];            // связанные сделки / проекты
  isClosed: boolean;             // закрытый контакт (нефтетрек и т.п.)
  tags: string[];                // e.g. "hot"
}

export const BATOV_PEOPLE: BatovPartner[] = [
  {
    id: "p1",
    name: "Руслан Мирзаев",
    company: "ООО «ТрансОйл Групп»",
    role: "Директор по трейдингу",
    birthday: "1974-02-18",
    nation: "Россия",
    religiousNote: "Ислам — Рамадан ~март 2027",
    lastContactOnline: "2026-06-01",
    lastContactInPerson: "2026-05-12",
    introducedBy: "Олег Власенко (ГПН)",
    avoidWith: ["Армен Сагателян"],
    themes: [
      { title: "ГПН — поставка Q4 2026", status: "active" },
      { title: "Выход на биржу СПбМТСБ", status: "hold" },
    ],
    timeline: [
      { date: "2026-05-12", text: "Встреча в Москве, обсудили объём Q4 и схему расчётов." },
      { date: "2026-06-01", text: "Звонок: подтвердил квоту 45 000 т, ждёт проформы." },
      { date: "2026-04-03", text: "Знакомство через Власенко на форуме «Нефть России»." },
    ],
    projects: ["Нефтетрейдинг ГПН", "Проект «Восточный коридор»"],
    isClosed: true,
    tags: ["hot"],
  },
  {
    id: "p2",
    name: "Виктор Гладышев",
    company: "Северо-Западный Портовый Альянс",
    role: "Председатель СД / Депутат ГД",
    birthday: "1963-08-05",
    nation: "Россия",
    religiousNote: "Православие — именины 26 авг (Виктор Исповедник)",
    lastContactOnline: "2026-07-08",
    lastContactInPerson: "2026-06-30",
    introducedBy: "Администрация Президента РФ",
    avoidWith: ["Сергей Калашников"],
    themes: [
      { title: "Концессия контейнерного терминала СПб", status: "active" },
    ],
    timeline: [
      { date: "2026-06-30", text: "Ужин в ресторане «Северянин», обсудили сроки концессии." },
      { date: "2026-07-08", text: "Telegram: прислал проект поправки к концессионному соглашению." },
      { date: "2026-05-14", text: "Первое знакомство на приёме в Смольном." },
    ],
    projects: ["Порт-ВЭД схема"],
    isClosed: false,
    tags: [],
  },
  {
    id: "p3",
    name: "Гиорги Канделаки",
    company: "AviaTrans Caucasus LLC",
    role: "Генеральный директор",
    birthday: "1981-07-22",
    nation: "Грузия",
    religiousNote: "Православие (Грузинская) — Мариамоба 28 авг",
    lastContactOnline: "2026-06-15",
    lastContactInPerson: "2026-05-20",
    introducedBy: "Бека Гобеджишвили",
    avoidWith: [],
    themes: [
      { title: "Слот хранения TBS Airport", status: "active" },
      { title: "Таможенное согласование ГТК", status: "active" },
    ],
    timeline: [
      { date: "2026-05-20", text: "Встреча в Тбилиси: осмотр терминала, согласовали ёмкость 3 000 т." },
      { date: "2026-06-15", text: "Zoom: проблема с документами на экспорт топлива, подключает юриста." },
      { date: "2026-04-11", text: "Знакомство через Бека на выставке Airport Expo Tbilisi." },
    ],
    projects: ["Авиакеросин Грузия Q3"],
    isClosed: false,
    tags: ["hot"],
  },
  {
    id: "p4",
    name: "Максим Зубрилин",
    company: "Единая Баскетбольная Ассоциация",
    role: "Президент UBA",
    birthday: "1976-03-11",
    nation: "Россия",
    religiousNote: "Православие — Пасха (переходящий), 2027 ~апр",
    lastContactOnline: "2026-07-05",
    lastContactInPerson: "2026-07-01",
    introducedBy: "Андрей Поляков (медиа)",
    avoidWith: [],
    themes: [
      { title: "Спонсорство UBA сезон 2026/27", status: "active" },
      { title: "Медиаправа Восточная Европа", status: "active" },
    ],
    timeline: [
      { date: "2026-07-01", text: "Ужин: оговорили бюджет спонсорства ₽180M, пакет брендинга." },
      { date: "2026-07-05", text: "WhatsApp: прислал презентацию медиапакета EastEurope." },
      { date: "2026-06-10", text: "Знакомство через Полякова на финале сезона UBA в Москве." },
    ],
    projects: ["UBA Sponsorship 2027"],
    isClosed: false,
    tags: ["hot"],
  },
  {
    id: "p5",
    name: "Алибек Тураров",
    company: "АКБ «ВЭД-Капитал»",
    role: "Заместитель председателя правления",
    birthday: "1968-04-15",
    nation: "Казахстан",
    religiousNote: "Ислам — Курбан-айт ~июнь 2027",
    lastContactOnline: "2026-05-20",
    lastContactInPerson: "2026-04-30",
    introducedBy: "Бекжан Сейтов (Алматы)",
    avoidWith: [],
    themes: [
      { title: "Аккредитив ВЭД под Грузию", status: "active" },
      { title: "Расчёты в дирхамах AED", status: "hold" },
    ],
    timeline: [
      { date: "2026-04-30", text: "Встреча в Алматы: обсудили открытие счёта и структуру аккредитива." },
      { date: "2026-05-20", text: "Email: банк одобрил лимит $4M, ждут пакет документов от нас." },
      { date: "2026-03-18", text: "Первый звонок — рекомендован Сейтовым как надёжный ВЭД-банк." },
    ],
    projects: ["Авиакеросин Грузия Q3", "Порт-ВЭД схема"],
    isClosed: false,
    tags: [],
  },
  {
    id: "p6",
    name: "Сергей Калашников",
    company: "ООО «Нефтехим-Логистика»",
    role: "Совладелец",
    birthday: "1969-11-30",
    nation: "Россия",
    religiousNote: "Православие — Рождество 7 янв",
    lastContactOnline: "2026-07-02",
    lastContactInPerson: "2026-06-20",
    introducedBy: "Руслан Мирзаев",
    avoidWith: ["Виктор Гладышев"],
    themes: [
      { title: "Танкерный фрахт Балтика Q3", status: "active" },
    ],
    timeline: [
      { date: "2026-06-20", text: "Встреча в Петербурге: обсудили ставки фрахта и маршрут." },
      { date: "2026-07-02", text: "Telegram: прислал котировки Балтики, просит решение до 15-го." },
      { date: "2026-05-30", text: "Знакомство через Мирзаева на переговорах по Q3." },
    ],
    projects: ["Нефтетрейдинг ГПН"],
    isClosed: false,
    tags: [],
  },
  {
    id: "p7",
    name: "Денис Протасов",
    company: "Meridian Ports Group",
    role: "Управляющий партнёр",
    birthday: "1983-12-20",
    nation: "Россия",
    religiousNote: "Православие — Рождество 7 янв",
    lastContactOnline: "2026-07-11",
    lastContactInPerson: "2026-07-10",
    introducedBy: "Виктор Гладышев",
    avoidWith: [],
    themes: [
      { title: "Брокерский агент терминал СПб", status: "active" },
    ],
    timeline: [
      { date: "2026-07-10", text: "Встреча на причале: осмотр инфраструктуры терминала." },
      { date: "2026-07-11", text: "Telegram: направил проект агентского договора на согласование." },
      { date: "2026-06-25", text: "Гладышев представил как операционного партнёра по терминалу." },
    ],
    projects: ["Порт-ВЭД схема"],
    isClosed: false,
    tags: ["hot"],
  },
  {
    id: "p8",
    name: "Армен Сагателян",
    company: "Eagle Aviation Fuels LLC",
    role: "Генеральный директор",
    birthday: "1972-09-03",
    nation: "Армения",
    religiousNote: "Армянская Апостольская церковь — Вардавар ~авг",
    lastContactOnline: "2026-04-01",
    lastContactInPerson: "2026-03-15",
    introducedBy: "Тигран Арутюнян (Ереван)",
    avoidWith: ["Руслан Мирзаев"],
    themes: [
      { title: "Контракт авиатопливо Тбилиси", status: "active" },
      { title: "Лицензия SCAA Армения", status: "hold" },
    ],
    timeline: [
      { date: "2026-03-15", text: "Встреча в Ереване: оговорили объём 1 200 т/мес, условия FOB." },
      { date: "2026-04-01", text: "Звонок: сложности с лицензией SCAA, просит 2 недели паузы." },
      { date: "2026-02-20", text: "Знакомство через Тиграна Арутюняна на конференции в Дубае." },
    ],
    projects: ["Авиакеросин Грузия Q3"],
    isClosed: true,
    tags: [],
  },
];
