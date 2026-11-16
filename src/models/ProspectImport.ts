import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type ProspectImportKind = "companies" | "contacts";
export type ProspectImportStatus = "review" | "approved" | "rejected";

interface ImportAttributes {
    idProspectImport: number;
    userId: number;
    filename: string;
    kind: ProspectImportKind;
    status: ProspectImportStatus;
    totalRows: number;
    validRows: number;
    importedRows: number;
    sha256: string;
}

interface ImportCreationAttributes extends Optional<ImportAttributes, "idProspectImport" | "status" | "importedRows"> {}

export class ProspectImportModel extends Model<ImportAttributes, ImportCreationAttributes> implements ImportAttributes {
    declare idProspectImport: number;
    declare userId: number;
    declare filename: string;
    declare kind: ProspectImportKind;
    declare status: ProspectImportStatus;
    declare totalRows: number;
    declare validRows: number;
    declare importedRows: number;
    declare sha256: string;
    declare createdAt: Date;
    declare updatedAt: Date;
}

export const ProspectImport = (sequelize: Sequelize) => {
    ProspectImportModel.init({
        idProspectImport: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        filename: { type: DataTypes.STRING(255), allowNull: false },
        kind: { type: DataTypes.STRING(20), allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "review" },
        totalRows: { type: DataTypes.INTEGER, allowNull: false },
        validRows: { type: DataTypes.INTEGER, allowNull: false },
        importedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        sha256: { type: DataTypes.STRING(64), allowNull: false },
    }, { sequelize, tableName: "prospect_import", timestamps: true, underscored: true });
    return ProspectImportModel;
};

interface ImportRowAttributes {
    idProspectImportRow: number;
    importId: number;
    rowNumber: number;
    rawData: string;
    mappedData: string;
    errors: string | null;
    state: "ready" | "imported" | "duplicate" | "invalid";
}

interface ImportRowCreationAttributes extends Optional<ImportRowAttributes, "idProspectImportRow" | "errors" | "state"> {}

export class ProspectImportRowModel extends Model<ImportRowAttributes, ImportRowCreationAttributes> implements ImportRowAttributes {
    declare idProspectImportRow: number;
    declare importId: number;
    declare rowNumber: number;
    declare rawData: string;
    declare mappedData: string;
    declare errors: string | null;
    declare state: "ready" | "imported" | "duplicate" | "invalid";
}

export const ProspectImportRow = (sequelize: Sequelize) => {
    ProspectImportRowModel.init({
        idProspectImportRow: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        importId: { type: DataTypes.INTEGER, allowNull: false },
        rowNumber: { type: DataTypes.INTEGER, allowNull: false },
        rawData: { type: DataTypes.TEXT, allowNull: false },
        mappedData: { type: DataTypes.TEXT, allowNull: false },
        errors: { type: DataTypes.TEXT, allowNull: true },
        state: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "ready" },
    }, { sequelize, tableName: "prospect_import_row", timestamps: false, underscored: true,
        indexes: [{ name: "prospect_import_row_unique", unique: true, fields: ["import_id", "row_number"] }] });
    return ProspectImportRowModel;
};
