import { publishQueue, tokenRefreshQueue } from "./queue";
import { db } from "../db";
import { eq, and, lte, gt } from "drizzle-orm";
import * as schema from "../db/schema";

// Check for posts that need to be published and enqueue them
export async function enqueueScheduledPosts() {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Find posts scheduled within the next 5 minutes that are still in "scheduled" status
  const duePosts = await db.query.posts.findMany({
    where: and(
      eq(schema.posts.status, "scheduled"),
      lte(schema.posts.scheduledAt, fiveMinutesFromNow),
      gt(schema.posts.scheduledAt, new Date(now.getTime() - 60 * 60 * 1000)) // Not more than 1 hour overdue
    ),
  });

  for (const post of duePosts) {
    const delay = Math.max(
      0,
      new Date(post.scheduledAt!).getTime() - now.getTime()
    );

    await publishQueue.add(
      `publish-${post.id}`,
      { postId: post.id },
      {
        delay,
        jobId: `publish-${post.id}`, // Prevent duplicates
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 30_000, // 30s, 60s, 120s
        },
      }
    );

    console.log(
      `Enqueued post ${post.id} for @${post.accountId}, delay: ${Math.round(delay / 1000)}s`
    );
  }

  return duePosts.length;
}

// Schedule the token refresh repeatable job
export async function setupRecurringJobs() {
  // Token refresh: every 12 hours
  await tokenRefreshQueue.add(
    "refresh-tokens",
    {},
    {
      repeat: {
        pattern: "0 */12 * * *", // Every 12 hours
      },
      jobId: "recurring-token-refresh",
    }
  );

  console.log("Recurring token refresh job scheduled");
}
