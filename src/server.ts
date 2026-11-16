import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/env";
import { connectToDatabase } from "./db/sequelize";
import routes from "./modules/Routes";
import { errorHandler, notFoundApi } from "./middleware/errorHandler";

export const app = express();

app.use(
    helmet({
        // Appli servie en http (localhost / réseau local) : on évite de forcer le https
        contentSecurityPolicy: { directives: { "upgrade-insecure-requests": null } },
        hsts: false,
    }),
);
app.use(cors({ origin: config.cors.origin }));
app.use("/api/prospect-imports/preview", express.text({ type: ["text/csv", "application/csv", "text/plain"], limit: "2mb" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
    res.json({ status: "SUCCESS" });
});
app.use("/api", routes);
app.use("/api", notFoundApi);

// Le front (HTML/CSS/JS statiques) est servi directement par l'API
app.use(express.static(path.resolve(process.cwd(), "public")));

app.use(errorHandler);

export async function startServer() {
    await connectToDatabase();
    app.listen(config.port, () => console.log(`Alternance tracker prêt sur http://localhost:${config.port}`));
}

if (config.nodeEnv !== "test") {
    startServer().catch((err) => {
        console.error("Impossible de démarrer le serveur :", err);
        process.exit(1);
    });
}
