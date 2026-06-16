import { useState, useEffect } from "react";
import { AlertTriangle, GitFork, Clock, CheckCircle2, RotateCcw, Send, Hourglass } from "lucide-react";

const HF = "'Hanken Grotesk', system-ui, sans-serif";
const ACCENT = "#5b8bd0";
const TEXT = {
  hi:  "rgba(228,232,255,0.92)",
  mid: "rgba(228,232,255,0.60)",
  lo:  "rgba(228,232,255,0.40)",
  dim: "rgba(228,232,255,0.25)",
};
const DIVIDER = "rgba(255,255,255,0.07)";

type TreeNode = {
  id: number;
  title: string;
  assigneeRole: string;
  status: string;
  acceptedAt?: string | null;
  lastActivityAt: string;
  parentId?: number | null;
};

type TaskTreeData = {
  root: TreeNode;
  children: TreeNode[];
};

function staleDays(lastActivityAt: string) {
  const diffMs = Date.now() - new Date(lastActivityAt).getTime();
  const hours = diffMs / 3_600_000;
  return { isStale: hours > 24, days: Math.floor(hours / 24) };
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sent:        { label: "не приняли",  color: "#f0b54a", icon: <Send style={{ width: 10, height: 10 }} /> },
  in_progress: { label: "в работе",   color: ACCENT,    icon: <CheckCircle2 style={{ width: 10, height: 10 }} /> },
  review:      { label: "на приёмке", color: "#f0b54a", icon: <Hourglass style={{ width: 10, height: 10 }} /> },
  done:        { label: "готово",     color: "#3ed9a0", icon: <CheckCircle2 style={{ width: 10, height: 10 }} /> },
  returned:    { label: "возврат",    color: "#f0625a", icon: <RotateCcw style={{ width: 10, height: 10 }} /> },
  draft:       { label: "черновик",   color: TEXT.dim,  icon: null },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: TEXT.dim, icon: null };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 7px", borderRadius: 999,
      fontSize: 10, fontWeight: 700, fontFamily: HF,
      background: `${meta.color}18`,
      color: meta.color,
      border: `1px solid ${meta.color}35`,
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function StaleBadge({ days }: { days: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 7px", borderRadius: 999,
      fontSize: 10, fontWeight: 700, fontFamily: HF,
      background: "rgba(240,98,90,0.12)",
      color: "#f0625a",
      border: "1px solid rgba(240,98,90,0.30)",
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      <AlertTriangle style={{ width: 10, height: 10 }} />
      зависла · {days}д
    </span>
  );
}

function isBottleneck(node: TreeNode) {
  const { isStale } = staleDays(node.lastActivityAt);
  return node.status === "sent" || node.status === "returned" || isStale;
}

interface Props {
  data: TaskTreeData;
  createdBy?: string;
}

export function TaskDistributionTree({ data, createdBy }: Props) {
  const { root, children } = data;

  if (children.length === 0) return null;

  const bottleneckCount = children.filter(isBottleneck).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: TEXT.dim, fontFamily: HF,
        }}>
          Распределение
        </span>
        <GitFork style={{ width: 11, height: 11, color: TEXT.dim }} />
        {bottleneckCount > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "1px 7px", borderRadius: 999,
            fontSize: 10, fontWeight: 700, fontFamily: HF,
            background: "rgba(240,98,90,0.12)",
            color: "#f0625a",
            border: "1px solid rgba(240,98,90,0.25)",
          }}>
            <AlertTriangle style={{ width: 10, height: 10 }} />
            {bottleneckCount === 1 ? "1 узкое место" : `${bottleneckCount} узких места`}
          </span>
        )}
      </div>

      {/* Tree card */}
      <div className="glass" style={{ borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 0 }}>

        {/* Root row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          paddingBottom: 10, marginBottom: 2,
          borderBottom: `1px solid ${DIVIDER}`,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT.hi, fontFamily: HF, flex: 1, minWidth: 0 }}>
            {root.title}
          </span>
          {createdBy && (
            <span style={{ fontSize: 10, color: TEXT.dim, fontFamily: HF, flexShrink: 0 }}>
              поставил: {createdBy}
            </span>
          )}
        </div>

        {/* Children rows */}
        {children.map((child, idx) => {
          const isLast = idx === children.length - 1;
          const connector = isLast ? "└" : "├";
          const depth = child.parentId === root.id ? 0 : 1;
          const { isStale, days } = staleDays(child.lastActivityAt);
          const highlight = isBottleneck(child);

          return (
            <div
              key={child.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                paddingTop: idx === 0 ? 8 : 6,
                paddingBottom: isLast ? 0 : 6,
                paddingLeft: depth * 16,
                borderBottom: isLast ? "none" : `1px solid ${DIVIDER}`,
                background: highlight ? "rgba(240,98,90,0.04)" : "transparent",
                borderRadius: highlight ? 6 : 0,
                transition: "background 0.15s",
              }}
            >
              {/* Tree connector */}
              <span style={{
                fontFamily: "monospace", fontSize: 12,
                color: TEXT.dim, flexShrink: 0, userSelect: "none",
                lineHeight: 1,
              }}>
                {connector}
              </span>

              {/* Title */}
              <span style={{
                fontSize: 12, fontWeight: 500, color: TEXT.mid,
                fontFamily: HF, flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {child.title}
              </span>

              {/* Role */}
              <span style={{
                fontSize: 11, color: TEXT.dim, fontFamily: HF,
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
                → {child.assigneeRole}
              </span>

              {/* Badges */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                <StatusBadge status={child.status} />
                {isStale && child.status !== "done" && <StaleBadge days={days} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LazyTaskDistributionTree({ taskId, createdBy }: { taskId: number; createdBy?: string }) {
  const [data, setData] = useState<TaskTreeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tasks/tree?id=${taskId}`)
      .then(r => r.ok ? r.json() as Promise<TaskTreeData> : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT.dim, fontFamily: HF }}>
        <Clock style={{ width: 11, height: 11 }} className="animate-spin" />
        Загрузка распределения…
      </div>
    );
  }

  if (!data || data.children.length === 0) return null;

  return <TaskDistributionTree data={data} createdBy={createdBy} />;
}
