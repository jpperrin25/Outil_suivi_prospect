import fs from "node:fs";
import path from "node:path";
import { Sequelize } from "sequelize";
import { config } from "../config/env";
import { initModels } from "../models";
import { seedDefaults } from "./fixtures/defaults";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createSequelize(): Sequelize {
    if (config.nodeEnv === "test") {
        return new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
    }

    if (config.database.dialect === "sqlite") {
        // Un simple fichier .db : tout est conservé dans ce fichier (dossier ./data, monté en volume sous Docker)
        fs.mkdirSync(path.dirname(config.database.storage), { recursive: true });
        return new Sequelize({ dialect: "sqlite", storage: config.database.storage, logging: false });
    }

    const { name, username, password, host, port } = config.database;
    return new Sequelize(name, username, password, {
        host,
        port,
        dialect: "mysql",
        logging: false,
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" },
    });
}

/**
 * Connexion + création des tables manquantes + données par défaut.
 * Ne supprime JAMAIS de données : sync() sans "force".
 */
export async function connectToDatabase(): Promise<Sequelize> {
    const sequelize = createSequelize();
    initModels(sequelize);

    // MySQL peut mettre quelques secondes à accepter les connexions au premier démarrage
    const attempts = config.nodeEnv === "test" ? 1 : 30;
    for (let i = 1; ; i++) {
        try {
            await sequelize.authenticate();
            break;
        } catch (err) {
            if (i >= attempts) throw err;
            console.log(`[db] base indisponible, nouvelle tentative (${i}/${attempts})...`);
            await sleep(2000);
        }
    }

    await sequelize.sync(config.database.sync === "alter" ? { alter: true } : {});
    await seedDefaults();
    return sequelize;
}
