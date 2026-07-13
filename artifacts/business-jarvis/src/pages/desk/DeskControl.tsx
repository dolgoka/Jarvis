import { Radio } from "lucide-react";
import { DeskStub } from "./_stub";

export default function DeskControl() {
  return (
    <DeskStub
      icon={Radio}
      title="Бот-пульт"
      description="Голосовой ввод → черновик поручения → проверка загруженности → подтверждение → отправка. Мокап командного пульта."
      phase={3}
      color="rgba(167,139,250,0.75)"
    />
  );
}
