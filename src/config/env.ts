import dotenv from "dotenv";

dotenv.config();

export const env = {
    PORT : process.env.PORT || 3000,
    JWT_SECRET : process.env.JWT_SECRET || "secret",
    DATABASE_URL : process.env.DATABASE_URL || "",
    REDIS_URL : process.env.REDIS_URL || "redis://localhost:6379",
    OPENAI_API_KEY : process.env.OPENAI_API_KEY || "",
    CORS_ORIGIN : process.env.CORS_ORIGIN || "*",
    NODE_ENV : process.env.NODE_ENV || "development",
}