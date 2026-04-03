import { z } from "zod";
import { router, publicProcedure } from "../lib/trpc";
import { uploadFromUrl, uploadFromGoogleDrive } from "../lib/media";

export const mediaRouter = router({
  uploadFromUrl: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        filename: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await uploadFromUrl(input.url, input.filename);
      return result;
    }),

  uploadFromGoogleDrive: publicProcedure
    .input(
      z.object({
        driveUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await uploadFromGoogleDrive(input.driveUrl);
      return result;
    }),
});
