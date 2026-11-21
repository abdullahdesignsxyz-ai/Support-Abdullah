(() => {
  const STORAGE_STATE = "shikhi_site_state_v4";
  const STORAGE_ACT = "mg_activity_v1";
  const STORAGE_HASH = "mg_vault_hash_v1";
  const SESSION_UNLOCK = "mg_vault_session_v1";
  const STORAGE_LANG = "mg_lang";
  const PASS_SALT = "mg-salt-v1::";
  const DEFAULT_HASH = "ac71ae1c08231c685c822386e894986100f2d1e7d3075db786c8aa618c468c1c";

  const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  /* Pure-JS SHA-256 (works identically on file://, http://, and https://) */
  function sha256(str) {
    const bytes = new TextEncoder().encode(str);
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bitLen = bytes.length * 8;
    const padLen = ((bytes.length + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(padLen);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(padLen - 4, bitLen >>> 0, false);

    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    for (let off = 0; off < padLen; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = [
        (H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0,
        (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0,
      ];
    }
    return H.map((x) => x.toString(16).padStart(8, "0")).join("");
  }

  function hashPasscode(code) {
    return sha256(PASS_SALT + code);
  }

  function getActiveHash() {
    return localStorage.getItem(STORAGE_HASH) || DEFAULT_HASH;
  }

  function getLang() {
    return localStorage.getItem(STORAGE_LANG) === "en" ? "en" : "bn";
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_LANG, lang);
    document.documentElement.lang = lang;
  }

  function t(bn, en) {
    return getLang() === "bn" ? bn : en;
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatNum(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    const s = n.toLocaleString("en-US", { maximumFractionDigits: 1 });
    return getLang() === "en" ? s : s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
  }

  function formatTaka(value) {
    return "৳" + formatNum(value);
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(getLang() === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function showToast(msg) {
    let el = document.getElementById("vaultToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "vaultToast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2700);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadState() {
    const base = clone(window.SHIKHI_DATA || {});
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_STATE) || "null");
      if (saved && typeof saved === "object") {
        const merged = {
          ...base,
          brand: { ...(base.brand || {}), ...(saved.brand || {}), social: { ...(base.brand?.social || {}), ...(saved.brand?.social || {}) } },
          stats: { ...(base.stats || {}), ...(saved.stats || {}) },
          settings: {
            ...(base.settings || {}),
            ...(saved.settings || {}),
            hero: { ...(base.settings?.hero || {}), ...(saved.settings?.hero || {}) },
            short_link: { ...(base.settings?.short_link || {}), ...(saved.settings?.short_link || {}) },
            pay: { bkash: saved.settings?.pay?.bkash || base.settings?.pay?.bkash || "01754441574" },
          },
          categories: Array.isArray(saved.categories) ? saved.categories : base.categories,
          resources: Array.isArray(saved.resources) ? saved.resources : base.resources,
          supporters: Array.isArray(saved.supporters) ? saved.supporters : base.supporters,
          faqs: Array.isArray(saved.faqs) ? saved.faqs : base.faqs,
        };
        merged.stats.resource_count = merged.resources.length;
        return merged;
      }
    } catch {}
    return base;
  }

  function saveState(state) {
    state.stats.resource_count = state.resources.length;
    localStorage.setItem(STORAGE_STATE, JSON.stringify(state));
  }

  function loadActivity() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_ACT) || "null");
      if (raw && typeof raw === "object") {
        return {
          supports: [],
          donations: [],
          help_requests: [],
          messages: [],
          comments: [],
          downloads: {},
          views: {},
          ...raw,
        };
      }
    } catch {}
    return { supports: [], donations: [], help_requests: [], messages: [], comments: [], downloads: {}, views: {} };
  }

  function saveActivity(act) {
    localStorage.setItem(STORAGE_ACT, JSON.stringify(act));
  }

  function slugify(str) {
    const clean = String(str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0980-\u09ff\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64);
    return clean || `res-${Date.now()}`;
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getPendingPayments(state, act) {
    const items = [];
    (act.supports || []).forEach((s) => {
      if (s.status === "pending") items.push({ ...s, _origin: "act_support" });
    });
    return items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  /* UI State */
  let activeTab = "overview";
  let resQuery = "";
  let resCat = "all";
  let inboxSub = "messages";
  let failAttempts = 0;
  let lockUntil = 0;

  function renderLockScreen() {
    document.documentElement.lang = getLang();
    const root = document.getElementById("vaultRoot");
    root.innerHTML = `
      <div class="vault-lock-screen">
        <div class="vault-lock-card" id="lockCard">
          <div class="vault-shield">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <span class="vault-pill-private" style="margin-bottom:10px;display:inline-block;">${t("প্রাইভেট অ্যাক্সেস", "Private Access")}</span>
          <h1 style="font-size:24px;font-weight:800;color:var(--ink);margin-bottom:6px;">${t("শিখি ওনার স্টুডিও", "Shikhi Owner Studio")}</h1>
          <p style="font-size:14px;color:var(--muted);margin-bottom:22px;">
            ${t("শুধুমাত্র অ্যাডমিনের জন্য। পাসকোড দিয়ে আনলক করুন।", "Owner only. Enter your private passcode to continue.")}
          </p>
          <form id="vaultLoginForm">
            <div class="pass-wrap">
              <input type="password" id="vaultPassInput" class="input" autocomplete="current-password" required placeholder="${t("পাসকোড লিখুন", "Enter passcode")}">
              <button type="button" class="pass-eye" id="togglePassEye" aria-label="Show passcode">👁</button>
            </div>
            <p id="lockErrMsg" style="font-size:13px;font-weight:700;color:var(--red);min-height:20px;margin-bottom:10px;"></p>
            <button type="submit" class="btn btn-primary" style="width:100%;height:48px;">${t("আনলক করুন", "Unlock Studio")} →</button>
          </form>
        </div>
      </div>
    `;

    const passInput = document.getElementById("vaultPassInput");
    const errEl = document.getElementById("lockErrMsg");
    const lockCard = document.getElementById("lockCard");
    passInput?.focus();

    document.getElementById("togglePassEye")?.addEventListener("click", () => {
      const showing = passInput.type === "text";
      passInput.type = showing ? "password" : "text";
    });

    document.getElementById("vaultLoginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now < lockUntil) {
        const secs = Math.ceil((lockUntil - now) / 1000);
        errEl.textContent = t(`${formatNum(secs)} সেকেন্ড পর আবার চেষ্টা করুন।`, `Please wait ${secs}s before trying again.`);
        return;
      }
      const val = passInput.value.trim();
      if (hashPasscode(val) === getActiveHash()) {
        failAttempts = 0;
        sessionStorage.setItem(SESSION_UNLOCK, getActiveHash());
        renderStudio();
      } else {
        failAttempts += 1;
        if (failAttempts >= 5) {
          lockUntil = Date.now() + 15000;
          failAttempts = 0;
          errEl.textContent = t("অনেকবার ভুল হয়েছে। ১৫ সেকেন্ড অপেক্ষা করুন।", "Too many wrong tries. Wait 15 seconds.");
        } else {
          errEl.textContent = t("পাসকোড সঠিক নয়। আবার চেষ্টা করুন।", "Incorrect passcode. Please try again.");
        }
        lockCard.classList.remove("shake");
        void lockCard.offsetWidth;
        lockCard.classList.add("shake");
        passInput.select();
      }
    });
  }

  function verifyPayment(item, approve) {
    const state = loadState();
    const act = loadActivity();
    const amount = Number(item.amount) || 0;
    const nowIso = new Date().toISOString();

    const target = (act.supports || []).find((x) => x.id === item.id);
    if (target) target.status = approve ? "verified" : "rejected";
    saveActivity(act);

    if (approve && amount > 0) {
      state.supporters.unshift({
        id: item.id,
        resource_id: item.resource_id || null,
        name: item.show_name ? item.name : null,
        show_name: Boolean(item.show_name),
        message: item.message || null,
        amount,
        method: "bkash",
        created_at: item.created_at || nowIso,
      });
      state.stats.verified_supporters_count = (Number(state.stats.verified_supporters_count) || 0) + 1;
      state.stats.total_support_amount = Math.round(((Number(state.stats.total_support_amount) || 0) + amount) * 10) / 10;
    }

    saveState(state);
    showToast(
      approve
        ? t("বিকাশ সাপোর্ট যাচাই ও রিভিউ লাইভ হয়েছে!", "bKash support verified & review published!")
        : t("লেনদেন বাতিল করা হয়েছে।", "Entry marked as rejected.")
    );
    renderStudio();
  }

  function openResourceModal(existingId = null) {
    const state = loadState();
    const editing = existingId ? state.resources.find((r) => r.id === existingId) : null;
    const modal = document.getElementById("resEditorModal");
    const body = document.getElementById("resEditorBody");
    if (!modal || !body) return;

    const catOptions = state.categories
      .map((c) => `<option value="${esc(c.id)}" ${editing?.category_id === c.id ? "selected" : ""}>${esc(t(c.name_bn, c.name_en))}</option>`)
      .join("");

    const initialCover = editing?.cover || "assets/covers/r_4b8ac37d385e.png";

    body.innerHTML = `
      <h2 style="font-size:21px;font-weight:800;margin-bottom:16px;">
        ${editing ? t("রিসোর্স এডিট করুন", "Edit Resource") : t("নতুন রিসোর্স যোগ করুন", "Add New Resource")}
      </h2>
      <form id="resEditForm">
        <div class="cover-preview-box">
          <img id="edCoverPreview" src="${esc(initialCover)}" alt="Cover preview">
          <div style="flex:1;min-width:0;">
            <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;">${t("কভার ছবি আপলোড বা পাথ দিন", "Upload cover image or enter path")}</label>
            <input type="file" id="edCoverFile" accept="image/*" style="font-size:12.5px;margin-bottom:8px;max-width:100%;">
            <input id="edCoverPath" class="input" style="height:38px;font-size:13px;" value="${esc(initialCover)}" placeholder="assets/covers/... or https://...">
          </div>
        </div>

        <div class="vault-form-grid">
          <div class="field">
            <label>${t("শিরোনাম (বাংলা) *", "Title (Bangla) *")}</label>
            <input id="edTitleBn" class="input" required value="${esc(editing?.title_bn || "")}">
          </div>
          <div class="field">
            <label>${t("শিরোনাম (English)", "Title (English)")}</label>
            <input id="edTitleEn" class="input" value="${esc(editing?.title_en || "")}">
          </div>
        </div>

        <div class="vault-form-grid">
          <div class="field">
            <label>${t("ক্যাটাগরি", "Category")}</label>
            <select id="edCat" class="select-input" style="width:100%;">${catOptions}</select>
          </div>
          <div class="field">
            <label>${t("ফাইল ফরম্যাট", "File format")}</label>
            <select id="edKind" class="select-input" style="width:100%;">
              ${["pdf", "zip", "guide", "template", "link", "doc"]
                .map((k) => `<option value="${k}" ${(editing?.file_kind || "pdf") === k ? "selected" : ""}>${k.toUpperCase()}</option>`)
                .join("")}
            </select>
          </div>
        </div>

        <div class="vault-form-grid">
          <div class="field">
            <label>${t("ডাউনলোড লিংক (Google Drive / URL) *", "Download URL *")}</label>
            <input id="edUrl" type="url" class="input" required value="${esc(editing?.download_url || "")}" placeholder="https://drive.google.com/...">
          </div>
          <div class="field">
            <label>${t("স্লাগ (URL slug)", "Slug (auto if blank)")}</label>
            <input id="edSlug" class="input" value="${esc(editing?.slug || "")}" placeholder="e.g. my-free-guide">
          </div>
        </div>

        <div class="field">
          <label>${t("বিবরণ (বাংলা)", "Description (Bangla)")}</label>
          <textarea id="edDescBn" class="textarea" style="min-height:80px;">${esc(editing?.desc_bn || "")}</textarea>
        </div>

        <div class="field">
          <label>${t("বিবরণ (English)", "Description (English)")}</label>
          <textarea id="edDescEn" class="textarea" style="min-height:80px;">${esc(editing?.desc_en || "")}</textarea>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
          <label class="check-row">
            <input type="checkbox" id="edFeatured" ${editing?.featured ? "checked" : ""}>
            <span>${t("হোমপেজে বাছাই করা (Featured) হিসেবে দেখান", "Feature on homepage")}</span>
          </label>
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:13px;font-weight:700;">${t("ভাষা:", "Lang:")}</label>
            <input id="edLang" class="input" style="height:36px;width:130px;" value="${esc(editing?.language || "বাংলা")}">
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" class="btn btn-outline btn-sm" id="cancelResEdit">${t("বাতিল", "Cancel")}</button>
          <button type="submit" class="btn btn-primary btn-sm">${editing ? t("পরিবর্তন সেভ করুন", "Save changes") : t("রিসোর্স প্রকাশ করুন", "Publish resource")}</button>
        </div>
      </form>
    `;

    const coverPath = document.getElementById("edCoverPath");
    const coverPrev = document.getElementById("edCoverPreview");
    coverPath.addEventListener("input", () => {
      coverPrev.src = coverPath.value.trim() || initialCover;
    });

    document.getElementById("edCoverFile").addEventListener("change", (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 480;
          const maxH = 600;
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
          coverPath.value = dataUrl;
          coverPrev.src = dataUrl;
          showToast(t("কভার ছবি লোড হয়েছে!", "Cover image ready!"));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    function closeEditor() {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    }

    document.getElementById("cancelResEdit").addEventListener("click", closeEditor);

    document.getElementById("resEditForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const s = loadState();
      const titleBn = document.getElementById("edTitleBn").value.trim();
      const titleEn = document.getElementById("edTitleEn").value.trim() || titleBn;
      const slugVal = document.getElementById("edSlug").value.trim() || slugify(titleEn || titleBn);
      const nowIso = new Date().toISOString();
      const payload = {
        id: editing ? editing.id : `r_${Date.now().toString(36)}`,
        slug: slugVal,
        category_id: document.getElementById("edCat").value,
        title_bn: titleBn,
        title_en: titleEn,
        desc_bn: document.getElementById("edDescBn").value.trim(),
        desc_en: document.getElementById("edDescEn").value.trim() || document.getElementById("edDescBn").value.trim(),
        cover: coverPath.value.trim() || "assets/covers/r_4b8ac37d385e.png",
        download_url: document.getElementById("edUrl").value.trim(),
        file_kind: document.getElementById("edKind").value,
        language: document.getElementById("edLang").value.trim() || "বাংলা",
        featured: document.getElementById("edFeatured").checked,
        downloads: editing ? editing.downloads : 0,
        views: editing ? (editing.views || 0) : 0,
        created_at: editing ? editing.created_at : nowIso,
        updated_at: nowIso,
      };

      if (editing) {
        const idx = s.resources.findIndex((r) => r.id === editing.id);
        if (idx >= 0) s.resources[idx] = payload;
      } else {
        s.resources.unshift(payload);
      }

      saveState(s);
      closeEditor();
      showToast(editing ? t("রিসোর্স আপডেট হয়েছে!", "Resource updated!") : t("নতুন রিসোর্স যোগ হয়েছে!", "New resource published!"));
      renderStudio();
    });

    document.body.style.overflow = "hidden";
    void modal.offsetHeight;
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function renderStudio() {
    document.documentElement.lang = getLang();
    const state = loadState();
    const act = loadActivity();
    const pendingPayments = getPendingPayments(state, act);
    const pendingInbox = (act.messages || []).filter((m) => m.status !== "resolved").length;
    const totalDownloads = state.resources.reduce(
      (sum, r) => sum + (Number(r.downloads) || 0) + (act.downloads?.[r.id] || 0),
      0
    );
    const bkashNumber = state.settings.pay?.bkash || "01754441574";

    const root = document.getElementById("vaultRoot");
    root.innerHTML = `
      <div class="vault-shell">
        <aside class="vault-sidebar">
          <div class="vault-brand-row">
            <div class="brand" style="font-size:18px;">
              <img src="assets/logo.svg" alt="" class="brand-logo" style="width:32px;height:32px;" aria-hidden="true">
              <span>${t("ওনার স্টুডিও", "Owner Studio")}</span>
            </div>
            <span class="vault-pill-private">Private</span>
          </div>

          <nav class="vault-nav" aria-label="Admin sections">
            <button type="button" class="vault-nav-btn ${activeTab === "overview" ? "active" : ""}" data-tab="overview">
              <span>${t("ড্যাশবোর্ড", "Dashboard")}</span>
            </button>
            <button type="button" class="vault-nav-btn ${activeTab === "resources" ? "active" : ""}" data-tab="resources">
              <span>${t("রিসোর্স ম্যানেজার", "Resources")}</span>
              <span class="vault-nav-badge num">${formatNum(state.resources.length)}</span>
            </button>
            <button type="button" class="vault-nav-btn ${activeTab === "payments" ? "active" : ""}" data-tab="payments">
              <span>${t("বিকাশ সাপোর্ট", "bKash Supports")}</span>
              ${pendingPayments.length ? `<span class="vault-nav-badge num">${formatNum(pendingPayments.length)}</span>` : ""}
            </button>
            <button type="button" class="vault-nav-btn ${activeTab === "inbox" ? "active" : ""}" data-tab="inbox">
              <span>${t("ইনবক্স মেসেজ", "Contact Inbox")}</span>
              ${pendingInbox ? `<span class="vault-nav-badge num">${formatNum(pendingInbox)}</span>` : ""}
            </button>
            <button type="button" class="vault-nav-btn ${activeTab === "settings" ? "active" : ""}" data-tab="settings">
              <span>${t("সেটিংস ও এক্সপোর্ট", "Settings & Export")}</span>
            </button>
          </nav>

          <div class="vault-sidebar-foot">
            <button type="button" class="btn btn-yellow btn-sm" id="quickExportDataBtn">↓ ${t("data.js এক্সপোর্ট", "Export data.js")}</button>
            <a href="index.html" target="_blank" class="btn btn-outline btn-sm">${t("পাবলিক সাইট দেখুন", "View Public Site")} ↗</a>
            <div style="display:flex;gap:6px;">
              <button type="button" class="btn btn-outline btn-sm" id="vaultLangBtn" style="flex:1;">${getLang() === "bn" ? "EN" : "বাংলা"}</button>
              <button type="button" class="btn btn-danger btn-sm" id="vaultLockBtn" style="flex:1;">${t("লক করুন", "Lock")}</button>
            </div>
          </div>
        </aside>

        <main class="vault-main">
          <div id="vaultPanelBody"></div>
        </main>
      </div>

      <div class="modal-backdrop" id="resEditorModal" role="dialog" aria-modal="true">
        <div class="modal-card" style="max-width:680px;">
          <button type="button" class="modal-close" id="closeResEditorBtn" aria-label="Close">✕</button>
          <div id="resEditorBody"></div>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.getAttribute("data-tab");
        renderStudio();
      });
    });

    document.getElementById("vaultLangBtn")?.addEventListener("click", () => {
      setLang(getLang() === "bn" ? "en" : "bn");
      renderStudio();
    });

    document.getElementById("vaultLockBtn")?.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_UNLOCK);
      renderLockScreen();
    });

    document.getElementById("quickExportDataBtn")?.addEventListener("click", () => {
      const s = loadState();
      const jsOut = `// Shikhi (shikhi.xyz) site catalog (exported from private Owner Studio)\nwindow.SHIKHI_DATA = ${JSON.stringify(s, null, 2)};\n`;
      downloadFile("data.js", jsOut, "application/javascript;charset=utf-8");
      showToast(t("data.js ডাউনলোড হয়েছে! html/js/data.js-এ রিপ্লেস করুন।", "data.js exported! Replace html/js/data.js to make live permanently."));
    });

    const edModal = document.getElementById("resEditorModal");
    const closeEdModal = () => {
      edModal?.classList.remove("open");
      document.body.style.overflow = "";
    };
    document.getElementById("closeResEditorBtn")?.addEventListener("click", closeEdModal);
    edModal?.addEventListener("click", (e) => {
      if (e.target === edModal) closeEdModal();
    });
    if (!window._vaultEscBound) {
      window._vaultEscBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const m = document.getElementById("resEditorModal");
          if (m?.classList.contains("open")) {
            m.classList.remove("open");
            document.body.style.overflow = "";
          }
        }
      });
    }

    const panel = document.getElementById("vaultPanelBody");

    if (activeTab === "overview") {
      renderOverviewTab(panel, state, act, pendingPayments, pendingInbox, totalDownloads, bkashNumber);
    } else if (activeTab === "resources") {
      renderResourcesTab(panel, state, act);
    } else if (activeTab === "payments") {
      renderPaymentsTab(panel, state, act, pendingPayments, bkashNumber);
    } else if (activeTab === "inbox") {
      renderInboxTab(panel, act);
    } else {
      renderSettingsTab(panel, state, bkashNumber);
    }
  }

  function renderOverviewTab(panel, state, act, pendingPayments, pendingInbox, totalDownloads, bkashNumber) {
    panel.innerHTML = `
      <div class="vault-topbar">
        <div>
          <p class="eyebrow" style="margin-bottom:4px;">${t("প্রাইভেট ড্যাশবোর্ড", "Private Overview")}</p>
          <h1 style="font-size:28px;font-weight:800;">${t("স্বাগতম, অ্যাডমিন", "Welcome back, Owner")}</h1>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="ovAddResBtn">+ ${t("নতুন রিসোর্স যোগ করুন", "Add New Resource")}</button>
      </div>

      <div class="card card-yellow" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;padding:18px 22px;margin-bottom:22px;">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <img src="assets/bkash.svg" alt="bKash" style="height:30px;width:auto;background:#fff;padding:4px 10px;border-radius:10px;border:1px solid var(--border);">
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:0.06em;">${t("সক্রিয় পেমেন্ট মাধ্যম (শুধুমাত্র বিকাশ)", "Active Payment Method (bKash Only)")}</div>
            <div style="font-size:22px;font-weight:800;color:var(--ink);" class="num">bKash Personal · ${esc(bkashNumber)}</div>
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" id="ovEditBkashBtn">${t("নম্বর পরিবর্তন করুন", "Change number")}</button>
      </div>

      <div class="vault-kpi-grid">
        <div class="stat-card">
          <div class="stat-label">${t("মোট রিসোর্স", "Published Resources")}</div>
          <div class="stat-val num">${formatNum(state.resources.length)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${t("মোট ডাউনলোড", "Total Downloads")}</div>
          <div class="stat-val num">${formatNum(totalDownloads)}</div>
        </div>
        <div class="stat-card ${pendingPayments.length ? "highlight" : ""}">
          <div class="stat-label">${t("বিকাশ যাচাই বাকি", "Pending bKash")}</div>
          <div class="stat-val num">${formatNum(pendingPayments.length)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${t("যাচাইকৃত সাপোর্টার", "Verified Supporters")}</div>
          <div class="stat-val num">${formatNum(state.stats.verified_supporters_count)}</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-label">${t("মোট যাচাইকৃত সাপোর্ট", "Verified Support Total")}</div>
          <div class="stat-val num">${formatTaka(state.stats.total_support_amount || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${t("অপঠিত মেসেজ", "Pending Messages")}</div>
          <div class="stat-val num">${formatNum(pendingInbox)}</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <h2 style="font-size:19px;font-weight:800;">${t("অপেক্ষমাণ বিকাশ লেনদেন", "Pending bKash Verifications")}</h2>
          <button type="button" class="link-underline" id="ovGoPayBtn">${t("সব সাপোর্ট দেখুন", "Manage all supports")} →</button>
        </div>
        ${
          pendingPayments.length === 0
            ? `<p style="color:var(--muted);font-size:14.5px;">${t("কোনো অপেক্ষমাণ বিকাশ লেনদেন নেই।", "All bKash submissions are caught up.")}</p>`
            : `<div class="list-stack" style="max-height:320px;">
                ${pendingPayments
                  .slice(0, 6)
                  .map(
                    (p, idx) => `<div class="list-item">
                      <div>
                        <span class="badge-free" style="margin-bottom:4px;display:inline-block;">${t("বিকাশ সাপোর্ট", "bKash Support")}</span>
                        <div style="font-weight:700;">${esc(p.name || t("নাম প্রকাশে অনিচ্ছুক", "Anonymous"))} · <span class="num" style="color:var(--red);">${formatTaka(p.amount)}</span></div>
                        <div style="font-size:12.5px;color:var(--muted);">TrxID: <strong style="color:var(--ink);">${esc(p.trx_id)}</strong> · ${formatDate(p.created_at)}</div>
                        ${p.message ? `<p style="font-size:13px;color:var(--muted);margin-top:4px;">“${esc(p.message)}”</p>` : ""}
                      </div>
                      <div class="vault-actions">
                        <button type="button" class="btn btn-verify btn-sm" data-ov-approve="${idx}">✓ ${t("যাচাই", "Verify")}</button>
                        <button type="button" class="btn btn-danger btn-sm" data-ov-reject="${idx}">✕</button>
                      </div>
                    </div>`
                  )
                  .join("")}
              </div>`
        }
      </div>
    `;

    document.getElementById("ovAddResBtn")?.addEventListener("click", () => openResourceModal(null));
    document.getElementById("ovEditBkashBtn")?.addEventListener("click", () => {
      activeTab = "settings";
      renderStudio();
    });
    document.getElementById("ovGoPayBtn")?.addEventListener("click", () => {
      activeTab = "payments";
      renderStudio();
    });
    panel.querySelectorAll("[data-ov-approve]").forEach((b) =>
      b.addEventListener("click", () => verifyPayment(pendingPayments[Number(b.getAttribute("data-ov-approve"))], true))
    );
    panel.querySelectorAll("[data-ov-reject]").forEach((b) =>
      b.addEventListener("click", () => verifyPayment(pendingPayments[Number(b.getAttribute("data-ov-reject"))], false))
    );
  }

  function renderResourcesTab(panel, state, act) {
    panel.innerHTML = `
      <div class="vault-topbar">
        <div>
          <h1 style="font-size:26px;font-weight:800;">${t("রিসোর্স ম্যানেজার", "Resources Manager")}</h1>
          <p style="font-size:14px;color:var(--muted);">${t("নতুন ফাইল যোগ করুন, কভার বদলান, অথবা এডিট/ডিলিট করুন।", "Add, edit, feature, or remove free resources.")}</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="addResBtn">+ ${t("নতুন রিসোর্স", "Add Resource")}</button>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="adminResSearch" type="search" value="${esc(resQuery)}" placeholder="${t("রিসোর্স খুঁজুন…", "Search resources…")}">
        </div>
        <select id="adminResCat" class="select-input">
          <option value="all">${t("সব ক্যাটাগরি", "All categories")}</option>
          ${state.categories.map((c) => `<option value="${esc(c.id)}" ${resCat === c.id ? "selected" : ""}>${esc(t(c.name_bn, c.name_en))}</option>`).join("")}
        </select>
      </div>

      <div id="adminResList" style="display:grid;gap:10px;"></div>
    `;

    const listEl = document.getElementById("adminResList");
    function renderRows() {
      const sNow = loadState();
      const aNow = loadActivity();
      const q = resQuery.trim().toLowerCase();
      const list = sNow.resources.filter((r) => {
        if (resCat !== "all" && r.category_id !== resCat) return false;
        if (q && !`${r.title_bn} ${r.title_en} ${r.slug}`.toLowerCase().includes(q)) return false;
        return true;
      });

      listEl.innerHTML =
        list.length === 0
          ? `<div class="card card-yellow" style="text-align:center;padding:34px;">${t("কোনো রিসোর্স পাওয়া যায়নি।", "No matching resources.")}</div>`
          : list
              .map((r) => {
                const cat = sNow.categories.find((c) => c.id === r.category_id);
                const dl = (Number(r.downloads) || 0) + (aNow.downloads?.[r.id] || 0);
                const vw = (Number(r.views) || 0) + (aNow.views?.[r.id] || 0);
                return `
                  <div class="vault-res-row">
                    <img class="vault-thumb" src="${esc(r.cover)}" alt="" onerror="this.style.visibility='hidden'">
                    <div style="min-width:0;">
                      <div style="font-weight:700;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t(r.title_bn, r.title_en))}</div>
                      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px;font-size:12.5px;color:var(--muted);">
                        <span class="badge-kind">${esc(r.file_kind)}</span>
                        <span>${esc(cat ? t(cat.name_bn, cat.name_en) : "")}</span>
                        <span class="num">· ↓ ${formatNum(dl)} · 👁 ${formatNum(vw)}</span>
                        ${r.featured ? `<span class="badge-free">★ Featured</span>` : ""}
                      </div>
                    </div>
                    <div class="vault-actions">
                      <button type="button" class="btn btn-outline btn-sm" data-feat-id="${esc(r.id)}" title="${t("Featured টগল", "Toggle Featured")}">${r.featured ? "★" : "☆"}</button>
                      <button type="button" class="btn btn-yellow btn-sm" data-edit-id="${esc(r.id)}">${t("এডিট", "Edit")}</button>
                      <button type="button" class="btn btn-danger btn-sm" data-del-id="${esc(r.id)}">${t("ডিলিট", "Delete")}</button>
                    </div>
                  </div>
                `;
              })
              .join("");

      listEl.querySelectorAll("[data-feat-id]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const s = loadState();
          const item = s.resources.find((r) => r.id === btn.getAttribute("data-feat-id"));
          if (item) {
            item.featured = !item.featured;
            saveState(s);
            showToast(item.featured ? t("হোমপেজে Featured করা হয়েছে।", "Marked as Featured.") : t("Featured থেকে সরানো হয়েছে।", "Removed from Featured."));
            renderRows();
          }
        })
      );

      listEl.querySelectorAll("[data-edit-id]").forEach((btn) =>
        btn.addEventListener("click", () => openResourceModal(btn.getAttribute("data-edit-id")))
      );

      listEl.querySelectorAll("[data-del-id]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del-id");
          if (!confirm(t("এই রিসোর্সটি মুছে ফেলবেন?", "Delete this resource?"))) return;
          const s = loadState();
          s.resources = s.resources.filter((r) => r.id !== id);
          saveState(s);
          showToast(t("রিসোর্স মুছে ফেলা হয়েছে।", "Resource deleted."));
          renderStudio();
        })
      );
    }

    document.getElementById("addResBtn")?.addEventListener("click", () => openResourceModal(null));
    const searchEl = document.getElementById("adminResSearch");
    searchEl?.addEventListener("input", () => {
      resQuery = searchEl.value;
      renderRows();
    });
    document.getElementById("adminResCat")?.addEventListener("change", (e) => {
      resCat = e.target.value;
      renderRows();
    });

    renderRows();
  }

  function renderPaymentsTab(panel, state, act, pendingPayments, bkashNumber) {
    panel.innerHTML = `
      <div class="vault-topbar">
        <div>
          <h1 style="font-size:26px;font-weight:800;">${t("বিকাশ সাপোর্ট ও রিভিউ", "bKash Supports & Reviews")}</h1>
          <p style="font-size:14px;color:var(--muted);">${t(`শুধুমাত্র বিকাশ (${bkashNumber}) স্টেটমেন্ট মিলিয়ে যাচাই করুন। যাচাই হলে সাপোর্টার স্লাইডারে দেখা যাবে।`, `Verify TrxIDs against bKash (${bkashNumber}) statement. Verified entries show in the supporters slider.`)}</p>
        </div>
      </div>

      <div class="two-col" style="margin-bottom:24px;">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">
            <h2 style="font-size:19px;font-weight:800;">${t("যাচাইয়ের অপেক্ষায়", "Pending Queue")}</h2>
            <span class="pill-status pending num">${formatNum(pendingPayments.length)}</span>
          </div>
          ${
            pendingPayments.length === 0
              ? `<p style="color:var(--muted);font-size:14px;">${t("কোনো অপেক্ষমাণ লেনদেন নেই।", "No pending bKash submissions.")}</p>`
              : `<div class="list-stack">
                  ${pendingPayments
                    .map(
                      (p, idx) => `<div class="list-item">
                        <div>
                          <span class="badge-free" style="margin-bottom:4px;display:inline-block;">${t("বিকাশ সাপোর্ট", "bKash Support")}</span>
                          <div style="font-weight:700;">${esc(p.name || t("নাম প্রকাশে অনিচ্ছুক", "Anonymous"))} · <span class="num" style="color:var(--red);">${formatTaka(p.amount)}</span></div>
                          <div style="font-size:12.5px;color:var(--muted);">bKash TrxID: <strong style="color:var(--ink);">${esc(p.trx_id)}</strong> · ${formatDate(p.created_at)}</div>
                          ${p.message ? `<p style="font-size:13px;color:var(--muted);margin-top:4px;">“${esc(p.message)}”</p>` : ""}
                        </div>
                        <div class="vault-actions">
                          <button type="button" class="btn btn-verify btn-sm" data-pay-ok="${idx}">✓ ${t("যাচাই", "Verify")}</button>
                          <button type="button" class="btn btn-danger btn-sm" data-pay-no="${idx}">✕ ${t("বাতিল", "Reject")}</button>
                        </div>
                      </div>`
                    )
                    .join("")}
                </div>`
          }
        </div>

        <div class="card card-yellow">
          <h2 style="font-size:19px;font-weight:800;margin-bottom:12px;">${t("ম্যানুয়াল সাপোর্টার ও রিভিউ যোগ করুন", "Add Verified Supporter / Review")}</h2>
          <form id="manualSupForm">
            <div class="vault-form-grid">
              <div class="field">
                <label>${t("নাম *", "Name *")}</label>
                <input id="msName" class="input" required placeholder="${t("সাপোর্টারের নাম", "Supporter name")}">
              </div>
              <div class="field">
                <label>${t("পরিমাণ (৳) *", "Amount (৳) *")}</label>
                <input id="msAmount" type="number" min="1" class="input" required value="50">
              </div>
            </div>
            <div class="field">
              <label>${t("রিভিউ বা বার্তা (ঐচ্ছিক)", "Review or quote (optional)")}</label>
              <textarea id="msMsg" class="textarea" style="min-height:80px;" placeholder="${t("সাপোর্টারের মতামত…", "Supporter feedback…")}"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">${t("স্লাইডারে প্রকাশ করুন", "Publish to Supporters Slider")}</button>
          </form>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">
          <h2 style="font-size:19px;font-weight:800;">${t("যাচাইকৃত সাপোর্টার তালিকা", "Verified Supporters")}</h2>
          <span class="badge-free num">${formatNum(state.supporters.length)} ${t("জন", "people")}</span>
        </div>
        ${
          state.supporters.length === 0
            ? `<p style="color:var(--muted);font-size:14px;">${t("এখনো কোনো যাচাইকৃত সাপোর্টার নেই। সাপোর্টার যোগ হলে পাবলিক সাইটে রিভিউ স্লাইডার চালু হবে।", "No verified supporters yet. Once added, the public reviews slider reveals automatically.")}</p>`
            : `<div class="list-stack" style="max-height:380px;">
                ${state.supporters
                  .map(
                    (s) => `<div class="list-item">
                      <div>
                        <div style="font-weight:700;">${esc(s.show_name && s.name ? s.name : t("নাম প্রকাশে অনিচ্ছুক", "Anonymous"))} ${s.amount ? `· <span class="num" style="color:var(--red);">${formatTaka(s.amount)}</span>` : ""}</div>
                        ${s.message ? `<p style="font-size:13.5px;color:var(--muted);margin-top:4px;">“${esc(s.message)}”</p>` : ""}
                        <div style="font-size:12px;color:var(--muted);margin-top:3px;">bKash · ${formatDate(s.created_at)}</div>
                      </div>
                      <button type="button" class="btn btn-danger btn-sm" data-del-sup="${esc(s.id)}" title="${t("মুছুন", "Remove")}">✕</button>
                    </div>`
                  )
                  .join("")}
              </div>`
        }
      </div>
    `;

    panel.querySelectorAll("[data-pay-ok]").forEach((b) =>
      b.addEventListener("click", () => verifyPayment(pendingPayments[Number(b.getAttribute("data-pay-ok"))], true))
    );
    panel.querySelectorAll("[data-pay-no]").forEach((b) =>
      b.addEventListener("click", () => verifyPayment(pendingPayments[Number(b.getAttribute("data-pay-no"))], false))
    );

    document.getElementById("manualSupForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const s = loadState();
      const name = document.getElementById("msName").value.trim();
      const amt = Math.max(1, Number(document.getElementById("msAmount").value) || 20);
      const msg = document.getElementById("msMsg").value.trim();
      s.supporters.unshift({
        id: `sup_${Date.now()}`,
        resource_id: null,
        name,
        show_name: true,
        message: msg || null,
        amount: amt,
        method: "bkash",
        created_at: new Date().toISOString(),
      });
      s.stats.verified_supporters_count = (Number(s.stats.verified_supporters_count) || 0) + 1;
      s.stats.total_support_amount = Math.round(((Number(s.stats.total_support_amount) || 0) + amt) * 10) / 10;
      saveState(s);
      showToast(t("সাপোর্টার ও রিভিউ প্রকাশিত হয়েছে!", "Supporter & review published!"));
      renderStudio();
    });

    panel.querySelectorAll("[data-del-sup]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-sup");
        const s = loadState();
        const item = s.supporters.find((x) => x.id === id);
        if (!item) return;
        s.supporters = s.supporters.filter((x) => x.id !== id);
        s.stats.verified_supporters_count = Math.max(0, (Number(s.stats.verified_supporters_count) || 0) - 1);
        if (item.amount) {
          s.stats.total_support_amount = Math.max(0, Math.round(((Number(s.stats.total_support_amount) || 0) - Number(item.amount)) * 10) / 10);
        }
        saveState(s);
        showToast(t("সাপোর্টার সরানো হয়েছে।", "Supporter removed."));
        renderStudio();
      })
    );
  }

  function renderInboxTab(panel, act) {
    const msgs = act.messages || [];
    panel.innerHTML = `
      <div class="vault-topbar">
        <div>
          <h1 style="font-size:26px;font-weight:800;">${t("ইনবক্স মেসেজ", "Contact Inbox")}</h1>
          <p style="font-size:14px;color:var(--muted);">${t("যোগাযোগ ফর্ম থেকে আসা মেসেজগুলো এখানে দেখুন।", "Private messages submitted from the Contact page.")}</p>
        </div>
      </div>

      <div class="card">
        ${
          msgs.length === 0
            ? `<p style="color:var(--muted);">${t("কোনো মেসেজ নেই।", "No contact messages yet.")}</p>`
            : `<div class="list-stack">
                ${msgs
                  .map(
                    (m) => `<div class="list-item">
                      <div>
                        <div style="font-weight:700;">${esc(m.name)} <span class="pill-status ${m.status === "resolved" ? "verified" : "pending"}" style="margin-left:6px;">${m.status === "resolved" ? t("সমাধান", "Resolved") : t("অপেক্ষমাণ", "Pending")}</span></div>
                        <div style="font-size:12.5px;color:var(--red);margin-top:2px;">
                          ${[m.email, m.whatsapp ? "WA: " + m.whatsapp : "", m.facebook ? "FB: " + m.facebook : ""].filter(Boolean).map(esc).join(" · ")}
                        </div>
                        <p style="font-size:14px;color:var(--ink);margin-top:6px;">${esc(m.body)}</p>
                        <div style="font-size:11.5px;color:var(--muted);margin-top:4px;">${formatDate(m.created_at)}</div>
                      </div>
                      <div class="vault-actions">
                        <button type="button" class="btn btn-verify btn-sm" data-msg-done="${esc(m.id)}">${m.status === "resolved" ? t("পুনরায় খুলুন", "Reopen") : "✓ " + t("সমাধান", "Resolve")}</button>
                        <button type="button" class="btn btn-danger btn-sm" data-msg-del="${esc(m.id)}">✕</button>
                      </div>
                    </div>`
                  )
                  .join("")}
              </div>`
        }
      </div>
    `;

    panel.querySelectorAll("[data-msg-done]").forEach((b) =>
      b.addEventListener("click", () => {
        const a = loadActivity();
        const m = (a.messages || []).find((x) => x.id === b.getAttribute("data-msg-done"));
        if (m) m.status = m.status === "resolved" ? "pending" : "resolved";
        saveActivity(a);
        renderStudio();
      })
    );
    panel.querySelectorAll("[data-msg-del]").forEach((b) =>
      b.addEventListener("click", () => {
        const a = loadActivity();
        a.messages = (a.messages || []).filter((x) => x.id !== b.getAttribute("data-msg-del"));
        saveActivity(a);
        renderStudio();
      })
    );
  }

  function renderSettingsTab(panel, state, bkashNumber) {
    panel.innerHTML = `
      <div class="vault-topbar">
        <div>
          <h1 style="font-size:26px;font-weight:800;">${t("সেটিংস, সিকিউরিটি ও এক্সপোর্ট", "Settings, Security & Export")}</h1>
          <p style="font-size:14px;color:var(--muted);">${t("বিকাশ নম্বর, হোমপেজ টেক্সট, পাসকোড এবং পার্মানেন্ট ডেটা এক্সপোর্ট নিয়ন্ত্রণ করুন।", "Manage bKash number, site copy, vault passcode, and static exports.")}</p>
        </div>
      </div>

      <div class="two-col" style="margin-bottom:22px;">
        <div class="card">
          <h2 style="font-size:19px;font-weight:800;margin-bottom:14px;">${t("বিকাশ ও সাইট সেটিংস", "bKash & Site Settings")}</h2>
          <form id="siteSettingsForm">
            <div class="field">
              <label>${t("বিকাশ Personal নম্বর (শুধুমাত্র বিকাশ) *", "bKash Personal Number (bKash Only) *")}</label>
              <input id="setBkash" class="input num" required pattern="[0-9+\\-\\s]{11,15}" value="${esc(bkashNumber)}" placeholder="01754441574">
            </div>
            <div class="field">
              <label>${t("সাপোর্ট প্রিসেট (কমা দিয়ে)", "Support presets (comma separated)")}</label>
              <input id="setSupPresets" class="input" value="${esc((state.settings.support_presets || [20, 50, 100]).join(", "))}">
            </div>
            <div class="vault-form-grid">
              <div class="field">
                <label>${t("হিরো শিরোনাম (বাংলা)", "Hero Title (BN)")}</label>
                <input id="setHeroBn" class="input" value="${esc(state.settings.hero?.title_bn || "")}">
              </div>
              <div class="field">
                <label>${t("হাইলাইট অংশ (বাংলা)", "Hero Accent (BN)")}</label>
                <input id="setAccentBn" class="input" value="${esc(state.settings.hero?.accent_bn || "")}">
              </div>
            </div>
            <div class="vault-form-grid">
              <div class="field">
                <label>${t("হিরো শিরোনাম (English)", "Hero Title (EN)")}</label>
                <input id="setHeroEn" class="input" value="${esc(state.settings.hero?.title_en || "")}">
              </div>
              <div class="field">
                <label>${t("হাইলাইট অংশ (English)", "Hero Accent (EN)")}</label>
                <input id="setAccentEn" class="input" value="${esc(state.settings.hero?.accent_en || "")}">
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">${t("সেটিংস সেভ করুন", "Save Site Settings")}</button>
          </form>
        </div>

        <div style="display:grid;gap:18px;">
          <div class="card card-yellow">
            <h2 style="font-size:19px;font-weight:800;margin-bottom:12px;">${t("অ্যাডমিন পাসকোড পরিবর্তন", "Change Owner Passcode")}</h2>
            <form id="changePassForm">
              <div class="field"><label>${t("বর্তমান পাসকোড *", "Current passcode *")}</label><input id="cpOld" type="password" class="input" required></div>
              <div class="field"><label>${t("নতুন পাসকোড (কমপক্ষে ৪ অক্ষর) *", "New passcode (min 4 chars) *")}</label><input id="cpNew" type="password" class="input" required minlength="4"></div>
              <div class="field"><label>${t("নতুন পাসকোড নিশ্চিত করুন *", "Confirm new passcode *")}</label><input id="cpConfirm" type="password" class="input" required minlength="4"></div>
              <button type="submit" class="btn btn-primary btn-sm" style="width:100%;">${t("পাসকোড আপডেট করুন", "Update Passcode")}</button>
            </form>
          </div>

          <div class="card">
            <h2 style="font-size:19px;font-weight:800;margin-bottom:8px;">${t("পার্মানেন্ট পাবলিশ ও ব্যাকআপ", "Permanent Publish & Backup")}</h2>
            <p style="font-size:13.5px;color:var(--muted);margin-bottom:14px;">
              ${t(
                "ব্রাউজারে করা সব পরিবর্তন সাথে সাথে পাবলিক সাইটে দেখা যাবে। স্থায়ীভাবে হোস্টিংয়ে আপডেট করতে data.js ডাউনলোড করে html/js/data.js ফাইলে রাখুন।",
                "Changes apply live in this browser right away. To deploy permanently to any static host, download data.js and replace html/js/data.js."
              )}
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button type="button" class="btn btn-primary btn-sm" id="expDataJsBtn">↓ ${t("data.js ডাউনলোড", "Download data.js")}</button>
              <button type="button" class="btn btn-outline btn-sm" id="expJsonBtn">↓ ${t("JSON ব্যাকআপ", "Export JSON")}</button>
              <label class="btn btn-outline btn-sm" style="cursor:pointer;">
                ↑ ${t("JSON ইমপোর্ট", "Import JSON")}
                <input type="file" id="impJsonInput" accept="application/json" style="display:none;">
              </label>
              <button type="button" class="btn btn-danger btn-sm" id="resetLocalBtn">${t("লোকাল রিসেট", "Reset Local")}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("siteSettingsForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const s = loadState();
      s.settings.pay = { bkash: document.getElementById("setBkash").value.trim() || "01754441574" };
      const parsedPresets = document
        .getElementById("setSupPresets")
        .value.split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => n > 0);
      if (parsedPresets.length >= 2) s.settings.support_presets = parsedPresets.slice(0, 3);
      s.settings.hero.title_bn = document.getElementById("setHeroBn").value.trim() || s.settings.hero.title_bn;
      s.settings.hero.accent_bn = document.getElementById("setAccentBn").value.trim() || s.settings.hero.accent_bn;
      s.settings.hero.title_en = document.getElementById("setHeroEn").value.trim() || s.settings.hero.title_en;
      s.settings.hero.accent_en = document.getElementById("setAccentEn").value.trim() || s.settings.hero.accent_en;
      saveState(s);
      showToast(t("সাইট সেটিংস সেভ হয়েছে!", "Site settings saved!"));
      renderStudio();
    });

    document.getElementById("changePassForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const oldP = document.getElementById("cpOld").value.trim();
      const newP = document.getElementById("cpNew").value.trim();
      const confP = document.getElementById("cpConfirm").value.trim();
      if (hashPasscode(oldP) !== getActiveHash()) {
        showToast(t("বর্তমান পাসকোড সঠিক নয়।", "Current passcode is incorrect."));
        return;
      }
      if (newP !== confP) {
        showToast(t("নতুন পাসকোড দুটি মেলেনি।", "New passcodes do not match."));
        return;
      }
      const nextHash = hashPasscode(newP);
      localStorage.setItem(STORAGE_HASH, nextHash);
      sessionStorage.setItem(SESSION_UNLOCK, nextHash);
      e.target.reset();
      showToast(t("পাসকোড সফলভাবে পরিবর্তন হয়েছে!", "Owner passcode updated!"));
    });

    document.getElementById("expDataJsBtn")?.addEventListener("click", () => {
      const s = loadState();
      const jsOut = `// Shikhi (shikhi.xyz) site catalog (exported from private Owner Studio)\nwindow.SHIKHI_DATA = ${JSON.stringify(s, null, 2)};\n`;
      downloadFile("data.js", jsOut, "application/javascript;charset=utf-8");
      showToast(t("data.js ডাউনলোড হয়েছে!", "Exported data.js!"));
    });

    document.getElementById("expJsonBtn")?.addEventListener("click", () => {
      downloadFile("shikhi-backup.json", JSON.stringify({ state: loadState(), activity: loadActivity() }, null, 2), "application/json");
      showToast(t("JSON ব্যাকআপ ডাউনলোড হয়েছে!", "JSON backup exported!"));
    });

    document.getElementById("impJsonInput")?.addEventListener("change", (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (parsed.state) localStorage.setItem(STORAGE_STATE, JSON.stringify(parsed.state));
          if (parsed.activity) localStorage.setItem(STORAGE_ACT, JSON.stringify(parsed.activity));
          showToast(t("ব্যাকআপ ইমপোর্ট সফল হয়েছে!", "Backup restored successfully!"));
          renderStudio();
        } catch {
          showToast(t("ভুল JSON ফাইল।", "Invalid JSON backup file."));
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("resetLocalBtn")?.addEventListener("click", () => {
      if (!confirm(t("ব্রাউজারে সেভ করা সব লোকাল পরিবর্তন রিসেট করবেন?", "Reset all local overrides back to base data.js?"))) return;
      localStorage.removeItem(STORAGE_STATE);
      showToast(t("লোকাল পরিবর্তন রিসেট হয়েছে।", "Local overrides cleared."));
      renderStudio();
    });
  }

  function boot() {
    if (sessionStorage.getItem(SESSION_UNLOCK) === getActiveHash()) {
      renderStudio();
    } else {
      renderLockScreen();
    }
  }

  boot();
})();
