import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
// Allow any *.replit.dev or *.replit.app origin (covers dev preview + deployed app)
// plus any explicit origins listed in CORS_ORIGINS.
const explicitOrigins = (process.env.CORS_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / server-to-server
    if (origin.endsWith(".replit.dev") || origin.endsWith(".replit.app")) return cb(null, true);
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

export default app;
