import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface AiAnswerProps {
  markdown: string;
  compact?: boolean;
}

/* Strip leading emoji from a string (U+1F000–U+1FAFF + misc symbols) */
function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u2139\u231A\u231B\u23E9-\u23F3\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u{1F004}\u{1F0CF}]+\s*/u, "");
}

/* Detect if a cell value looks like a positive/negative delta */
function deltaClass(text: string): string {
  const s = text.trim();
  if (/^\+\d|▲/.test(s)) return "positive";
  if (/^[-−]\d|▼/.test(s)) return "negative";
  return "";
}

/* AI-inference section headings (trigger special visual treatment) */
const INFERENCE_KEYWORDS = /вывод|прогноз|рекомендац|анализ ии|заключение/i;

const FONT = "'Hanken Grotesk', system-ui, sans-serif";

const components = (compact: boolean): Components => ({
  /* ── Headings ── */
  h1: ({ children }) => (
    <h2
      style={{
        fontFamily: FONT,
        fontSize: compact ? "13px" : "15px",
        fontWeight: 700,
        color: "rgba(255,255,255,0.9)",
        marginTop: compact ? "12px" : "18px",
        marginBottom: compact ? "4px" : "6px",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  ),
  h2: ({ children }) => {
    const text = String(children);
    const isInference = INFERENCE_KEYWORDS.test(text);
    return (
      <div
        style={{
          fontFamily: FONT,
          fontSize: compact ? "11px" : "12px",
          fontWeight: 600,
          color: isInference ? "rgba(149,165,245,0.75)" : "rgba(255,255,255,0.55)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: compact ? "10px" : "16px",
          marginBottom: compact ? "3px" : "5px",
          paddingBottom: isInference ? "4px" : undefined,
          borderBottom: isInference ? "1px dashed rgba(149,165,245,0.2)" : undefined,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {isInference && (
          <span
            style={{
              fontSize: "9px",
              background: "rgba(149,165,245,0.12)",
              border: "1px solid rgba(149,165,245,0.25)",
              color: "rgba(149,165,245,0.7)",
              borderRadius: "4px",
              padding: "1px 5px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            вывод ИИ
          </span>
        )}
        {children}
      </div>
    );
  },
  h3: ({ children }) => (
    <div
      style={{
        fontFamily: FONT,
        fontSize: compact ? "11px" : "12px",
        fontWeight: 600,
        color: "rgba(255,255,255,0.45)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginTop: compact ? "8px" : "12px",
        marginBottom: "3px",
      }}
    >
      {children}
    </div>
  ),

  /* ── Paragraph ── */
  p: ({ children }) => (
    <p
      style={{
        fontFamily: FONT,
        fontSize: compact ? "13px" : "15px",
        lineHeight: 1.6,
        color: "rgba(255,255,255,0.80)",
        margin: `${compact ? 4 : 6}px 0`,
      }}
    >
      {children}
    </p>
  ),

  /* ── Lists ── */
  ul: ({ children }) => (
    <ul
      style={{
        margin: `${compact ? 4 : 6}px 0`,
        paddingLeft: compact ? "14px" : "16px",
        listStyle: "none",
      }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      style={{
        margin: `${compact ? 4 : 6}px 0`,
        paddingLeft: compact ? "14px" : "18px",
        listStyleType: "decimal",
      }}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => {
    const isOrdered = (props as any).ordered;
    const raw = String(
      Array.isArray(children)
        ? children.map(c => (typeof c === "string" ? c : "")).join("")
        : children
    );
    const cleanChildren = typeof children === "string"
      ? stripLeadingEmoji(children)
      : children;

    return (
      <li
        style={{
          fontFamily: FONT,
          fontSize: compact ? "13px" : "15px",
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.78)",
          marginBottom: compact ? "2px" : "4px",
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        {!isOrdered && (
          <span
            style={{
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "rgba(91,139,208,0.65)",
              flexShrink: 0,
              marginTop: compact ? "7px" : "8px",
            }}
          />
        )}
        <span style={{ flex: 1 }}>{cleanChildren}</span>
      </li>
    );
  },

  /* ── Horizontal rule → section divider ── */
  hr: () => (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        margin: `${compact ? 8 : 14}px 0`,
      }}
    />
  ),

  /* ── Tables (plan-fact) ── */
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: `${compact ? 6 : 10}px 0` }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: FONT,
          fontSize: compact ? "12px" : "13px",
        }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th
      style={{
        padding: compact ? "4px 8px" : "6px 10px",
        textAlign: "left",
        fontSize: compact ? "10px" : "11px",
        fontWeight: 600,
        color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => {
    const text = String(children ?? "");
    const dc = deltaClass(text);
    return (
      <td
        style={{
          padding: compact ? "4px 8px" : "6px 10px",
          color:
            dc === "positive"
              ? "rgba(62,217,160,0.9)"
              : dc === "negative"
              ? "rgba(240,98,90,0.9)"
              : "rgba(255,255,255,0.78)",
          fontVariantNumeric: "tabular-nums",
          fontSize: compact ? "12px" : "13px",
          fontWeight: dc ? 600 : 400,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </td>
    );
  },

  /* ── Code ── */
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    return isBlock ? (
      <code
        style={{
          display: "block",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: compact ? "11px" : "12px",
          color: "rgba(91,139,208,0.9)",
          background: "rgba(91,139,208,0.06)",
          border: "1px solid rgba(91,139,208,0.12)",
          borderRadius: "8px",
          padding: compact ? "8px 10px" : "10px 14px",
          overflowX: "auto",
          margin: `${compact ? 6 : 10}px 0`,
        }}
      >
        {children}
      </code>
    ) : (
      <code
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "0.88em",
          fontVariantNumeric: "tabular-nums",
          color: "rgba(91,139,208,0.88)",
          background: "rgba(91,139,208,0.08)",
          borderRadius: "4px",
          padding: "1px 5px",
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      style={{
        margin: `${compact ? 6 : 10}px 0`,
        overflowX: "auto",
        background: "rgba(91,139,208,0.05)",
        borderRadius: "8px",
        padding: compact ? "8px 10px" : "10px 14px",
      }}
    >
      {children}
    </pre>
  ),

  /* ── Bold / italic ── */
  strong: ({ children }) => (
    <strong
      style={{
        fontWeight: 600,
        color: "rgba(255,255,255,0.92)",
      }}
    >
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em
      style={{
        fontStyle: "italic",
        color: "rgba(255,255,255,0.65)",
      }}
    >
      {children}
    </em>
  ),

  /* ── Blockquote ── */
  blockquote: ({ children }) => (
    <blockquote
      style={{
        margin: `${compact ? 6 : 10}px 0`,
        paddingLeft: compact ? "10px" : "14px",
        borderLeft: "2px solid rgba(149,165,245,0.3)",
        color: "rgba(255,255,255,0.55)",
        fontStyle: "italic",
        fontSize: compact ? "12px" : "14px",
        lineHeight: 1.55,
      }}
    >
      {children}
    </blockquote>
  ),
});

export function AiAnswer({ markdown, compact = false }: AiAnswerProps) {
  return (
    <div
      style={{
        fontFamily: FONT,
        maxWidth: compact ? undefined : "72ch",
        lineHeight: 1.6,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components(compact)}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
