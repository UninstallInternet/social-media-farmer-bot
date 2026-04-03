import "dotenv/config";
import { startPublishWorker } from "./server/jobs/publish-worker";
import { startTokenRefreshWorker } from "./server/jobs/token-refresh-worker";
import { enqueueScheduledPosts, setupRecurringJobs } from "./server/jobs/scheduler";

async function main() {
  console.log("Starting Instagram Scheduler workers...");

  // Start workers
  const publishWorker = startPublishWorker();
  const tokenRefreshWorker = startTokenRefreshWorker();

  // Set up recurring jobs
  await setupRecurringJobs();

  // Check for scheduled posts every 2 minutes
  const schedulerInterval = setInterval(async () => {
    try {
      const count = await enqueueScheduledPosts();
      if (count > 0) {
        console.log(`Enqueued ${count} posts for publishing`);
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  }, 2 * 60 * 1000);

  // Run initial check
  await enqueueScheduledPosts();

  console.log("Workers started successfully");

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down workers...");
    clearInterval(schedulerInterval);
    await publishWorker.close();
    await tokenRefreshWorker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  console.error("Worker startup failed:", error);
  process.exit(1);
});
