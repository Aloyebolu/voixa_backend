import { query } from "@/app/lib/db";
import { getRedisClient } from "@/app/lib/redis/redis";
interface UserRoleData {
  id: string;
  role?: string;
  status?: string;
  [key: string]: any;
}
const rolesKey = (roomId : string) => `room:${roomId}:role`
let redis;
redis = await getRedisClient()
export async function getUserRoleFromDatabase(roomId: string, userId: string): Promise<UserRoleData | null> {

  const queryText = `
    SELECT 
      u.id, u.name, u.country, 
      rr.position, rr.role, rr.raised_hand, rr.is_muted, 
      ui.image_path
    FROM room_roles rr
    JOIN users u ON rr.user_id = u.id
    LEFT JOIN user_images ui ON ui.user_id = u.id AND ui.is_active = true 
    WHERE rr.room_id = $1 AND rr.user_id = $2
  `;

  const result = await query(queryText, [roomId, userId]);
  return result.length > 0 ? result[0] : null;
}

export async function getUserRoleFromRedis(roomId: string, userId: string): Promise<UserRoleData | null> {
  const result = redis.hGet(rolesKey(roomId), userId)

  return result ? JSON.parse(result) : null;
}

