import rateLimit from "express-rate-limit";

export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment before retrying." },
  skip: (req) => req.path.startsWith("/admin"),
});

export const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Submission rate limit reached. Please wait 15 minutes before submitting again." },
});

export const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Download rate limit reached. Please wait before downloading again." },
});
