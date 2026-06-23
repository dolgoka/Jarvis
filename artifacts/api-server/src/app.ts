import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import healthRouter from "./routes/health";
import { requireAuth } from "./middlewares/auth";
import { logger } from "./lib/logger";

const app: Express = express();

// Replit runs behind a proxy — trust the first hop so rate-limiters
// see the real client IP from X-Forwarded-For instead of the proxy IP.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Allow Replit domains, Railway domains, and any explicit origins in CORS_ORIGINS.
const explicitOrigins = (process.env.CORS_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / server-to-server
    if (origin.endsWith(".replit.dev") || origin.endsWith(".replit.app")) return cb(null, true);
    if (origin.endsWith(".railway.app") || origin.endsWith(".up.railway.app")) return cb(null, true);
    if (explicitOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public: health check (no token required)
app.use("/api", healthRouter);

// Protected: all other routes require a valid API token
app.use("/api", requireAuth, router);

// Serve the built frontend in production (Railway / any non-Replit host)
// The frontend is built by nixpacks into artifacts/business-jarvis/dist/public
const frontendDist = path.resolve(__dirname, "../../business-jarvis/dist/public");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback — explicitly exclude /api/* so API routes are never shadowed
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/") || req.path === "/api") return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
  logger.info({ frontendDist }, "[static] Serving frontend build");
} else {
  logger.warn({ frontendDist }, "[static] Frontend build not found — API-only mode");
}

export default app;
