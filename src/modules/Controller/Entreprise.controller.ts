import type { Request, Response } from "express";
import { EntrepriseModel } from "../../models/Entreprise";
import { JobModel } from "../../models/Job";
import { JobStatusHistoryModel } from "../../models/JobStatusHistory";
import { getUserId } from "../../middleware/authentification";
import {
    conflict, notFound, parseBody, parseId, parseRating, parseText, requireText,
} from "../../utils/http";

async function findOwned(req: Request, res: Response): Promise<EntrepriseModel> {
    const entreprise = await EntrepriseModel.findOne({
        where: { idEntreprise: parseId(req.params.id), userId: getUserId(res) },
    });
    if (!entreprise) throw notFound("Entreprise not found");
    return entreprise;
}

async function assertNameFree(userId: number, name: string, exceptId?: number) {
    const other = await EntrepriseModel.findOne({ where: { userId, name } });
    if (other && other.idEntreprise !== exceptId) throw conflict("An entreprise with this name already exists");
}

export const entrepriseController = {
    async all(_req: Request, res: Response) {
        const userId = getUserId(res);
        const [entreprises, jobs] = await Promise.all([
            EntrepriseModel.findAll({ where: { userId }, order: [["name", "ASC"]] }),
            JobModel.count({ where: { userId }, group: ["entrepriseId"] }),
        ]);
        const counts = new Map<number, number>(
            (jobs as unknown as { entrepriseId: number; count: number }[]).map((r) => [r.entrepriseId, Number(r.count)]),
        );
        res.json({
            status: "SUCCESS",
            entreprises: entreprises.map((e) => ({ ...e.get({ plain: true }), jobCount: counts.get(e.idEntreprise) ?? 0 })),
        });
    },

    async detail(req: Request, res: Response) {
        const entreprise = await findOwned(req, res);
        res.json({ status: "SUCCESS", entreprise });
    },

    async create(req: Request, res: Response) {
        const userId = getUserId(res);
        const body = parseBody(req.body);
        const name = requireText(body.name, "name");
        await assertNameFree(userId, name);

        const entreprise = await EntrepriseModel.create({
            userId,
            name,
            address: parseText(body.address, "address") ?? null,
            contact: parseText(body.contact, "contact") ?? null,
            website: parseText(body.website, "website", 500) ?? null,
            notes: parseText(body.notes, "notes", 5000) ?? null,
            interestRating: parseRating(body.interestRating) ?? null,
        });
        res.status(201).json({ status: "SUCCESS", entreprise });
    },

    /** PUT et PATCH : seuls les champs envoyés sont modifiés. */
    async update(req: Request, res: Response) {
        const entreprise = await findOwned(req, res);
        const body = parseBody(req.body);

        if (body.name !== undefined) {
            const name = requireText(body.name, "name");
            await assertNameFree(entreprise.userId, name, entreprise.idEntreprise);
            entreprise.name = name;
        }
        const address = parseText(body.address, "address");
        if (address !== undefined) entreprise.address = address;
        const contact = parseText(body.contact, "contact");
        if (contact !== undefined) entreprise.contact = contact;
        const website = parseText(body.website, "website", 500);
        if (website !== undefined) entreprise.website = website;
        const notes = parseText(body.notes, "notes", 5000);
        if (notes !== undefined) entreprise.notes = notes;
        const rating = parseRating(body.interestRating);
        if (rating !== undefined) entreprise.interestRating = rating;

        await entreprise.save();
        res.json({ status: "SUCCESS", entreprise });
    },

    /** Si l'entreprise a des candidatures : 409, sauf avec ?force=true (supprime aussi les candidatures). */
    async remove(req: Request, res: Response) {
        const entreprise = await findOwned(req, res);
        const jobs = await JobModel.findAll({ where: { entrepriseId: entreprise.idEntreprise }, attributes: ["idJob"] });

        if (jobs.length && req.query.force !== "true") {
            throw conflict(`This entreprise still has ${jobs.length} application(s)`, { jobCount: jobs.length });
        }
        await entreprise.sequelize.transaction(async (transaction) => {
            if (jobs.length) {
                await JobStatusHistoryModel.destroy({ where: { jobId: jobs.map((j) => j.idJob) }, transaction });
                await JobModel.destroy({ where: { entrepriseId: entreprise.idEntreprise }, transaction });
            }
            await entreprise.destroy({ transaction });
        });
        res.json({ status: "SUCCESS", message: "Entreprise deleted" });
    },
};
