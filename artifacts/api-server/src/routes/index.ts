import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessesRouter from "./businesses";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import managersRouter from "./managers";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessesRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(managersRouter);
router.use(aiRouter);

export default router;
