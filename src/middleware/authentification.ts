import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { unauthorized } from "../utils/http";

interface TokenPayload {
    idUser: number;
    isAdmin?: boolean;
}

export const signToken = (idUser: number, isAdmin = false): string =>
    jwt.sign({ idUser, isAdmin }, config.jwt.secret, { expiresIn: config.jwt.expireIn });

/** Vérifie le header "Authorization: Bearer <token>" et place l'id utilisateur dans res.locals.userId. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) throw unauthorized("Missing token");
    try {
        const payload = jwt.verify(header.slice(7), config.jwt.secret) as unknown as TokenPayload;
        if (!payload || typeof payload.idUser !== "number") throw new Error("bad payload");
        res.locals.userId = payload.idUser;
        next();
    } catch {
        throw unauthorized();
    }
}

export const getUserId = (res: Response): number => res.locals.userId as number;
