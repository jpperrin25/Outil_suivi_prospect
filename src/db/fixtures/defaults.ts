import { StatusModel, type StatusKind } from "../../models/Status";
import { OfferTypeModel } from "../../models/OfferType";

const DEFAULT_STATUSES: { status: string; color: string; kind: StatusKind }[] = [
    { status: "À postuler", color: "#94a3b8", kind: "todo" },
    { status: "Candidature envoyée", color: "#3b82f6", kind: "sent" },
    { status: "Relancée", color: "#06b6d4", kind: "sent" },
    { status: "Entretien RH", color: "#8b5cf6", kind: "progress" },
    { status: "Entretien technique", color: "#a855f7", kind: "progress" },
    { status: "Proposition reçue", color: "#f59e0b", kind: "progress" },
    { status: "Acceptée", color: "#22c55e", kind: "success" },
    { status: "Refusée", color: "#ef4444", kind: "failure" },
    { status: "Abandonnée", color: "#64748b", kind: "failure" },
];

const DEFAULT_OFFER_TYPES = ["Alternance", "Apprentissage", "Contrat de professionnalisation", "Stage", "Candidature spontanée"];

/** Ajoute les statuts / types d'offre par défaut seulement s'ils n'existent pas déjà. Idempotent. */
export async function seedDefaults(): Promise<void> {
    if ((await StatusModel.count()) === 0) {
        await StatusModel.bulkCreate(DEFAULT_STATUSES.map((s, i) => ({ ...s, position: i })));
    }
    if ((await OfferTypeModel.count()) === 0) {
        await OfferTypeModel.bulkCreate(DEFAULT_OFFER_TYPES.map((offerType) => ({ offerType })));
    }
}
