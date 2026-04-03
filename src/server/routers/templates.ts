import { z } from "zod";
import { router, publicProcedure } from "../lib/trpc";
import { db } from "../db";
import { templates } from "../db/schema";
import { eq } from "drizzle-orm";

export const templatesRouter = router({
  list: publicProcedure.query(async () => {
    return db.query.templates.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        captionTemplate: z.string().optional(),
        defaultHashtags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [template] = await db.insert(templates).values(input).returning();
      return template;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        captionTemplate: z.string().optional(),
        defaultHashtags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.update(templates).set(data).where(eq(templates.id, id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(templates).where(eq(templates.id, input.id));
      return { success: true };
    }),
});
