import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { accounts } from "@/server/db/schema";
import { encrypt } from "@/server/lib/encryption";
import {
  exchangeForLongLivedToken,
  getUserPages,
  getInstagramAccountFromPage,
  getUserProfile,
} from "@/server/lib/instagram-api";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/accounts?error=no_code", request.url)
    );
  }

  try {
    // Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI!)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    // Exchange for long-lived token
    const longLived = await exchangeForLongLivedToken(tokenData.access_token);

    // Get user's Facebook pages
    const pages = await getUserPages(longLived.accessToken);

    if (!pages.data || pages.data.length === 0) {
      return NextResponse.redirect(
        new URL("/accounts?error=no_pages", request.url)
      );
    }

    // For each page, check if it has an Instagram business account
    let addedCount = 0;
    for (const page of pages.data) {
      const igAccount = await getInstagramAccountFromPage(
        page.id,
        page.access_token
      );

      if (igAccount) {
        // Get the IG user profile
        const profile = await getUserProfile(igAccount.id, encrypt(longLived.accessToken));

        // Upsert account
        const existing = await db.query.accounts.findFirst({
          where: eq(accounts.instagramUserId, igAccount.id),
        });

        const tokenExpiry = new Date(Date.now() + longLived.expiresIn * 1000);

        if (existing) {
          await db
            .update(accounts)
            .set({
              accessToken: encrypt(longLived.accessToken),
              tokenExpiresAt: tokenExpiry,
              username: profile.username,
              displayName: profile.name,
              profilePicUrl: profile.profile_picture_url,
              facebookPageId: page.id,
              updatedAt: new Date(),
            })
            .where(eq(accounts.id, existing.id));
        } else {
          await db.insert(accounts).values({
            instagramUserId: igAccount.id,
            username: profile.username,
            displayName: profile.name,
            profilePicUrl: profile.profile_picture_url,
            accessToken: encrypt(longLived.accessToken),
            tokenExpiresAt: tokenExpiry,
            facebookPageId: page.id,
          });
        }
        addedCount++;
      }
    }

    return NextResponse.redirect(
      new URL(`/accounts?added=${addedCount}`, request.url)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Facebook OAuth callback error:", message);
    return NextResponse.redirect(
      new URL(
        `/accounts?error=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}
