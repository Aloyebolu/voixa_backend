/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { connectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";
import { ERROR_CODES } from "@/app/utils/errorCodes";
import { verifyPermit } from "@/app/lib/permits/verifyPermit";
import { BatchProcessor } from "@/app/lib/batchProcessor";
import { getRedisClient } from "@/app/lib/redis/redis";
import { getUserRoleFromDatabase } from "../../../lib/functions";


// Constants
const REDIS_ROOM_PREFIX = 'room';
const REDIS_ROLES_PREFIX = 'roles';
const rand = 10000010


interface UserRoleData {
  id: string;
  role?: string;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}


function getRedisKeys(roomId: string) {
  return {
    roomKey: `${REDIS_ROOM_PREFIX}:${roomId}`,
    rolesKey: `${REDIS_ROOM_PREFIX}:${roomId}:${REDIS_ROLES_PREFIX}`
  };
}


export async function POST(request: NextRequest) {
  let redis;
  try {
    // Extract the initiator ID from the request
    const initiator_id = getUserIdFromRequest(request)?.userId;
    if (!initiator_id) {
      console.error("No viewer ID found in the request.");
      return setCorsHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      );
    }

    // Connect to the database
    connectDB();
    const bp = await BatchProcessor.getInstance();
    redis = await getRedisClient()
    // Parse the request body
    const { roomId, action, extra } = await request.json();
    const permitToken = extra?.permitToken || null;
    const targetId = extra?.targetId || null
    if (!initiator_id || !roomId) {
      console.log("Missing required parameters:", {
        initiator_id,
        targetId,
        roomId,
      });
      return setCorsHeaders(
        NextResponse.json(
          { message: "User ID, target ID, and room ID are required" },
          { status: 403 }
        )
      );
    }

    const { roomKey, rolesKey } = getRedisKeys(roomId);

    //Step 1: Check inititor role(Redis -> DB fallback)
    let initiatorRole: UserRoleData | null = null;
    const cachedInitiatorRole = await redis.hGet(rolesKey, initiator_id);
    if (cachedInitiatorRole) {
      initiatorRole = JSON.parse(cachedInitiatorRole)
      console.log("Initiator role fetched from redis")
    }
    else {
      // DB fallback
      const dbInitiatorRole = await getUserRoleFromDatabase(roomId, initiator_id)
      initiatorRole = dbInitiatorRole
      redis.hSet(rolesKey, initiator_id, JSON.stringify(dbInitiatorRole))
      console.warn("Initiator role could not be fetched from redis ->DB")
    }

    // Step 2: Check if there is a target and the target role exist
    let targetRole: UserRoleData | null = null;
    if (targetId) {

      const cachedTargetRole = await redis.hGet(rolesKey, targetId)
      if (!cachedTargetRole) {
        const dbTargetRole = await getUserRoleFromDatabase(roomId, targetId)
        targetRole = dbTargetRole
        redis.hSet(rolesKey, targetId, JSON.stringify(dbTargetRole))
        console.log("Target could not be found in redis ->DB")
      } else {
        targetRole = JSON.parse(cachedTargetRole)
        console.log("Terget role fetched from redis")
      }
    }


    // A function for permission based action

    const isHost = initiatorRole?.role === "host";
    const isHolder = initiatorRole?.role === "holder";
    const checkPermission = (allowed: string = 'server') => {
      if(allowed == 'server') {
        
      }
      if (allowed == 'host') {
        if (!isHolder || !isHost) {
          return setCorsHeaders(
            NextResponse.json(
              { error: "You have no permission to operte", code: ERROR_CODES.ROOM_NOT_AUTHORIZED.code },
              { status: 403 }
            )
          );
        }
      } else if (allowed == 'holder') {
        if (!isHolder) {
          return setCorsHeaders(
            NextResponse.json(
              { error: "You have no permission to operte", code: ERROR_CODES.ROOM_NOT_AUTHORIZED.code },
              { status: 403 }
            )
          );
        }
      }else{
        throw "Unknown role permitted to perform a room action"
      }

    };

    // Retuns a success message
    const returnSuccess = () => {
      return setCorsHeaders(
        NextResponse.json(
          { message: "Success" },
          { status: 200 }
        )
      );
    }

    // Handle different actions
    switch (action) {
      case "set_as_speaker": {
        // Verify the permit token if provided
        if (!permitToken) {
          console.log('‼️ No permit token provided')
          return setCorsHeaders(
            NextResponse.json(
              { message: "Permit token is required for this action" },
              { status: 400 }
            )
          );
        }
        try {
          const data = verifyPermit(permitToken);
          // Check if the one who signed the token is a holder or host

          //   Check if the target user is already a speaker
          if (targetRole?.position > 0) {
            console.log("‼️ User is already a speaker")
            return setCorsHeaders(
              NextResponse.json(
                { error: "User is already a speaker" },
                { status: 400 }
              )
            );
          }
          if (!data?.by) {
            throw new Error("Signer ID is missing in permit token");
          }
          const cachedSignerRole = await redis.hGet(rolesKey, data.by)
          let signerRole: UserRoleData | null = null;
          if (cachedSignerRole) {
            signerRole = JSON.parse(cachedSignerRole)
          } else {
            console.log('Failed to fetch signer role from redis');
            const dbSignerRole = await getUserRoleFromDatabase(roomId, data?.by)
            if (!signerRole) {
              throw "Signer role could not be found from db"
            }
            signerRole = dbSignerRole && dbSignerRole[0]
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            dbSignerRole && await redis.hSet(rolesKey, data?.by, JSON.stringify(dbSignerRole[0]))
          }
          checkPermission('host')
          // Update the user's role to 'speaker' in the room_roles table

          // Check the next available position for the user
          const positionResult = await query(
            `
              SELECT MIN(t1.position + 1) AS position
              FROM room_roles t1
              LEFT JOIN room_roles t2
              ON t1.position + 1 = t2.position
              WHERE t1.room_id = $1 AND t2.position IS NULL
            `,
            [roomId]
          );
          const position = positionResult[0]?.position || 0; // Ensure position fallback
          console.log("Position result:", positionResult);
          // Update redis for the position change
          redis.hSet(rolesKey, targetId, JSON.stringify({...targetRole, position : position}))

          // queue the process for DB update
          await bp.addToQueue({
            operation: 'update',
            entity: 'room_roles',
            data: {
              position: position
            },
            condition: {
              user_id: targetId,
              room_id: roomId
            },
            dedupeKey: `set_as_speaker:${targetId}:${roomId}`
          }, true);

          // Return a good response
          return setCorsHeaders(
            NextResponse.json(
              {
                message: "User set as speaker successfully",
                position,
                role: targetRole
              },
              { status: 200 }
            )
          );
        } catch (error) {
          console.error("Invalid permit token:", error);
          return setCorsHeaders(
            NextResponse.json(
              { error: "Invalid permit token" },
              { status: 400 }
            )
          );
        }
      };

      case "set_as_viewer": {
        // Holders and hosts only can perform this action
        checkPermission('host')

        /// Update the user's role to 'host' in redis
        await redis.hSet(rolesKey, targetId, JSON.stringify({ ...targetRole, position: 0 }))

        // Queue the process for db update
        await bp.addToQueue({
          operation: 'update',
          entity: 'room_roles',
          data: {
            position: 0
          },
          condition: {
            user_id: targetId,
          },
          dedupeKey: `set_as_viewer:${targetId}:${roomId}`
        });

        // Return a valid response
        return setCorsHeaders(
          NextResponse.json(
            { message: "User set as viewer successfully" },
            { status: 200 }
          )
        );
      };

      case "remove_from_host": {
        // Holders only can perform this action
        checkPermission('holder')

        // Update the user's role to 'host' in redis
        await redis.hSet(rolesKey, targetId, JSON.stringify({ ...targetRole, role: 'host' }))

        // Queue the process for db update
        await bp.addToQueue({
          operation: 'update',
          entity: 'room_roles',
          data: {
            role: '',
          },
          condition: {
            user_id: targetId,
          },
          dedupeKey: `toggle_host:${targetId}:${roomId}`
        });

        // Return a valid response
        return setCorsHeaders(
          NextResponse.json(
            { message: "Success" },
            { status: 200 }
          )
        );
      };

      case "set_as_host": {
        // Holders only can perform this action
        checkPermission('holder');

        // Update the user's role to 'host' in redis
        await redis.hSet(rolesKey, targetId, JSON.stringify({ ...targetRole, role: 'host' }))

        // Queue the process for db update
        await bp.addToQueue({
          operation: 'update',
          entity: 'room_roles',
          data: {
            role: 'host',
          },
          condition: {
            user_id: targetId,
          },
          dedupeKey: `toggle_host:${targetId}:${roomId}`
        });

        // Return a valid response
        return setCorsHeaders(
          NextResponse.json(
            { message: "Success" },
            { status: 200 }
          )
        );
      };

      case "remove_from_room": {
        // Update the user's status to 'banned' in the room_roles table
        checkPermission('host')

        // Update the user role in redis
        redis.hSet(rolesKey, targetId, JSON.stringify({ ...targetRole, status: 'removed' }))

        // Queue the process for db update
        await bp.addToQueue({
          operation: 'update',
          entity: 'room_roles',
          data: {
            status: 'removed',
          },
          condition: {
            user_id: targetId,
          },
          dedupeKey: `remove_from_room:${targetId}:${roomId}`
        });

        // Return a success response
        return setCorsHeaders(
          NextResponse.json(
            { message: "User removed successfully" },
            { status: 200 }
          )
        );
      };


      case "pause_messaging": {
        // Holders only can perform this action
        checkPermission("holder");

        // Update the user's role to 'host' in the room_roles table
        await query("UPDATE rooms SET messaging_status = 'only-host' where room_id = $1", [roomId]);
        returnSuccess();
      };
      default: {
        console.warn(`⚠️ Invalid action received: ${action}`); // Log invalid action
        return setCorsHeaders(
          NextResponse.json({ message: "Invalid action" }, { status: 400 })
        );
      };
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("Error processing request:", error);
    return setCorsHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}


// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}
