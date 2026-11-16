import { DataTypes, Model, Optional, Sequelize } from "sequelize";

/**
 * Famille du statut, utilisée pour les statistiques :
 * todo = à postuler, sent = envoyée / en attente, progress = en discussion (entretiens…),
 * success = accepté, failure = refusé.
 */
export const STATUS_KINDS = ["todo", "sent", "progress", "success", "failure"] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];

export interface StatusAttributs {
    idStatus: number;
    status: string;
    color: string;
    kind: StatusKind;
    position: number;
}

export interface StatusCreationAttributs
    extends Optional<StatusAttributs, "idStatus" | "color" | "kind" | "position"> { }

export class StatusModel extends Model<StatusAttributs, StatusCreationAttributs> {
    declare idStatus: number;
    declare status: string;
    declare color: string;
    declare kind: StatusKind;
    declare position: number;
}

export const Status = (sequelize: Sequelize) => {
    StatusModel.init(
        {
            idStatus: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            status: { type: DataTypes.STRING(100), allowNull: false },
            color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#7c8798" },
            kind: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "sent",
                validate: { isIn: [STATUS_KINDS as unknown as string[]] },
            },
            position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        },
        {
            sequelize,
            tableName: "status",
            timestamps: true,
            underscored: true,
            indexes: [{ name: "status_name_unique", unique: true, fields: ["status"] }],
        },
    );
    return StatusModel;
};
