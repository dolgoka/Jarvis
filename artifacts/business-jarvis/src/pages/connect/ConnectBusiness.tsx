import { Shell } from "@/components/layout/Shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCreateBusiness } from "@workspace/api-client-react";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { useLocation } from "wouter";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "#5b8bd0";

const connectSchema = z.object({
  name: z.string().min(1, "Введите название"),
  city: z.string().min(1, "Введите город"),
  country: z.string().min(1, "Введите страну"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  industry: z.string().min(1, "Введите отрасль"),
  managerName: z.string().min(1, "Введите имя менеджера"),
  managerEmail: z.string().email("Неверный email"),
  description: z.string().optional(),
});

type ConnectFormData = z.infer<typeof connectSchema>;

const fieldBase: React.CSSProperties = {
  fontFamily: HF,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "rgba(228,232,255,0.88)",
  fontSize: 14,
  padding: "10px 14px",
  width: "100%",
  outline: "none",
  transition: "border 0.2s, box-shadow 0.2s",
};

const labelBase: React.CSSProperties = {
  fontFamily: HF,
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(228,232,255,0.40)",
  display: "block",
  marginBottom: 6,
};

const errBase: React.CSSProperties = {
  fontFamily: HF,
  fontSize: 11,
  color: "rgba(240,98,90,0.85)",
  marginTop: 4,
};

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelBase}>{label}</label>
      {children}
      {error && <p style={errBase}>{error}</p>}
    </div>
  );
}

export default function ConnectBusiness() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createBusiness = useCreateBusiness();

  const { register, handleSubmit, formState: { errors } } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      name: "", city: "", country: "",
      lat: 0, lng: 0, industry: "",
      managerName: "", managerEmail: "", description: "",
    },
  });

  const focusField = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.border = `1px solid rgba(91,139,208,0.45)`;
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(91,139,208,0.10)";
  };
  const blurField = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow = "none";
  };

  const inp = { ...register } as unknown as typeof register;

  const onSubmit = (data: ConnectFormData) => {
    createBusiness.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Узел подключён", description: "Бизнес успешно зарегистрирован в сети.", variant: "default" });
        setLocation("/businesses");
      },
      onError: () => {
        toast({ title: "Ошибка подключения", description: "Не удалось установить связь с узлом.", variant: "destructive" });
      },
    });
  };

  const pending = createBusiness.isPending;

  return (
    <Shell>
      <div style={{ fontFamily: HF }} className="p-8 max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(91,139,208,0.12)",
                border: "1px solid rgba(91,139,208,0.28)",
              }}
            >
              <LinkIcon className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <h1 className="text-2xl font-bold text-white">Подключения</h1>
          </div>
          <p className="text-sm ml-12" style={{ color: "rgba(255,255,255,0.38)" }}>
            Зарегистрировать новый бизнес-узел в командной сети
          </p>
        </div>

        {/* Card */}
        <div
          className="glass"
          style={{ padding: "28px" }}
        >
          {/* Section title */}
          <div className="mb-6">
            <p
              className="text-xs font-semibold"
              style={{ color: "rgba(91,139,208,0.75)" }}
            >
              Конфигурация узла
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(228,232,255,0.30)" }}
            >
              Введите телеметрические данные нового подразделения
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Название" error={errors.name?.message}>
                <input
                  style={fieldBase}
                  placeholder="Название компании"
                  {...register("name")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
              <Field label="Отрасль" error={errors.industry?.message}>
                <input
                  style={fieldBase}
                  placeholder="Сфера деятельности"
                  {...register("industry")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Город" error={errors.city?.message}>
                <input
                  style={fieldBase}
                  placeholder="Город"
                  {...register("city")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
              <Field label="Страна" error={errors.country?.message}>
                <input
                  style={fieldBase}
                  placeholder="Страна"
                  {...register("country")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
            </div>

            {/* Row 3 — coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Широта">
                <input
                  type="number"
                  step="any"
                  style={fieldBase}
                  {...register("lat")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
              <Field label="Долгота">
                <input
                  type="number"
                  step="any"
                  style={fieldBase}
                  {...register("lng")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "8px 0" }} />

            {/* Row 4 — manager */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Менеджер" error={errors.managerName?.message}>
                <input
                  style={fieldBase}
                  placeholder="Имя и фамилия"
                  {...register("managerName")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
              <Field label="Email" error={errors.managerEmail?.message}>
                <input
                  type="email"
                  style={fieldBase}
                  placeholder="manager@example.com"
                  {...register("managerEmail")}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </Field>
            </div>

            {/* Notes */}
            <Field label="Параметры / Примечания">
              <textarea
                rows={4}
                style={{ ...fieldBase, resize: "none", minHeight: 100 }}
                placeholder="Дополнительные данные по узлу…"
                {...register("description")}
                onFocus={focusField}
                onBlur={blurField}
              />
            </Field>

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: HF,
                background: "linear-gradient(135deg, #5b8bd0 0%, #3d6aad 100%)",
                color: "#fff",
                border: "none",
                boxShadow: "0 4px 20px rgba(91,139,208,0.28)",
              }}
              onMouseEnter={e => { if (!pending) { e.currentTarget.style.boxShadow = "0 6px 28px rgba(91,139,208,0.45)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(91,139,208,0.28)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {pending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Подключаю…</>
                : "Зарегистрировать узел"}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
