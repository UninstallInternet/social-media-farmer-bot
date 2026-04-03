import { router } from "../lib/trpc";
import { accountsRouter } from "./accounts";
import { postsRouter } from "./posts";
import { mediaRouter } from "./media";
import { templatesRouter } from "./templates";
import { groupsRouter } from "./groups";
import { logsRouter } from "./logs";

export const appRouter = router({
  accounts: accountsRouter,
  posts: postsRouter,
  media: mediaRouter,
  templates: templatesRouter,
  groups: groupsRouter,
  logs: logsRouter,
});

export type AppRouter = typeof appRouter;
