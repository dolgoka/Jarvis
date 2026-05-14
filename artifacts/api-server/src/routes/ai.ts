import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, businessesTable, reportsTable } from "@workspace/db";
import { GetAiSummaryQueryParams, GetAiSummaryResponse } from "@workspace/api-zod";
import OpenAI from "openai";

const router: IRouter = Router();

router.get("/ai/summary", async (req, res): Promise<void> => {
  const query = GetAiSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const period = query.data.period ?? "month";

  const businesses = await db.select().from(businessesTable);
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.period, period));

  const businessSummaries = businesses.map(b => {
    const bReports = reports.filter(r => r.businessId === b.id);
    const latestReport = bReports.sort((a, z) => z.date.localeCompare(a.date))[0];
    return {
      name: b.name,
      city: b.city,
      country: b.country,
      industry: b.industry,
      status: b.status,
      revenue: latestReport?.revenue ?? 0,
      orders: latestReport?.orders ?? 0,
      profit: latestReport?.profit ?? 0,
    };
  });

  const totalRevenue = businessSummaries.reduce((s, b) => s + b.revenue, 0);
  const totalProfit = businessSummaries.reduce((s, b) => s + b.profit, 0);
  const totalOrders = businessSummaries.reduce((s, b) => s + b.orders, 0);

  if (businesses.length === 0) {
    res.json(GetAiSummaryResponse.parse({
      period,
      summary: "No businesses connected yet. Use the Connect Business page to add your first business.",
      highlights: ["No data available"],
      generatedAt: new Date().toISOString(),
    }));
    return;
  }

  const client = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });

  const dataContext = JSON.stringify(businessSummaries, null, 2);
  const prompt = `You are a chief intelligence officer for a global enterprise. Analyze this ${period} business performance data and provide an executive briefing.

Data across ${businesses.length} businesses:
Total Revenue: $${totalRevenue.toLocaleString()}
Total Profit: $${totalProfit.toLocaleString()}
Total Orders: ${totalOrders.toLocaleString()}

Individual business data:
${dataContext}

Respond in JSON with exactly this structure:
{
  "summary": "2-3 sentence executive summary of the overall portfolio performance, key trends, and most important takeaway",
  "highlights": ["bullet 1 — specific insight or action", "bullet 2", "bullet 3", "bullet 4", "bullet 5"]
}

Be direct, data-driven, and precise. No fluff. Identify top performers, underperformers, and recommend focus areas.`;

  const completion = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { summary?: string; highlights?: string[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { summary: content, highlights: [] };
  }

  res.json(GetAiSummaryResponse.parse({
    period,
    summary: parsed.summary ?? "No summary available.",
    highlights: parsed.highlights ?? [],
    generatedAt: new Date().toISOString(),
  }));
});

export default router;
