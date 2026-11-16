export class HttpError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public label: string = "FAILED",
        public extra?: Record<string, unknown>,
    ) {
        super(message);
    }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = "Invalid or expired token") => new HttpError(401, message);
export const forbidden = (message = "Unauthorized") => new HttpError(403, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string, extra?: Record<string, unknown>) =>
    new HttpError(409, message, "CONFLICT", extra);

/** Entier strictement positif (id). */
export function parseId(value: unknown, label = "id"): number {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw badRequest(`${label} is invalid`);
    return n;
}

/**
 * Texte optionnel.
 * undefined = champ absent (on ne touche pas) ; null / "" = on vide le champ.
 */
export function parseText(value: unknown, label: string, max = 255): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") throw badRequest(`${label} must be a string`);
    const text = value.trim();
    if (!text) return null;
    if (text.length > max) throw badRequest(`${label} is too long (max ${max} characters)`);
    return text;
}

export function requireText(value: unknown, label: string, max = 255): string {
    const text = parseText(value, label, max);
    if (!text) throw badRequest(`${label} is required`);
    return text;
}

/** Date au format YYYY-MM-DD. */
export function parseDate(value: unknown, label: string): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw badRequest(`${label} must use the YYYY-MM-DD format`);
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw badRequest(`${label} is not a valid date`);
    }
    return value;
}

/** Note d'intérêt de 1 à 5 (null = pas de note). */
export function parseRating(value: unknown, label = "interestRating"): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 5) throw badRequest(`${label} must be an integer between 1 and 5`);
    return n;
}

export function parseColor(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
        throw badRequest("color must look like #aabbcc");
    }
    return value.toLowerCase();
}

export function parseBody(body: unknown): Record<string, unknown> {
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}
