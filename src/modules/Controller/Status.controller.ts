import type { Request, Response } from "express";
import { StatusModel, STATUS_KINDS, type StatusKind } from "../../models/Status";
import { JobModel } from "../../models/Job";
import { getUserId } from "../../middleware/authentification";
import { badRequest, conflict, notFound, parseBody, parseColor, parseId, requireText } from "../../utils/http";

function parseKind(value: unknown): StatusKind | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string" || !(STATUS_KINDS as readonly string[]).includes(value)) {
        throw badRequest(`kind must be one of: ${STATUS_KINDS.join(", ")}`);
    }
    return value as StatusKind;
}

async function findStatus(req: Request): Promise<StatusModel> {
    const status = await StatusModel.findByPk(parseId(req.params.id));
    if (!status) throw notFound("Status not found");
    return status;
}

async function assertNameFree(name: string, exceptId?: number) {
    const other = await StatusModel.findOne({ where: { status: name } });
    if (other && other.idStatus !== exceptId) throw conflict("This status already exists");
}

export const statusController = {
    async all(_req: Request, res: Response) {
        const userId = getUserId(res);
        const [statuses, counts] = await Promise.all([
            StatusModel.findAll({ order: [["position", "ASC"], ["idStatus", "ASC"]] }),
            JobModel.count({ where: { userId }, group: ["statusId"] }),
        ]);
        const byId = new Map<number, number>(
            (counts as unknown as { statusId: number; count: number }[]).map((r) => [r.statusId, Number(r.count)]),
        );
        res.json({
            status: "SUCCESS",
            statuses: statuses.map((s) => ({ ...s.get({ plain: true }), jobCount: byId.get(s.idStatus) ?? 0 })),
        });
    },

    async create(req: Request, res: Response) {
        const body = parseBody(req.body);
        const name = requireText(body.status, "status", 100);
        await assertNameFree(name);
        const max = (await StatusModel.max("position")) as number | null;
        const status = await StatusModel.create({
            status: name,
            color: parseColor(body.color) ?? "#7c8798",
            kind: parseKind(body.kind) ?? "sent",
            position: (max ?? -1) + 1,
        });
        res.status(201).json({ status: "SUCCESS", item: status });
    },

    async update(req: Request, res: Response) {
        const status = await findStatus(req);
        const body = parseBody(req.body);
        if (body.status !== undefined) {
            const name = requireText(body.status, "status", 100);
            await assertNameFree(name, status.idStatus);
            status.status = name;
        }
        const color = parseColor(body.color);
        if (color) status.color = color;
        const kind = parseKind(body.kind);
        if (kind) status.kind = kind;
        if (body.position !== undefined) {
            const pos = Number(body.position);
            if (!Number.isInteger(pos)) throw badRequest("position must be an integer");
            status.position = pos;
        }
        await status.save();
        res.json({ status: "SUCCESS", item: status });
    },

    /** Utilisé par des candidatures : 409, sauf avec ?replaceWith=<idStatus> qui les réaffecte. */
    async remove(req: Request, res: Response) {
        const status = await findStatus(req);
        const used = await JobModel.count({ where: { statusId: status.idStatus } });
        let replacement: number | null = null;

        if (used > 0) {
            if (req.query.replaceWith === undefined) {
                throw conflict(`This status is used by ${used} application(s)`, { jobCount: used });
            }
            replacement = parseId(req.query.replaceWith, "replaceWith");
            if (replacement === status.idStatus || !(await StatusModel.findByPk(replacement))) {
                throw badRequest("replaceWith is invalid");
            }
        }
        await status.sequelize.transaction(async (transaction) => {
            if (replacement !== null) {
                await JobModel.update({ statusId: replacement }, { where: { statusId: status.idStatus }, transaction });
            }
            await status.destroy({ transaction });
        });
        res.json({ status: "SUCCESS", message: "Status deleted" });
    },
};
