import type { Sequelize } from "sequelize";
import { User, UserModel } from "./User";
import { Entreprise, EntrepriseModel } from "./Entreprise";
import { Status, StatusModel } from "./Status";
import { OfferType, OfferTypeModel } from "./OfferType";
import { Job, JobModel } from "./Job";
import { JobStatusHistory, JobStatusHistoryModel } from "./JobStatusHistory";
import { Prospect, ProspectModel } from "./Prospect";
import { ProspectImport, ProspectImportModel, ProspectImportRow, ProspectImportRowModel } from "./ProspectImport";
import { ProspectInteraction, ProspectInteractionModel } from "./ProspectInteraction";

export const initModels = (sequelize: Sequelize) => {
    User(sequelize);
    Entreprise(sequelize);
    Status(sequelize);
    OfferType(sequelize);
    Job(sequelize);
    JobStatusHistory(sequelize);
    Prospect(sequelize);
    ProspectImport(sequelize);
    ProspectImportRow(sequelize);
    ProspectInteraction(sequelize);

    // Un utilisateur possède ses entreprises et ses candidatures (supprimées avec lui)
    UserModel.hasMany(EntrepriseModel, { foreignKey: "userId", onDelete: "CASCADE", onUpdate: "CASCADE" });
    EntrepriseModel.belongsTo(UserModel, { foreignKey: "userId" });

    UserModel.hasMany(JobModel, { foreignKey: "userId", onDelete: "CASCADE", onUpdate: "CASCADE" });
    JobModel.belongsTo(UserModel, { foreignKey: "userId" });

    // RESTRICT : on ne perd jamais une candidature parce qu'on a supprimé une entreprise / un statut / un type.
    // Les contrôleurs gèrent ces cas explicitement (confirmation, réaffectation).
    EntrepriseModel.hasMany(JobModel, { foreignKey: "entrepriseId", as: "jobs", onDelete: "RESTRICT", onUpdate: "CASCADE" });
    JobModel.belongsTo(EntrepriseModel, { foreignKey: "entrepriseId", as: "entreprise" });

    StatusModel.hasMany(JobModel, { foreignKey: "statusId", as: "jobs", onDelete: "RESTRICT", onUpdate: "CASCADE" });
    JobModel.belongsTo(StatusModel, { foreignKey: "statusId", as: "status" });

    OfferTypeModel.hasMany(JobModel, { foreignKey: "offerTypeId", as: "jobs", onDelete: "RESTRICT", onUpdate: "CASCADE" });
    JobModel.belongsTo(OfferTypeModel, { foreignKey: "offerTypeId", as: "offerType" });

    // Historique des statuts
    JobModel.hasMany(JobStatusHistoryModel, { foreignKey: "jobId", as: "history", onDelete: "CASCADE", onUpdate: "CASCADE" });
    JobStatusHistoryModel.belongsTo(JobModel, { foreignKey: "jobId", as: "job" });

    StatusModel.hasMany(JobStatusHistoryModel, { foreignKey: "statusId", onDelete: "SET NULL", onUpdate: "CASCADE" });
    JobStatusHistoryModel.belongsTo(StatusModel, { foreignKey: "statusId" });

    // Les prospects et imports sont séparés des candidatures existantes.
    EntrepriseModel.hasMany(ProspectModel, { foreignKey: "entrepriseId", as: "prospects", onDelete: "RESTRICT", onUpdate: "CASCADE" });
    ProspectModel.belongsTo(EntrepriseModel, { foreignKey: "entrepriseId", as: "entreprise" });
    UserModel.hasMany(ProspectModel, { foreignKey: "userId", onDelete: "CASCADE", onUpdate: "CASCADE" });
    ProspectModel.belongsTo(UserModel, { foreignKey: "userId" });
    UserModel.hasMany(ProspectImportModel, { foreignKey: "userId", onDelete: "CASCADE", onUpdate: "CASCADE" });
    ProspectImportModel.belongsTo(UserModel, { foreignKey: "userId" });
    ProspectImportModel.hasMany(ProspectImportRowModel, { foreignKey: "importId", as: "rows", onDelete: "CASCADE", onUpdate: "CASCADE" });
    ProspectImportRowModel.belongsTo(ProspectImportModel, { foreignKey: "importId", as: "import" });
    ProspectModel.hasMany(ProspectInteractionModel, { foreignKey: "prospectId", as: "interactions", onDelete: "CASCADE", onUpdate: "CASCADE" });
    ProspectInteractionModel.belongsTo(ProspectModel, { foreignKey: "prospectId", as: "prospect" });
    UserModel.hasMany(ProspectInteractionModel, { foreignKey: "userId", onDelete: "CASCADE", onUpdate: "CASCADE" });
    ProspectInteractionModel.belongsTo(UserModel, { foreignKey: "userId" });
};
