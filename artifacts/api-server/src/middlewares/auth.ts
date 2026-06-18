import type { Request, Response, NextFunction } from "express";

const API_TOKEN = process.env.API_TOKEN;

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!API_TOKEN) {
    res.status(503).json({ error: "Server auth not configured" });
    return;
  }

  const xToken = req.header("x-api-token");
  if (xToken === API_TOKEN) {
    next();
    return;
  }

  const authHeader = req.header("authorization");
  const bearerToken =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearerToken === API_TOKEN) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}
