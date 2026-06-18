import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.use(businessCardRouter);
router.use(businessesRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(managersRouter);
router.use(aiRouter);
router.use(eventsRouter);
router.use(voiceRouter);
router.use(peopleRouter);
router.use(tasksRouter);
router.use(feedNewsRouter);
router.use(feedRouter);
router.use(notesRouter);

export default router;
