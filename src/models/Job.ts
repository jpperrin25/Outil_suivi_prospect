import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import type { EntrepriseModel } from "./Entreprise";
import type { StatusModel } from "./Status";
import type { OfferTypeModel } from "./OfferType";

export interface JobAttributs {
    idJob: number;
    job: string;
    /** Date d'envoi de la candidature (YYYY-MM-DD). */
    sendDate: string | null;
    notes: string | null;
    jobUrl: string | null;
    contactPerson: string | null;
    contactEmail: string | null;
    /** Dernière fois qu'on a eu / relancé un contact (YYYY-MM-DD). */
    lastContactDate: string | null;
    /** Prochaine relance prévue (YYYY-MM-DD). */
    nextFollowUpDate: string | null;

    // FOREIGN KEYS
    offerTypeId: number;
    entrepriseId: number;
    statusId: number;
    userId: number;
}

export interface JobCreationAttributs
    extends Optional<
        JobAttributs,
        "idJob" | "sendDate" | "notes" | "jobUrl" | "contactPerson" | "contactEmail" | "lastContactDate" | "nextFollowUpDate"
    > { }

export class JobModel extends Model<JobAttributs, JobCreationAttributs> {
    declare idJob: number;
    declare job: string;
    declare sendDate: string | null;
    declare notes: string | null;
    declare jobUrl: string | null;
    declare contactPerson: string | null;
    declare contactEmail: string | null;
    declare lastContactDate: string | null;
    declare nextFollowUpDate: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;

    declare offerTypeId: number;
    declare entrepriseId: number;
    declare statusId: number;
    declare userId: number;

    // Renseignés quand la requête fait un include
    declare entreprise?: EntrepriseModel;
    declare status?: StatusModel;
    declare offerType?: OfferTypeModel;
}

/** Candidature "à plat" (get({plain:true})) avec ses relations chargées. */
export type JobPlain = JobAttributs & {
    createdAt: Date;
    updatedAt: Date;
    entreprise?: import("./Entreprise").EntrepriseAttributs & { createdAt: Date; updatedAt: Date };
    status?: import("./Status").StatusAttributs;
    offerType?: import("./OfferType").OfferTypeAttributs;
};

export const toPlainJob = (job: JobModel): JobPlain => job.get({ plain: true }) as unknown as JobPlain;

export const Job = (sequelize: Sequelize) => {
    JobModel.init(
        {
            idJob: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            job: { type: DataTypes.STRING, allowNull: false },
            sendDate: { type: DataTypes.DATEONLY, allowNull: true },
            notes: { type: DataTypes.TEXT, allowNull: true },
            jobUrl: { type: DataTypes.STRING(500), allowNull: true },
            contactPerson: { type: DataTypes.STRING, allowNull: true },
            contactEmail: { type: DataTypes.STRING, allowNull: true },
            lastContactDate: { type: DataTypes.DATEONLY, allowNull: true },
            nextFollowUpDate: { type: DataTypes.DATEONLY, allowNull: true },
            offerTypeId: { type: DataTypes.INTEGER, allowNull: false },
            entrepriseId: { type: DataTypes.INTEGER, allowNull: false },
            statusId: { type: DataTypes.INTEGER, allowNull: false },
            userId: { type: DataTypes.INTEGER, allowNull: false },
        },
        {
            sequelize,
            tableName: "job",
            timestamps: true,
            underscored: true,
        },
    );
    return JobModel;
};
