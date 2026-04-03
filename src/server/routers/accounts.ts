import { z } from "zod";
import { router, publicProcedure } from "../lib/trpc";
import { db } from "../db";
import { accounts, posts } from "../db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { encrypt } from "../lib/encryption";

export const accountsRouter = router({
  list: publicProcedure.query(async () => {
    const allAccounts = await db.query.accounts.findMany({
      orderBy: (a, { asc }) => [asc(a.username)],
    });

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return Promise.all(
      allAccounts.map(async (account) => {
        // Count today's posts
        const todayPosts = await db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(
            and(
              eq(posts.accountId, account.id),
              eq(posts.status, "published"),
              gte(posts.publishedAt, startOfDay),
              lte(posts.publishedAt, endOfDay)
            )
          );

        // Count scheduled posts
        const scheduledPosts = await db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(
            and(
              eq(posts.accountId, account.id),
              eq(posts.status, "scheduled")
            )
          );

        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        let tokenStatus: "valid" | "expiring" | "expired" = "valid";
        if (account.tokenExpiresAt < now) {
          tokenStatus = "expired";
        } else if (account.tokenExpiresAt < sevenDays) {
          tokenStatus = "expiring";
        }

        return {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          profilePicUrl: account.profilePicUrl,
          isActive: account.isActive,
          tokenStatus,
          tokenExpiresAt: account.tokenExpiresAt,
          postingConfig: account.postingConfig,
          postsToday: Number(todayPosts[0]?.count ?? 0),
          scheduledCount: Number(scheduledPosts[0]?.count ?? 0),
          createdAt: account.createdAt,
        };
      })
    );
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.accounts.findFirst({
        where: eq(accounts.id, input.id),
      });
    }),

  toggleActive: publicProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(accounts)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(accounts.id, input.id));
      return { success: true };
    }),

  updatePostingConfig: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        config: z.object({
          maxPostsPerDay: z.number().min(1).max(50),
          postingWindows: z.array(
            z.object({ start: z.string(), end: z.string() })
          ),
          timezone: z.string(),
          minGapMinutes: z.number().min(0),
          blackoutDates: z.array(z.string()),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(accounts)
        .set({ postingConfig: input.config, updatedAt: new Date() })
        .where(eq(accounts.id, input.id));
      return { success: true };
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(accounts).where(eq(accounts.id, input.id));
      return { success: true };
    }),

  // Manually add an account with a token
  addManual: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        instagramUserId: z.string().min(1),
        facebookPageId: z.string().min(1),
        accessToken: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      // Check if account already exists
      const existing = await db.query.accounts.findFirst({
        where: eq(accounts.instagramUserId, input.instagramUserId),
      });

      const encryptedToken = encrypt(input.accessToken);
      // Default to 60 days from now (long-lived token duration)
      const tokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      if (existing) {
        await db
          .update(accounts)
          .set({
            username: input.username,
            accessToken: encryptedToken,
            tokenExpiresAt: tokenExpiry,
            facebookPageId: input.facebookPageId,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existing.id));
        return { id: existing.id, updated: true };
      }

      const [account] = await db
        .insert(accounts)
        .values({
          instagramUserId: input.instagramUserId,
          username: input.username,
          accessToken: encryptedToken,
          tokenExpiresAt: tokenExpiry,
          facebookPageId: input.facebookPageId,
        })
        .returning();

      return { id: account.id, updated: false };
    }),
});
