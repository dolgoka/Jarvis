export type Importance = "high" | "medium" | "low";
export type Bucket = "day" | "week" | "month";

export interface TodayPriority {
  id: string;
  title: string;
  due: string;
  importance: Importance;
  bucket: Bucket;
}

export const BATOV_PRIORITIES: TodayPriority[] = [
  {
    id: "t1",
    title: "Ответить Калашникову по котировкам Балтики",
    due: "до 15:00",
    importance: "high",
    bucket: "day",
  },
  {
    id: "t2",
    title: "Подписать агентский договор с Протасовым",
    due: "сегодня",
    importance: "high",
    bucket: "day",
  },
  {
    id: "t3",
    title: "Согласовать пакет документов для ВЭД-Капитал",
    due: "до пятницы",
    importance: "medium",
    bucket: "week",
  },
  {
    id: "t4",
    title: "Проверить статус лицензии SCAA (Сагателян)",
    due: "до пятницы",
    importance: "medium",
    bucket: "week",
  },
  {
    id: "t5",
    title: "Подготовить проформу под объём Q4 (Мирзаев)",
    due: "до конца недели",
    importance: "high",
    bucket: "week",
  },
  {
    id: "t6",
    title: "Финализировать медиапакет UBA сезон 2026/27",
    due: "до 31 июля",
    importance: "low",
    bucket: "month",
  },
];
