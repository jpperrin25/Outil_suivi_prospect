import { DataTypes, Model, Optional, Sequelize } from "sequelize";

/** Chaque changement de statut d'une candidature est enregistré ici : c'est la "timeline". */
export interface JobStatusHistoryAttributs {
    idHistory: number;
    jobId: number;
    statusId: number | null;
    /** Copie du nom du statut au moment du changement (reste lisible si le statut est renommé/supprimé). */
    statusLabel: string;
    note: string | null;
}

export interface JobStatusHistoryCreationAttributs
    extends Optional<JobStatusHistoryAttributs, "idHistory" | "statusId" | "note"> { }

export class JobStatusHistoryModel extends Model<JobStatusHistoryAttributs, JobStatusHistoryCreationAttributs> {
    declare idHistory: number;
    declare jobId: number;
    declare statusId: number | null;
    declare statusLabel: string;
    declare note: string | null;
    declare createdAt: Date;
}

export const JobStatusHistory = (sequelize: Sequelize) => {
    JobStatusHistoryModel.init(
        {
            idHistory: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            jobId: { type: DataTypes.INTEGER, allowNull: false },
            statusId: { type: DataTypes.INTEGER, allowNull: true },
            statusLabel: { type: DataTypes.STRING(100), allowNull: false },
            note: { type: DataTypes.STRING(500), allowNull: true },
        },
        {
            sequelize,
            tableName: "job_status_history",
            timestamps: true,
            updatedAt: false,
            underscored: true,
        },
    );
    return JobStatusHistoryModel;
};
