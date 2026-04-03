import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import * as igApi from "../lib/instagram-api";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

interface PublishJobData {
  postId: string;
}

async function processPublishJob(job: Job<PublishJobData>) {
  const { postId } = job.data;

  // Fetch post with media and account
  const post = await db.query.posts.findFirst({
    where: eq(schema.posts.id, postId),
    with: {
      media: { orderBy: (m, { asc }) => [asc(m.sortOrder)] },
      account: true,
    },
  });

  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }

  if (!post.account.isActive) {
    throw new Error(`Account ${post.account.username} is inactive`);
  }

  // Update status to publishing
  await db
    .update(schema.posts)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(eq(schema.posts.id, postId));

  const fullCaption = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
  const igUserId = post.account.instagramUserId;
  const token = post.account.accessToken;

  try {
    let containerId: string;

    if (post.mediaType === "image") {
      // Single image
      const media = post.media[0];
      if (!media) throw new Error("No media attached to image post");

      const container = await igApi.createImageContainer(igUserId, token, {
        imageUrl: media.mediaUrl,
        caption: fullCaption,
        altText: media.altText ?? undefined,
      });
      containerId = container.id;
    } else if (post.mediaType === "reel") {
      // Video reel
      const media = post.media[0];
      if (!media) throw new Error("No media attached to reel post");

      const container = await igApi.createReelContainer(igUserId, token, {
        videoUrl: media.mediaUrl,
        caption: fullCaption,
      });
      containerId = container.id;

      // Wait for video processing
      await igApi.waitForContainerReady(containerId, token);
    } else if (post.mediaType === "carousel") {
      // Carousel: create children first
      const childIds: string[] = [];
      for (const media of post.media) {
        let child: { id: string };
        if (media.mediaType === "video") {
          child = await igApi.createCarouselChildVideo(igUserId, token, {
            videoUrl: media.mediaUrl,
          });
          // Wait for each video child to process
          await igApi.waitForContainerReady(child.id, token);
        } else {
          child = await igApi.createCarouselChildImage(igUserId, token, {
            imageUrl: media.mediaUrl,
            altText: media.altText ?? undefined,
          });
        }
        childIds.push(child.id);

        // Update child container ID
        await db
          .update(schema.postMedia)
          .set({ igContainerId: child.id })
          .where(eq(schema.postMedia.id, media.id));
      }

      // Create carousel parent
      const container = await igApi.createCarouselContainer(igUserId, token, {
        childrenIds: childIds,
        caption: fullCaption,
      });
      containerId = container.id;
    } else {
      throw new Error(`Unknown media type: ${post.mediaType}`);
    }

    // Publish
    const result = await igApi.publishMedia(igUserId, token, containerId);

    // Update post as published
    await db
      .update(schema.posts)
      .set({
        status: "published",
        igContainerId: containerId,
        igMediaId: result.id,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, postId));

    return { success: true, mediaId: result.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(schema.posts)
      .set({
        status: "failed",
        errorMessage,
        retryCount: (post.retryCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, postId));

    throw error; // Re-throw for BullMQ retry logic
  }
}

export function startPublishWorker() {
  const worker = new Worker<PublishJobData>(
    "instagram-publish",
    processPublishJob,
    {
      connection,
      concurrency: 3, // Process up to 3 posts concurrently
      limiter: {
        max: 10,
        duration: 60_000, // Max 10 jobs per minute across all accounts
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`Post published successfully: ${job.data.postId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Post publish failed: ${job?.data.postId}`, err.message);
  });

  return worker;
}
