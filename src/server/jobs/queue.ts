import { Queue } from "bullmq";
import IORedis from "ioredis";

function createConnection() {
  return new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

let _publishQueue: Queue | null = null;
let _tokenRefreshQueue: Queue | null = null;

export function getPublishQueue(): Queue {
  if (!_publishQueue) {
    _publishQueue = new Queue("instagram-publish", { connection: createConnection() });
  }
  return _publishQueue;
}

export function getTokenRefreshQueue(): Queue {
  if (!_tokenRefreshQueue) {
    _tokenRefreshQueue = new Queue("token-refresh", { connection: createConnection() });
  }
  return _tokenRefreshQueue;
}

// Keep backwards-compatible exports as getters
export const publishQueue = {
  add: (...args: Parameters<Queue["add"]>) => getPublishQueue().add(...args),
};

export const tokenRefreshQueue = {
  add: (...args: Parameters<Queue["add"]>) => getTokenRefreshQueue().add(...args),
};
