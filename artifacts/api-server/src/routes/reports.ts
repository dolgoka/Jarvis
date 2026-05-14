import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, reportsTable } from "@workspace/db";
import {
  ListReportsQueryParams,
  ListReportsResponse,
  CreateReportBody,
  FetchLatestReportQueryParams,
  FetchLatestReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports", async (req, res): Promise<void> => {
  const query = ListReportsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(reportsTable.businessId, query.data.businessId)];
  if (query.data.period) {
    conditions.push(eq(reportsTable.period, query.data.period));
  }
  const reports = await db.select().from(reportsTable)
    .where(and(...conditions))
    .orderBy(desc(reportsTable.date));
  res.json(ListReportsResponse.parse(reports.map(r => ({ ...r, notes: r.notes ?? null }))));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [report] = await db.insert(reportsTable).values({
    businessId: parsed.data.businessId,
    period: parsed.data.period,
    revenue: parsed.data.revenue,
    orders: parsed.data.orders,
    profit: parsed.data.profit,
    date: parsed.data.date,
    notes: parsed.data.notes,
  }).returning();
  res.status(201).json({ ...report, notes: report.notes ?? null });
});

router.get("/reports/latest", async (req, res): Promise<void> => {
  const query = FetchLatestReportQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(reportsTable.businessId, query.data.businessId)];
  if (query.data.period) {
    conditions.push(eq(reportsTable.period, query.data.period));
  }
  const [report] = await db.select().from(reportsTable)
    .where(and(...conditions))
    .orderBy(desc(reportsTable.date))
    .limit(1);
  if (!report) {
    res.status(404).json({ error: "No report found" });
    return;
  }
  res.json(FetchLatestReportResponse.parse({ ...report, notes: report.notes ?? null }));
});

export default router;
