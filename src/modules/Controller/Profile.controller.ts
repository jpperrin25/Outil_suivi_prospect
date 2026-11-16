import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { config } from "../../config/env";
import { UserModel } from "../../models/User";
import { JobModel } from "../../models/Job";
import { JobStatusHistoryModel } from "../../models/JobStatusHistory";
import { EntrepriseModel } from "../../models/Entreprise";
import { getUserId } from "../../middleware/authentification";
import { conflict, notFound, parseBody, parseText } from "../../utils/http";
import { parseEmail, parsePassword, userPublic } from "./Auth.controller";

async function currentUser(res: Response): Promise<UserModel> {
    const user = await UserModel.findByPk(getUserId(res));
    if (!user) throw notFound("User not found");
    return user;
}

export const profileController = {
    async get(_req: Request, res: Response) {
        res.json({ status: "SUCCESS", user: userPublic(await currentUser(res)) });
    },

    async update(req: Request, res: Response) {
        const user = await currentUser(res);
        const body = parseBody(req.body);

        if (body.email !== undefined) {
            const email = parseEmail(body.email);
            const other = await UserModel.findOne({ where: { email } });
            if (other && other.idUser !== user.idUser) throw conflict("This email is already used");
            user.email = email;
        }
        const username = parseText(body.username, "username", 100);
        if (username !== undefined) user.username = username;
        if (body.password !== undefined && body.password !== "") {
            user.password = await bcrypt.hash(parsePassword(body.password), config.bcrypt.saltRounds);
        }
        await user.save();
        res.json({ status: "SUCCESS", user: userPublic(user) });
    },

    /** Supprime le compte et toutes ses données. */
    async remove(_req: Request, res: Response) {
        const userId = getUserId(res);
        const user = await currentUser(res);
        await user.sequelize.transaction(async (transaction) => {
            const jobs = await JobModel.findAll({ where: { userId }, attributes: ["idJob"], transaction });
            const ids = jobs.map((j) => j.idJob);
            if (ids.length) await JobStatusHistoryModel.destroy({ where: { jobId: ids }, transaction });
            await JobModel.destroy({ where: { userId }, transaction });
            await EntrepriseModel.destroy({ where: { userId }, transaction });
            await user.destroy({ transaction });
        });
        res.json({ status: "SUCCESS", message: "Account deleted" });
    },
};
