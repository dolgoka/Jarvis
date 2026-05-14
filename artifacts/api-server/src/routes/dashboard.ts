import { Router, type IRouter } from "express";
import { eq, sum, count } from "drizzle-orm";
import { db, businessesTable, reportsTable } from "@workspace/db";
import {
  GetDashboardStatsQueryParams,
  GetDashboardStatsResponse,
  GetTopBusinessesQueryParams,
  GetTopBusinessesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const query = GetDashboardStatsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const period = query.data.period ?? "month";

  const allBusinesses = await db.select().from(businessesTable);
  const activeCount = allBusinesses.filter(b => b.status === "active").length;

  const reportRows = await db.select({
    revenue: sum(reportsTable.revenue),
    orders: sum(reportsTable.orders),
    profit: sum(reportsTable.profit),
  }).from(reportsTable).where(eq(reportsTable.period, period));

  const row = reportRows[0];
  res.json(GetDashboardStatsResponse.parse({
    totalRevenue: parseFloat(row?.revenue ?? "0"),
    totalOrders: parseInt(String(row?.orders ?? "0"), 10),
    totalProfit: parseFloat(row?.profit ?? "0"),
    activeBusinesses: activeCount,
    totalBusinesses: allBusinesses.length,
    period,
  }));
});

router.get("/dashboard/top-businesses", async (req, res): Promise<void> => {
  const query = GetTopBusinessesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const period = query.data.period ?? "month";
  const limit = query.data.limit ?? 10;

  const businesses = await db.select().from(businessesTable);
  const result = [];

  for (const b of businesses) {
    const reports = await db.select().from(reportsTable)
      .where(eq(reportsTable.businessId, b.id) && eq(reportsTable.period, period))
      .orderBy(reportsTable.date)
      .limit(1);

    if (reports.length > 0) {
      const r = reports[0];
      result.push({
        id: b.id,
        name: b.name,
        city: b.city,
        country: b.country,
        lat: b.lat,
        lng: b.lng,
        industry: b.industry,
        revenue: r.revenue,
        orders: r.orders,
        profit: r.profit,
      });
    } else {
      result.push({
        id: b.id,
        name: b.name,
        city: b.city,
        country: b.country,
        lat: b.lat,
        lng: b.lng,
        industry: b.industry,
        revenue: 0,
        orders: 0,
        profit: 0,
      });
    }
  }

  result.sort((a, b) => b.revenue - a.revenue);
  res.json(GetTopBusinessesResponse.parse(result.slice(0, limit)));
});

export default router;
