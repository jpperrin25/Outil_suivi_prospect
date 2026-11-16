const pad = (n: number) => String(n).padStart(2, "0");

export const todayISO = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDaysISO = (iso: string, days: number): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

/** Nombre de jours entre a et b (positif si b est après a). */
export const diffDays = (a: string, b: string): number =>
    Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Lundi de la semaine contenant la date. */
export const weekStartISO = (iso: string): string => {
    const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
    return addDaysISO(iso, -dow);
};
