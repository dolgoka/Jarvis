import { Router, type IRouter } from "express";
import { db, businessesTable } from "@workspace/db";
import { ConnectBusinessBody, GetBusinessResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/managers/connect", async (req, res): Promise<void> => {
  const parsed = ConnectBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ACCESS_CODE = "JARVIS2024";
  if (parsed.data.accessCode !== ACCESS_CODE) {
    res.status(403).json({ error: "Invalid access code" });
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

export default router;
