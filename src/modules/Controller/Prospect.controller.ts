import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { Op } from "sequelize";
import { EntrepriseModel } from "../../models/Entreprise";
import { ProspectModel } from "../../models/Prospect";
import { ProspectImportModel, ProspectImportRowModel, type ProspectImportKind } from "../../models/ProspectImport";
import { getUserId } from "../../middleware/authentification";
import { badRequest, notFound } from "../../utils/http";
import { mapCsv, normalizedCompanyKey } from "../../utils/prospectImport";

function safeFilename(value: unknown): string {
    if (typeof value !== "string" || !value.trim()) return "prospects.csv";
    return value.trim().replace(/[\\/\r\n\0]/g, "_").slice(0, 255);
}

async function ownedImport(id: number, userId: number) {
    const run = await ProspectImportModel.findOne({ where: { idProspectImport: id, userId } });
    if (!run) throw notFound("Import not found");
    return run;
}

export const prospectController = {
    async all(req: Request, res: Response) {
        const userId = getUserId(res);
        const q = String(req.query.q ?? "").trim();
        const status = String(req.query.status ?? "").trim();
        const prospects = await ProspectModel.findAll({
            where: {
                userId,
                ...(status ? { status } : {}),
                ...(q ? { [Op.or]: [
                    { firstName: { [Op.like]: `%${q}%` } }, { lastName: { [Op.like]: `%${q}%` } },
                    { email: { [Op.like]: `%${q}%` } }, { jobTitle: { [Op.like]: `%${q}%` } },
                ] } : {}),
            },
            include: [{ model: EntrepriseModel, as: "entreprise", attributes: ["idEntreprise", "name", "website"] }],
            order: [["createdAt", "DESC"]], limit: 500,
        });
        res.json({ status: "SUCCESS", prospects });
    },

    async imports(req: Request, res: Response) {
        const imports = await ProspectImportModel.findAll({ where: { userId: getUserId(res) }, order: [["createdAt", "DESC"]], limit: 30 });
        res.json({ status: "SUCCESS", imports });
    },

    async preview(req: Request, res: Response) {
        const userId = getUserId(res);
        const body = typeof req.body === "string" ? req.body : "";
        if (!body.trim()) throw badRequest("CSV file is empty");
        const kind = String(req.header("x-import-kind") ?? "") as ProspectImportKind;
        if (kind !== "companies" && kind !== "contacts") throw badRequest("Import type must be companies or contacts");
        if (Buffer.byteLength(body, "utf8") > 2_000_000) throw badRequest("CSV file is larger than 2 MB");

        const { headers, rows } = mapCsv(body, kind);
        const sha256 = createHash("sha256").update(body, "utf8").digest("hex");
        const existing = await ProspectImportModel.findOne({ where: { userId, sha256, status: { [Op.ne]: "rejected" } } });
        if (existing?.status === "review") {
            const staged = await ProspectImportRowModel.findAll({ where: { importId: existing.idProspectImport }, order: [["rowNumber", "ASC"]] });
            return res.json({ status: "SUCCESS", import: existing, headers: [],
                preview: staged.slice(0, 25).map((row) => ({ rowNumber: row.rowNumber, ...JSON.parse(row.mappedData), errors: row.errors ? JSON.parse(row.errors) : [] })),
                truncated: staged.length > 25 });
        }
        if (existing) throw badRequest(`This exact file was already imported as batch ${existing.idProspectImport}`);
        const validRows = rows.filter((row) => row.errors.length === 0).length;
        const run = await ProspectImportModel.create({
            userId, filename: safeFilename(req.header("x-import-filename")), kind, status: "review",
            totalRows: rows.length, validRows, importedRows: 0, sha256,
        });
        await ProspectImportRowModel.bulkCreate(rows.map((row, index) => ({
            importId: run.idProspectImport,
            rowNumber: index + 2,
            rawData: JSON.stringify(row.raw),
            mappedData: JSON.stringify(row.mapped),
            errors: row.errors.length ? JSON.stringify(row.errors) : null,
            state: row.errors.length ? "invalid" as const : "ready" as const,
        })));
        res.status(201).json({
            status: "SUCCESS", import: run, headers,
            preview: rows.slice(0, 25).map((row, index) => ({ rowNumber: index + 2, ...row.mapped, errors: row.errors })),
            truncated: rows.length > 25,
        });
    },

    async detail(req: Request, res: Response) {
        const run = await ownedImport(Number(req.params.id), getUserId(res));
        const rows = await ProspectImportRowModel.findAll({ where: { importId: run.idProspectImport }, order: [["rowNumber", "ASC"]], limit: 500 });
        res.json({ status: "SUCCESS", import: run, rows: rows.map((row) => ({
            rowNumber: row.rowNumber, ...JSON.parse(row.mappedData), errors: row.errors ? JSON.parse(row.errors) : [], state: row.state,
        })) });
    },

    async approve(req: Request, res: Response) {
        const userId = getUserId(res);
        const run = await ownedImport(Number(req.params.id), userId);
        if (run.status !== "review") throw badRequest("Only imports awaiting review can be approved");
        if (!run.validRows) throw badRequest("This import has no valid rows to import");
        const rows = await ProspectImportRowModel.findAll({ where: { importId: run.idProspectImport, state: "ready" }, order: [["rowNumber", "ASC"]] });
        const enterprises = await EntrepriseModel.findAll({ where: { userId } });
        const byName = new Map(enterprises.map((company) => [normalizedCompanyKey(company.name), company]));
        let imported = 0, duplicates = 0;

        await ProspectImportModel.sequelize!.transaction(async (transaction) => {
            for (const row of rows) {
                const mapped = JSON.parse(row.mappedData) as ReturnType<typeof mapCsv>["rows"][number]["mapped"];
                const key = normalizedCompanyKey(mapped.companyName);
                let company = byName.get(key);
                if (!company) {
                    company = await EntrepriseModel.create({
                        userId, name: mapped.companyName, website: mapped.website, address: mapped.address,
                        contact: null, notes: `Ajoutée depuis l'import ${run.filename}. Source : ${mapped.source ?? "fichier utilisateur"}.`, interestRating: null,
                    }, { transaction });
                    byName.set(key, company);
                } else if (run.kind === "companies") {
                    const changes: Record<string, unknown> = {};
                    if (!company.website && mapped.website) changes.website = mapped.website;
                    if (!company.address && mapped.address) changes.address = mapped.address;
                    if (Object.keys(changes).length) await company.update(changes, { transaction });
                }

                if (run.kind === "contacts") {
                    const matching = mapped.email || mapped.linkedinUrl || mapped.externalId ? await ProspectModel.findOne({
                        where: { userId, entrepriseId: company.idEntreprise, [Op.or]: [
                            ...(mapped.email ? [{ email: mapped.email.toLowerCase() }] : []),
                            ...(mapped.linkedinUrl ? [{ linkedinUrl: mapped.linkedinUrl }] : []),
                            ...(mapped.externalId ? [{ externalId: mapped.externalId }] : []),
                        ] }, transaction,
                    }) : null;
                    if (matching) {
                        await row.update({ state: "duplicate" }, { transaction });
                        duplicates++;
                        continue;
                    }
                    await ProspectModel.create({
                        userId, entrepriseId: company.idEntreprise, firstName: mapped.firstName, lastName: mapped.lastName,
                        jobTitle: mapped.jobTitle, email: mapped.email?.toLowerCase() ?? null, emailStatus: mapped.emailStatus,
                        linkedinUrl: mapped.linkedinUrl, status: "to_qualify", source: mapped.source ?? "Import manuel",
                        sourceUrl: mapped.sourceUrl, externalId: mapped.externalId, collectedAt: new Date(), rawData: row.rawData,
                    }, { transaction });
                }
                await row.update({ state: "imported" }, { transaction });
                imported++;
            }
            await run.update({ status: "approved", importedRows: imported }, { transaction });
        });
        res.json({ status: "SUCCESS", imported, duplicates, invalid: run.totalRows - run.validRows });
    },

    async reject(req: Request, res: Response) {
        const run = await ownedImport(Number(req.params.id), getUserId(res));
        if (run.status !== "review") throw badRequest("Only imports awaiting review can be rejected");
        await run.update({ status: "rejected" });
        res.json({ status: "SUCCESS", import: run });
    },
};
