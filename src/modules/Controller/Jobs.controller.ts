import type { Request, Response } from "express";
import type { Transaction } from "sequelize";
import { EntrepriseModel } from "../../models/Entreprise";
import { JobModel, toPlainJob, type JobAttributs } from "../../models/Job";
import { JobStatusHistoryModel } from "../../models/JobStatusHistory";
import { OfferTypeModel } from "../../models/OfferType";
import { StatusModel } from "../../models/Status";
import { getUserId } from "../../middleware/authentification";
import { todayISO } from "../../utils/dates";
import {
    badRequest, notFound, parseBody, parseDate, parseId, parseRating, parseText, requireText,
} from "../../utils/http";

const include = [
    { model: EntrepriseModel, as: "entreprise" },
    { model: StatusModel, as: "status" },
    { model: OfferTypeModel, as: "offerType" },
];

const qs = (req: Request, key: string): string | undefined => {
    const v = req.query[key];
    return typeof v === "string" && v !== "" ? v : undefined;
};

async function findOwned(req: Request, res: Response): Promise<JobModel> {
    const job = await JobModel.findOne({
        where: { idJob: parseId(req.params.id), userId: getUserId(res) },
        include,
    });
    if (!job) throw notFound("Job not found");
    return job;
}

/** Retrouve (ou crée à la volée) l'entreprise d'une candidature. */
type EntrepriseRef = { id: number } | { name: string } | null;

/** Lit la référence d'entreprise du body SANS rien écrire en base (la création se fait ensuite, en transaction). */
function parseEntrepriseRef(body: Record<string, unknown>, required: boolean): EntrepriseRef {
    if (body.entrepriseId !== undefined && body.entrepriseId !== null && body.entrepriseId !== "") {
        return { id: parseId(body.entrepriseId, "entrepriseId") };
    }
    if (body.entrepriseName !== undefined) return { name: requireText(body.entrepriseName, "entrepriseName") };
    if (required) throw badRequest("entrepriseId or entrepriseName is required");
    return null;
}

async function resolveEntreprise(ref: EntrepriseRef, userId: number, transaction: Transaction) {
    if (!ref) return null;
    if ("id" in ref) {
        const e = await EntrepriseModel.findOne({ where: { idEntreprise: ref.id, userId }, transaction });
        if (!e) throw notFound("Entreprise not found");
        return e;
    }
    const [e] = await EntrepriseModel.findOrCreate({
        where: { userId, name: ref.name },
        defaults: { userId, name: ref.name },
        transaction,
    });
    return e;
}

/** Champs "simples" d'une candidature, validés. Les champs absents ne sont pas touchés. */
function parseJobFields(body: Record<string, unknown>): Partial<JobAttributs> {
    const out: Partial<JobAttributs> = {};
    if (body.job !== undefined) out.job = requireText(body.job, "job");

    const dates = ["sendDate", "lastContactDate", "nextFollowUpDate"] as const;
    for (const key of dates) {
        const v = parseDate(body[key], key);
        if (v !== undefined) out[key] = v;
    }
    const texts = [
        ["notes", 10000],
        ["jobUrl", 500],
        ["contactPerson", 255],
        ["contactEmail", 255],
    ] as const;
    for (const [key, max] of texts) {
        const v = parseText(body[key], key, max);
        if (v !== undefined) out[key] = v;
    }
    return out;
}

async function addHistory(jobId: number, status: StatusModel, note: string | null, transaction?: Transaction) {
    await JobStatusHistoryModel.create(
        { jobId, statusId: status.idStatus, statusLabel: status.status, note },
        { transaction },
    );
}

const plain = toPlainJob;

