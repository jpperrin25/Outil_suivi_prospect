import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface EntrepriseAttributs {
    idEntreprise: number;
    userId: number;
    name: string;
    address: string | null;
    contact: string | null;
    website: string | null;
    notes: string | null;
    /** Intérêt porté à l'entreprise, de 1 (bof) à 5 (rêve). */
    interestRating: number | null;
}

export interface EntrepriseCreationAttributs
    extends Optional<EntrepriseAttributs, "idEntreprise" | "address" | "contact" | "website" | "notes" | "interestRating"> { }

export class EntrepriseModel extends Model<EntrepriseAttributs, EntrepriseCreationAttributs> {
    declare idEntreprise: number;
    declare userId: number;
    declare name: string;
    declare address: string | null;
    declare contact: string | null;
    declare website: string | null;
    declare notes: string | null;
    declare interestRating: number | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export const Entreprise = (sequelize: Sequelize) => {
    EntrepriseModel.init(
        {
            idEntreprise: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            userId: { type: DataTypes.INTEGER, allowNull: false },
            name: { type: DataTypes.STRING, allowNull: false },
            address: { type: DataTypes.STRING, allowNull: true },
            contact: { type: DataTypes.STRING, allowNull: true },
            website: { type: DataTypes.STRING(500), allowNull: true },
            notes: { type: DataTypes.TEXT, allowNull: true },
            interestRating: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: { min: 1, max: 5 },
            },
        },
        {
            sequelize,
            tableName: "entreprise",
            timestamps: true,
            underscored: true,
            indexes: [{ name: "entreprise_user_name_unique", unique: true, fields: ["user_id", "name"] }],
        },
    );
    return EntrepriseModel;
};
