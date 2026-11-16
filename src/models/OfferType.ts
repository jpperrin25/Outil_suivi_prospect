import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface OfferTypeAttributs {
    idOffer: number;
    offerType: string;
}

export interface OfferTypeCreationAttributs extends Optional<OfferTypeAttributs, "idOffer"> { }

export class OfferTypeModel extends Model<OfferTypeAttributs, OfferTypeCreationAttributs> {
    declare idOffer: number;
    declare offerType: string;
}

export const OfferType = (sequelize: Sequelize) => {
    OfferTypeModel.init(
        {
            idOffer: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            offerType: { type: DataTypes.STRING(100), allowNull: false },
        },
        {
            sequelize,
            tableName: "offer_type",
            timestamps: true,
            underscored: true,
            indexes: [{ name: "offer_type_name_unique", unique: true, fields: ["offer_type"] }],
        },
    );
    return OfferTypeModel;
};
