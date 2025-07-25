import { query } from '../db';
import { getRedisClient } from '../redis/redis';
import { getRedisKey } from '../redis/redisKeys';

export interface Badge {
  type: string;
  expires_at: string | null;
}

type UserBadgeMap = Record<string, Badge[]>;

// 🔁 Can be called with single ID or array
export async function getUserBadges(userIds: string | string[]): Promise<UserBadgeMap> {
  const redis = await getRedisClient();
  const ids = Array.isArray(userIds) ? userIds : [userIds];

  const redisKeys = ids.map(id => getRedisKey('user', id, 'badges'));

  const cachedResults = await redis.mGet(redisKeys);

  const userBadgeMap: UserBadgeMap = {};
  const missingUserIds: string[] = [];

  ids.forEach((userId, index) => {
    const cached = cachedResults[index];
    if (cached) {
      try {
        userBadgeMap[userId] = JSON.parse(cached);
      } catch {
        missingUserIds.push(userId);
      }
    } else {
      missingUserIds.push(userId);
    }
  });

  if (missingUserIds.length > 0) {
    const result: { user_id: string; type: string; expires_at: string | null }[] = await query(
      `SELECT user_id, type, expires_at FROM badges WHERE user_id = ANY($1)`,
      [missingUserIds]
    );

    const redisPipes = redis.multi();
    const dbGrouped: UserBadgeMap = {};

    for (const row of result) {
      if (!dbGrouped[row.user_id]) dbGrouped[row.user_id] = [];
      dbGrouped[row.user_id].push({ type: row.type, expires_at: row.expires_at });
    }

    for (const userId of missingUserIds) {
      const badges = dbGrouped[userId] || [];
      redisPipes.set(`user:${userId}:badges`, JSON.stringify(badges));
      userBadgeMap[userId] = badges;
    }

    await redisPipes.exec();
  }

  return userBadgeMap;
}

// ✅ For single use
export async function getBadgesForUser(userId: string): Promise<Badge[]> {
  const all = await getUserBadges(userId);
  return all[userId] || [];
}

export async function hasBadge(userId: string, type: string): Promise<boolean> {
  const userBadges = await getUserBadges(userId);
  const badges = userBadges[userId] || [];
  const now = new Date();

  return badges.some(b => b.type === type && (!b.expires_at || new Date(b.expires_at) > now));
}

export async function getTopBadges(
  userId: string | string[],
  count = 3
): Promise<Record<string, Badge[]>> {
  const userIds = Array.isArray(userId) ? userId : [userId];

  const result: { user_id: string; type: string; expires_at: string | null }[] = await query(
    `
    SELECT user_id, type, expires_at
    FROM badges
    WHERE user_id = ANY($1)
    ORDER BY created_at ASC
  `,
    [userIds]
  );

  const grouped: Record<string, Badge[]> = {};

  for (const row of result) {
    if (!grouped[row.user_id]) grouped[row.user_id] = [];
    if (grouped[row.user_id].length < count) {
      grouped[row.user_id].push({ type: row.type, expires_at: row.expires_at });
    }
  }

  return grouped;
}

export async function getBadgePowers(userId: string): Promise<{
  isVip: boolean;
  isEarlyAdopter: boolean;
  isVerified: boolean;
  isDev: boolean;
}> {
  const userBadges = await getUserBadges(userId);
  const badges = userBadges[userId] || [];
  const now = new Date();

  const activeTypes = new Set(
    badges
      .filter(b => !b.expires_at || new Date(b.expires_at) > now)
      .map(b => b.type)
  );

  return {
    isVip: activeTypes.has('vip'),
    isEarlyAdopter: activeTypes.has('early_adopter'),
    isVerified: activeTypes.has('verified'),
    isDev: activeTypes.has('dev'),
  };
}