export const jobController = {
    /**
     * GET /job — filtres : statusId, entrepriseId, offerTypeId, minRating, q, due=true (relances à faire)
     * tri : sort = recent | rating | company | sendDate | followUp, order = asc | desc
     */
    async all(req: Request, res: Response) {
        const where: Record<string, number> = { userId: getUserId(res) };
        for (const key of ["statusId", "entrepriseId", "offerTypeId"] as const) {
            const v = qs(req, key);
            if (v !== undefined) where[key] = parseId(v, key);
        }
        let jobs = (await JobModel.findAll({ where, include })).map(plain);

        const minRating = qs(req, "minRating");
        if (minRating !== undefined) {
            const min = Number(minRating);
            jobs = jobs.filter((j) => (j.entreprise?.interestRating ?? 0) >= min);
        }
        const q = qs(req, "q")?.toLowerCase();
        if (q) {
            jobs = jobs.filter((j) =>
                [j.job, j.entreprise?.name, j.notes, j.contactPerson].some((s) => s?.toLowerCase().includes(q)),
            );
        }
        if (qs(req, "due") === "true") {
            const today = todayISO();
            jobs = jobs.filter((j) => j.nextFollowUpDate && j.nextFollowUpDate <= today && !["success", "failure"].includes(j.status?.kind ?? ""));
        }

        const dir = qs(req, "order") === "asc" ? 1 : -1;
        const cmpStr = (a?: string | null, b?: string | null) => (a ?? "").localeCompare(b ?? "");
        const sorters: Record<string, (a: (typeof jobs)[number], b: (typeof jobs)[number]) => number> = {
            recent: (a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt),
            rating: (a, b) => (a.entreprise?.interestRating ?? 0) - (b.entreprise?.interestRating ?? 0),
            company: (a, b) => cmpStr(a.entreprise?.name, b.entreprise?.name),
            sendDate: (a, b) => cmpStr(a.sendDate, b.sendDate),
            // les candidatures sans relance prévue passent après les autres
            followUp: (a, b) => cmpStr(a.nextFollowUpDate ?? "9999-99-99", b.nextFollowUpDate ?? "9999-99-99"),
        };
        const sorter = sorters[qs(req, "sort") ?? "recent"] ?? sorters.recent;
        jobs.sort((a, b) => sorter(a, b) * dir);

        res.json({ status: "SUCCESS", count: jobs.length, jobs });
    },

    async detail(req: Request, res: Response) {
        const job = await findOwned(req, res);
        const history = await JobStatusHistoryModel.findAll({
            where: { jobId: job.idJob },
            order: [["createdAt", "ASC"], ["idHistory", "ASC"]],
        });
        res.json({ status: "SUCCESS", job: { ...plain(job), history } });
    },

    async create(req: Request, res: Response) {
        const userId = getUserId(res);
        const body = parseBody(req.body);
        const fields = parseJobFields(body);
        if (!fields.job) throw badRequest("job is required");

        const entrepriseRef = parseEntrepriseRef(body, true);
        const rating = parseRating(body.interestRating);

        const status = body.statusId
            ? await StatusModel.findByPk(parseId(body.statusId, "statusId"))
            : await StatusModel.findOne({ order: [["position", "ASC"], ["idStatus", "ASC"]] });
        if (!status) throw notFound("Status not found");

        const offerType = body.offerTypeId
            ? await OfferTypeModel.findByPk(parseId(body.offerTypeId, "offerTypeId"))
            : await OfferTypeModel.findOne({ order: [["idOffer", "ASC"]] });
        if (!offerType) throw notFound("Offer type not found");

        if (fields.sendDate === undefined && status.kind !== "todo") fields.sendDate = todayISO();

        const created = await JobModel.sequelize!.transaction(async (transaction) => {
            const entreprise = (await resolveEntreprise(entrepriseRef, userId, transaction))!;
            if (rating !== undefined) await entreprise.update({ interestRating: rating }, { transaction });
            const job = await JobModel.create(
                {
                    ...fields,
                    job: fields.job!,
                    userId,
                    entrepriseId: entreprise.idEntreprise,
                    statusId: status.idStatus,
                    offerTypeId: offerType.idOffer,
                },
                { transaction },
            );
            await addHistory(job.idJob, status, parseText(body.statusNote, "statusNote", 500) ?? null, transaction);
            return job;
        });

        req.params.id = String(created.idJob);
        res.status(201).json({ status: "SUCCESS", job: plain(await findOwned(req, res)) });
    },

    /** PUT et PATCH : seuls les champs envoyés sont modifiés. Un changement de statut alimente l'historique. */
    async update(req: Request, res: Response) {
        const userId = getUserId(res);
        const job = await findOwned(req, res);
        const body = parseBody(req.body);
        const fields = parseJobFields(body);

        const entrepriseRef = parseEntrepriseRef(body, false);
        const rating = parseRating(body.interestRating);

        let newStatus: StatusModel | null = null;
        if (body.statusId !== undefined && Number(body.statusId) !== job.statusId) {
            newStatus = await StatusModel.findByPk(parseId(body.statusId, "statusId"));
            if (!newStatus) throw notFound("Status not found");
        }
        let offerTypeId: number | undefined;
        if (body.offerTypeId !== undefined) {
            offerTypeId = parseId(body.offerTypeId, "offerTypeId");
            if (!(await OfferTypeModel.findByPk(offerTypeId))) throw notFound("Offer type not found");
        }

        await job.sequelize.transaction(async (transaction) => {
            const entreprise = await resolveEntreprise(entrepriseRef, userId, transaction);
            const targetEntreprise = entreprise ?? job.entreprise!;
            if (rating !== undefined) await targetEntreprise.update({ interestRating: rating }, { transaction });

            await job.update(
                {
                    ...fields,
                    ...(entreprise ? { entrepriseId: entreprise.idEntreprise } : {}),
                    ...(newStatus ? { statusId: newStatus.idStatus } : {}),
                    ...(offerTypeId !== undefined ? { offerTypeId } : {}),
                },
                { transaction },
            );
            if (newStatus) {
                await addHistory(job.idJob, newStatus, parseText(body.statusNote, "statusNote", 500) ?? null, transaction);
            }
        });

        res.json({ status: "SUCCESS", job: plain(await findOwned(req, res)) });
    },

    /** POST /job/:id/followup — "j'ai relancé / eu un contact" : met à jour les dates et ajoute une ligne à la timeline. */
    async followUp(req: Request, res: Response) {
        const job = await findOwned(req, res);
        const body = parseBody(req.body);
        const date = parseDate(body.date, "date") ?? todayISO();
        const next = parseDate(body.nextFollowUpDate, "nextFollowUpDate");
        const note = parseText(body.note, "note", 500) ?? null;

        await job.sequelize.transaction(async (transaction) => {
            await job.update(
                { lastContactDate: date, ...(next !== undefined ? { nextFollowUpDate: next } : {}) },
                { transaction },
            );
            await addHistory(job.idJob, job.status!, note ? `Contact : ${note}` : "Contact / relance", transaction);
        });
        res.json({ status: "SUCCESS", job: plain(await findOwned(req, res)) });
    },

    async remove(req: Request, res: Response) {
        const job = await findOwned(req, res);
        await job.sequelize.transaction(async (transaction) => {
            await JobStatusHistoryModel.destroy({ where: { jobId: job.idJob }, transaction });
            await job.destroy({ transaction });
        });
        res.json({ status: "SUCCESS", message: "Job deleted" });
    },
};
