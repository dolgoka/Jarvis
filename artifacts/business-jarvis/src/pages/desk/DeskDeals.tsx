import { Briefcase } from "lucide-react";
import { DeskStub } from "./_stub";

export default function DeskDeals() {
  return (
    <DeskStub
      icon={Briefcase}
      title="Проекты · Сделки"
      description="Воронка проектов и сделок директора. Статус переговоров, ключевые условия, следующий шаг и дедлайны."
      phase={2}
      color="rgba(62,217,160,0.70)"
    />
  );
}
