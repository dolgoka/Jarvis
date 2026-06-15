import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, notesTable, peopleTable } from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();
const OWNER_KEY = "owner";

function makeClient() {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OpenAI API key configured");
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

function noteDto(n: typeof notesTable.$inferSelect) {
  return {
    id: n.id,
    body: n.body,
    source: n.source,
    pinned: n.pinned,
    businessId: n.businessId ?? null,
    aiSummary: n.aiSummary ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

type ExpandMode = "develop" | "steps" | "risks" | "route" | "summarize";

function buildPrompt(mode: ExpandMode, noteBody: string, peopleRoles: string[]): string {
  const roles = peopleRoles.join(", ");

  const BASE = `Ты — бизнес-ассистент руководителя. Отвечай только на русском. Используй Markdown: заголовки ##, списки -, жирный **текст**. Будь конкретным и ёмким.

Мысль владельца:
"${noteBody}"`;

  switch (mode) {
    case "develop":
      return `${BASE}

Твоя задача — додумать и развить эту мысль:
- Уточни, что именно имеется в виду, если есть неоднозначность
- Предложи 2–3 варианта развития идеи
- Задай 2–3 уточняющих вопроса, которые помогут двигаться дальше`;

    case "steps":
      return `${BASE}

Составь конкретный план действий по реализации этой мысли:
- Разбей на шаги (нумерованный список)
- Для каждого шага укажи: что сделать, кто ответственный (роль), ориентировочный срок
- Выдели быстрые победы (quick wins) отдельно`;

    case "risks":
      return `${BASE}

Найди слабые места и риски в этой идее:
- Что может пойти не так? (список рисков с оценкой: 🔴 критично / 🟡 важно / 🟢 незначительно)
- Какие предположения могут оказаться неверными?
- Что нужно проверить в первую очередь?`;

    case "route":
      return `${BASE}

Доступные роли в команде: ${roles || "(нет данных)"}

Определи, кому адресовать эту задачу:
- Укажи наиболее подходящую роль и объясни почему
- Если нужно несколько людей — укажи каждого с его зоной ответственности
- Предложи формулировку задачи для передачи`;

    case "summarize":
      return `${BASE}

Сверни эту мысль в чёткое резюме:
- Одна фраза — суть идеи (жирным)
- Контекст: зачем это нужно?
- Следующий шаг: одно действие, которое нужно сделать прямо сейчас`;
  }
}

// GET /notes — pinned first, then newest first
router.get("/notes", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.ownerKey, OWNER_KEY))
      .orderBy(desc(notesTable.pinned), desc(notesTable.createdAt));
    res.json(rows.map(noteDto));
  } catch (err) {
    console.error("notes GET error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// POST /notes
router.post("/notes", async (req, res): Promise<void> => {
  try {
    const { body, source, businessId } = req.body as {
      body: string;
      source?: "voice" | "text";
      businessId?: number | null;
    };
    if (!body?.trim()) {
      res.status(400).json({ error: "body required" });
      return;
    }
    const [inserted] = await db
      .insert(notesTable)
      .values({
        body: body.trim(),
        source: source ?? "text",
        businessId: businessId ?? null,
        ownerKey: OWNER_KEY,
      })
      .returning();
    res.status(201).json(noteDto(inserted!));
  } catch (err) {
    console.error("notes POST error:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// POST /notes/patch?id
router.post("/notes/patch", async (req, res): Promise<void> => {
  try {
    const id = Number(req.query["id"]);
    if (!id) { res.status(400).json({ error: "id required" }); return; }

    const { body, pinned, aiSummary } = req.body as {
      body?: string;
      pinned?: boolean;
      aiSummary?: string | null;
    };

    const patch: Partial<typeof notesTable.$inferInsert> = { updatedAt: new Date() };
    if (body !== undefined)      patch.body = body.trim();
    if (pinned !== undefined)    patch.pinned = pinned;
    if (aiSummary !== undefined) patch.aiSummary = aiSummary;

    const [updated] = await db
      .update(notesTable)
      .set(patch)
      .where(and(eq(notesTable.id, id), eq(notesTable.ownerKey, OWNER_KEY)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(noteDto(updated));
  } catch (err) {
    console.error("notes/patch error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// POST /notes/delete?id
router.post("/notes/delete", async (req, res): Promise<void> => {
  try {
    const id = Number(req.query["id"]);
    if (!id) { res.status(400).json({ error: "id required" }); return; }
    await db
      .delete(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.ownerKey, OWNER_KEY)));
    res.json({ deleted: 1 });
  } catch (err) {
    console.error("notes/delete error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// POST /notes/expand?id
router.post("/notes/expand", async (req, res): Promise<void> => {
  try {
    const id = Number(req.query["id"]);
    if (!id) { res.status(400).json({ error: "id required" }); return; }

    const { mode } = req.body as { mode: ExpandMode };
    const MODES: ExpandMode[] = ["develop", "steps", "risks", "route", "summarize"];
    if (!MODES.includes(mode)) {
      res.status(400).json({ error: "invalid mode" });
      return;
    }

    const [note] = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.ownerKey, OWNER_KEY)));

    if (!note) { res.status(404).json({ error: "Not found" }); return; }

    // For route mode — fetch people roles
    let peopleRoles: string[] = [];
    if (mode === "route") {
      const people = await db.select({ role: peopleTable.role }).from(peopleTable);
      peopleRoles = people.map(p => p.role);
    }

    const prompt = buildPrompt(mode, note.body, peopleRoles);
    const client = makeClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ text });
  } catch (err) {
    console.error("notes/expand error:", err);
    res.status(500).json({ error: "Failed to expand note" });
  }
});

export default router;
