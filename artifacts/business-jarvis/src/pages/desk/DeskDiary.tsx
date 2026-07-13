import { BookOpen } from "lucide-react";
import { DeskStub } from "./_stub";

export default function DeskDiary() {
  return (
    <DeskStub
      icon={BookOpen}
      title="Голосовой дневник"
      description="Лента голосовых заметок директора. Быстрые цифры и ситуационные пометки — всё в одном потоке."
      phase={3}
      color="rgba(240,98,90,0.70)"
    />
  );
}
