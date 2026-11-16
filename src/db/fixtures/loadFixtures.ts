import { connectToDatabase } from "../sequelize";

// npm run fixtures : (re)crée les tables manquantes et les statuts / types d'offre par défaut
const sequelize = await connectToDatabase();
console.log("Base initialisée (tables + valeurs par défaut).");
await sequelize.close();
