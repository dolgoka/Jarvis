import { Router, type IRouter } from "express";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import {
  db,
  businessesTable,
  metricsTable,
  roadmapTable,
  coverageTable,
  peopleTable,
  reportsTable,
} from "@workspace/db";
import {
  GetBusinessCardQueryParams,
  GetBusinessCardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/businesses/card", async (req, res): Promise<void> => {
  const query = GetBusinessCardQueryParams.safeParse({ id: Number(req.query.id) });
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { id } = query.data;

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, id));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const [metrics, roadmap, coverage, topManagement, reports] = await Promise.all([
    db.select().from(metricsTable).where(eq(metricsTable.businessId, id)),
    db.select().from(roadmapTable).where(eq(roadmapTable.businessId, id)).orderBy(roadmapTable.date),
    db.select().from(coverageTable).where(eq(coverageTable.businessId, id)),
    db.select().from(peopleTable).where(
      and(eq(peopleTable.businessId, id), isNotNull(peopleTable.cLevel))
    ),
    db.select().from(reportsTable)
      .where(eq(reportsTable.businessId, id))
      .orderBy(desc(reportsTable.date))
      .limit(1),
  ]);

  const latestReport = reports[0] ?? null;

  const payload = {
    business: {
      id:           business.id,
      name:         business.name,
      city:         business.city,
      country:      business.country,
      industry:     business.industry,
      status:       business.status,
      health:       business.health,
      currency:     business.currency,
      stage:        business.stage,
      circle:       business.circle,
      managerId:    business.managerId,
      managerName:  business.managerName,
      managerEmail: business.managerEmail,
      createdAt:    business.createdAt.toISOString(),
      description:  business.description ?? null,
      partners:     (business.partners as Array<{ label: string; share: number }> | null) ?? null,
      nonFinancial: (business.nonFinancial as { reputation: string; concept: string; media: string; note?: string } | null) ?? null,
    },
    metrics: metrics.map(m => ({
      id:              m.id,
      businessId:      m.businessId,
      stageScope:      m.stageScope,
      key:             m.key,
      label:           m.label,
      unit:            m.unit,
      plan:            m.plan,
      fact:            m.fact,
      period:          m.period,
      ownerRole:       m.ownerRole,
      thresholdYellow: m.thresholdYellow,
      thresholdRed:    m.thresholdRed,
      date:            m.date,
      note:            m.note ?? null,
    })),
    roadmap: roadmap.map(r => ({
      id:         r.id,
      businessId: r.businessId,
      title:      r.title,
      date:       r.date,
      status:     r.status,
      note:       r.note ?? null,
    })),
    coverage: coverage.map(c => ({
      id:         c.id,
      businessId: c.businessId,
      area:       c.area,
      closed:     c.closed,
      ownerRole:  c.ownerRole,
      note:       c.note ?? null,
    })),
    topManagement: topManagement
      .filter(p => p.cLevel !== null)
      .map(p => ({
        id:            p.id,
        name:          p.name,
        role:          p.role,
        cLevel:        p.cLevel as string,
        effectiveness: p.effectiveness ?? null,
        email:         p.email ?? null,
      })),
    latestReport: latestReport
      ? {
          id:         latestReport.id,
          businessId: latestReport.businessId,
          period:     latestReport.period,
          revenue:    latestReport.revenue,
          orders:     latestReport.orders,
          profit:     latestReport.profit,
          date:       latestReport.date,
          notes:      latestReport.notes ?? null,
        }
      : null,
  };

  res.json(GetBusinessCardResponse.parse(payload));
});

export default router;
