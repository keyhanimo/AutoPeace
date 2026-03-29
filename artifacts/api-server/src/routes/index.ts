import { Router, type IRouter } from "express";
import healthRouter from "./health";
import forecastsRouter from "./forecasts";
import experimentsRouter from "./experiments";
import costsRouter from "./costs";
import evidenceRouter from "./evidence";
import changelogRouter from "./changelog";
import stakeholdersRouter from "./stakeholders";
import adminRouter from "./admin";
import dealsRouter from "./deals";
import proposalsRouter from "./proposals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(forecastsRouter);
router.use(experimentsRouter);
router.use(costsRouter);
router.use(evidenceRouter);
router.use(changelogRouter);
router.use(stakeholdersRouter);
router.use(dealsRouter);
router.use(proposalsRouter);
router.use(adminRouter);

export default router;
