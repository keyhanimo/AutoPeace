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
import communityForecastsRouter from "./community-forecasts";
import proposalSubmissionsRouter from "./proposal-submissions";
import downloadsRouter from "./downloads";
import scenariosRouter from "./scenarios";
import subscribeRouter from "./subscribe";
import { publicApiLimiter, submitLimiter, downloadLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

router.use(publicApiLimiter);

router.use(healthRouter);
router.use(forecastsRouter);
router.use(experimentsRouter);
router.use(costsRouter);
router.use(evidenceRouter);
router.use(changelogRouter);
router.use(stakeholdersRouter);
router.use(dealsRouter);
router.use(proposalsRouter);
router.use("/community-forecasts", submitLimiter);
router.use(communityForecastsRouter);
router.use(scenariosRouter);

router.use("/proposals/submit", submitLimiter);
router.use("/proposals/screen", submitLimiter);
router.use(proposalSubmissionsRouter);

router.use(subscribeRouter);

router.use("/downloads", downloadLimiter);
router.use(downloadsRouter);

router.use(adminRouter);

export default router;
