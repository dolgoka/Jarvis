import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import businessesRouter from "./businesses";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import managersRouter from "./managers";
import aiRouter from "./ai";
import eventsRouter from "./events";
import voiceRouter from "./voice";
import peopleRouter from "./people";
import tasksRouter from "./tasks";
import feedRouter from "./feed";
import feedNewsRouter from "./feedNews";
import notesRouter from "./notes";
import businessCardRouter from "./businessCard";

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов, попробуйте позже" },
});

const router: IRouter = Router();

router.use(businessCardRouter);
router.use(businessesRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(managersRouter);
router.use(aiLimiter, aiRouter);
router.use(eventsRouter);
router.use(aiLimiter, voiceRouter);
router.use(peopleRouter);
router.use(tasksRouter);
router.use(feedNewsRouter);
router.use(aiLimiter, feedRouter);
router.use(aiLimiter, notesRouter);

export default router;
