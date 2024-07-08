import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST ?? "db";
export const redis = new Redis({ host: REDIS_HOST });
