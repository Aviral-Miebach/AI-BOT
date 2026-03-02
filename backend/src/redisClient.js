import { createClient } from "redis";
import { config } from "./config.js";

let client = null;
let connected = false;

export function hasRedis() {
  return Boolean(config.redisUrl);
}

export async function getRedisClient() {
  if (!hasRedis()) return null;
  if (!client) {
    client = createClient({ url: config.redisUrl });
    client.on("error", (error) => {
      console.error("Redis error:", error.message);
    });
  }
  if (!connected) {
    await client.connect();
    connected = true;
  }
  return client;
}

export async function getRedisJson(key) {
  const c = await getRedisClient();
  if (!c) return null;
  const raw = await c.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setRedisJson(key, value, ttlSeconds) {
  const c = await getRedisClient();
  if (!c) return;
  await c.setEx(key, ttlSeconds, JSON.stringify(value));
}

