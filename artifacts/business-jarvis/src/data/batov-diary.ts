export type DiaryEntryType = "task" | "reminder" | "boss" | "card" | "note";

export interface DiaryEntry {
  id: string;
  at: string;
  text: string;
  type: DiaryEntryType;
  routedLabel: string;
  href: string | null;
}

export const BATOV_DIARY: DiaryEntry[] = [
  {
    id: "diary7",
    at: "14 июл, 17:55",
    text: "Виктор Гладышев просит ускорить согласование концессии — говорит, что комитет ждёт нашего ответа до пятницы. Надо не затянуть.",
    type: "card",
    routedLabel: "В карточку → Виктор Гладышев",
    href: "/people/p2",
  },
  {
    id: "diary6",
    at: "14 июл, 16:40",
    text: "Перевести КП по топливу на английский и отправить в Газпромнефть. Срочно, поручить Николаю.",
    type: "task",
    routedLabel: "Задача → Николай · опер. директор",
    href: null,
  },
  {
    id: "diary5",
    at: "14 июл, 13:10",
    text: "Напомнить позвонить Мирзаеву по проформе Q4 — он ждёт наши параметры по объёму, надо уточнить цифры до конца недели.",
    type: "reminder",
    routedLabel: "Напоминалка → Пятница, 18 июл",
    href: "/people/p1",
  },
  {
    id: "diary4",
    at: "13 июл, 20:22",
    text: "Сагателяну написать — сделка по авиакеросину Тбилиси застряла. Надо его лично подтолкнуть, иначе улетит к другим.",
    type: "boss",
    routedLabel: "Денису отправлено",
    href: "/people/p8",
  },
  {
    id: "diary3",
    at: "13 июл, 15:05",
    text: "Аккредитив по Грузии — Тураров говорит банк тормозит. Попросить Алибека подготовить пакет документов и дать мне на проверку.",
    type: "task",
    routedLabel: "Задача → Алибек Тураров",
    href: "/people/p5",
  },
  {
    id: "diary2",
    at: "12 июл, 11:30",
    text: "Зубрилин по UBA — лига хочет финальное подтверждение спонсорского пакета до 20 июля. Зафиксировать: условия пакета Platinum, 3 года.",
    type: "card",
    routedLabel: "В карточку → Игорь Зубрилин",
    href: "/people/p4",
  },
  {
    id: "diary1",
    at: "11 июл, 09:45",
    text: "Важно: у нас нет прямого выхода на фрахтового брокера по танкерам. Надо через Калашникова выйти на Lloyd's агента в Риге.",
    type: "note",
    routedLabel: "Заметка",
    href: "/people/p6",
  },
];
