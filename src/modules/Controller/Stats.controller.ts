import type { Request, Response } from "express";
import { EntrepriseModel } from "../../models/Entreprise";
import { JobModel, toPlainJob } from "../../models/Job";
import { JobStatusHistoryModel } from "../../models/JobStatusHistory";
import { StatusModel } from "../../models/Status";
import { getUserId } from "../../middleware/authentification";
import { addDaysISO, diffDays, todayISO, weekStartISO } from "../../utils/dates";

const STALE_AFTER_DAYS = 14;

export const statsController = {
    async get(_req: Request, res: Response) {
        const userId = getUserId(res);
        const today = todayISO();

        const [statuses, jobModels, entreprises] = await Promise.all([
            StatusModel.findAll({ order: [["position", "ASC"], ["idStatus", "ASC"]] }),
            JobModel.findAll({ where: { userId }, include: [{ model: EntrepriseModel, as: "entreprise" }, { model: StatusModel, as: "status" }] }),
            EntrepriseModel.findAll({ where: { userId } }),
        ]);
        const jobs = jobModels.map(toPlainJob);
        const kindOf = new Map(statuses.map((s) => [s.idStatus, s.kind]));

        // Candidatures qui ont déjà atteint un entretien / une proposition (via l'historique)
        const history = jobs.length
            ? await JobStatusHistoryModel.findAll({ where: { jobId: jobs.map((j) => j.idJob) } })
            : [];
        const reachedInterview = new Set(
            history
                .filter((h) => h.statusId !== null && ["progress", "success"].includes(kindOf.get(h.statusId) ?? ""))
                .map((h) => h.jobId),
        );

        const byKind: Record<string, number> = { todo: 0, sent: 0, progress: 0, success: 0, failure: 0 };
        for (const j of jobs) byKind[j.status?.kind ?? "sent"]++;

        const byStatus = statuses.map((s) => ({
            idStatus: s.idStatus,
            status: s.status,
            color: s.color,
            kind: s.kind,
            count: jobs.filter((j) => j.statusId === s.idStatus).length,
        }));

        const isOpen = (j: (typeof jobs)[number]) => !["success", "failure"].includes(j.status?.kind ?? "");
        const sentJobs = jobs.filter((j) => j.status?.kind !== "todo");

        // Relances en retard / à venir (7 jours)
        const brief = (j: (typeof jobs)[number]) => ({
            idJob: j.idJob,
            job: j.job,
            entreprise: j.entreprise?.name ?? "",
            interestRating: j.entreprise?.interestRating ?? null,
            status: j.status?.status ?? "",
            color: j.status?.color ?? "",
            nextFollowUpDate: j.nextFollowUpDate,
            lastContactDate: j.lastContactDate,
            sendDate: j.sendDate,
        });
        const withFollowUp = jobs.filter((j) => isOpen(j) && j.nextFollowUpDate);
        const overdue = withFollowUp
            .filter((j) => j.nextFollowUpDate! < today)
            .sort((a, b) => a.nextFollowUpDate!.localeCompare(b.nextFollowUpDate!))
            .map(brief);
        const upcoming = withFollowUp
            .filter((j) => j.nextFollowUpDate! >= today && j.nextFollowUpDate! <= addDaysISO(today, 7))
            .sort((a, b) => a.nextFollowUpDate!.localeCompare(b.nextFollowUpDate!))
            .map(brief);

        // Candidatures envoyées sans nouvelle depuis longtemps et sans relance planifiée
        const stale = jobs
            .filter((j) => j.status?.kind === "sent" && !j.nextFollowUpDate)
            .map((j) => ({ j, ref: j.lastContactDate ?? j.sendDate }))
            .filter((x) => x.ref && diffDays(x.ref, today) >= STALE_AFTER_DAYS)
            .sort((a, b) => a.ref!.localeCompare(b.ref!))
            .map((x) => ({ ...brief(x.j), daysSinceContact: diffDays(x.ref!, today) }));

        // Envois par semaine (8 dernières semaines)
        const thisWeek = weekStartISO(today);
        const weekly = Array.from({ length: 8 }, (_, i) => {
            const start = addDaysISO(thisWeek, -7 * (7 - i));
            const end = addDaysISO(start, 6);
            return { weekStart: start, count: jobs.filter((j) => j.sendDate && j.sendDate >= start && j.sendDate <= end).length };
        });

        // Intérêt
        const rated = entreprises.filter((e) => e.interestRating !== null);
        const avgInterest = rated.length
            ? Math.round((rated.reduce((s, e) => s + (e.interestRating ?? 0), 0) / rated.length) * 10) / 10
            : null;
        const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
            rating: r,
            count: entreprises.filter((e) => e.interestRating === r).length,
        }));
        const topInterest = jobs
            .filter((j) => isOpen(j) && (j.entreprise?.interestRating ?? 0) >= 4)
            .sort((a, b) => (b.entreprise?.interestRating ?? 0) - (a.entreprise?.interestRating ?? 0))
            .slice(0, 5)
            .map(brief);

        res.json({
            status: "SUCCESS",
            stats: {
                total: jobs.length,
                active: jobs.filter(isOpen).length,
                sent: sentJobs.length,
                byKind,
                byStatus,
                interviewRate: sentJobs.length
                    ? Math.round((sentJobs.filter((j) => reachedInterview.has(j.idJob) || j.status?.kind === "success").length / sentJobs.length) * 100)
                    : null,
                entreprises: entreprises.length,
                avgInterest,
                ratingDistribution,
                topInterest,
                overdue,
                upcoming,
                stale,
                weekly,
            },
        });
    },
};
