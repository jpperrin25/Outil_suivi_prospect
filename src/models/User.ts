import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface UserAttributes {
    idUser: number;
    username: string | null;
    email: string;
    password: string;
    isAdmin: boolean;
}

export interface UserCreationAttributes
    extends Optional<UserAttributes, "idUser" | "username" | "isAdmin"> { }

export class UserModel extends Model<UserAttributes, UserCreationAttributes> {
    declare idUser: number;
    declare username: string | null;
    declare email: string;
    declare password: string;
    declare isAdmin: boolean;
}

export const User = (sequelize: Sequelize) => {
    UserModel.init(
        {
            idUser: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            username: { type: DataTypes.STRING(255), allowNull: true },
            email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
            password: { type: DataTypes.STRING(255), allowNull: false },
            isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        },
        {
            sequelize,
            tableName: "users",
            timestamps: true,
            underscored: true,
            indexes: [{ name: "users_email_unique", unique: true, fields: ["email"] }],
        },
    );
    return UserModel;
};
