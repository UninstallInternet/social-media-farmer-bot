import { decrypt } from "./encryption";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

interface ApiResponse<T = Record<string, unknown>> {
  data?: T;
  error?: { message: string; type: string; code: number };
}

interface ContainerStatus {
  id: string;
  status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
}

interface MediaPublishResult {
  id: string;
}

interface TokenRefreshResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

async function graphFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GRAPH_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (json.error) {
    throw new Error(
      `Instagram API Error [${json.error.code}]: ${json.error.message}`
    );
  }

  return json as T;
}

// Get user profile info
export async function getUserProfile(
  igUserId: string,
  encryptedToken: string
): Promise<UserProfile> {
  const token = decrypt(encryptedToken);
  return graphFetch<UserProfile>(
    `/${igUserId}?fields=id,username,name,profile_picture_url&access_token=${token}`
  );
}

// Create a single image container
export async function createImageContainer(
  igUserId: string,
  encryptedToken: string,
  params: {
    imageUrl: string;
    caption?: string;
    locationId?: string;
    altText?: string;
  }
): Promise<{ id: string }> {
  const token = decrypt(encryptedToken);
  const searchParams = new URLSearchParams({
    image_url: params.imageUrl,
    access_token: token,
  });
  if (params.caption) searchParams.set("caption", params.caption);
  if (params.locationId) searchParams.set("location_id", params.locationId);
  if (params.altText) searchParams.set("alt_text", params.altText);

  return graphFetch<{ id: string }>(`/${igUserId}/media`, {
    method: "POST",
    body: searchParams.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// Create a video (reel) container
export async function createReelContainer(
  igUserId: string,
  encryptedToken: string,
  params: {
    videoUrl: string;
    caption?: string;
    coverUrl?: string;
    locationId?: string;
  }
): Promise<{ id: string }> {
  const token = decrypt(encryptedToken);
  const searchParams = new URLSearchParams({
    video_url: params.videoUrl,
    media_type: "REELS",
    access_token: token,
  });
  if (params.caption) searchParams.set("caption", params.caption);
  if (params.coverUrl) searchParams.set("cover_url", params.coverUrl);
  if (params.locationId) searchParams.set("location_id", params.locationId);

  return graphFetch<{ id: string }>(`/${igUserId}/media`, {
    method: "POST",
    body: searchParams.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// Create a carousel child container (image)
export async function createCarouselChildImage(
  igUserId: string,
  encryptedToken: string,
  params: { imageUrl: string; altText?: string }
): Promise<{ id: string }> {
  const token = decrypt(encryptedToken);
  const searchParams = new URLSearchParams({
    image_url: params.imageUrl,
    is_carousel_item: "true",
    access_token: token,
  });
  if (params.altText) searchParams.set("alt_text", params.altText);

  return graphFetch<{ id: string }>(`/${igUserId}/media`, {
    method: "POST",
    body: searchParams.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// Create a carousel child container (video)
export async function createCarouselChildVideo(
  igUserId: string,
  encryptedToken: string,
  params: { videoUrl: string }
): Promise<{ id: string }> {
  const token = decrypt(encryptedToken);
  const searchParams = new URLSearchParams({
    video_url: params.videoUrl,
    media_type: "VIDEO",
    is_carousel_item: "true",
    access_token: token,
  });

  return graphFetch<{ id: string }>(`/${igUserId}/media`, {
    method: "POST",
    body: searchParams.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// Create carousel parent container
export async function createCarouselContainer(
  igUserId: string,
  encryptedToken: string,
  params: {
    childrenIds: string[];
    caption?: string;
    locationId?: string;
  }
): Promise<{ id: string }> {
  const token = decrypt(encryptedToken);
  const searchParams = new URLSearchParams({
    media_type: "CAROUSEL",
    children: params.childrenIds.join(","),
    access_token: token,
  });
  if (params.caption) searchParams.set("caption", params.caption);
  if (params.locationId) searchParams.set("location_id", params.locationId);

  return graphFetch<{ id: string }>(`/${igUserId}/media`, {
    method: "POST",
    body: searchParams.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// Create a scheduled container (image, carousel, or reel)
export async function createScheduledContainer(
  igUserId: string,
  encryptedToken: string,
  params: {
    imageUrl?: string;
    videoUrl?: string;
    mediaType: "image" | "carousel" | "reel";
    caption?: string;
    scheduledPublishTime: number; // Unix timestamp
    childrenIds?: string[]; // For carousels
  }
): Promise<{ id: string }> {
  const token = decrypt(encryptedToken);
  const searchParams = new URLSearchParams({
    access_token: token,
    published: "false",
    scheduled_publish_time: params.scheduledPublishTime.toString(),
  });

  if (params.caption) searchParams.set("caption", params.caption);

  if (params.mediaType === "image" && params.imageUrl) {
    searchParams.set("image_url", params.imageUrl);
  } else if (params.mediaType === "reel" && params.videoUrl) {
    searchParams.set("video_url", params.videoUrl);
    searchParams.set("media_type", "REELS");
  } else if (params.mediaType === "carousel" && params.childrenIds) {
    searchParams.set("media_type", "CAROUSEL");
    searchParams.set("children", params.childrenIds.join(","));
  }

  return graphFetch<{ id: string }>(`/${igUserId}/media`, {
    method: "POST",
    body: searchParams.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// Check container status (for videos — they process async)
export async function checkContainerStatus(
  containerId: string,
  encryptedToken: string
): Promise<ContainerStatus> {
  const token = decrypt(encryptedToken);
  return graphFetch<ContainerStatus>(
    `/${containerId}?fields=id,status_code,status&access_token=${token}`
  );
}

// Publish a container
export async function publishMedia(
  igUserId: string,
  encryptedToken: string,
  containerId: string
): Promise<MediaPublishResult> {
  const token = decrypt(encryptedToken);
  const searchParams = new URLSearchParams({
    creation_id: containerId,
    access_token: token,
  });

  return graphFetch<MediaPublishResult>(`/${igUserId}/media_publish`, {
    method: "POST",
    body: searchParams.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// Poll container until ready (for video processing)
export async function waitForContainerReady(
  containerId: string,
  encryptedToken: string,
  maxAttempts = 30,
  intervalMs = 5000
): Promise<ContainerStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkContainerStatus(containerId, encryptedToken);

    if (status.status_code === "FINISHED") {
      return status;
    }

    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(
        `Container ${containerId} failed: ${status.status_code} - ${status.status}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Container ${containerId} timed out after ${maxAttempts * intervalMs}ms`
  );
}

// Refresh a long-lived token
export async function refreshLongLivedToken(
  encryptedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const token = decrypt(encryptedToken);
  const result = await graphFetch<TokenRefreshResult>(
    `/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${token}`
  );

  return {
    accessToken: result.access_token,
    expiresIn: result.expires_in,
  };
}

// Exchange short-lived token for long-lived token
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const result = await graphFetch<TokenRefreshResult>(
    `/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
  );

  return {
    accessToken: result.access_token,
    expiresIn: result.expires_in,
  };
}

// Get Instagram Business Account ID from Facebook Page
export async function getInstagramAccountFromPage(
  pageId: string,
  pageAccessToken: string
): Promise<{ id: string } | null> {
  const result = await graphFetch<{
    instagram_business_account?: { id: string };
  }>(
    `/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  );

  return result.instagram_business_account ?? null;
}

// Get user's Facebook Pages
export async function getUserPages(
  userAccessToken: string
): Promise<{ data: { id: string; name: string; access_token: string }[] }> {
  return graphFetch<{
    data: { id: string; name: string; access_token: string }[];
  }>(`/me/accounts?access_token=${userAccessToken}`);
}
