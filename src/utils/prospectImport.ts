import { badRequest } from "./http";
import type { ProspectImportKind } from "../models/ProspectImport";

export interface MappedImportRow {
    companyName: string;
    website: string | null;
    address: string | null;
    firstName: string | null;
    lastName: string | null;
    jobTitle: string | null;
    email: string | null;
    emailStatus: string | null;
    linkedinUrl: string | null;
    source: string | null;
    sourceUrl: string | null;
    externalId: string | null;
}

const aliases: Record<string, string[]> = {
    companyName: ["company", "company name", "account name", "organization", "organisation", "company legal name", "entreprise", "nom entreprise", "nom de l entreprise", "raison sociale", "account"],
    website: ["website", "account website", "company website", "website url", "domain", "domain name", "company domain", "site web", "domaine"],
    address: ["address", "company address", "street", "adresse"],
    firstName: ["first name", "firstname", "first", "prenom", "given name"],
    lastName: ["last name", "lastname", "surname", "last", "nom de famille"],
    jobTitle: ["title", "job title", "position", "role", "fonction", "poste", "titre"],
    email: ["email", "email address", "work email", "business email", "email professionnel", "courriel"],
    emailStatus: ["email status", "email verification", "email verification status", "verification email", "statut email"],
    linkedinUrl: ["linkedin url", "person linkedin url", "linkedin profile", "linkedin", "url linkedin", "profile url"],
    source: ["source", "data source", "provider", "fournisseur", "origine"],
    sourceUrl: ["source url", "source link", "source website", "url source"],
    externalId: ["id", "apollo id", "record id", "contact id", "account id", "external id", "identifier"],
};

const keyOf = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function parseDelimited(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"' && cell.length === 0) quoted = true;
        else if (ch === delimiter) { row.push(cell.trim()); cell = ""; }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(cell.trim()); cell = "";
            if (row.some((value) => value !== "")) rows.push(row);
            row = [];
        } else cell += ch;
    }
    if (quoted) throw badRequest("CSV contains an unclosed quoted field");
    row.push(cell.trim());
    if (row.some((value) => value !== "")) rows.push(row);
    return rows;
}

function detectDelimiter(header: string): string {
    const options = [",", ";", "\t"];
    return options.map((delimiter) => ({ delimiter, count: parseDelimited(header, delimiter)[0]?.length ?? 0 }))
        .sort((a, b) => b.count - a.count)[0].delimiter;
}

export function mapCsv(text: string, kind: ProspectImportKind): { headers: string[]; rows: { raw: Record<string, string>; mapped: MappedImportRow; errors: string[] }[] } {
    const cleaned = text.replace(/^\uFEFF/, "");
    const firstLine = cleaned.split(/\r?\n/, 1)[0] ?? "";
    const matrix = parseDelimited(cleaned, detectDelimiter(firstLine));
    if (matrix.length < 2) throw badRequest("CSV must contain a header and at least one data row");
    const headers = matrix[0].map((h) => h.replace(/^\uFEFF/, "").trim());
    if (headers.length < 2) throw badRequest("Could not detect CSV columns; export the file as comma- or semicolon-separated CSV");
    const normalizedHeaders = headers.map(keyOf);
    const col = (field: string): number => {
        const candidates = aliases[field].map(keyOf);
        return normalizedHeaders.findIndex((header) => candidates.includes(header));
    };
    const value = (cells: string[], field: string) => {
        const i = col(field);
        return i >= 0 ? (cells[i] ?? "").trim() || null : null;
    };
    const rows = matrix.slice(1, 501).map((cells) => {
        const raw = Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""]));
        const mapped: MappedImportRow = {
            companyName: value(cells, "companyName") ?? "",
            website: value(cells, "website"), address: value(cells, "address"),
            firstName: value(cells, "firstName"), lastName: value(cells, "lastName"),
            jobTitle: value(cells, "jobTitle"), email: value(cells, "email")?.toLowerCase() ?? null,
            emailStatus: value(cells, "emailStatus"), linkedinUrl: value(cells, "linkedinUrl"),
            source: value(cells, "source"), sourceUrl: value(cells, "sourceUrl"), externalId: value(cells, "externalId"),
        };
        const errors: string[] = [];
        if (!mapped.companyName) errors.push("Nom d'entreprise absent");
        if (kind === "contacts" && !(mapped.firstName || mapped.lastName || mapped.email || mapped.linkedinUrl)) errors.push("Contact sans nom, email ni profil LinkedIn");
        if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) errors.push("Format d'email invalide");
        return { raw, mapped, errors };
    });
    if (matrix.length > 501) throw badRequest("Import limited to 500 rows per batch; split the CSV and import the next part separately");
    return { headers, rows };
}

export const normalizedCompanyKey = (name: string) => name.trim().toLocaleLowerCase("fr-FR").replace(/\s+/g, " ");
