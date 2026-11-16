(() => {
    "use strict";

    /* ------------------------------------------------------------------ utilitaires */
    const $ = (sel, el = document) => el.querySelector(sel);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } },
        del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } },
    };

    const pad = (n) => String(n).padStart(2, "0");
    const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayISO = () => isoOf(new Date());
    const parseISO = (iso) => new Date(`${iso}T00:00:00`);
    const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
    const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
    const fmtDate = (iso) => (iso ? parseISO(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");
    const fmtDateTime = (v) => new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

    const KINDS = {
        todo: "À faire",
        sent: "Envoyée ou en attente",
        progress: "En discussion",
        success: "Réussie",
        failure: "Terminée sans suite",
    };
    const RATING_LABELS = ["Pas de note", "Bof", "Moyen", "Intéressé", "Très motivé", "Entreprise de rêve"];
    const ERRORS = {
        "Invalid email or password": "Email ou mot de passe incorrect.",
        "This email is already used": "Cet email est déjà utilisé.",
        "password must contain at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères.",
        "email is invalid": "Cet email n'est pas valide.",
        "An entreprise with this name already exists": "Une entreprise porte déjà ce nom.",
        "This status already exists": "Ce statut existe déjà.",
        "This offer type already exists": "Ce type d'offre existe déjà.",
        "interestRating must be an integer between 1 and 5": "La note d'intérêt doit être comprise entre 1 et 5.",
    };
    const tr = (m) => ERRORS[m] || m || "Une erreur est survenue.";

    const ICON = {
        home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
        list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></svg>',
        building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5l8-2v18"/><path d="M12 9h8v12"/><path d="M8 8h1M8 12h1M8 16h1M16 13h1M16 17h1"/></svg>',
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.2-.8.2-1.2z"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
        x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    };

    /* ------------------------------------------------------------------ état */
    const S = {
        token: store.get("token"),
        user: null,
        statuses: [],
        offerTypes: [],
        entreprises: [],
        prospects: [],
        prospectImports: [],
        importDraft: null,
        jobs: [],
        stats: null,
        view: "dashboard",
        layout: store.get("layout") || "board",
        f: { q: "", statusId: "", offerTypeId: "", minRating: "", sort: "recent:desc" },
    };

    /* ------------------------------------------------------------------ API */
    async function api(path, { method = "GET", body } = {}) {
        const headers = { "Content-Type": "application/json" };
        if (S.token) headers.Authorization = `Bearer ${S.token}`;
        let res;
        try {
            res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        } catch {
            throw Object.assign(new Error("Le serveur est injoignable."), { status: 0 });
        }
        let data = {};
        try { data = await res.json(); } catch { /* corps vide */ }
        if (res.status === 401 && S.token && !path.startsWith("/login")) {
            logout(true);
            throw Object.assign(new Error("Session expirée, reconnecte-toi."), { status: 401 });
        }
        if (!res.ok) throw Object.assign(new Error(tr(data.message)), { status: res.status, data });
        return data;
    }

    async function loadRef() {
        const [s, o, e] = await Promise.all([api("/status"), api("/offer-types"), api("/entreprise")]);
        S.statuses = s.statuses;
        S.offerTypes = o.offerTypes;
        S.entreprises = e.entreprises;
    }
    async function loadStats() { S.stats = (await api("/stats")).stats; }
    async function loadProspects() {
        const [p, i] = await Promise.all([api("/prospects"), api("/prospect-imports")]);
        S.prospects = p.prospects;
        S.prospectImports = i.imports;
    }
    function jobsQuery() {
        const [sort, order] = S.f.sort.split(":");
        const p = new URLSearchParams({ sort, order });
        for (const k of ["q", "statusId", "offerTypeId", "minRating"]) if (S.f[k]) p.set(k, S.f[k]);
        return p.toString();
    }
    async function loadJobs() { S.jobs = (await api(`/job?${jobsQuery()}`)).jobs; }
    async function refresh() { await Promise.all([loadRef(), loadStats(), loadJobs(), loadProspects()]); }

    /* ------------------------------------------------------------------ petits composants */
    function ratingHTML(value, opts = {}) {
        const v = Number(value) || 0;
        const edit = opts.edit;
        const tag = edit ? 'button type="button"' : "i";
        const close = edit ? "button" : "i";
        const pips = [1, 2, 3, 4, 5]
            .map((i) => `<${tag} class="pip ${i <= v ? "on" : ""}" data-v="${i}" style="--h:${i}"${edit ? ` aria-label="${i} sur 5"` : ""}></${close}>`)
            .join("");
        const attrs = edit
            ? `class="rating edit" data-value="${v}" role="group" aria-label="Intérêt" ${opts.patch ? `data-patch="${opts.patch}" data-id="${opts.id}"` : ""}`
            : `class="rating" data-value="${v}" role="img" aria-label="Intérêt : ${v ? v + " sur 5" : "pas de note"}"`;
        return `<span ${attrs}>${pips}</span>`;
    }
    const pillHTML = (status) => (status ? `<span class="pill" style="--c:${esc(status.color)}">${esc(status.status)}</span>` : "");
    const isClosed = (job) => ["success", "failure"].includes(job.status?.kind);

    function followChip(job) {
        if (!job.nextFollowUpDate || isClosed(job)) return "";
        const d = daysBetween(todayISO(), job.nextFollowUpDate);
        if (d < 0) return `<span class="chip late">Relance en retard de ${d === -1 ? "1 jour" : -d + " jours"}</span>`;
        if (d === 0) return `<span class="chip today">Relance aujourd'hui</span>`;
        if (d <= 7) return `<span class="chip">Relance dans ${plural(d, "jour", "jours")}</span>`;
        return `<span class="chip">Relance le ${fmtDate(job.nextFollowUpDate)}</span>`;
    }

    function toast(msg, type = "ok") {
        const el = document.createElement("div");
        el.className = `toast ${type === "error" ? "error" : ""}`;
        el.textContent = msg;
        $("#toasts").append(el);
        setTimeout(() => el.remove(), type === "error" ? 5000 : 2600);
    }
    const fail = (err) => toast(err.message || "Une erreur est survenue.", "error");

    function modal(html) {
        return new Promise((resolve) => {
            const d = $("#dlg");
            d.innerHTML = html;
            d.returnValue = "";
            d.addEventListener("close", () => {
                const form = d.querySelector("form");
                resolve(d.returnValue === "ok" && form ? Object.fromEntries(new FormData(form)) : null);
            }, { once: true });
            d.showModal();
        });
    }
    const confirmDlg = async (title, text, okLabel = "Confirmer", danger = false) =>
        !!(await modal(`<form method="dialog"><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
            <div class="foot"><button type="button" class="btn" data-action="dlg-cancel">Annuler</button>
            <button value="ok" class="btn ${danger ? "danger" : "primary"}">${esc(okLabel)}</button></div></form>`));

    /* ------------------------------------------------------------------ navigation */
    const VIEWS = { dashboard: "Tableau de bord", jobs: "Candidatures", prospects: "Prospects", entreprises: "Entreprises", settings: "Réglages" };
    const NAV_ICON = { dashboard: ICON.home, jobs: ICON.list, prospects: ICON.list, entreprises: ICON.building, settings: ICON.gear };

    function currentView() {
        const v = location.hash.replace(/^#\/?/, "").split("?")[0];
        return VIEWS[v] ? v : "dashboard";
    }
    function go(view) { if (currentView() === view) { S.view = view; render(); } else location.hash = `#/${view}`; }

    function renderNav() {
        const urgent = S.stats ? S.stats.overdue.length : 0;
        $("#nav").innerHTML = Object.entries(VIEWS)
            .map(([key, label]) => `<a href="#/${key}" ${S.view === key ? 'aria-current="page"' : ""}>${NAV_ICON[key]}<span>${label}</span>${key === "dashboard" && urgent ? `<span class="count" title="Relances en retard">${urgent}</span>` : ""}</a>`)
            .join("");
        $("#side-user").textContent = S.user?.username || S.user?.email || "";
    }

    function render() {
        if (!S.user) return showAuth();
        $("#auth").hidden = true;
        $("#app").hidden = false;
        S.view = currentView();
        document.title = `${VIEWS[S.view]} · Prospect Engine`;
        renderNav();
        $("#main").innerHTML = { dashboard: dashboardView, jobs: jobsView, prospects: prospectsView, entreprises: entreprisesView, settings: settingsView }[S.view]();
    }

    function prospectsView() {
        const pending = S.prospectImports.filter((i) => i.status === "review");
        return `<div class="page-head"><div><h1>Prospects</h1><p class="sub">${plural(S.prospects.length, "contact", "contacts")} suivis · ${plural(S.entreprises.length, "entreprise", "entreprises")} dans le référentiel</p></div></div>
            <section class="panel"><h2>Recevoir les données préparées</h2><p class="muted">Importe un export CSV d'entreprises ou de contacts. Le fichier est d'abord contrôlé et présenté en aperçu ; rien n'est ajouté avant ta validation.</p>
                <div class="row import-controls"><label class="field"><span>Type de fichier</span><select id="import-kind"><option value="companies">Entreprises</option><option value="contacts">Contacts</option></select></label>
                    <label class="field"><span>Fichier CSV</span><input id="prospect-csv" type="file" accept=".csv,text/csv"></label>
                    <button class="btn primary" type="button" data-action="preview-import">Vérifier le fichier</button></div>
                <p class="muted small">Jusqu'à 500 lignes et 2 Mo par import. Les exports Apollo restent manuels : aucune recherche payante ni aucun envoi n'est déclenché ici.</p>
            </section>
            ${S.importDraft ? importPreviewHTML(S.importDraft) : ""}
            ${pending.length ? `<section class="panel"><h2>Imports à valider</h2><div class="table-wrap"><table><thead><tr><th>Fichier</th><th>Type</th><th>Lignes valides</th><th>Créé</th><th></th></tr></thead><tbody>${pending.map((i) => `<tr><td>${esc(i.filename)}</td><td>${i.kind === "companies" ? "Entreprises" : "Contacts"}</td><td>${i.validRows} / ${i.totalRows}</td><td>${fmtDateTime(i.createdAt)}</td><td><button class="btn sm" data-action="open-import" data-id="${i.idProspectImport}">Revoir</button></td></tr>`).join("")}</tbody></table></div></section>` : ""}
            <section class="panel"><h2>Contacts importés</h2>
                ${S.prospects.length ? `<div class="table-wrap"><table><thead><tr><th>Contact</th><th>Entreprise</th><th>Email</th><th>Source</th><th>État</th></tr></thead><tbody>${S.prospects.map((p) => `<tr><td>${esc([p.firstName, p.lastName].filter(Boolean).join(" ") || "Contact sans nom")}<div class="muted small">${esc(p.jobTitle || "")}</div></td><td>${esc(p.entreprise?.name || "")}</td><td>${p.email ? `<span title="${esc(p.emailStatus || "Statut de vérification inconnu")}">${esc(p.email)}</span>` : "—"}</td><td>${esc(p.source || "—")}</td><td>${esc(({ to_qualify: "À qualifier", qualified: "Qualifié", to_contact: "À contacter", contacted: "Contacté", replied: "Réponse reçue", excluded: "Exclu" })[p.status] || p.status)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><p>Les contacts préparés apparaîtront ici après validation d'un import.</p></div>`}
            </section>
            ${S.prospectImports.length ? `<section class="panel"><h2>Historique des imports</h2><div class="table-wrap"><table><thead><tr><th>Fichier</th><th>Type</th><th>État</th><th>Importés</th><th>Date</th></tr></thead><tbody>${S.prospectImports.map((i) => `<tr><td>${esc(i.filename)}</td><td>${i.kind === "companies" ? "Entreprises" : "Contacts"}</td><td>${({ review: "À valider", approved: "Validé", rejected: "Refusé" })[i.status] || esc(i.status)}</td><td>${i.importedRows} / ${i.validRows}</td><td>${fmtDateTime(i.createdAt)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
    }

    function importPreviewHTML(data) {
        const imp = data.import;
        return `<section class="panel"><div class="page-head"><div><h2>Aperçu : ${esc(imp.filename)}</h2><p class="sub">${imp.kind === "companies" ? "Entreprises" : "Contacts"} · ${imp.validRows} ligne(s) prêtes sur ${imp.totalRows}</p></div></div>
            <p class="muted">Les domaines restent vides s'ils ne figurent pas dans le fichier. Les entreprises sont rapprochées sur leur nom exact normalisé ; aucun doublon approximatif n'est fusionné.</p>
            <div class="table-wrap"><table><thead><tr><th>Ligne</th><th>Entreprise</th><th>Site / domaine</th><th>Nom</th><th>Fonction</th><th>Email</th><th>Contrôle</th></tr></thead><tbody>${data.preview.map((r) => `<tr><td>${r.rowNumber}</td><td>${esc(r.companyName)}</td><td>${esc(r.website || "—")}</td><td>${esc([r.firstName, r.lastName].filter(Boolean).join(" "))}</td><td>${esc(r.jobTitle || "—")}</td><td>${esc(r.email || "—")}</td><td>${r.errors.length ? `<span class="pill" style="--c:#ef4444">${esc(r.errors.join(" · "))}</span>` : `<span class="pill" style="--c:#22c55e">Prête</span>`}</td></tr>`).join("")}</tbody></table></div>
            ${data.truncated ? `<p class="muted small">Aperçu limité aux 25 premières lignes ; les ${imp.totalRows} lignes seront contrôlées à la validation.</p>` : ""}
            <div class="actions"><button class="btn" type="button" data-action="cancel-import">Fermer</button><button class="btn danger" type="button" data-action="reject-import" data-id="${imp.idProspectImport}">Refuser</button><button class="btn primary" type="button" data-action="approve-import" data-id="${imp.idProspectImport}" ${imp.validRows ? "" : "disabled"}>Valider et importer ${imp.validRows} ligne(s)</button></div></section>`;
    }

    async function previewImport() {
        const file = $("#prospect-csv")?.files?.[0];
        if (!file) return toast("Choisis d'abord un fichier CSV.", "error");
        try {
            const response = await fetch("/api/prospect-imports/preview", { method: "POST", headers: {
                Authorization: `Bearer ${S.token}`, "Content-Type": "text/csv; charset=utf-8",
                "X-Import-Kind": $("#import-kind").value, "X-Import-Filename": file.name,
            }, body: await file.text() });
            const data = await response.json();
            if (!response.ok) throw new Error(tr(data.message));
            S.importDraft = data;
            await loadProspects();
            render();
            toast("Aperçu prêt ; aucune donnée n'a encore été importée.");
        } catch (err) { fail(err); }
    }

    async function approveImport(id) {
        if (!(await confirmDlg("Valider cet import ?", "Les entreprises et contacts prêts seront ajoutés. Les candidatures existantes resteront séparées."))) return;
        try {
            const result = await api(`/prospect-imports/${id}/approve`, { method: "POST", body: {} });
            S.importDraft = null;
            await refresh(); render();
            toast(`${result.imported} ligne(s) importée(s), ${result.duplicates} doublon(s) ignoré(s).`);
        } catch (err) { fail(err); }
    }

    async function openImport(id) {
        try {
            const data = await api(`/prospect-imports/${id}`);
            S.importDraft = { ...data, preview: data.rows.slice(0, 25), truncated: data.rows.length > 25 };
            go("prospects");
            render();
        } catch (err) { fail(err); }
    }

    async function rejectImport(id) {
        if (!(await confirmDlg("Refuser cet import ?", "Les lignes en attente seront conservées dans l'historique et ne seront pas ajoutées."))) return;
        try { await api(`/prospect-imports/${id}/reject`, { method: "POST", body: {} }); S.importDraft = null; await loadProspects(); render(); toast("Import refusé"); }
        catch (err) { fail(err); }
    }

    /* ------------------------------------------------------------------ vue : tableau de bord */
    function todoItem(j, kind, label) {
        return `<li class="todo-item ${kind}" tabindex="0" role="button" data-action="open-job" data-id="${j.idJob}">
            <span class="bar"></span>
            <div><div class="t-title">${esc(j.entreprise)} <span class="muted" style="font-weight:400">${esc(j.job)}</span></div>
            <div class="t-sub">${ratingHTML(j.interestRating)}<span>${esc(label)}</span>${pillHTML({ status: j.status, color: j.color })}</div></div>
            <button class="btn sm" data-action="followup" data-id="${j.idJob}">J'ai relancé</button></li>`;
    }

    function dashboardView() {
        const st = S.stats;
        if (!st) return "";
        const name = S.user.username || S.user.email.split("@")[0];
        const today = todayISO();
        const dueToday = st.upcoming.filter((j) => j.nextFollowUpDate === today).length;
        const urgent = st.overdue.length + dueToday;
        const sub = st.total === 0
            ? "Commence par ajouter ta première candidature."
            : urgent ? `${plural(urgent, "relance à faire", "relances à faire")} aujourd'hui.` : "Rien d'urgent aujourd'hui.";

        const items = [
            ...st.overdue.map((j) => todoItem(j, "late", `En retard de ${plural(-daysBetween(today, j.nextFollowUpDate), "jour", "jours")}`)),
            ...st.upcoming.map((j) => {
                const d = daysBetween(today, j.nextFollowUpDate);
                return todoItem(j, d === 0 ? "late" : "soon", d === 0 ? "À relancer aujourd'hui" : `Dans ${plural(d, "jour", "jours")}`);
            }),
            ...st.stale.map((j) => todoItem(j, "", `Sans nouvelle depuis ${j.daysSinceContact} jours`)),
        ].join("");

        const segments = st.byStatus.filter((s) => s.count > 0);
        const maxWeek = Math.max(1, ...st.weekly.map((w) => w.count));
        const maxRating = Math.max(1, st.entreprises);

        const empty = `<div class="empty"><p>Aucune candidature pour l'instant.</p><button class="btn primary" data-action="new-job">${ICON.plus}Ajouter une candidature</button></div>`;

        return `
        <div class="page-head">
            <div><h1>Bonjour ${esc(name)}</h1><p class="sub">${sub}</p></div>
            <button class="btn primary" data-action="new-job">${ICON.plus}Nouvelle candidature</button>
        </div>
        <div class="kpis">
            <div class="kpi"><b>${st.active}</b><span>${st.active > 1 ? "candidatures en cours" : "candidature en cours"}</span></div>
            <div class="kpi"><b>${st.sent}</b><span>envoyées au total</span></div>
            <div class="kpi"><b>${st.interviewRate === null ? "–" : st.interviewRate + " %"}</b><span>ont mené à un entretien</span></div>
            <div class="kpi"><b>${st.avgInterest === null ? "–" : String(st.avgInterest).replace(".", ",") + " / 5"}</b><span>intérêt moyen</span></div>
        </div>
        ${segments.length ? `<section class="pipeline"><h2>Où en sont mes candidatures</h2>
            <div class="pipeline-bar" role="img" aria-label="Répartition par statut">${segments.map((s) => `<button style="flex:${s.count};--c:${esc(s.color)}" data-action="filter-status" data-id="${s.idStatus}" title="${esc(s.status)} : ${s.count}" aria-label="${esc(s.status)} : ${s.count}"></button>`).join("")}</div>
            <div class="legend">${segments.map((s) => `<button style="--c:${esc(s.color)}" data-action="filter-status" data-id="${s.idStatus}"><i></i>${esc(s.status)} <b>${s.count}</b></button>`).join("")}</div></section>` : ""}
        <div class="dash-grid">
            <section><div class="section-title"><h2>À relancer</h2></div>
                ${items ? `<ul class="todo-list">${items}</ul>` : st.total ? `<div class="empty"><p>Aucune relance en attente. Pense à fixer une date de relance sur tes candidatures envoyées.</p></div>` : empty}
            </section>
            <div class="side-col">
                <section><h2>Les plus motivantes</h2>
                    ${st.topInterest.length ? `<ul class="plain-list">${st.topInterest.map((j) => `<li class="todo-item" tabindex="0" role="button" data-action="open-job" data-id="${j.idJob}" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="t-title">${esc(j.entreprise)}</div><div class="t-sub">${esc(j.job)}</div></div>${ratingHTML(j.interestRating)}</li>`).join("")}</ul>` : `<p class="muted small" style="margin-top:.5rem">Note tes entreprises de 1 à 5 : celles qui te motivent le plus apparaîtront ici.</p>`}
                </section>
                <section><h2>Candidatures envoyées par semaine</h2>
                    <div class="mini-bars">${st.weekly.map((w, i) => `<div class="${i === 7 ? "now" : ""}"><span>${w.count || ""}</span><i style="height:${Math.round((w.count / maxWeek) * 60)}px"></i><span>${+w.weekStart.slice(8)}/${+w.weekStart.slice(5, 7)}</span></div>`).join("")}</div>
                </section>
                <section><h2>Mon niveau d'intérêt</h2>
                    <div class="dist">${[...st.ratingDistribution].reverse().map((r) => `<div>${ratingHTML(r.rating)}<span class="track"><i style="width:${(r.count / maxRating) * 100}%"></i></span><span>${r.count}</span></div>`).join("")}</div>
                </section>
            </div>
        </div>`;
    }

    /* ------------------------------------------------------------------ vue : candidatures */
    const SORTS = [
        ["recent:desc", "Dernières modifiées"],
        ["rating:desc", "Intérêt, du plus haut au plus bas"],
        ["followUp:asc", "Prochaine relance"],
        ["sendDate:desc", "Date d'envoi"],
        ["company:asc", "Entreprise A → Z"],
    ];

    function jobsView() {
        const f = S.f;
        const opt = (items, val, getV, getL, all) => `<option value="">${all}</option>` + items.map((i) => `<option value="${getV(i)}" ${String(getV(i)) === String(val) ? "selected" : ""}>${esc(getL(i))}</option>`).join("");
        return `
        <div class="page-head"><div><h1>Candidatures</h1><p class="sub" id="jobs-count"></p></div>
            <button class="btn primary" data-action="new-job">${ICON.plus}Nouvelle candidature</button></div>
        <div class="toolbar">
            <input class="grow" type="search" id="q" placeholder="Entreprise, poste, note…" value="${esc(f.q)}" aria-label="Rechercher">
            <select data-filter="statusId" aria-label="Statut">${opt(S.statuses, f.statusId, (s) => s.idStatus, (s) => s.status, "Tous les statuts")}</select>
            <select data-filter="offerTypeId" aria-label="Type d'offre">${opt(S.offerTypes, f.offerTypeId, (o) => o.idOffer, (o) => o.offerType, "Tous les types")}</select>
            <select data-filter="minRating" aria-label="Intérêt minimum">
                <option value="">Tout niveau d'intérêt</option>${[2, 3, 4, 5].map((n) => `<option value="${n}" ${String(f.minRating) === String(n) ? "selected" : ""}>Intérêt ${n}+ sur 5</option>`).join("")}</select>
            <select data-filter="sort" aria-label="Trier par">${SORTS.map(([v, l]) => `<option value="${v}" ${f.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select>
            <div class="seg" role="group" aria-label="Affichage">
                <button data-action="layout" data-layout="board" aria-pressed="${S.layout === "board"}">Tableau</button>
                <button data-action="layout" data-layout="list" aria-pressed="${S.layout === "list"}">Liste</button>
            </div>
        </div>
        <div id="jobs-results">${jobsResults()}</div>`;
    }

    function jobCard(j) {
        return `<article class="card" draggable="true" tabindex="0" role="button" data-action="open-job" data-id="${j.idJob}" style="--c:${esc(j.status?.color || "#7c8798")}">
            <div class="co">${esc(j.entreprise?.name)}</div><div class="jb">${esc(j.job)}</div>
            <div class="meta">${ratingHTML(j.entreprise?.interestRating)}${followChip(j) || (j.sendDate ? `<span class="chip">Envoyée le ${fmtDate(j.sendDate)}</span>` : "")}</div></article>`;
    }

    function jobsResults() {
        const jobs = S.jobs;
        const filtered = S.f.q || S.f.statusId || S.f.offerTypeId || S.f.minRating;
        const count = $("#jobs-count");
        if (count) count.textContent = plural(jobs.length, "candidature", "candidatures");
        if (!jobs.length) {
            return `<div class="empty"><p>${filtered ? "Aucune candidature ne correspond à ces filtres." : "Tu n'as pas encore de candidature."}</p>
                ${filtered ? '<button class="btn" data-action="reset-filters">Effacer les filtres</button>' : `<button class="btn primary" data-action="new-job">${ICON.plus}Ajouter une candidature</button>`}</div>`;
        }
        if (S.layout === "list") {
            return `<div class="table-wrap"><table><thead><tr><th>Candidature</th><th>Intérêt</th><th>Statut</th><th>Envoyée</th><th>Relance</th><th>Type</th></tr></thead><tbody>
                ${jobs.map((j) => `<tr class="click" tabindex="0" data-action="open-job" data-id="${j.idJob}">
                    <td><div class="co">${esc(j.entreprise?.name)}</div><div class="jb">${esc(j.job)}</div></td>
                    <td>${ratingHTML(j.entreprise?.interestRating)}</td><td>${pillHTML(j.status)}</td>
                    <td>${j.sendDate ? fmtDate(j.sendDate) : '<span class="muted">–</span>'}</td>
                    <td>${followChip(j) || '<span class="muted">–</span>'}</td><td class="muted">${esc(j.offerType?.offerType)}</td></tr>`).join("")}
                </tbody></table></div>`;
        }
        const columns = S.f.statusId ? S.statuses.filter((s) => String(s.idStatus) === String(S.f.statusId)) : S.statuses;
        return `<div class="board">${columns.map((s) => {
            const items = jobs.filter((j) => j.statusId === s.idStatus);
            return `<section class="col" data-status="${s.idStatus}" aria-label="${esc(s.status)}">
                <div class="col-head" style="--c:${esc(s.color)}"><i></i>${esc(s.status)}<span>${items.length}</span></div>${items.map(jobCard).join("")}</section>`;
        }).join("")}</div>`;
    }

    /* ------------------------------------------------------------------ vue : entreprises */
    function entreprisesView() {
        const list = [...S.entreprises].sort((a, b) => (b.interestRating || 0) - (a.interestRating || 0) || a.name.localeCompare(b.name));
        return `
        <div class="page-head"><div><h1>Entreprises</h1><p class="sub">${plural(list.length, "entreprise", "entreprises")}. Clique sur les barres pour changer le niveau d'intérêt.</p></div>
            <button class="btn primary" data-action="entreprise-form">${ICON.plus}Nouvelle entreprise</button></div>
        ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Entreprise</th><th>Intérêt</th><th>Candidatures</th><th>Contact</th><th></th></tr></thead><tbody>
            ${list.map((e) => `<tr><td><div class="co">${esc(e.name)}</div>${e.website ? `<a class="small" href="${esc(e.website)}" target="_blank" rel="noopener noreferrer">${esc(e.website.replace(/^https?:\/\//, ""))}</a>` : ""}</td>
                <td>${ratingHTML(e.interestRating, { edit: true, patch: "entreprise", id: e.idEntreprise })}</td>
                <td>${e.jobCount}</td><td class="muted">${esc(e.contact || "")}</td>
                <td><div class="actions"><button class="btn sm" data-action="entreprise-form" data-id="${e.idEntreprise}">Modifier</button>
                <button class="btn sm danger" data-action="entreprise-delete" data-id="${e.idEntreprise}">Supprimer</button></div></td></tr>`).join("")}
            </tbody></table></div>` : `<div class="empty"><p>Tes entreprises apparaîtront ici dès que tu ajouteras une candidature.</p></div>`}`;
    }

    /* ------------------------------------------------------------------ vue : réglages */
    function settingsView() {
        const u = S.user;
        return `
        <div class="page-head"><div><h1>Réglages</h1><p class="sub">Statuts, types d'offre et compte.</p></div></div>
        <div class="settings">
            <section><h2>Statuts</h2><p class="muted small">Les statuts forment les colonnes du tableau. La famille sert aux statistiques.</p>
                <div style="margin-top:.6rem">${S.statuses.map((s, i) => `<div class="set-row" data-status-row="${s.idStatus}">
                    <input type="color" name="color" value="${esc(s.color)}" aria-label="Couleur de ${esc(s.status)}">
                    <input type="text" name="status" value="${esc(s.status)}" aria-label="Nom du statut">
                    <select name="kind" aria-label="Famille">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${s.kind === k ? "selected" : ""}>${l}</option>`).join("")}</select>
                    <div class="actions"><span class="count">${s.jobCount}</span>
                        <button class="btn ghost sm" data-action="status-move" data-id="${s.idStatus}" data-dir="-1" aria-label="Monter" ${i === 0 ? "disabled" : ""}>↑</button>
                        <button class="btn ghost sm" data-action="status-move" data-id="${s.idStatus}" data-dir="1" aria-label="Descendre" ${i === S.statuses.length - 1 ? "disabled" : ""}>↓</button>
                        <button class="btn ghost sm danger" data-action="status-delete" data-id="${s.idStatus}" aria-label="Supprimer">${ICON.x}</button></div></div>`).join("")}</div>
                <form class="add-row" data-form="status-new"><input type="color" name="color" value="#2f5bff" aria-label="Couleur"><input type="text" name="status" placeholder="Nouveau statut" required maxlength="100">
                    <select name="kind" aria-label="Famille">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${k === "sent" ? "selected" : ""}>${l}</option>`).join("")}</select>
                    <button class="btn">Ajouter</button></form></section>
            <section><h2>Types d'offre</h2>
                <div style="margin-top:.6rem">${S.offerTypes.map((o) => `<div class="set-row offer" data-offer-row="${o.idOffer}">
                    <input type="text" name="offerType" value="${esc(o.offerType)}" aria-label="Nom du type">
                    <div class="actions"><span class="count">${o.jobCount}</span><button class="btn ghost sm danger" data-action="offer-delete" data-id="${o.idOffer}" aria-label="Supprimer">${ICON.x}</button></div></div>`).join("")}</div>
                <form class="add-row" data-form="offer-new"><input type="text" name="offerType" placeholder="Nouveau type d'offre" required maxlength="100"><button class="btn">Ajouter</button></form></section>
            <section><h2>Mon compte</h2>
                <form data-form="profile" style="display:grid;gap:.8rem;margin-top:.6rem;max-width:420px">
                    <label class="field"><span>Prénom</span><input type="text" name="username" value="${esc(u.username || "")}"></label>
                    <label class="field"><span>Email</span><input type="email" name="email" value="${esc(u.email)}" required></label>
                    <label class="field"><span>Nouveau mot de passe</span><input type="password" name="password" placeholder="Laisse vide pour ne pas le changer" minlength="6" autocomplete="new-password"></label>
                    <div><button class="btn primary">Enregistrer</button></div></form></section>
            <section><h2>Mes données</h2><p class="muted small">Tout est enregistré dans ta base de données. Tu peux aussi en garder une copie lisible dans Excel.</p>
                <div style="margin-top:.7rem"><button class="btn" data-action="export-csv">Exporter mes candidatures (CSV)</button></div></section>
            <section class="danger-zone"><h2>Supprimer mon compte</h2><p class="muted small">Efface définitivement ton compte, tes entreprises et toutes tes candidatures.</p>
                <div><button class="btn danger" data-action="delete-account">Supprimer mon compte</button></div></section>
        </div>`;
    }

    /* ------------------------------------------------------------------ panneau candidature */
    async function openJob(id) {
        try {
            const { job } = await api(`/job/${id}`);
            drawer(job);
        } catch (e) { fail(e); }
    }

    function drawer(job) {
        const isEdit = !!job;
        const statusId = job?.statusId ?? S.statuses[0]?.idStatus;
        const rating = job?.entreprise?.interestRating ?? 0;
        const statusMap = new Map(S.statuses.map((s) => [s.idStatus, s]));
        const history = (job?.history || []).slice().reverse();
        const sel = (items, cur, v, l) => items.map((i) => `<option value="${i[v]}" ${i[v] === cur ? "selected" : ""}>${esc(i[l])}</option>`).join("");

        $("#drawer-root").innerHTML = `
        <div class="overlay" data-action="close-drawer"></div>
        <aside class="drawer" role="dialog" aria-modal="true" aria-label="${isEdit ? "Candidature" : "Nouvelle candidature"}">
            <div class="drawer-head"><h2>${isEdit ? esc(job.entreprise?.name) : "Nouvelle candidature"}</h2>
                <button class="btn ghost sm" data-action="close-drawer" aria-label="Fermer">${ICON.x}</button></div>
            <form data-form="job" data-id="${job?.idJob || ""}" data-initial-status="${statusId}" novalidate>
                <div class="drawer-body">
                    <label class="field"><span>Poste</span><input type="text" name="job" required value="${esc(job?.job || "")}" placeholder="Ex. Alternant développeur web"></label>
                    <label class="field"><span>Entreprise</span><input type="text" name="entrepriseName" required list="entreprises-list" value="${esc(job?.entreprise?.name || "")}" placeholder="Nom de l'entreprise" autocomplete="off"></label>
                    <datalist id="entreprises-list">${S.entreprises.map((e) => `<option value="${esc(e.name)}">`).join("")}</datalist>
                    <div class="interest-box"><span class="small" style="font-weight:600;margin-right:.9rem">Intérêt pour cette entreprise</span>
                        ${ratingHTML(rating, { edit: true })}<span class="rating-label" id="rating-label">${RATING_LABELS[rating]}</span>
                        <input type="hidden" name="interestRating" value="${rating || ""}"></div>
                    <div class="row">
                        <label class="field"><span>Statut</span><select name="statusId">${sel(S.statuses, statusId, "idStatus", "status")}</select></label>
                        <label class="field"><span>Type d'offre</span><select name="offerTypeId">${sel(S.offerTypes, job?.offerTypeId, "idOffer", "offerType")}</select></label>
                    </div>
                    <label class="field" id="status-note-field" hidden><span>Note sur ce changement de statut (facultatif)</span><input type="text" name="statusNote" maxlength="500" placeholder="Ex. Entretien jeudi à 14 h"></label>
                    <div class="row">
                        <label class="field"><span>Envoyée le</span><input type="date" name="sendDate" value="${esc(job?.sendDate || "")}"></label>
                        <label class="field"><span>Dernier contact</span><input type="date" name="lastContactDate" value="${esc(job?.lastContactDate || "")}"></label>
                    </div>
                    <div class="field"><label for="next-date" style="font-size:.84rem;color:var(--ink-2);font-weight:550">Prochaine relance</label>
                        <input type="date" id="next-date" name="nextFollowUpDate" value="${esc(job?.nextFollowUpDate || "")}">
                        <div class="quick">${[3, 7, 14].map((n) => `<button type="button" class="btn sm" data-action="next-in" data-days="${n}">Dans ${n} jours</button>`).join("")}<button type="button" class="btn sm ghost" data-action="next-in" data-days="">Effacer</button></div></div>
                    <div class="row">
                        <label class="field"><span>Contact</span><input type="text" name="contactPerson" value="${esc(job?.contactPerson || "")}" placeholder="Nom du recruteur"></label>
                        <label class="field"><span>Email du contact</span><input type="email" name="contactEmail" value="${esc(job?.contactEmail || "")}"></label>
                    </div>
                    <label class="field"><span>Lien de l'offre</span><input type="url" name="jobUrl" value="${esc(job?.jobUrl || "")}" placeholder="https://…"></label>
                    <label class="field"><span>Notes</span><textarea name="notes" placeholder="Ce qui t'a plu, questions à poser, retours d'entretien…">${esc(job?.notes || "")}</textarea></label>
                    ${isEdit ? `<div><h3 style="margin-bottom:.8rem">Historique</h3><ul class="timeline">${history.map((h) => `<li style="--c:${esc(statusMap.get(h.statusId)?.color || "#8691a8")}"><div><strong>${esc(h.statusLabel)}</strong> <span class="when">${fmtDateTime(h.createdAt)}</span></div>${h.note ? `<div class="note">${esc(h.note)}</div>` : ""}</li>`).join("")}</ul></div>` : ""}
                </div>
                <div class="drawer-foot">
                    <div>${isEdit ? '<button type="button" class="btn danger" data-action="delete-job">Supprimer</button>' : ""}</div>
                    <div class="right">${isEdit ? '<button type="button" class="btn" data-action="followup" data-id="' + job.idJob + '">J\'ai relancé</button>' : '<button type="button" class="btn" data-action="close-drawer">Annuler</button>'}
                        <button class="btn primary" type="submit">Enregistrer</button></div>
                </div>
            </form>
        </aside>`;
        setTimeout(() => $('#drawer-root input[name="job"]')?.focus(), 30);
    }
    const closeDrawer = () => { $("#drawer-root").innerHTML = ""; };

    async function submitJob(form) {
        const id = form.dataset.id;
        const fd = new FormData(form);
        const g = (k) => String(fd.get(k) ?? "").trim();
        if (!g("job") || !g("entrepriseName")) return toast("Renseigne le poste et l'entreprise.", "error");

        const body = {
            job: g("job"), entrepriseName: g("entrepriseName"),
            statusId: Number(g("statusId")), offerTypeId: Number(g("offerTypeId")),
            lastContactDate: g("lastContactDate") || null, nextFollowUpDate: g("nextFollowUpDate") || null,
            contactPerson: g("contactPerson"), contactEmail: g("contactEmail"), jobUrl: g("jobUrl"), notes: g("notes"),
        };
        if (id || g("sendDate")) body.sendDate = g("sendDate") || null; // à la création, vide = date du jour (si déjà envoyée)
        if (form.dataset.touched) body.interestRating = g("interestRating") === "" ? null : Number(g("interestRating"));
        if (Number(g("statusId")) !== Number(form.dataset.initialStatus) && g("statusNote")) body.statusNote = g("statusNote");

        try {
            await api(id ? `/job/${id}` : "/job", { method: id ? "PATCH" : "POST", body });
            closeDrawer();
            await refresh();
            render();
            toast(id ? "Modifications enregistrées" : "Candidature ajoutée");
        } catch (e) { fail(e); }
    }

    async function followUp(id) {
        const job = S.jobs.find((j) => j.idJob === id);
        const info = job ? `${job.entreprise?.name} : ${job.job}` : "";
        const res = await modal(`<form method="dialog"><h2>J'ai relancé</h2>${info ? `<p class="muted">${esc(info)}</p>` : ""}
            <label class="field"><span>Date du contact</span><input type="date" name="date" value="${todayISO()}" required></label>
            <div class="field"><label for="fu-next" style="font-size:.84rem;color:var(--ink-2);font-weight:550">Prochaine relance</label><input type="date" id="fu-next" name="nextFollowUpDate" value="${addDays(todayISO(), 7)}">
                <div class="quick">${[3, 7, 14].map((n) => `<button type="button" class="btn sm" data-action="fu-days" data-days="${n}">Dans ${n} jours</button>`).join("")}<button type="button" class="btn sm ghost" data-action="fu-days" data-days="">Aucune</button></div></div>
            <label class="field"><span>Note (facultatif)</span><input type="text" name="note" maxlength="400" placeholder="Ex. Mail envoyé à la RH"></label>
            <div class="foot"><button type="button" class="btn" data-action="dlg-cancel">Annuler</button><button value="ok" class="btn primary">Enregistrer</button></div></form>`);
        if (!res) return;
        try {
            await api(`/job/${id}/followup`, { method: "POST", body: { date: res.date || undefined, nextFollowUpDate: res.nextFollowUpDate || null, note: res.note } });
            await refresh();
            render();
            toast("Relance enregistrée");
        } catch (e) { fail(e); }
    }

    async function changeStatus(jobId, statusId) {
        const job = S.jobs.find((j) => j.idJob === jobId);
        if (!job || job.statusId === statusId) return;
        try {
            await api(`/job/${jobId}`, { method: "PATCH", body: { statusId } });
            await refresh();
            render();
            toast("Statut mis à jour");
        } catch (e) { fail(e); }
    }

    /* ------------------------------------------------------------------ entreprises, statuts, types */
    async function entrepriseForm(id) {
        const e = id ? S.entreprises.find((x) => x.idEntreprise === id) : null;
        const res = await modal(`<form method="dialog"><h2>${e ? "Modifier l'entreprise" : "Nouvelle entreprise"}</h2>
            <label class="field"><span>Nom</span><input type="text" name="name" required value="${esc(e?.name || "")}"></label>
            <div class="interest-box"><span class="small" style="font-weight:600;margin-right:.9rem">Intérêt</span>${ratingHTML(e?.interestRating, { edit: true })}<span class="rating-label" id="rating-label">${RATING_LABELS[e?.interestRating || 0]}</span><input type="hidden" name="interestRating" value="${e?.interestRating || ""}"></div>
            <label class="field"><span>Site web</span><input type="url" name="website" value="${esc(e?.website || "")}" placeholder="https://…"></label>
            <div class="row"><label class="field"><span>Adresse</span><input type="text" name="address" value="${esc(e?.address || "")}"></label>
            <label class="field"><span>Contact</span><input type="text" name="contact" value="${esc(e?.contact || "")}"></label></div>
            <label class="field"><span>Notes</span><textarea name="notes">${esc(e?.notes || "")}</textarea></label>
            <div class="foot"><button type="button" class="btn" data-action="dlg-cancel">Annuler</button><button value="ok" class="btn primary">Enregistrer</button></div></form>`);
        if (!res) return;
        const body = { ...res, interestRating: res.interestRating === "" ? null : Number(res.interestRating) };
        try {
            await api(e ? `/entreprise/${id}` : "/entreprise", { method: e ? "PATCH" : "POST", body });
            await refresh();
            render();
            toast(e ? "Entreprise modifiée" : "Entreprise ajoutée");
        } catch (err) { fail(err); }
    }

    async function entrepriseDelete(id) {
        const e = S.entreprises.find((x) => x.idEntreprise === id);
        const text = e.jobCount ? `${e.name} a ${plural(e.jobCount, "candidature", "candidatures")}. Elles seront supprimées avec l'entreprise.` : `Supprimer ${e.name} ?`;
        if (!(await confirmDlg("Supprimer l'entreprise", text, "Supprimer", true))) return;
        try {
            await api(`/entreprise/${id}${e.jobCount ? "?force=true" : ""}`, { method: "DELETE" });
            await refresh();
            render();
            toast("Entreprise supprimée");
        } catch (err) { fail(err); }
    }

    async function lookupDelete(kind, id) {
        const isStatus = kind === "status";
        const items = isStatus ? S.statuses : S.offerTypes;
        const idKey = isStatus ? "idStatus" : "idOffer";
        const nameKey = isStatus ? "status" : "offerType";
        const item = items.find((x) => x[idKey] === id);
        const base = isStatus ? `/status/${id}` : `/offer-types/${id}`;
        let replace = "";

        if (item.jobCount > 0 || items.length === 1) {
            const others = items.filter((x) => x[idKey] !== id);
            if (!others.length) return toast("Il faut garder au moins un élément.", "error");
            const res = await modal(`<form method="dialog"><h2>Supprimer « ${esc(item[nameKey])} »</h2>
                <p class="muted">${plural(item.jobCount, "candidature utilise", "candidatures utilisent")} cet élément. Choisis par quoi le remplacer.</p>
                <label class="field"><span>Remplacer par</span><select name="to">${others.map((o) => `<option value="${o[idKey]}">${esc(o[nameKey])}</option>`).join("")}</select></label>
                <div class="foot"><button type="button" class="btn" data-action="dlg-cancel">Annuler</button><button value="ok" class="btn danger">Supprimer</button></div></form>`);
            if (!res) return;
            replace = `?replaceWith=${res.to}`;
        } else if (!(await confirmDlg("Supprimer", `Supprimer « ${item[nameKey]} » ?`, "Supprimer", true))) return;

        try {
            await api(base + replace, { method: "DELETE" });
            await refresh();
            render();
            toast("Supprimé");
        } catch (e) { fail(e); }
    }

    async function moveStatus(id, dir) {
        const i = S.statuses.findIndex((s) => s.idStatus === id);
        const j = i + dir;
        if (j < 0 || j >= S.statuses.length) return;
        const order = S.statuses.map((s) => s.idStatus);
        [order[i], order[j]] = [order[j], order[i]];
        try {
            await Promise.all(order.map((sid, pos) => api(`/status/${sid}`, { method: "PATCH", body: { position: pos } })));
            await loadRef();
            render();
        } catch (e) { fail(e); }
    }

    function exportCsv() {
        api("/job?sort=company&order=asc").then(({ jobs }) => {
            const cell = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
            const head = ["Entreprise", "Poste", "Type", "Statut", "Intérêt", "Envoyée le", "Dernier contact", "Prochaine relance", "Contact", "Email", "Lien", "Notes"];
            const rows = jobs.map((j) => [j.entreprise?.name, j.job, j.offerType?.offerType, j.status?.status, j.entreprise?.interestRating, j.sendDate, j.lastContactDate, j.nextFollowUpDate, j.contactPerson, j.contactEmail, j.jobUrl, j.notes]);
            const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            a.download = `candidatures-${todayISO()}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
        }).catch(fail);
    }

    /* ------------------------------------------------------------------ authentification */
    let authMode = "login";
    function showAuth() {
        $("#app").hidden = true;
        $("#auth").hidden = false;
        const signup = authMode === "signup";
        $("#auth-title").textContent = signup ? "Créer un compte" : "Connexion";
        $("#auth-submit").textContent = signup ? "Créer mon compte" : "Se connecter";
        $("#auth-name-field").hidden = !signup;
        $("#auth-switch-text").textContent = signup ? "Déjà un compte ?" : "Pas encore de compte ?";
        $("#auth-switch").textContent = signup ? "Se connecter" : "Créer un compte";
        $('#auth-form [name="password"]').autocomplete = signup ? "new-password" : "current-password";
    }

    async function submitAuth(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const err = $("#auth-error");
        err.textContent = "";
        const email = String(fd.get("email") || "").trim();
        const password = String(fd.get("password") || "");
        if (!email || !password) { err.textContent = "Renseigne ton email et ton mot de passe."; return; }
        try {
            const data = await api(authMode === "signup" ? "/sign" : "/login", {
                method: "POST", body: { email, password, username: String(fd.get("username") || "").trim() },
            });
            S.token = data.token;
            store.set("token", data.token);
            S.user = data.user;
            form.reset();
            await refresh();
            if (!location.hash) location.hash = "#/dashboard";
            render();
        } catch (ex) { err.textContent = ex.message; }
    }

    function logout(expired = false) {
        S.token = null;
        S.user = null;
        store.del("token");
        closeDrawer();
        authMode = "login";
        showAuth();
        if (expired) setTimeout(() => toast("Session expirée, reconnecte-toi.", "error"), 50);
    }

    /* ------------------------------------------------------------------ événements */
    const actions = {
        "new-job": () => drawer(null),
        "open-job": (el) => openJob(Number(el.dataset.id)),
        "close-drawer": closeDrawer,
        "followup": (el) => followUp(Number(el.dataset.id)),
        "delete-job": async (el) => {
            const form = el.closest("form");
            if (!(await confirmDlg("Supprimer la candidature", "Elle sera supprimée avec son historique. Cette action est définitive.", "Supprimer", true))) return;
            try {
                await api(`/job/${form.dataset.id}`, { method: "DELETE" });
                closeDrawer();
                await refresh();
                render();
                toast("Candidature supprimée");
            } catch (e) { fail(e); }
        },
        "next-in": (el) => { $("#next-date").value = el.dataset.days ? addDays(todayISO(), Number(el.dataset.days)) : ""; },
        "fu-days": (el) => { $("#fu-next").value = el.dataset.days ? addDays(todayISO(), Number(el.dataset.days)) : ""; },
        "dlg-cancel": () => $("#dlg").close(""),
        "filter-status": (el) => { S.f.statusId = el.dataset.id; loadJobs().then(() => go("jobs")).catch(fail); },
        "reset-filters": () => { S.f = { ...S.f, q: "", statusId: "", offerTypeId: "", minRating: "" }; loadJobs().then(render).catch(fail); },
        "layout": (el) => { S.layout = el.dataset.layout; store.set("layout", S.layout); render(); },
        "entreprise-form": (el) => entrepriseForm(el.dataset.id ? Number(el.dataset.id) : null),
        "entreprise-delete": (el) => entrepriseDelete(Number(el.dataset.id)),
        "preview-import": previewImport,
        "approve-import": (el) => approveImport(Number(el.dataset.id)),
        "open-import": (el) => openImport(Number(el.dataset.id)),
        "reject-import": (el) => rejectImport(Number(el.dataset.id)),
        "cancel-import": () => { S.importDraft = null; render(); },
        "status-delete": (el) => lookupDelete("status", Number(el.dataset.id)),
        "offer-delete": (el) => lookupDelete("offer", Number(el.dataset.id)),
        "status-move": (el) => moveStatus(Number(el.dataset.id), Number(el.dataset.dir)),
        "export-csv": exportCsv,
        "logout": () => logout(),
        "delete-account": async () => {
            if (!(await confirmDlg("Supprimer mon compte", "Toutes tes données seront effacées définitivement.", "Supprimer mon compte", true))) return;
            try { await api("/profile", { method: "DELETE" }); logout(); } catch (e) { fail(e); }
        },
    };

    document.addEventListener("click", async (e) => {
        // Notation par barres
        const pip = e.target.closest(".rating.edit .pip");
        if (pip) {
            const rating = pip.closest(".rating");
            const v = Number(pip.dataset.v);
            const next = Number(rating.dataset.value) === v ? 0 : v;
            rating.dataset.value = next;
            rating.querySelectorAll(".pip").forEach((p) => p.classList.toggle("on", Number(p.dataset.v) <= next));
            const label = rating.parentElement.querySelector(".rating-label");
            if (label) label.textContent = RATING_LABELS[next];
            if (rating.dataset.patch === "entreprise") {
                try {
                    await api(`/entreprise/${rating.dataset.id}`, { method: "PATCH", body: { interestRating: next || null } });
                    await refresh();
                    toast("Intérêt mis à jour");
                } catch (err) { fail(err); await refresh(); render(); }
            } else {
                const form = rating.closest("form");
                form.elements.interestRating.value = next || "";
                form.dataset.touched = "1";
            }
            return;
        }
        const el = e.target.closest("[data-action]");
        if (!el) return;
        const fn = actions[el.dataset.action];
        // closest() part de la cible : un bouton imbriqué (ex. « J'ai relancé » dans une ligne) déclenche seulement sa propre action
        if (fn) fn(el);
    }, true);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && $("#drawer-root").firstChild && !$("#dlg").open) closeDrawer();
        if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-action]') && !e.target.matches("button")) {
            e.preventDefault();
            e.target.click();
        }
    });

    document.addEventListener("submit", (e) => {
        const form = e.target.closest("[data-form]");
        if (!form) return;
        e.preventDefault();
        const fd = new FormData(form);
        const kind = form.dataset.form;
        const done = async (promise, msg, reset) => {
            try { await promise; if (reset) form.reset(); await refresh(); render(); toast(msg); } catch (err) { fail(err); }
        };
        if (kind === "job") submitJob(form);
        else if (kind === "status-new") done(api("/status", { method: "POST", body: { status: fd.get("status"), color: fd.get("color"), kind: fd.get("kind") } }), "Statut ajouté");
        else if (kind === "offer-new") done(api("/offer-types", { method: "POST", body: { offerType: fd.get("offerType") } }), "Type d'offre ajouté");
        else if (kind === "profile") {
            const body = { username: fd.get("username"), email: fd.get("email") };
            if (fd.get("password")) body.password = fd.get("password");
            api("/profile", { method: "PATCH", body })
                .then(async (r) => { S.user = r.user; renderNav(); form.elements.password.value = ""; toast("Compte mis à jour"); })
                .catch(fail);
        }
    });

    document.addEventListener("change", async (e) => {
        const t = e.target;
        if (t.dataset.filter) {
            S.f[t.dataset.filter] = t.value;
            try { await loadJobs(); $("#jobs-results").innerHTML = jobsResults(); } catch (err) { fail(err); }
        } else if (t.name === "statusId" && t.closest('form[data-form="job"]')) {
            const form = t.closest("form");
            $("#status-note-field").hidden = Number(t.value) === Number(form.dataset.initialStatus);
        } else if (t.closest("[data-status-row]")) {
            const row = t.closest("[data-status-row]");
            try {
                await api(`/status/${row.dataset.statusRow}`, { method: "PATCH", body: { status: row.querySelector('[name="status"]').value, color: row.querySelector('[name="color"]').value, kind: row.querySelector('[name="kind"]').value } });
                await refresh();
                toast("Statut enregistré");
            } catch (err) { fail(err); await loadRef(); render(); }
        } else if (t.closest("[data-offer-row]")) {
            const row = t.closest("[data-offer-row]");
            try {
                await api(`/offer-types/${row.dataset.offerRow}`, { method: "PATCH", body: { offerType: t.value } });
                await refresh();
                toast("Type d'offre enregistré");
            } catch (err) { fail(err); await loadRef(); render(); }
        }
    });

    let searchTimer;
    document.addEventListener("input", (e) => {
        const t = e.target;
        if (t.id === "q") {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(async () => {
                S.f.q = t.value.trim();
                try { await loadJobs(); $("#jobs-results").innerHTML = jobsResults(); } catch (err) { fail(err); }
            }, 250);
        } else if (t.name === "entrepriseName" && t.closest('form[data-form="job"]')) {
            // Entreprise déjà connue : on reprend sa note d'intérêt, sauf si elle vient d'être modifiée à la main
            const form = t.closest("form");
            if (form.dataset.touched) return;
            const known = S.entreprises.find((x) => x.name.toLowerCase() === t.value.trim().toLowerCase());
            const v = known?.interestRating || 0;
            const rating = form.querySelector(".rating.edit");
            rating.dataset.value = v;
            rating.querySelectorAll(".pip").forEach((p) => p.classList.toggle("on", Number(p.dataset.v) <= v));
            form.elements.interestRating.value = v || "";
            $("#rating-label").textContent = RATING_LABELS[v];
        }
    });

    // Glisser-déposer d'une carte vers une autre colonne = changement de statut
    let dragId = null;
    document.addEventListener("dragstart", (e) => {
        const card = e.target.closest?.(".card");
        if (!card) return;
        dragId = Number(card.dataset.id);
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(dragId));
    });
    document.addEventListener("dragend", () => {
        dragId = null;
        document.querySelectorAll(".dragging, .drop").forEach((el) => el.classList.remove("dragging", "drop"));
    });
    document.addEventListener("dragover", (e) => {
        const col = e.target.closest?.(".col");
        if (!col || dragId === null) return;
        e.preventDefault();
        document.querySelectorAll(".col.drop").forEach((c) => c !== col && c.classList.remove("drop"));
        col.classList.add("drop");
    });
    document.addEventListener("drop", (e) => {
        const col = e.target.closest?.(".col");
        if (!col || dragId === null) return;
        e.preventDefault();
        const id = dragId;
        dragId = null;
        col.classList.remove("drop");
        changeStatus(id, Number(col.dataset.status));
    });

    $("#auth-form").addEventListener("submit", submitAuth);
    $("#auth-switch").addEventListener("click", () => { authMode = authMode === "login" ? "signup" : "login"; $("#auth-error").textContent = ""; showAuth(); });
    window.addEventListener("hashchange", () => { if (S.user) render(); });

    /* ------------------------------------------------------------------ démarrage */
    (async function init() {
        if (!S.token) return showAuth();
        try {
            S.user = (await api("/profile")).user;
            await refresh();
            render();
        } catch {
            if (!S.user) showAuth();
        }
    })();
})();
