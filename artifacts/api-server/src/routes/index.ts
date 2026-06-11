import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessesRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(managersRouter);
router.use(aiRouter);
router.use(eventsRouter);
router.use(voiceRouter);
router.use(peopleRouter);
router.use(tasksRouter);
router.use(feedRouter);

export default router;
