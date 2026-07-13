import { Sun } from "lucide-react";
import { DeskStub } from "./_stub";

export default function DeskToday() {
  return (
    <DeskStub
      icon={Sun}
      title="Сегодня"
      description="Напоминалки, приоритеты дня и встроенный календарь. Личная повестка директора на текущие сутки."
      phase={1}
      color="rgba(240,181,74,0.75)"
    />
  );
}
