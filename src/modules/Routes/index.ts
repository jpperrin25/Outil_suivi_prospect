import { Router } from "express";
import { requireAuth } from "../../middleware/authentification";
import { authController } from "../Controller/Auth.controller";
import { profileController } from "../Controller/Profile.controller";
import { entrepriseController } from "../Controller/Entreprise.controller";
import { statusController } from "../Controller/Status.controller";
import { offerTypeController } from "../Controller/OfferType.controller";
import { jobController } from "../Controller/Jobs.controller";
import { statsController } from "../Controller/Stats.controller";
import { prospectController } from "../Controller/Prospect.controller";

const router = Router();

// Public
router.post("/sign", authController.signin);
router.post("/login", authController.login);

// Tout le reste nécessite un token
router.use(requireAuth);

router.get("/profile", profileController.get);
router.put("/profile", profileController.update);
router.patch("/profile", profileController.update);
router.delete("/profile", profileController.remove);

router.get("/stats", statsController.get);

router.get("/prospects", prospectController.all);
router.get("/prospect-imports", prospectController.imports);
router.post("/prospect-imports/preview", prospectController.preview);
router.get("/prospect-imports/:id", prospectController.detail);
router.post("/prospect-imports/:id/approve", prospectController.approve);
router.post("/prospect-imports/:id/reject", prospectController.reject);

router.get("/job", jobController.all);
router.post("/job", jobController.create);
router.get("/job/:id", jobController.detail);
router.put("/job/:id", jobController.update);
router.patch("/job/:id", jobController.update);
router.post("/job/:id/followup", jobController.followUp);
router.delete("/job/:id", jobController.remove);

router.get("/entreprise", entrepriseController.all);
router.post("/entreprise", entrepriseController.create);
router.get("/entreprise/:id", entrepriseController.detail);
router.put("/entreprise/:id", entrepriseController.update);
router.patch("/entreprise/:id", entrepriseController.update);
router.delete("/entreprise/:id", entrepriseController.remove);

router.get("/status", statusController.all);
router.post("/status", statusController.create);
router.put("/status/:id", statusController.update);
router.patch("/status/:id", statusController.update);
router.delete("/status/:id", statusController.remove);

router.get("/offer-types", offerTypeController.all);
router.post("/offer-types", offerTypeController.create);
router.put("/offer-types/:id", offerTypeController.update);
router.patch("/offer-types/:id", offerTypeController.update);
router.delete("/offer-types/:id", offerTypeController.remove);

export default router;
