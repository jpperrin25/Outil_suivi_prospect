import "dotenv/config";
import path from "node:path";
import type { SignOptions } from "jsonwebtoken";

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET || "";

if (!jwtSecret && nodeEnv === "production") {
    throw new Error("JWT_SECRET must be set when NODE_ENV=production");
}
if (!jwtSecret && nodeEnv !== "test") {
    console.warn("[config] JWT_SECRET is not set: using an insecure development secret.");
}

const dialect: "mysql" | "sqlite" = process.env.DB_DIALECT === "sqlite" ? "sqlite" : "mysql";
// "safe"  : crée seulement les tables manquantes (aucune donnée n'est jamais touchée)
// "alter" : adapte les tables existantes au modèle (à utiliser ponctuellement après un changement de modèle)
const sync: "safe" | "alter" = process.env.DB_SYNC === "alter" ? "alter" : "safe";

export const config = {
    nodeEnv,
    port: Number(process.env.PORT || 3000),
    database: {
        dialect,
        sync,
        storage: process.env.SQLITE_PATH || path.resolve(process.cwd(), "data", "alternance.db"),
        name: process.env.DATABASE_NAME || "alternance",
        username: process.env.DATABASE_USERNAME || "alternance",
        password: process.env.DATABASE_PASSWORD || "",
        port: Number(process.env.DATABASE_PORT || 3306),
        host: process.env.DATABASE_HOST || "mysql",
    },
    jwt: {
        secret: jwtSecret || "dev-only-insecure-secret",
        expireIn: (process.env.JWT_EXPIRES_IN || "30d") as SignOptions["expiresIn"],
    },
    bcrypt: {
        saltRounds: Number(process.env.BCRYPT_SALT_ROUND || 10),
    },
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
    },
};
