import { Users } from "lucide-react";
import { DeskStub } from "./_stub";

export default function DeskPeople() {
  return (
    <DeskStub
      icon={Users}
      title="Люди"
      description="Список партнёров и доверенных контактов директора. Карточка партнёра со статусом, сделками и историей взаимодействия."
      phase={1}
      color="rgba(91,139,208,0.75)"
    />
  );
}
