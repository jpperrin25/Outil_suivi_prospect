import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import type { EntrepriseModel } from "./Entreprise";

export type ProspectStatus = "to_qualify" | "qualified" | "to_contact" | "contacted" | "replied" | "excluded";

export interface ProspectAttributes {
    idProspect: number;
    userId: number;
    entrepriseId: number;
    firstName: string | null;
    lastName: string | null;
    jobTitle: string | null;
    email: string | null;
    emailStatus: string | null;
    linkedinUrl: string | null;
    status: ProspectStatus;
    source: string | null;
    sourceUrl: string | null;
    externalId: string | null;
    collectedAt: Date | null;
    rawData: string | null;
}

export interface ProspectCreationAttributes extends Optional<ProspectAttributes,
    "idProspect" | "firstName" | "lastName" | "jobTitle" | "email" | "emailStatus" | "linkedinUrl" | "status" | "source" | "sourceUrl" | "externalId" | "collectedAt" | "rawData"> {}

export class ProspectModel extends Model<ProspectAttributes, ProspectCreationAttributes> implements ProspectAttributes {
    declare idProspect: number;
    declare userId: number;
    declare entrepriseId: number;
    declare firstName: string | null;
    declare lastName: string | null;
    declare jobTitle: string | null;
    declare email: string | null;
    declare emailStatus: string | null;
    declare linkedinUrl: string | null;
    declare status: ProspectStatus;
    declare source: string | null;
    declare sourceUrl: string | null;
    declare externalId: string | null;
    declare collectedAt: Date | null;
    declare rawData: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
    declare entreprise?: EntrepriseModel;
}

export const Prospect = (sequelize: Sequelize) => {
    ProspectModel.init({
        idProspect: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        entrepriseId: { type: DataTypes.INTEGER, allowNull: false },
        firstName: { type: DataTypes.STRING(100), allowNull: true },
        lastName: { type: DataTypes.STRING(100), allowNull: true },
        jobTitle: { type: DataTypes.STRING(180), allowNull: true },
        email: { type: DataTypes.STRING(320), allowNull: true },
        emailStatus: { type: DataTypes.STRING(40), allowNull: true },
        linkedinUrl: { type: DataTypes.STRING(500), allowNull: true },
        status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "to_qualify" },
        source: { type: DataTypes.STRING(120), allowNull: true },
        sourceUrl: { type: DataTypes.STRING(1000), allowNull: true },
        externalId: { type: DataTypes.STRING(180), allowNull: true },
        collectedAt: { type: DataTypes.DATE, allowNull: true },
        rawData: { type: DataTypes.TEXT, allowNull: true },
    }, {
        sequelize,
        tableName: "prospect",
        timestamps: true,
        underscored: true,
        indexes: [
            { name: "prospect_user_company_idx", fields: ["user_id", "entreprise_id"] },
            { name: "prospect_user_email_idx", fields: ["user_id", "email"] },
        ],
    });
    return ProspectModel;
};
