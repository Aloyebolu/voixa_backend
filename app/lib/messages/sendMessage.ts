import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getRedisClient } from '../redis/redis';
import { BatchProcessor } from '../batchProcessor';
import {  getRedisKey } from '../redis/redisKeys';


const messageSchema = z.object({
    conversation_id: z.string(),
  message: z.string(),
  type: z.enum(['text', 'image', 'voice']),
  attachment: z.string().optional(),
  reply: z.string().nullable().optional(),
});

export async function sendMessage({
    userId,
    extra,
}: {
    userId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra: any;
}) {
    const redis = await getRedisClient();
  const validation = messageSchema.safeParse(extra);
  if (!validation.success) {
    console.error('❌ Invalid message data:', validation.error);
    return;
  }

  const data = validation.data;
  const now = new Date().toISOString();
  const messageId = nanoid();
  const nowUTC = new Date().toISOString();

  const messageData = {
    sender_id: userId,
    conversation_id: data.conversation_id,
    message: data.message,
    type: data.type,
    attachment: data.attachment || null,
    reply: data.reply || null,
    created_at: now,
  };

  // ✅ 1. Cache in Redis (for quick frontend fetch)
  const redisKey = getRedisKey('convo', data.conversation_id)
  await redis.rPush(redisKey, JSON.stringify(messageData));

  // ✅ 2. Queue for batch insert
  const batch = await BatchProcessor.getInstance();
  await batch.addToQueue({
    operation: 'insert',
    entity: 'messages',
    data: messageData,
    dedupeKey: `msg:${messageId}`,
    retry: 12
  });
  await batch.addToQueue({
    operation: "update",
    entity: 'conversations',
    data: {last_updated : nowUTC},
    condition: {id : data.conversation_id},
    dedupeKey: `convo_last_updated:${data.conversation_id}`,
    retry: 12
  });
await batch.addToQueue({
    operation: "update",
    entity: 'messages_last_read',
    data: {last_updated : nowUTC},
    condition: {user_id: userId, conversation_id : data.conversation_id},
    dedupeKey: `messages_last_read:${data.conversation_id}:${userId}`,
    retry: 12
  });
  console.log(`📨 Message ${messageId} queued and cached`);
}
