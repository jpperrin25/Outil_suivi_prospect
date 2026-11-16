import type { Request, Response } from "express";
import { OfferTypeModel } from "../../models/OfferType";
import { JobModel } from "../../models/Job";
import { getUserId } from "../../middleware/authentification";
import { badRequest, conflict, notFound, parseBody, parseId, requireText } from "../../utils/http";

async function findOffer(req: Request): Promise<OfferTypeModel> {
    const offer = await OfferTypeModel.findByPk(parseId(req.params.id));
    if (!offer) throw notFound("Offer type not found");
    return offer;
}

async function assertNameFree(name: string, exceptId?: number) {
    const other = await OfferTypeModel.findOne({ where: { offerType: name } });
    if (other && other.idOffer !== exceptId) throw conflict("This offer type already exists");
}

export const offerTypeController = {
    async all(_req: Request, res: Response) {
        const userId = getUserId(res);
        const [offers, counts] = await Promise.all([
            OfferTypeModel.findAll({ order: [["offerType", "ASC"]] }),
            JobModel.count({ where: { userId }, group: ["offerTypeId"] }),
        ]);
        const byId = new Map<number, number>(
            (counts as unknown as { offerTypeId: number; count: number }[]).map((r) => [r.offerTypeId, Number(r.count)]),
        );
        res.json({
            status: "SUCCESS",
            offerTypes: offers.map((o) => ({ ...o.get({ plain: true }), jobCount: byId.get(o.idOffer) ?? 0 })),
        });
    },

    async create(req: Request, res: Response) {
        const name = requireText(parseBody(req.body).offerType, "offerType", 100);
        await assertNameFree(name);
        const item = await OfferTypeModel.create({ offerType: name });
        res.status(201).json({ status: "SUCCESS", item });
    },

    async update(req: Request, res: Response) {
        const offer = await findOffer(req);
        const name = requireText(parseBody(req.body).offerType, "offerType", 100);
        await assertNameFree(name, offer.idOffer);
        offer.offerType = name;
        await offer.save();
        res.json({ status: "SUCCESS", item: offer });
    },

    async remove(req: Request, res: Response) {
        const offer = await findOffer(req);
        const used = await JobModel.count({ where: { offerTypeId: offer.idOffer } });
        let replacement: number | null = null;

        if (used > 0) {
            if (req.query.replaceWith === undefined) {
                throw conflict(`This offer type is used by ${used} application(s)`, { jobCount: used });
            }
            replacement = parseId(req.query.replaceWith, "replaceWith");
            if (replacement === offer.idOffer || !(await OfferTypeModel.findByPk(replacement))) {
                throw badRequest("replaceWith is invalid");
            }
        }
        await offer.sequelize.transaction(async (transaction) => {
            if (replacement !== null) {
                await JobModel.update({ offerTypeId: replacement }, { where: { offerTypeId: offer.idOffer }, transaction });
            }
            await offer.destroy({ transaction });
        });
        res.json({ status: "SUCCESS", message: "Offer type deleted" });
    },
};
