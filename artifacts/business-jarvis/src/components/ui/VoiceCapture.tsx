import { useRef, useState, useCallback, useEffect } from "react";
import { Mic, Loader2, X, Square, AlertCircle } from "lucide-react";
import { useVoiceTranscribe } from "@workspace/api-client-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

// ─── waveform bars ───────────────────────────────────────────────────────────

const WAVE_STYLE = `
@keyframes vcBar {
  0%, 100% { transform: scaleY(0.25); }
  50%       { transform: scaleY(1); }
}
`;

let waveStyleInjected = false;
function injectWaveStyle() {
  if (waveStyleInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = WAVE_STYLE;
  document.head.appendChild(el);
  waveStyleInjected = true;
}

const BAR_DELAYS = ["0s", "0.12s", "0.24s", "0.12s", "0s"];

function WaveBars() {
  return (
    <div
      className="flex items-center gap-[2px] h-4 motion-reduce:hidden"
      aria-hidden="true"
    >
      {BAR_DELAYS.map((delay, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-red-400/70"
          style={{
            height: "100%",
            transformOrigin: "center bottom",
            animation: `vcBar 0.7s ${delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

type VoiceState = "idle" | "requesting" | "recording" | "transcribing" | "error";

export interface VoiceCaptureProps {
  onText: (text: string) => void;
  onActiveChange?: (active: boolean) => void;
  accentColor?: string;
}

// ─── component ───────────────────────────────────────────────────────────────

export function VoiceCapture({
  onText,
  onActiveChange,
  accentColor = "rgba(0,212,255,0.7)",
}: VoiceCaptureProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { mutateAsync: transcribe } = useVoiceTranscribe();

  useEffect(() => { injectWaveStyle(); }, []);

  const isActive = voiceState !== "idle";
  useEffect(() => { onActiveChange?.(isActive); }, [isActive, onActiveChange]);

  // auto-clear error after 4 s
  useEffect(() => {
    if (voiceState !== "error") return;
    const t = setTimeout(() => setVoiceState("idle"), 4000);
    return () => clearTimeout(t);
  }, [voiceState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSeconds(0);
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const cancelRecording = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstart = null;
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    releaseStream();
    setVoiceState("idle");
  }, [stopTimer, releaseStream]);

  const stopAndTranscribe = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    setVoiceState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = getMimeType();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        releaseStream();
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/mp4" });
        chunksRef.current = [];

        if (blob.size < 500) {
          setVoiceState("idle");
          return;
        }

        setVoiceState("transcribing");
        try {
          const audio = await blobToBase64(blob);
          const result = await transcribe({ data: { audio } });
          const text = result.text?.trim() ?? "";
          if (text) {
            onText(text);
            setVoiceState("idle");
          } else {
            setErrorMsg("Ничего не распознано — попробуйте ещё");
            setVoiceState("error");
          }
        } catch {
          setErrorMsg("Не удалось распознать — попробуйте ещё");
          setVoiceState("error");
        }
      };

      mr.start(200);
      mediaRecorderRef.current = mr;
      setVoiceState("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 59) {
            stopAndTranscribe();
            return 0;
          }
          return s + 1;
        });
      }, 1000);

    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setErrorMsg(
        isDenied
          ? "Нет доступа к микрофону — разрешите в браузере"
          : "Не удалось открыть микрофон"
      );
      setVoiceState("error");
    }
  }, [transcribe, onText, releaseStream, stopAndTranscribe]);

  // ─── idle ──────────────────────────────────────────────────────────────────
  if (voiceState === "idle") {
    return (
      <button
        type="button"
        onClick={startRecording}
        className="flex-shrink-0 p-1.5 rounded transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2"
        style={{ color: accentColor }}
        title="Голосовой ввод"
        aria-label="Начать голосовой ввод"
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  // ─── requesting ────────────────────────────────────────────────────────────
  if (voiceState === "requesting") {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" style={{ color: accentColor }} />
        <span className="text-xs font-mono" style={{ color: "rgba(228,232,255,0.4)" }}>
          Подключаю микрофон…
        </span>
      </div>
    );
  }

  // ─── recording ─────────────────────────────────────────────────────────────
  if (voiceState === "recording") {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Mic
          className="w-4 h-4 flex-shrink-0 motion-reduce:opacity-100"
          style={{
            color: "rgb(248,113,113)",
            animation: "pulse 1s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
        <WaveBars />
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: "rgba(248,113,113,0.85)" }}
        >
          {seconds}с
        </span>
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={cancelRecording}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors hover:bg-white/10"
            style={{ color: "rgba(228,232,255,0.4)" }}
            title="Отмена"
            aria-label="Отменить запись"
          >
            <X className="w-3 h-3" />
            Отмена
          </button>
          <button
            type="button"
            onClick={stopAndTranscribe}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors hover:bg-white/10"
            style={{ color: "rgba(248,113,113,0.85)" }}
            title="Остановить и распознать"
            aria-label="Остановить запись"
          >
            <Square className="w-3 h-3 fill-current" />
            Стоп
          </button>
        </div>
      </div>
    );
  }

  // ─── transcribing ──────────────────────────────────────────────────────────
  if (voiceState === "transcribing") {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" style={{ color: accentColor }} />
        <span className="text-xs font-mono" style={{ color: "rgba(228,232,255,0.4)" }}>
          Распознаю…
        </span>
      </div>
    );
  }

  // ─── error ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400/80" aria-hidden="true" />
      <span className="text-xs font-mono truncate" style={{ color: "rgba(228,232,255,0.5)" }}>
        {errorMsg || "Не удалось — попробуйте ещё"}
      </span>
      <button
        type="button"
        onClick={() => setVoiceState("idle")}
        className="ml-auto flex-shrink-0 text-xs font-mono underline transition-opacity hover:opacity-80"
        style={{ color: "rgba(228,232,255,0.35)" }}
        aria-label="Попробовать снова"
      >
        ✕
      </button>
    </div>
  );
}
