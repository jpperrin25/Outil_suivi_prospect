import type { NextFunction, Request, Response } from "express";
import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from "sequelize";
import { HttpError } from "../utils/http";

export function notFoundApi(_req: Request, res: Response): void {
    res.status(404).json({ status: "FAILED", message: "Route not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof HttpError) {
        res.status(err.statusCode).json({ status: err.label, message: err.message, ...(err.extra ?? {}) });
        return;
    }
    if (err instanceof UniqueConstraintError) {
        res.status(409).json({ status: "CONFLICT", message: "This value already exists" });
        return;
    }
    if (err instanceof ForeignKeyConstraintError) {
        res.status(409).json({ status: "CONFLICT", message: "This item is still used by other records" });
        return;
    }
    if (err instanceof ValidationError) {
        res.status(400).json({ status: "FAILED", message: err.errors.map((e) => e.message).join(", ") });
        return;
    }
    if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
        res.status(400).json({ status: "FAILED", message: "Invalid JSON body" });
        return;
    }
    console.error(err);
    res.status(500).json({ status: "ERROR", message: "Internal server error" });
}
