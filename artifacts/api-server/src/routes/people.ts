import { Router, type IRouter } from "express";
import { db, peopleTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/people", async (_req, res): Promise<void> => {
  const people = await db.select().from(peopleTable).orderBy(peopleTable.id);
  res.json(people.map(p => ({
    id: p.id,
    name: p.name,
    role: p.role,
    email: p.email ?? null,
  })));
});

export default router;
