import { z } from "zod";
import { router, publicProcedure } from "../lib/trpc";
import { db } from "../db";
import { jobLogs } from "../db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const logsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        action: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.action) conditions.push(eq(jobLogs.action, input.action));
      if (input.status) conditions.push(eq(jobLogs.status, input.status));

      const where = conditions.length > 0
        ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
        : undefined;

      const logs = await db.query.jobLogs.findMany({
        orderBy: [desc(jobLogs.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(jobLogs);

      return {
        logs,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  clear: publicProcedure.mutation(async () => {
    await db.delete(jobLogs);
    return { success: true };
  }),
});
