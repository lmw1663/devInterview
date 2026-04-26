import Redis from "ioredis";
import { env } from "../config/env";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export default redis;