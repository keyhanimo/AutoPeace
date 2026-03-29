import { Router } from "express";
import { db } from "@workspace/db";
import { emailSubscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { adminAuth } from "../lib/admin-auth";

const router = Router();

router.post("/subscribe", async (req, res) => {
  try {
    const { email, name, source } = req.body as {
      email?: string;
      name?: string;
      source?: string;
    };

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }

    const normalised = email.toLowerCase().trim();

    const existing = await db.select()
      .from(emailSubscriptionsTable)
      .where(eq(emailSubscriptionsTable.email, normalised));

    if (existing.length > 0) {
      if (existing[0]!.unsubscribedAt) {
        await db.update(emailSubscriptionsTable)
          .set({ unsubscribedAt: null, subscribedAt: new Date() })
          .where(eq(emailSubscriptionsTable.email, normalised));
        res.json({ message: "Welcome back! You have been re-subscribed to AutoPeace research updates." });
        return;
      }
      res.json({ message: "You are already subscribed to AutoPeace research updates." });
      return;
    }

    const id = randomUUID();
    await db.insert(emailSubscriptionsTable).values({
      id,
      email: normalised,
      name: name?.trim() || null,
      source: source || "web",
      confirmed: false,
    });

    console.info(`[subscribe] New subscriber: ${normalised} (source: ${source ?? "web"})`);

    res.json({
      id,
      message: "Subscribed! You will receive AutoPeace research updates whenever a new analysis cycle completes.",
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/subscribe", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const normalised = email.toLowerCase().trim();
    await db.update(emailSubscriptionsTable)
      .set({ unsubscribedAt: new Date() })
      .where(eq(emailSubscriptionsTable.email, normalised));
    res.json({ message: "You have been unsubscribed from AutoPeace research updates." });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/admin/subscribers", adminAuth, async (_req, res) => {
  try {
    const subscribers = await db.select()
      .from(emailSubscriptionsTable)
      .orderBy(emailSubscriptionsTable.subscribedAt);
    const active = subscribers.filter(s => !s.unsubscribedAt);
    res.json({ data: subscribers, activeCount: active.length, total: subscribers.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
