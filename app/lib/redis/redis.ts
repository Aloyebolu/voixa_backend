// // lib/redis.ts
// import { createClient, RedisClientType } from 'redis';

// const client = createClient({
//   url: 'redis://localhost:6379',
// });

// // Track connection state and pending connection
// let isConnected = false;
// let connectionPromise: Promise<void> | null = null;

// export async function getRedisClient(): Promise<RedisClientType> {
//   if (!isConnected && !connectionPromise) {
//     connectionPromise = client.connect()
//       .then(() => {
//         isConnected = true;
//         connectionPromise = null;
//       })
//       .catch((err) => {
//         connectionPromise = null;
//         throw err;
//       });

//     await connectionPromise;
//   } else if (connectionPromise) {
//     // Wait for the ongoing connection attempt
//     await connectionPromise;
//   }

//   return client;
// }

// /**
//  * Clears Redis data (either current DB or all DBs)
//  * @param options.flushAll If true, clears ALL databases (default: false)
//  * @param options.db Specific database number to clear (default: current connection DB)
//  * @returns Promise<boolean> True if successful
//  */
// export async function clearRedis(options: { 
//   flushAll?: boolean; 
//   db?: number 
// } = {}): Promise<boolean> {
//   const { flushAll = false, db } = options;
//   const redis = await getRedisClient();

//   try {
//     if (db !== undefined) {
//       // Switch to specified DB if needed
//       await redis.select(db);
//     }

//     if (flushAll) {
//       await redis.flushAll();
//     } else {
//       await redis.flushDb();
//     }
//     return true;
//   } catch (err) {
//     console.error('Redis clear error:', err);
//     return false;
//   }
// }

// // Optional: Graceful shutdown handler
// process.on('SIGTERM', async () => {
//   try {
//     await client.quit();
//   } catch (err) {
//     console.error('Error during Redis shutdown:', err);
//   }
// });

// // Export the raw client for advanced use cases
// export { client as redisClient };

import { createClient } from 'redis';
// import type { RedisClientType } from 'redis';

// 🔹 Option A – widest, simplest
// type MyRedisClient = RedisClientType<any, any, any>;

// 🔹 Option B – safest, let TS figure it out
type MyRedisClient = ReturnType<typeof createClient>;

const client = createClient({
  url: 'redis://localhost:6379',
});

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

export async function getRedisClient(): Promise<MyRedisClient> {
  if (!isConnected && !connectionPromise) {
    connectionPromise = client.connect()
      .then(() => {
        isConnected = true;
        connectionPromise = null;
      })
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });

    await connectionPromise;
  } else if (connectionPromise) {
    await connectionPromise;
  }
  return client;
}

/* … rest of your file unchanged … */
