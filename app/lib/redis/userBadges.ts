import { getRedisClient } from "./redis";

const PREFIX = 'user_badges:';

export async function getCachedUserBadges(userId: string) {
  const redis = await getRedisClient();
  const json = await redis.get(`${PREFIX}${userId}`);
  return json ? JSON.parse(json) : null;
}
export async function getManyCachedUserBadges(userIds: string[]) {
  const redis = await getRedisClient();
  const keys = userIds.map(id => `${PREFIX}${id}`);
  const values = await redis.mGet(...keys);

  const result: Record<string, any[]> = {};
  userIds.forEach((id, i) => {
    result[id] = values[i] ? JSON.parse(values[i]) : undefined;
  });

  return result;
}

export async function cacheUserBadges(userId: string, badges: any[]) {
  const redis = await getRedisClient();
  await redis.set(`${PREFIX}${userId}`, JSON.stringify(badges), 'EX', 600); // 10 mins
}

export async function cacheManyUserBadges(badgeMap: Record<string, any[]>) {
  const redis = await getRedisClient();
  const pipeline = redis.multi();

  for (const userId in badgeMap) {
    pipeline.set(`${PREFIX}${userId}`, JSON.stringify(badgeMap[userId]), 'EX', 600);
  }

  await pipeline.exec();
}
