import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, businessesTable, reportsTable } from "@workspace/db";
import {
  GetDashboardStatsQueryParams,
  GetDashboardStatsResponse,
  GetTopBusinessesQueryParams,
  GetTopBusinessesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const RUB_TO_USD = 90;

function toUsd(amount: number, currency: string): number {
  return currency === "RUB" ? amount / RUB_TO_USD : amount;
}

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const query = GetDashboardStatsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const period = query.data.period ?? "month";

  const allBusinesses = await db.select().from(businessesTable);
  const activeCount = allBusinesses.filter(b => b.status === "active").length;

  const currencyMap = new Map(allBusinesses.map(b => [b.id, b.currency]));

  const reportRows = await db
    .select({
      businessId: reportsTable.businessId,
      revenue: reportsTable.revenue,
      orders: reportsTable.orders,
      profit: reportsTable.profit,
    })
    .from(reportsTable)
    .where(eq(reportsTable.period, period));

  let totalRevenue = 0;
  let totalOrders = 0;
  let totalProfit = 0;

  for (const row of reportRows) {
    const currency = currencyMap.get(row.businessId) ?? "USD";
    totalRevenue += toUsd(row.revenue, currency);
    totalOrders += row.orders;
    totalProfit += toUsd(row.profit, currency);
  }

  res.json(GetDashboardStatsResponse.parse({
    totalRevenue,
    totalOrders,
    totalProfit,
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
        currency: b.currency,
        revenue: r.revenue,
        orders: r.orders,
        profit: r.profit,
        _revenueUsd: toUsd(r.revenue, b.currency),
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
        currency: b.currency,
        revenue: 0,
        orders: 0,
        profit: 0,
        _revenueUsd: 0,
      });
    }
  }

  result.sort((a, b) => b._revenueUsd - a._revenueUsd);
  const sliced = result.slice(0, limit).map(({ _revenueUsd, ...rest }) => rest);
  res.json(GetTopBusinessesResponse.parse(sliced));
});

export default router;
