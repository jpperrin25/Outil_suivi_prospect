import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/server";
import { connectToDatabase } from "../src/db/sequelize";
import type { Sequelize } from "sequelize";

let sequelize: Sequelize;
let token = "";
const auth = () => ({ Authorization: `Bearer ${token}` });

before(async () => {
    sequelize = await connectToDatabase();
});
after(async () => {
    await sequelize.close();
});

describe("auth", () => {
    it("refuse l'accès sans token", async () => {
        await request(app).get("/api/job").expect(401);
    });

    it("inscription puis connexion", async () => {
        const r = await request(app).post("/api/sign").send({ email: "Lucas@Test.fr", password: "secret1", username: "lucas" }).expect(201);
        assert.ok(r.body.token);
        await request(app).post("/api/sign").send({ email: "lucas@test.fr", password: "secret1" }).expect(409);
        await request(app).post("/api/login").send({ email: "lucas@test.fr", password: "mauvais" }).expect(401);
        const l = await request(app).post("/api/login").send({ email: "lucas@test.fr", password: "secret1" }).expect(200);
        token = l.body.token;
    });
});

describe("candidatures", () => {
    let jobId = 0;
    let statuses: { idStatus: number; status: string; kind: string }[] = [];

    it("a des statuts et types d'offre par défaut", async () => {
        const s = await request(app).get("/api/status").set(auth()).expect(200);
        statuses = s.body.statuses;
        assert.ok(statuses.length >= 5);
        const o = await request(app).get("/api/offer-types").set(auth()).expect(200);
        assert.ok(o.body.offerTypes.length >= 1);
    });

    it("crée une candidature avec entreprise + note d'intérêt", async () => {
        const sent = statuses.find((s) => s.kind === "sent")!;
        const r = await request(app)
            .post("/api/job")
            .set(auth())
            .send({ job: "Dev web", entrepriseName: "Acme", interestRating: 5, statusId: sent.idStatus, nextFollowUpDate: "2020-01-01" })
            .expect(201);
        jobId = r.body.job.idJob;
        assert.equal(r.body.job.entreprise.name, "Acme");
        assert.equal(r.body.job.entreprise.interestRating, 5);
        assert.ok(r.body.job.sendDate);
    });

    it("rejette une note hors 1-5 et une date invalide", async () => {
        await request(app).post("/api/job").set(auth()).send({ job: "X", entrepriseName: "Y", interestRating: 9 }).expect(400);
        await request(app).patch(`/api/job/${jobId}`).set(auth()).send({ nextFollowUpDate: "demain" }).expect(400);
    });

    it("modifie partiellement et historise le changement de statut", async () => {
        const interview = statuses.find((s) => s.kind === "progress")!;
        const r = await request(app)
            .patch(`/api/job/${jobId}`)
            .set(auth())
            .send({ statusId: interview.idStatus, statusNote: "Entretien jeudi", interestRating: 4 })
            .expect(200);
        assert.equal(r.body.job.job, "Dev web");
        assert.equal(r.body.job.entreprise.interestRating, 4);

        const d = await request(app).get(`/api/job/${jobId}`).set(auth()).expect(200);
        assert.equal(d.body.job.history.length, 2);
        assert.equal(d.body.job.history[1].note, "Entretien jeudi");
    });

    it("enregistre une relance", async () => {
        const r = await request(app).post(`/api/job/${jobId}/followup`).set(auth()).send({ nextFollowUpDate: "2099-01-01", note: "mail" }).expect(200);
        assert.equal(r.body.job.nextFollowUpDate, "2099-01-01");
        assert.ok(r.body.job.lastContactDate);
    });

    it("filtre, trie et calcule les stats", async () => {
        await request(app).post("/api/job").set(auth()).send({ job: "Data", entrepriseName: "Globex", interestRating: 2 }).expect(201);
        const list = await request(app).get("/api/job?sort=rating&order=desc").set(auth()).expect(200);
        assert.deepEqual(list.body.jobs.map((j: any) => j.entreprise.name), ["Acme", "Globex"]);
        const min = await request(app).get("/api/job?minRating=4").set(auth()).expect(200);
        assert.equal(min.body.count, 1);

        const s = await request(app).get("/api/stats").set(auth()).expect(200);
        assert.equal(s.body.stats.total, 2);
        assert.equal(s.body.stats.byKind.progress, 1);
        assert.equal(s.body.stats.interviewRate, 100);
        assert.equal(s.body.stats.entreprises, 2);
    });

    it("protège les suppressions et réaffecte les statuts", async () => {
        const acme = (await request(app).get("/api/entreprise").set(auth())).body.entreprises.find((e: any) => e.name === "Acme");
        await request(app).delete(`/api/entreprise/${acme.idEntreprise}`).set(auth()).expect(409);

        const used = statuses.find((s) => s.kind === "progress")!;
        const other = statuses.find((s) => s.kind === "failure")!;
        await request(app).delete(`/api/status/${used.idStatus}`).set(auth()).expect(409);
        await request(app).delete(`/api/status/${used.idStatus}?replaceWith=${other.idStatus}`).set(auth()).expect(200);

        await request(app).delete(`/api/job/${jobId}`).set(auth()).expect(200);
        await request(app).get(`/api/job/${jobId}`).set(auth()).expect(404);
        await request(app).delete(`/api/entreprise/${acme.idEntreprise}`).set(auth()).expect(200);
    });
});
