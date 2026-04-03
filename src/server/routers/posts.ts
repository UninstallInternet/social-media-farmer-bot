import { z } from "zod";
import { router, publicProcedure } from "../lib/trpc";
import { db } from "../db";
import { posts, postMedia } from "../db/schema";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import { publishQueue } from "../jobs/queue";

export const postsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
        status: z.enum(["draft", "scheduled", "publishing", "published", "failed"]).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const filters = input;
      const conditions = [];

      if (filters.accountId) {
        conditions.push(eq(posts.accountId, filters.accountId));
      }
      if (filters.status) {
        conditions.push(eq(posts.status, filters.status));
      }
      if (filters.from) {
        conditions.push(gte(posts.scheduledAt, new Date(filters.from)));
      }
      if (filters.to) {
        conditions.push(lte(posts.scheduledAt, new Date(filters.to)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db.query.posts.findMany({
        where,
        with: {
          media: { orderBy: (m, { asc }) => [asc(m.sortOrder)] },
          account: {
            columns: { id: true, username: true, profilePicUrl: true },
          },
        },
        orderBy: [desc(posts.scheduledAt)],
        limit: filters.limit,
        offset: filters.offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(where);

      return {
        posts: results,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.posts.findFirst({
        where: eq(posts.id, input.id),
        with: {
          media: { orderBy: (m, { asc }) => [asc(m.sortOrder)] },
          account: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        caption: z.string().max(2200).optional(),
        hashtags: z.string().optional(),
        mediaType: z.enum(["image", "carousel", "reel"]),
        scheduledAt: z.string().datetime().optional(),
        media: z.array(
          z.object({
            mediaUrl: z.string().url(),
            mediaType: z.enum(["image", "video"]),
            sortOrder: z.number(),
            altText: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const status = input.scheduledAt ? "scheduled" : "draft";

      const [post] = await db
        .insert(posts)
        .values({
          accountId: input.accountId,
          caption: input.caption,
          hashtags: input.hashtags,
          mediaType: input.mediaType,
          status,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        })
        .returning();

      if (input.media.length > 0) {
        await db.insert(postMedia).values(
          input.media.map((m) => ({
            postId: post.id,
            mediaUrl: m.mediaUrl,
            mediaType: m.mediaType,
            sortOrder: m.sortOrder,
            altText: m.altText,
          }))
        );
      }

      return post;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        caption: z.string().max(2200).optional(),
        hashtags: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
        status: z.enum(["draft", "scheduled"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db
        .update(posts)
        .set({
          ...data,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(posts).where(eq(posts.id, input.id));
      return { success: true };
    }),

  retry: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db
        .update(posts)
        .set({ status: "scheduled", errorMessage: null, updatedAt: new Date() })
        .where(eq(posts.id, input.id));

      await publishQueue.add(
        `publish-${input.id}`,
        { postId: input.id },
        {
          jobId: `retry-${input.id}-${Date.now()}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
        }
      );

      return { success: true };
    }),

  bulkDelete: publicProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ input }) => {
      await db.delete(posts).where(inArray(posts.id, input.ids));
      return { success: true, count: input.ids.length };
    }),

  bulkReschedule: publicProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        shiftMinutes: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      for (const id of input.ids) {
        const post = await db.query.posts.findFirst({
          where: eq(posts.id, id),
        });
        if (post?.scheduledAt) {
          const newDate = new Date(
            post.scheduledAt.getTime() + input.shiftMinutes * 60 * 1000
          );
          await db
            .update(posts)
            .set({ scheduledAt: newDate, updatedAt: new Date() })
            .where(eq(posts.id, id));
        }
      }
      return { success: true };
    }),

  stats: publicProcedure.query(async () => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [scheduledToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.status, "scheduled"),
          gte(posts.scheduledAt, startOfDay),
          lte(posts.scheduledAt, endOfDay)
        )
      );

    const [publishedToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.status, "published"),
          gte(posts.publishedAt, startOfDay),
          lte(posts.publishedAt, endOfDay)
        )
      );

    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.status, "scheduled"));

    const [failed] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.status, "failed"));

    return {
      scheduledToday: Number(scheduledToday?.count ?? 0),
      publishedToday: Number(publishedToday?.count ?? 0),
      pending: Number(pending?.count ?? 0),
      failed: Number(failed?.count ?? 0),
    };
  }),
});
