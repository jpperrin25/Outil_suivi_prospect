import fs from "node:fs/promises";
import path from "node:path";
import { connectToDatabase } from "../sequelize";
import { UserModel } from "../../models/User";
import { EntrepriseModel } from "../../models/Entreprise";
import { ProspectModel } from "../../models/Prospect";
import { ProspectInteractionModel } from "../../models/ProspectInteraction";

type EventInput = { id: string; at: string; direction: "outbound" | "inbound"; subject?: string; summary: string; responseState: "pending" | "replied" | "no_response"; attachments?: string[] };
type ContactInput = { id: string; firstName: string; lastName: string; title?: string; company: string; status: "contacted" | "replied"; events: EventInput[] };

async function main() {
    const userRef = process.argv[2]?.trim();
    if (!userRef) throw new Error("Usage: npm run import-linkedin -- <user-id|email>");
    const numericUserId = /^\d+$/.test(userRef) ? Number(userRef) : null;
    const inputPath = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(process.cwd(), "private-data/linkedin-interactions.json");
    const input = JSON.parse(await fs.readFile(inputPath, "utf8")) as { contacts: ContactInput[] };
    if (!Array.isArray(input.contacts) || input.contacts.length === 0) throw new Error("Import file contains no contacts");

    const sequelize = await connectToDatabase();
    try {
        const user = numericUserId === null
            ? await UserModel.findOne({ where: { email: userRef.toLowerCase() } })
            : await UserModel.findByPk(numericUserId);
        if (!user) throw new Error(`No Prospect Engine account found for ${userRef}; create the account in the app first`);
        let contacts = 0;
        let events = 0;
        for (const item of input.contacts) {
            const [company] = await EntrepriseModel.findOrCreate({
                where: { userId: user.idUser, name: item.company },
                defaults: { userId: user.idUser, name: item.company, notes: "Entreprise issue d’un import manuel des échanges LinkedIn." },
            });
            const externalId = `linkedin:${item.id}`;
            let prospect = await ProspectModel.findOne({ where: { userId: user.idUser, externalId } });
            if (!prospect) {
                prospect = await ProspectModel.findOne({ where: { userId: user.idUser, entrepriseId: company.idEntreprise, firstName: item.firstName, lastName: item.lastName } });
            }
            if (!prospect) {
                prospect = await ProspectModel.create({
                    userId: user.idUser, entrepriseId: company.idEntreprise, firstName: item.firstName, lastName: item.lastName,
                    jobTitle: item.title ?? null, status: item.status, source: "LinkedIn · import manuel", externalId,
                });
            } else {
                await prospect.update({ jobTitle: prospect.jobTitle || item.title || null, status: item.status, source: prospect.source || "LinkedIn · import manuel", externalId: prospect.externalId || externalId });
            }
            contacts++;
            for (const event of item.events) {
                const [, created] = await ProspectInteractionModel.findOrCreate({
                    where: { userId: user.idUser, externalId: event.id },
                    defaults: {
                        userId: user.idUser, prospectId: prospect.idProspect, channel: "linkedin", direction: event.direction,
                        occurredAt: new Date(event.at), subject: event.subject ?? null,
                        summary: event.attachments?.length ? `${event.summary} Pièce jointe : ${event.attachments.join(", ")}.` : event.summary,
                        responseState: event.responseState, externalId: event.id,
                    },
                });
                if (created) events++;
            }
        }
        console.log(JSON.stringify({ userId: user.idUser, contacts, newEvents: events }, null, 2));
    } finally {
        await sequelize.close();
    }
}

main().catch((error: unknown) => {
    console.error("Import LinkedIn impossible :", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
