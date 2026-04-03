import { z } from "zod";
import { router, publicProcedure } from "../lib/trpc";
import { db } from "../db";
import { groups, groupMembers, accounts } from "../db/schema";
import { eq, inArray } from "drizzle-orm";

export const groupsRouter = router({
  list: publicProcedure.query(async () => {
    const allGroups = await db.query.groups.findMany({
      with: {
        members: {
          with: {
            account: {
              columns: {
                id: true,
                username: true,
                profilePicUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: (g, { asc }) => [asc(g.name)],
    });

    return allGroups.map((g) => ({
      ...g,
      accounts: g.members.map((m) => m.account),
      memberCount: g.members.length,
    }));
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3B82F6"),
        accountIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ input }) => {
      const [group] = await db.insert(groups).values({
        name: input.name,
        color: input.color,
      }).returning();

      if (input.accountIds.length > 0) {
        await db.insert(groupMembers).values(
          input.accountIds.map((accountId) => ({
            groupId: group.id,
            accountId,
          }))
        );
      }

      return group;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        accountIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, accountIds, ...data } = input;

      if (Object.keys(data).length > 0) {
        await db.update(groups).set(data).where(eq(groups.id, id));
      }

      if (accountIds !== undefined) {
        // Replace all members
        await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
        if (accountIds.length > 0) {
          await db.insert(groupMembers).values(
            accountIds.map((accountId) => ({
              groupId: id,
              accountId,
            }))
          );
        }
      }

      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(groups).where(eq(groups.id, input.id));
      return { success: true };
    }),
});
