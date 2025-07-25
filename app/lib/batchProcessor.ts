/* eslint-disable @typescript-eslint/no-explicit-any */
// YOUR IMPORTS REMAIN UNCHANGED
import { getRedisClient } from "./redis/redis";
import { connectDB, query } from "./db";

export type BatchOperation = 'insert' | 'update' | 'delete';
export type EntityType = 'room_roles' | 'users' | 'rooms' | string;

export interface BatchJob {
  operation: BatchOperation;
  entity: EntityType;
  data: Record<string, any>;
  condition?: Record<string, any>;
  timestamp: number;
  dedupeKey?: string;
  retry?: number;
}

const BATCH_QUEUE_KEY = 'global:batch:queue';
const MAX_BATCH_SIZE = 1000;

export class BatchProcessor {
  private static instance: BatchProcessor;
  private redis: any;
  private isProcessing = false;

  private constructor() {}

  static async getInstance() {
    if (!BatchProcessor.instance) {
      BatchProcessor.instance = new BatchProcessor();
      await BatchProcessor.instance.init();
    }
    return BatchProcessor.instance;
  }

  private async init() {
    await connectDB();
    this.redis = await getRedisClient();
  }

  async addToQueue(job: Omit<BatchJob, 'timestamp'>, dedupe = false) {
    const fullJob: BatchJob = { ...job, timestamp: Date.now() };

    if (dedupe && job.dedupeKey) {
      const items = await this.redis.lRange(BATCH_QUEUE_KEY, 0, -1);
      const index = items.findIndex((item: string) => {
        const parsed = JSON.parse(item);
        return parsed.dedupeKey === job.dedupeKey;
      });

      if (index >= 0) {
        await this.redis.lSet(BATCH_QUEUE_KEY, index, JSON.stringify(fullJob));
        return;
      }
    }

    await this.redis.rPush(BATCH_QUEUE_KEY, JSON.stringify(fullJob));
  }

  async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      let length = await this.redis.lLen(BATCH_QUEUE_KEY);
      while (length) {
        const chunk = await this.redis.lRange(BATCH_QUEUE_KEY, 0, MAX_BATCH_SIZE - 1);
        await this.redis.lTrim(BATCH_QUEUE_KEY, chunk.length, -1);
        await this.processBatch(chunk.map(JSON.parse));
        length -= chunk.length;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatch(jobs: BatchJob[]) {
    const grouped: Record<string, BatchJob[]> = {};

    for (const job of jobs) {
      const key = `${job.entity}:${job.operation}`;
      grouped[key] ??= [];
      grouped[key].push(job);
    }

    for (const [key, group] of Object.entries(grouped)) {
      const [entity, operation] = key.split(':');
      const handler = {
        insert: this.handleInsert.bind(this),
        update: this.handleUpdate.bind(this),
        delete: this.handleDelete.bind(this),
      }[operation as BatchOperation];

      const success = await this.withRetry(group[0], () => handler(entity, group));
      if (!success) await this.requeueFailedJobs(group);
    }
  }

  private async withRetry(job: BatchJob, fn: () => Promise<any>): Promise<boolean> {
    const retries = job.retry ?? 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await fn();
        return true;
      } catch (err) {
        console.error(`❌ ${job.operation.toUpperCase()} FAILED (${job.entity}) attempt ${attempt + 1}:`, err);
        if (attempt === retries) {
          console.warn(`💀 Dropping job →`, job);
          return false;
        }
      }
    }

    return false;
  }

  private async requeueFailedJobs(jobs: BatchJob[]) {
    for (const job of jobs) {
      const retry = (job.retry ?? 0) - 1;
      if (retry >= 0) {
        await this.redis.rPush(BATCH_QUEUE_KEY, JSON.stringify({
          ...job,
          retry,
          timestamp: Date.now(),
        }));
        console.log(`🔁 Requeued with ${retry} retries → ${job.entity}`);
      }
    }
  }

  private async handleInsert(entity: string, jobs: BatchJob[]) {
    if (!jobs.length) return;

    const cols = Object.keys(jobs[0].data);
    const values = jobs.map(job => cols.map(col => job.data[col]));

    const placeholders = jobs.map((_, i) =>
      `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(', ')})`
    ).join(', ');

    const queryText = `
      INSERT INTO ${entity} (${cols.join(', ')})
      VALUES ${placeholders}
      ON CONFLICT DO NOTHING
    `;

    await query(queryText, values.flat());
    console.log(`✅ INSERTED ${jobs.length} → ${entity}`);

    if (entity === 'messages') {
      const convoIds = new Set<string>();
      for (const job of jobs) {
        if (job.data?.conversation_id) convoIds.add(job.data.conversation_id);
      }

      for (const id of convoIds) {
        await this.redis.del(`convo:${id}`);
        console.log(`🧹 Cleared convo:${id}`);
      }
    }
  }

  private async handleUpdate(entity: string, jobs: BatchJob[]) {
    const deduped: Record<string, BatchJob> = {};
    for (const job of jobs) {
      if (!job.dedupeKey || !deduped[job.dedupeKey] || job.timestamp > deduped[job.dedupeKey].timestamp) {
        deduped[job.dedupeKey || `${job.entity}-${job.timestamp}`] = job;
      }
    }

    const uniqueJobs = Object.values(deduped);
    for (const job of uniqueJobs) {
      const setKeys = Object.keys(job.data);
      const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const setValues = setKeys.map(k => job.data[k]);

      const condKeys = Object.keys(job.condition || {});
      const whereClause = condKeys.map((k, i) => `${k} = $${setValues.length + i + 1}`).join(' AND ');
      const whereValues = condKeys.map(k => job.condition?.[k]);

      const sql = `
        UPDATE ${entity}
        SET ${setClause}
        WHERE ${whereClause}
      `;

      await query(sql, [...setValues, ...whereValues]);
      console.log(`✅ UPDATED → ${entity}`);
    }
  }

  private async handleDelete(entity: string, jobs: BatchJob[]) {
    if (!jobs.length) return;

    const condKeys = Object.keys(jobs[0].condition || {});
    const conditions = condKeys.map(key => {
      const values = jobs.map(job => job.condition?.[key]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      return `${key} IN (${placeholders})`;
    });

    const sql = `
      DELETE FROM ${entity}
      WHERE ${conditions.join(' AND ')}
    `;

    const values = jobs.map(job => job.condition?.[condKeys[0]]);
    await query(sql, values);
    console.log(`🗑️ DELETED ${jobs.length} → ${entity}`);
  }
}
