import { Worker } from "bullmq";
import IORedis from "ioredis";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { lt, eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { refreshLongLivedToken } from "../lib/instagram-api";
import { encrypt } from "../lib/encryption";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function refreshExpiringTokens() {
  // Find accounts with tokens expiring within 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringAccounts = await db.query.accounts.findMany({
    where: and(
      lt(schema.accounts.tokenExpiresAt, sevenDaysFromNow),
      eq(schema.accounts.isActive, true)
    ),
  });

  console.log(`Found ${expiringAccounts.length} accounts with expiring tokens`);

  for (const account of expiringAccounts) {
    try {
      const result = await refreshLongLivedToken(account.accessToken);
      const newExpiry = new Date(Date.now() + result.expiresIn * 1000);

      await db
        .update(schema.accounts)
        .set({
          accessToken: encrypt(result.accessToken),
          tokenExpiresAt: newExpiry,
          updatedAt: new Date(),
        })
        .where(eq(schema.accounts.id, account.id));

      await db.insert(schema.tokenRefreshLog).values({
        accountId: account.id,
        oldExpiry: account.tokenExpiresAt,
        newExpiry,
        success: true,
      });

      console.log(`Refreshed token for @${account.username}, new expiry: ${newExpiry.toISOString()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await db.insert(schema.tokenRefreshLog).values({
        accountId: account.id,
        oldExpiry: account.tokenExpiresAt,
        success: false,
        errorMessage,
      });

      console.error(`Failed to refresh token for @${account.username}: ${errorMessage}`);
    }
  }
}

export function startTokenRefreshWorker() {
  const worker = new Worker(
    "token-refresh",
    async () => {
      await refreshExpiringTokens();
    },
    { connection }
  );

  worker.on("completed", () => {
    console.log("Token refresh cycle completed");
  });

  worker.on("failed", (_job, err) => {
    console.error("Token refresh cycle failed:", err.message);
  });

  return worker;
}
