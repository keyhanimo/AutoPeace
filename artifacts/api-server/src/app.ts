import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

const QUIET_ROUTES = new Set([
  "/api/admin/cycle-status",
  "/api/status",
  "/api/status/stream",
  "/api/health",
  "/api/healthz",
  "/api/admin/config",
]);

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore(req) {
        const url = (req.url ?? "").split("?")[0];
        return QUIET_ROUTES.has(url);
      },
    },
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
