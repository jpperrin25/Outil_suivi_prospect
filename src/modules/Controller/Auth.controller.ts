import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { config } from "../../config/env";
import { UserModel } from "../../models/User";
import { signToken } from "../../middleware/authentification";
import { badRequest, conflict, parseBody, parseText, requireText, unauthorized } from "../../utils/http";

export const userPublic = (u: UserModel) => ({
    idUser: u.idUser,
    username: u.username,
    email: u.email,
    isAdmin: u.isAdmin,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(value: unknown): string {
    const email = requireText(value, "email").toLowerCase();
    if (!EMAIL_RE.test(email)) throw badRequest("email is invalid");
    return email;
}

export function parsePassword(value: unknown): string {
    if (typeof value !== "string" || value.length < 6) throw badRequest("password must contain at least 6 characters");
    return value;
}

export const authController = {
    async signin(req: Request, res: Response) {
        const body = parseBody(req.body);
        const email = parseEmail(body.email);
        const password = parsePassword(body.password);
        const username = parseText(body.username, "username", 100) ?? null;

        if (await UserModel.findOne({ where: { email } })) throw conflict("This email is already used");

        const user = await UserModel.create({
            email,
            username,
            password: await bcrypt.hash(password, config.bcrypt.saltRounds),
        });
        res.status(201).json({ status: "SUCCESS", token: signToken(user.idUser, user.isAdmin), user: userPublic(user) });
    },

    async login(req: Request, res: Response) {
        const body = parseBody(req.body);
        const email = parseEmail(body.email);
        const password = typeof body.password === "string" ? body.password : "";

        const user = await UserModel.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) throw unauthorized("Invalid email or password");

        res.json({ status: "SUCCESS", token: signToken(user.idUser, user.isAdmin), user: userPublic(user) });
    },
};
