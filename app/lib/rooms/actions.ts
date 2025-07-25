/* eslint-disable @typescript-eslint/no-explicit-any */
// services/roomService.ts
import { query } from "../db";
import { verifyPermit } from "../permits/verifyPermit";
import { BatchProcessor } from "../batchProcessor";
import { getRedisClient } from "../redis/redis";
import { ERROR_CODES } from "../../utils/errorCodes";
import { getUserRoleFromDB } from "./joinRoom";
import { decodeToken } from "../../utils/auth";
import { RoomActionType, RoomType, UserRoleData } from "@/types";

const REDIS_ROOM_PREFIX = "room";
const REDIS_ROLES_PREFIX = "roles";


function getRedisKeys(roomId: string) {
  return {
    roomKey: `${REDIS_ROOM_PREFIX}:${roomId}`,
    rolesKey: `${REDIS_ROOM_PREFIX}:${roomId}:${REDIS_ROLES_PREFIX}`,
  };
}

export async function handleRoomAction(token: string, roomId: string, action: RoomActionType, extra?: { targetId?: string; permitToken?: string; roomType?: RoomType }): Promise<{ status: number; body: { position?: number, message: string, newStatus?: string | boolean} }> {
  // Extract userId from token (token is a string, not a Socket)
  const decoded = decodeToken(token);
  const initiatorId = decoded?.userId;
  if (!initiatorId) {
    throw new Error("Unauthorized: Invalid or missing token");
  }
  if (!roomId) {
    throw new Error("Room ID is required");
  }
  if (!action) {
    throw new Error("Action is required");
  }

  console.log(initiatorId, roomId, action)
  const { targetId, permitToken } = extra ?? {};

  const redis = await getRedisClient();
  const bp = await BatchProcessor.getInstance();
  const { rolesKey } = getRedisKeys(roomId);

  /* ---------- ROLE LOOK‑UPS ------------------------------------------------ */
  console.log("rom id", roomId)
  const getRole = async (uid: string): Promise<UserRoleData | null> => {
    const cached = await redis.hGet(rolesKey, uid);
    if (cached) return JSON.parse(cached);

    console.log('The id is', uid, roomId)
    const dbRole = await getUserRoleFromDB(roomId, uid);
    if (dbRole) await redis.hSet(rolesKey, uid, JSON.stringify(dbRole));
    return dbRole;
  };

  const initiatorRole = await getRole(initiatorId);
  if (!initiatorRole) throw new Error("Initiator has no role in this room");

  const targetRole = targetId ? await getRole(targetId) : null;

  /* ---------- PERMISSION HELPER ------------------------------------------- */

  const isHost = initiatorRole.role === "host";
  const isHolder = initiatorRole.role === "holder";
  const isHostTarget = targetRole ? targetRole.role === "host" : null;

  const requireRole = (need: "host" | "holder") => {
    if (
      (need === "host" && (!isHost && !isHolder)) ||
      (need === "holder" && !isHolder)
    ) {
      const err: any = new Error("Not authorized");
      err.status = 403;
      err.code = ERROR_CODES.ROOM_NOT_AUTHORIZED.code;
      throw err;
    }
  };

  /* ---------- ACTIONS ------------------------------------------------------ */

  switch (action) {
    case "set_as_speaker": {
      if (!permitToken) throw new Error("Permit token required");
      const permitResult = verifyPermit(permitToken);
      if (!permitResult || typeof permitResult !== "object" || !("by" in permitResult)) {
        throw new Error("Invalid permit token");
      }
      // const { by } = permitResult as { by: string };
      // const signerRole = await getRole(by);

      requireRole("host");

      if (targetRole?.position && targetRole.position > 0) {
        console.log(targetRole)
        const err: any = new Error("User already a speaker");
        err.status = 400;
        throw err;
      }

      const positionRow = await query(
        `
          SELECT MIN(t1.position + 1) AS position
          FROM room_roles t1
          LEFT JOIN room_roles t2
          ON t1.position + 1 = t2.position
          WHERE t1.room_id = $1 AND t2.position IS NULL
        `,
        [roomId],
      );
      const newPos = positionRow[0]?.position ?? 1;

      await redis.hSet(
        rolesKey,
        targetId!,
        JSON.stringify({ ...targetRole, position: newPos }),
      );

      await bp.addToQueue(
        {
          operation: "update",
          entity: "room_roles",
          data: { position: newPos },
          condition: { user_id: targetId, room_id: roomId },
          dedupeKey: `set_as_speaker:${targetId}:${roomId}`,
        },
        true,
      );

      return { status: 200, body: { message: "User set as speaker", position: newPos }, };
    }

    case "set_as_viewer": {
      requireRole("host");

      await redis.hSet(
        rolesKey,
        targetId!,
        JSON.stringify({ ...targetRole, position: 0 }),
      );

      await bp.addToQueue({
        operation: "update",
        entity: "room_roles",
        data: { position: 0 },
        condition: { user_id: targetId , room_id: roomId},
        dedupeKey: `set_as_viewer:${targetId}:${roomId}`,
      });

      return { status: 200, body: { message: "User set as viewer" } };
    }

    case "set_as_host": {
      requireRole("holder");

      await redis.hSet(
        rolesKey,
        targetId!,
        JSON.stringify({ ...targetRole, role: "host" }),
      );

      await bp.addToQueue({
        operation: "update",
        entity: "room_roles",
        data: { role: "host" },
        condition: { user_id: targetId, room_id: roomId },
        dedupeKey: `toggle_host:${targetId}:${roomId}`,
      });

      return { status: 200, body: { message: "User promoted to host" } };
    }

    case "remove_from_host": {
      requireRole("holder");

      await redis.hSet(
        rolesKey,
        targetId!,
        JSON.stringify({ ...targetRole, role: "" }),
      );

      await bp.addToQueue({
        operation: "update",
        entity: "room_roles",
        data: { role: "" },
        condition: { user_id: targetId, room_id: roomId },
        dedupeKey: `toggle_host:${targetId}:${roomId}`,
      });

      return { status: 200, body: { message: "Host rights removed" } };
    }

    case "remove_from_room": {
      requireRole("host");

      await redis.hSet(
        rolesKey,
        targetId!,
        JSON.stringify({ ...targetRole, status: "removed" }),
      );

      await bp.addToQueue({
        operation: "update",
        entity: "room_roles",
        data: { status: "removed" },
        condition: { user_id: targetId, room_id: roomId },
        dedupeKey: `remove_from_room:${targetId}:${roomId}`,
      });

      return { status: 200, body: { message: "User removed" } };
    }

    case "toggle_messaging": {

      requireRole('holder');

      const { roomKey } = getRedisKeys(roomId);
      const currentStatus = await redis.hGet(roomKey, 'messaging_status');
      const newStatus = currentStatus === 'paused' ? 'active' : 'paused';

      await redis.hSet(roomKey, 'messaging_status', newStatus);

      await bp.addToQueue({
        operation: "update",
        entity: "rooms",
        data: { messaging_status: newStatus },
        condition: { id: roomId },
        dedupeKey: `${action}${targetId}:${roomId}`,
      });

      return {
        status: 200,
        body: {
          message: `Messaging ${newStatus === 'paused' ? 'paused' : 'resumed'} (only host)`,
          newStatus,
        },
      };
    }

    case 'toggle_mic': {
      function canMute(): boolean {
        if (isHolder) return true; // holder can mute anyone
        if (isHost) return initiatorId === targetId || !isHostTarget; // host can mute self or others
        return initiatorId === targetId; // normal users can only mute themselves
      }
      if (!canMute()) return { status: 400, body: { message: "Not permitted" } };

if (!targetId) {
  throw new Error("targetId is required to update mute status");
}

const currentStatus = targetRole?.is_muted ?? false;
const newStatus = currentStatus === true ? false : true;

const updatedRole = {
  ...(targetRole || {}),
  is_muted: newStatus,
};

await redis.hSet(
  rolesKey,
  targetId,
  JSON.stringify(updatedRole)
);


      await bp.addToQueue({
        operation: "update",
        entity: "room_roles",
        data: { is_muted: newStatus },
        condition: { user_id: targetId, room_id: roomId },
        dedupeKey: `${action}:${targetId}:${roomId}`,
      });

      return { status: 200, body: { message: "Mic toggled", newStatus} };
    }
    case "change_room_type": {
      if (!extra?.roomType) {
        throw "No room type specified"
      }
      // requireRole('holder')
      const { roomKey } = getRedisKeys(roomId)
      redis.hSet(roomKey, 'type', extra.roomType)
      await bp.addToQueue({
        operation: "update",
        entity: "rooms",
        data: { type: extra?.roomType },
        condition: { id: roomId },
        dedupeKey: `${action}${targetId}:${roomId}`,
      })
    }
    default:
      return { status: 400, body: { message: "Invalid action" } };
  }
}
