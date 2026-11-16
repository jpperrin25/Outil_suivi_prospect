import test from "node:test";
import assert from "node:assert/strict";
import { Sequelize } from "sequelize";
import { initModels } from "../src/models";
import { UserModel } from "../src/models/User";
import { EntrepriseModel } from "../src/models/Entreprise";
import { ProspectModel } from "../src/models/Prospect";
import { ProspectInteractionModel } from "../src/models/ProspectInteraction";

test("stores LinkedIn messages in order and tracks a replied then unanswered follow-up", async () => {
  const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
  initModels(sequelize);
  await sequelize.sync();
  try {
    const user = await UserModel.create({ email: "local@example.test", password: "unused" });
    const company = await EntrepriseModel.create({ userId: user.idUser, name: "Niji" });
    const prospect = await ProspectModel.create({ userId: user.idUser, entrepriseId: company.idEntreprise, firstName: "Amélie", lastName: "Poirier", status: "replied" });
    await ProspectInteractionModel.bulkCreate([
      { userId: user.idUser, prospectId: prospect.idProspect, channel: "linkedin", direction: "outbound", occurredAt: new Date("2026-11-06T15:29:00+01:00"), summary: "Prise de contact personnalisée", responseState: "replied", externalId: "out-1" },
      { userId: user.idUser, prospectId: prospect.idProspect, channel: "linkedin", direction: "inbound", occurredAt: new Date("2026-11-06T20:37:00+01:00"), summary: "Indique qu’elle vérifiera ses disponibilités", responseState: "replied", externalId: "in-1" },
      { userId: user.idUser, prospectId: prospect.idProspect, channel: "linkedin", direction: "outbound", occurredAt: new Date("2026-11-10T13:13:00+01:00"), summary: "Relance sur un créneau d’échange", responseState: "no_response", externalId: "out-2" },
    ]);
    const result = await ProspectInteractionModel.findAll({ where: { prospectId: prospect.idProspect }, order: [["occurredAt", "ASC"]] });
    assert.equal(result.length, 3);
    assert.equal(result.at(-1)?.responseState, "no_response");
  } finally {
    await sequelize.close();
  }
});
