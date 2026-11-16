import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type InteractionDirection = "outbound" | "inbound";
export type InteractionResponseState = "pending" | "replied" | "no_response";

export interface ProspectInteractionAttributes {
    idProspectInteraction: number;
    userId: number;
    prospectId: number;
    channel: "linkedin" | "email" | "other";
    direction: InteractionDirection;
    occurredAt: Date;
    subject: string | null;
    summary: string;
    responseState: InteractionResponseState;
    externalId: string;
}

export interface ProspectInteractionCreationAttributes extends Optional<ProspectInteractionAttributes,
    "idProspectInteraction" | "subject" | "responseState"> {}

export class ProspectInteractionModel extends Model<ProspectInteractionAttributes, ProspectInteractionCreationAttributes> implements ProspectInteractionAttributes {
    declare idProspectInteraction: number;
    declare userId: number;
    declare prospectId: number;
    declare channel: "linkedin" | "email" | "other";
    declare direction: InteractionDirection;
    declare occurredAt: Date;
    declare subject: string | null;
    declare summary: string;
    declare responseState: InteractionResponseState;
    declare externalId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export const ProspectInteraction = (sequelize: Sequelize) => {
    ProspectInteractionModel.init({
        idProspectInteraction: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        prospectId: { type: DataTypes.INTEGER, allowNull: false },
        channel: { type: DataTypes.STRING(20), allowNull: false },
        direction: { type: DataTypes.STRING(20), allowNull: false },
        occurredAt: { type: DataTypes.DATE, allowNull: false },
        subject: { type: DataTypes.STRING(255), allowNull: true },
        summary: { type: DataTypes.TEXT, allowNull: false },
        responseState: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
        externalId: { type: DataTypes.STRING(180), allowNull: false },
    }, {
        sequelize,
        tableName: "prospect_interaction",
        timestamps: true,
        underscored: true,
        indexes: [
            { name: "prospect_interaction_user_prospect_date_idx", fields: ["user_id", "prospect_id", "occurred_at"] },
            { name: "prospect_interaction_external_unique", unique: true, fields: ["user_id", "external_id"] },
        ],
    });
    return ProspectInteractionModel;
};
