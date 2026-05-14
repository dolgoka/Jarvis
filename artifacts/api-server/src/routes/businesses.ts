import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";
import {
  ListBusinessesResponse,
  CreateBusinessBody,
  GetBusinessParams,
  GetBusinessResponse,
  UpdateBusinessParams,
  UpdateBusinessBody,
  UpdateBusinessResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/businesses", async (_req, res): Promise<void> => {
  const businesses = await db.select().from(businessesTable).orderBy(businessesTable.name);
  res.json(ListBusinessesResponse.parse(businesses.map(b => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    description: b.description ?? null,
  }))));
});

router.post("/businesses", async (req, res): Promise<void> => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [business] = await db.insert(businessesTable).values({
    name: parsed.data.name,
    city: parsed.data.city,
    country: parsed.data.country,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    industry: parsed.data.industry,
    managerName: parsed.data.managerName,
    managerEmail: parsed.data.managerEmail,
    description: parsed.data.description,
    status: "active",
    managerId: 0,
  }).returning();
  res.status(201).json(GetBusinessResponse.parse({
    ...business,
    createdAt: business.createdAt.toISOString(),
    description: business.description ?? null,
  }));
});

router.get("/businesses/:id", async (req, res): Promise<void> => {
  const params = GetBusinessParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id));
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  res.json(GetBusinessResponse.parse({
    ...business,
    createdAt: business.createdAt.toISOString(),
    description: business.description ?? null,
  }));
});

router.patch("/businesses/:id", async (req, res): Promise<void> => {
  const params = UpdateBusinessParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [business] = await db.update(businessesTable)
    .set(parsed.data)
    .where(eq(businessesTable.id, params.data.id))
    .returning();
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  res.json(UpdateBusinessResponse.parse({
    ...business,
    createdAt: business.createdAt.toISOString(),
    description: business.description ?? null,
  }));
});

export default router;
