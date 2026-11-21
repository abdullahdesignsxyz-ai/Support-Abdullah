(() => {
  const STORAGE_LANG = "mg_lang";
  const STORAGE_THEME = "shikhi_theme";
  const STORAGE_ACT = "mg_activity_v1";
  const STORAGE_STATE = "shikhi_site_state_v4";

  function getTheme() {
    return localStorage.getItem(STORAGE_THEME) === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    const tVal = theme === "dark" ? "dark" : "light";
    localStorage.setItem(STORAGE_THEME, tVal);
    document.documentElement.setAttribute("data-theme", tVal);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tVal === "dark" ? "#0b0b0d" : "#ffffff");
  }

  applyTheme(getTheme());

  function loadData() {
    const base = window.SHIKHI_DATA || {};
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

  const DATA = loadData();

  const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

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

  function formatNum(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    const formatted = n.toLocaleString("en-US", { maximumFractionDigits: 1 });
    if (getLang() === "en") return formatted;
    return formatted.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
  }

  function formatTaka(value) {
    return "৳" + formatNum(value);
  }

  function formatRelative(iso) {
    if (!iso) return "";
    const parsed = new Date(iso).getTime();
    const refNow = Math.max(Date.now(), new Date("2026-11-21T11:45:00+06:00").getTime());
    const diffMs = Math.max(0, refNow - parsed);
    const hrs = Math.floor(diffMs / 3600000);
    if (hrs < 1) return t("কিছুক্ষণ আগে", "Just now");
    if (hrs < 24) return t(`${formatNum(hrs)} ঘণ্টা আগে`, `${hrs}h ago`);
    const days = Math.floor(hrs / 24);
    if (days === 1) return t("গতকাল", "Yesterday");
    if (days < 30) return t(`${formatNum(days)} দিন আগে`, `${days}d ago`);
    return new Date(iso).toLocaleDateString(getLang() === "bn" ? "bn-BD" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const ACT_NAME_PREFIX = "__SHIKHI_ACT__:";
  let memActivity = null;

  function emptyActivity() {
    return { supports: [], donations: [], help_requests: [], messages: [], comments: [], downloads: {}, views: {} };
  }

  function readWindowNameActivity() {
    try {
      if (typeof window.name === "string" && window.name.startsWith(ACT_NAME_PREFIX)) {
        const parsed = JSON.parse(window.name.slice(ACT_NAME_PREFIX.length));
        if (parsed && typeof parsed === "object") return { ...emptyActivity(), ...parsed };
      }
    } catch {}
    return null;
  }

  function getActivity() {
    let lsAct = null;
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_ACT) || "null");
      if (raw && typeof raw === "object") lsAct = { ...emptyActivity(), ...raw };
    } catch {}

    // On file:// (where Safari/Firefox isolate localStorage per HTML file) or blocked storage, fall back to window.name
    if (location.protocol === "file:" || !lsAct) {
      const wnAct = readWindowNameActivity();
      if (wnAct && lsAct) {
        const merged = {
          ...lsAct,
          downloads: { ...(wnAct.downloads || {}), ...(lsAct.downloads || {}) },
          views: { ...(wnAct.views || {}), ...(lsAct.views || {}) },
        };
        for (const [k, v] of Object.entries(wnAct.downloads || {})) {
          merged.downloads[k] = Math.max(Number(merged.downloads[k]) || 0, Number(v) || 0);
        }
        for (const [k, v] of Object.entries(wnAct.views || {})) {
          merged.views[k] = Math.max(Number(merged.views[k]) || 0, Number(v) || 0);
        }
        memActivity = merged;
        return merged;
      }
      if (wnAct) {
        memActivity = wnAct;
        return wnAct;
      }
    }
    if (lsAct) {
      memActivity = lsAct;
      return lsAct;
    }
    return memActivity ? { ...emptyActivity(), ...memActivity } : emptyActivity();
  }

  function saveActivity(act) {
    const clean = { ...emptyActivity(), ...(act || {}) };
    memActivity = clean;
    try {
      localStorage.setItem(STORAGE_ACT, JSON.stringify(clean));
    } catch {}
    if (location.protocol === "file:" || (() => { try { return !localStorage.getItem(STORAGE_ACT); } catch { return true; } })()) {
      try {
        window.name = ACT_NAME_PREFIX + JSON.stringify(clean);
      } catch {}
    }
  }

  function getViewCount(res) {
    const act = getActivity();
    return (Number(res.views) || 0) + (Number(act.views?.[res.id]) || 0);
  }

  function getDownloadCount(res) {
    const act = getActivity();
    return (Number(res.downloads) || 0) + (Number(act.downloads?.[res.id]) || 0);
  }

  function syncLiveStats() {
    const act = getActivity();
    document.querySelectorAll("[data-dl-id]").forEach((el) => {
      const id = el.getAttribute("data-dl-id");
      const res = DATA.resources.find((x) => x.id === id);
      if (res) el.textContent = formatNum(getDownloadCount(res));
    });
    document.querySelectorAll("[data-vw-id]").forEach((el) => {
      const id = el.getAttribute("data-vw-id");
      const res = DATA.resources.find((x) => x.id === id);
      if (res) el.textContent = formatNum(getViewCount(res));
    });
    const homeDlEl = document.getElementById("homeTotalDlVal");
    if (homeDlEl) {
      const totalDl = DATA.resources.reduce((sum, r) => sum + getDownloadCount(r), 0);
      homeDlEl.textContent = formatNum(totalDl);
    }
    const homeSupEl = document.getElementById("homeTotalSupVal");
    if (homeSupEl) {
      const verifiedIds = new Set(DATA.supporters.map((x) => x.id));
      const localSupCount = (act.supports || []).filter((x) => !verifiedIds.has(x.id) && x.status !== "rejected").length;
      homeSupEl.textContent = formatNum((Number(DATA.stats.verified_supporters_count) || 0) + localSupCount);
    }
    const detStat = document.getElementById("detStatLine");
    if (detStat) {
      const rid = detStat.getAttribute("data-res-id");
      const res = DATA.resources.find((x) => x.id === rid);
      if (res) {
        detStat.textContent = `↓ ${formatNum(getDownloadCount(res))} ${t("ডাউনলোড", "downloads")} · 👁 ${formatNum(getViewCount(res))} ${t("ভিউ", "views")}`;
      }
    }
    const inStat = document.getElementById("resInsideStat");
    if (inStat) {
      const rid = inStat.getAttribute("data-res-id");
      const res = DATA.resources.find((x) => x.id === rid);
      if (res) {
        inStat.textContent = `↓ ${formatNum(getDownloadCount(res))} · 👁 ${formatNum(getViewCount(res))}`;
      }
    }
  }

  function recordView(resId) {
    const act = getActivity();
    act.views = act.views || {};
    act.views[resId] = (Number(act.views[resId]) || 0) + 1;
    saveActivity(act);
    syncLiveStats();
  }

  function recordDownload(resId) {
    const act = getActivity();
    act.downloads = act.downloads || {};
    act.downloads[resId] = (Number(act.downloads[resId]) || 0) + 1;
    saveActivity(act);
    syncLiveStats();
  }

  function showToast(msg) {
    let el = document.getElementById("mgToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "mgToast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(label || t("কপি হয়েছে!", "Copied!")),
        () => showToast(text)
      );
    } else {
      showToast(text);
    }
  }

  function categoryName(catId) {
    const c = DATA.categories.find((x) => x.id === catId);
    if (!c) return "";
    return t(c.name_bn, c.name_en);
  }

  function resourceBySlug(slug) {
    return DATA.resources.find((r) => r.slug === slug || r.id === slug);
  }

  /* ---------- Shared Header & Footer ---------- */
  const NAV_ITEMS = [
    { key: "resources", href: "resources.html", bn: "রিসোর্স", en: "Resources" },
    { key: "support", href: "support.html", bn: "সাপোর্ট", en: "Support" },
    { key: "about", href: "about.html", bn: "আমাদের কথা", en: "About" },
    { key: "contact", href: "contact.html", bn: "যোগাযোগ", en: "Contact" },
  ];

  let activeThemeVt = null;

  function renderShell(activeKey, onUpdate) {
    document.documentElement.lang = getLang();
    const isDark = getTheme() === "dark";
    const moonSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    const sunSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    const header = document.getElementById("siteHeader");
    const footer = document.getElementById("siteFooter");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="container header-inner">
          <a href="index.html" class="brand" aria-label="${t("শিখি, হোম", "Shikhi, home")}">
            <img src="assets/logo.svg" alt="" class="brand-logo" aria-hidden="true">
            <span>${t("শিখি", "Shikhi")}</span>
          </a>
          <nav class="nav-links" aria-label="${t("প্রধান মেনু", "Main")}">
            ${NAV_ITEMS.map(
              (n) => `<a href="${n.href}" class="${activeKey === n.key ? "active" : ""}">${t(n.bn, n.en)}</a>`
            ).join("")}
          </nav>
          <div class="header-actions">
            <button type="button" class="theme-toggle-btn" id="themeToggleBtn" aria-label="${isDark ? t("লাইট মোড", "Switch to light mode") : t("ডার্ক মোড", "Switch to dark mode")}" title="${isDark ? t("লাইট মোড", "Light mode") : t("ডার্ক মোড", "Dark mode")}">
              ${isDark ? sunSvg : moonSvg}
            </button>
            <button type="button" class="icon-btn" id="langToggleBtn" aria-label="${t("Switch to English", "বাংলায় দেখুন")}">
              ${getLang() === "bn" ? "EN" : "বাংলা"}
            </button>
            <a href="me.html" class="icon-btn header-me-btn ${activeKey === "me" ? "active" : ""}" title="${t("আমার কার্যক্রম", "My activity")}">
              ${t("আমার", "Me")}
            </a>
            <button type="button" class="mobile-menu-btn" id="mobileMenuBtn" aria-label="${t("মেনু", "Menu")}" aria-expanded="false">
              ☰
            </button>
          </div>
        </div>
      `;

      // Mount mobile/tablet drawer & backdrop directly on document.body (never inside backdrop-filter header!)
      let backdrop = document.getElementById("mobileNavBackdrop");
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.id = "mobileNavBackdrop";
        backdrop.className = "mobile-nav-backdrop";
        backdrop.setAttribute("aria-hidden", "true");
        document.body.appendChild(backdrop);
      }
      let mobileNav = document.getElementById("mobileNav");
      if (!mobileNav) {
        mobileNav = document.createElement("nav");
        mobileNav.id = "mobileNav";
        mobileNav.className = "mobile-nav";
        document.body.appendChild(mobileNav);
      }
      mobileNav.setAttribute("aria-label", t("মোবাইল মেনু", "Mobile menu"));
      mobileNav.innerHTML = `
        ${NAV_ITEMS.map(
          (n) => `<a href="${n.href}" class="${activeKey === n.key ? "active" : ""}"><span>${t(n.bn, n.en)}</span><span class="mnav-arrow">›</span></a>`
        ).join("")}
        <a href="founder.html" class="${activeKey === "founder" ? "active" : ""}"><span>${t("প্রতিষ্ঠাতা", "Founder")}</span><span class="mnav-arrow">›</span></a>
        <a href="me.html" class="${activeKey === "me" ? "active" : ""}"><span>${t("আমার কার্যক্রম", "My activity")}</span><span class="mnav-arrow">›</span></a>
      `;

      document.getElementById("themeToggleBtn")?.addEventListener("click", (e) => {
        const next = getTheme() === "dark" ? "light" : "dark";
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced && typeof document.startViewTransition === "function") {
          const btn = e.currentTarget;
          const rect = btn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const r = Math.hypot(
            Math.max(cx, window.innerWidth - cx),
            Math.max(cy, window.innerHeight - cy)
          );
          const rootEl = document.documentElement;
          rootEl.style.setProperty("--tx", `${cx}px`);
          rootEl.style.setProperty("--ty", `${cy}px`);
          rootEl.style.setProperty("--tr", `${Math.ceil(r)}px`);
          rootEl.classList.add("theme-transitioning");
          const vt = document.startViewTransition(() => {
            applyTheme(next);
            renderShell(activeKey, onUpdate);
          });
          activeThemeVt = vt;
          vt.finished.finally(() => {
            if (activeThemeVt === vt) rootEl.classList.remove("theme-transitioning");
          });
        } else {
          applyTheme(next);
          renderShell(activeKey, onUpdate);
        }
      });

      const langBtn = document.getElementById("langToggleBtn");
      langBtn?.addEventListener("click", () => {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        const doLang = () => {
          setLang(getLang() === "bn" ? "en" : "bn");
          renderShell(activeKey, onUpdate);
          if (typeof onUpdate === "function") onUpdate();
        };
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced && typeof document.startViewTransition === "function") {
          document.startViewTransition(doLang);
        } else {
          doLang();
        }
      });

      const menuBtn = document.getElementById("mobileMenuBtn");
      function setMenuOpen(open) {
        const nav = document.getElementById("mobileNav");
        const bd = document.getElementById("mobileNavBackdrop");
        const btn = document.getElementById("mobileMenuBtn");
        nav?.classList.toggle("open", open);
        bd?.classList.toggle("open", open);
        if (btn) {
          btn.setAttribute("aria-expanded", String(open));
          btn.textContent = open ? "✕" : "☰";
        }
        if (open) {
          document.body.style.overflow = "hidden";
        } else if (!document.querySelector(".modal-backdrop.open")) {
          document.body.style.overflow = "";
        }
      }
      menuBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        setMenuOpen(!document.getElementById("mobileNav")?.classList.contains("open"));
      });
      backdrop.onclick = () => setMenuOpen(false);
      if (!window._mgShellListeners) {
        window._mgShellListeners = true;
        document.addEventListener("click", (e) => {
          const nav = document.getElementById("mobileNav");
          const btn = document.getElementById("mobileMenuBtn");
          const bd = document.getElementById("mobileNavBackdrop");
          if (nav?.classList.contains("open") && !nav.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
            nav.classList.remove("open");
            bd?.classList.remove("open");
            if (btn) {
              btn.setAttribute("aria-expanded", "false");
              btn.textContent = "☰";
            }
            if (!document.querySelector(".modal-backdrop.open")) document.body.style.overflow = "";
          }
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            const nav = document.getElementById("mobileNav");
            const btn = document.getElementById("mobileMenuBtn");
            const bd = document.getElementById("mobileNavBackdrop");
            if (nav?.classList.contains("open")) {
              nav.classList.remove("open");
              bd?.classList.remove("open");
              if (btn) {
                btn.setAttribute("aria-expanded", "false");
                btn.textContent = "☰";
              }
              if (!document.querySelector(".modal-backdrop.open")) document.body.style.overflow = "";
            }
          }
        });
      }
    }

    // Native thumb-zone bottom navigation bar on mobile
    let tabBar = document.getElementById("mobileTabBar");
    if (!tabBar) {
      tabBar = document.createElement("nav");
      tabBar.id = "mobileTabBar";
      tabBar.className = "mobile-tabbar";
      document.body.appendChild(tabBar);
    }
    tabBar.setAttribute("aria-label", t("নিচের মেনু", "Bottom navigation"));
    const isRes = activeKey === "resources" || activeKey === "resource";
    tabBar.innerHTML = `
      <a href="index.html" class="tabbar-item ${activeKey === "home" ? "active" : ""}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-6h-4v6a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2z"/></svg>
        <span>${t("হোম", "Home")}</span>
      </a>
      <a href="resources.html" class="tabbar-item ${isRes ? "active" : ""}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        <span>${t("রিসোর্স", "Library")}</span>
      </a>
      <a href="support.html" class="tabbar-item ${activeKey === "support" ? "active" : ""}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <span>${t("সাপোর্ট", "Support")}</span>
      </a>
      <a href="me.html" class="tabbar-item ${activeKey === "me" ? "active" : ""}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span>${t("আমার", "Me")}</span>
      </a>
    `;

    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `
        <div class="container">
          <div class="footer-minimal">
            <div class="footer-brand-block">
              <a href="index.html" class="brand">
                <img src="assets/logo.svg" alt="" class="brand-logo" aria-hidden="true">
                <span>${t("শিখি", "Shikhi")}</span>
              </a>
              <p class="footer-tagline">${t("বই, গাইড, PDF ও AI টুল — সবার জন্য ফ্রি।", "Books, guides, PDFs & AI tools — free for everyone.")}</p>
            </div>
            <div class="footer-links-row">
              <a href="resources.html">${t("রিসোর্স", "Resources")}</a>
              <a href="support.html">${t("সাপোর্ট", "Support")}</a>
              <a href="about.html">${t("আমাদের কথা", "About")}</a>
              <a href="founder.html">${t("প্রতিষ্ঠাতা", "Founder")}</a>
              <a href="contact.html">${t("যোগাযোগ", "Contact")}</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© 2026 ${t("শিখি", "Shikhi")} · shikhi.xyz</span>
            <div class="footer-social-inline">
              <a href="${DATA.brand.social.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
              <a href="${DATA.brand.social.facebook}" target="_blank" rel="noopener">Facebook</a>
              <a href="${DATA.brand.social.youtube}" target="_blank" rel="noopener">YouTube</a>
            </div>
          </div>
        </div>
      `;
    }
  }

  /* ---------- Hero Circular Orbit Controller (1s Stop Per Post + Infinite Loop) ---------- */
  const heroState = { index: 0, query: "", paused: false, stopFn: null };

  function stopHeroTimer() {
    if (typeof heroState.stopFn === "function") {
      heroState.stopFn();
      heroState.stopFn = null;
    }
  }

  /* ---------- Resource Card & Modals ---------- */
  function renderResourceCard(r) {
    const title = t(r.title_bn, r.title_en);
    const dl = getDownloadCount(r);
    const views = getViewCount(r);
    return `
      <article class="res-card">
        <div class="res-thumb-wrap">
          <a href="resource.html?slug=${encodeURIComponent(r.slug)}" aria-label="${esc(title)}" style="display:block;width:100%;height:100%;">
            <img class="res-thumb" src="${esc(r.cover)}" alt="${esc(title)}" loading="lazy" decoding="async"
                 onerror="this.style.display='none'">
          </a>
        </div>
        <div class="res-body">
          <a href="resource.html?slug=${encodeURIComponent(r.slug)}">
            <h3 class="res-title">${esc(title)}</h3>
          </a>
          <div class="res-footer">
            <div class="res-meta num">
              <span class="res-stat-item" title="${t("ডাউনলোড", "Downloads")}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span data-dl-id="${esc(r.id)}">${formatNum(dl)}</span>
              </span>
              <span class="res-stat-item" title="${t("ভিউ", "Views")}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <span data-vw-id="${esc(r.id)}">${formatNum(views)}</span>
              </span>
            </div>
            <span class="badge-free">${esc((r.file_kind || "pdf").toUpperCase())}</span>
          </div>
        </div>
      </article>
    `;
  }

  function ensureModals() {
    if (document.getElementById("mgPreviewModal")) return;
    const html = `
      <div class="modal-backdrop" id="mgPreviewModal" role="dialog" aria-modal="true" aria-labelledby="pvTitle">
        <div class="modal-card">
          <button type="button" class="modal-close" data-close-modal="mgPreviewModal" aria-label="${t("বন্ধ করুন", "Close")}">✕</button>
          <div id="pvBody"></div>
        </div>
      </div>
      <div class="modal-backdrop" id="mgDownloadModal" role="dialog" aria-modal="true" aria-labelledby="dlTitle">
        <div class="modal-card">
          <button type="button" class="modal-close" data-close-modal="mgDownloadModal" aria-label="${t("বন্ধ করুন", "Close")}">✕</button>
          <div id="dlBody"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);

    document.addEventListener("click", (e) => {
      const closeTarget = e.target.closest("[data-close-modal]");
      if (closeTarget) {
        closeModal(closeTarget.getAttribute("data-close-modal"));
      }
      if (e.target.classList.contains("modal-backdrop")) {
        closeModal(e.target.id);
      }
      const pvBtn = e.target.closest("[data-preview-id]");
      if (pvBtn) {
        const res = DATA.resources.find((x) => x.id === pvBtn.getAttribute("data-preview-id"));
        if (res) openPreviewModal(res);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal("mgPreviewModal");
        closeModal("mgDownloadModal");
      }
    });
  }

  function enhanceDetailsAccordion(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll("details").forEach((det) => {
      if (det.dataset.smoothBound) return;
      det.dataset.smoothBound = "1";
      const summary = det.querySelector("summary");
      if (!summary || typeof det.animate !== "function") return;
      let anim = null;
      let isClosing = false;
      let isExpanding = false;

      summary.addEventListener("click", (e) => {
        e.preventDefault();
        const currentH = `${det.getBoundingClientRect().height}px`;
        if (anim) {
          anim.cancel();
          anim = null;
        }
        if (isClosing || !det.open) {
          isClosing = false;
          isExpanding = true;
          det.open = true;
          const endH = `${det.offsetHeight}px`;
          anim = det.animate(
            { height: [currentH, endH] },
            { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
          );
          anim.onfinish = () => {
            isExpanding = false;
            anim = null;
          };
          anim.oncancel = () => {
            isExpanding = false;
          };
        } else if (isExpanding || det.open) {
          isExpanding = false;
          isClosing = true;
          const cs = getComputedStyle(det);
          const extraY =
            (parseFloat(cs.borderTopWidth) || 0) +
            (parseFloat(cs.borderBottomWidth) || 0) +
            (parseFloat(cs.paddingTop) || 0) +
            (parseFloat(cs.paddingBottom) || 0);
          const endH = `${Math.ceil(summary.offsetHeight + extraY)}px`;
          anim = det.animate(
            { height: [currentH, endH] },
            { duration: 210, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
          );
          anim.onfinish = () => {
            det.open = false;
            isClosing = false;
            anim = null;
          };
          anim.oncancel = () => {
            isClosing = false;
          };
        }
      });
    });
  }

  let dlInterval = null;
  function showModalSmooth(modal) {
    if (!modal) return;
    document.body.style.overflow = "hidden";
    void modal.offsetHeight;
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("open");
    const anyOpen = document.querySelector(".modal-backdrop.open, #mobileNav.open");
    if (!anyOpen) document.body.style.overflow = "";
    if (id === "mgDownloadModal" && dlInterval) {
      clearInterval(dlInterval);
      dlInterval = null;
    }
  }

  function openPreviewModal(r) {
    ensureModals();
    recordView(r.id);
    const modal = document.getElementById("mgPreviewModal");
    const body = document.getElementById("pvBody");
    const title = t(r.title_bn, r.title_en);
    const desc = t(r.desc_bn, r.desc_en);
    body.innerHTML = `
      <span class="badge-kind" style="margin-bottom:10px;display:inline-block;">${esc(categoryName(r.category_id))} · ${esc(r.file_kind.toUpperCase())}</span>
      <h2 id="pvTitle" style="font-size:22px;font-weight:800;line-height:1.25;margin-bottom:12px;padding-right:40px;">${esc(title)}</h2>
      <div style="border-radius:14px;overflow:hidden;border:1px solid var(--border);background:var(--surface-tint);margin-bottom:14px;padding:8px;">
        <img src="${esc(r.cover)}" alt="${esc(title)}" style="width:100%;max-height:260px;object-fit:contain;margin-inline:auto;border-radius:10px;">
      </div>
      <p style="white-space:pre-line;font-size:14.5px;color:var(--muted);margin-bottom:18px;max-height:180px;overflow-y:auto;">${esc(desc)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;">
        <span class="num" style="font-weight:700;color:var(--red-deep);">↓ ${formatNum(getDownloadCount(r))} ${t("ডাউনলোড · ফ্রি", "downloads · Free")}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="resource.html?slug=${encodeURIComponent(r.slug)}" class="btn btn-outline btn-sm">${t("বিস্তারিত দেখুন", "Full details")}</a>
          <button type="button" class="btn btn-primary btn-sm" id="pvDownloadBtn">${t("ডাউনলোড করুন", "Download")} →</button>
        </div>
      </div>
    `;
    document.getElementById("pvDownloadBtn").addEventListener("click", () => {
      closeModal("mgPreviewModal");
      openDownloadDrawer(r);
    });
    showModalSmooth(modal);
  }

  function openDownloadDrawer(r) {
    ensureModals();
    const modal = document.getElementById("mgDownloadModal");
    const body = document.getElementById("dlBody");
    const sl = DATA.settings.short_link;
    let remaining = sl.seconds || 20;
    const total = remaining;
    const circ = 2 * Math.PI * 35;

    let countedThisDrawer = false;
    function recordDlOnce() {
      if (countedThisDrawer) return;
      countedThisDrawer = true;
      recordDownload(r.id);
    }

    function bindDownloadTrack(el) {
      if (!el) return;
      el.addEventListener("click", recordDlOnce);
      el.addEventListener("auxclick", recordDlOnce);
      el.addEventListener("contextmenu", recordDlOnce);
    }

    body.innerHTML = `
      <h2 id="dlTitle" style="font-size:21px;font-weight:800;margin-bottom:6px;padding-right:36px;">${esc(t(sl.title_bn, sl.title_en))}</h2>
      <p style="font-size:14px;color:var(--muted);margin-bottom:16px;">${esc(t(sl.body_bn, sl.body_en))}</p>
      <div class="card card-yellow" style="text-align:center;padding:18px;">
        <div class="countdown-ring">
          <svg viewBox="0 0 84 84">
            <circle cx="42" cy="42" r="35" fill="none" stroke="rgba(215,25,32,0.22)" stroke-width="6"/>
            <circle id="dlRing" cx="42" cy="42" r="35" fill="none" stroke="var(--red)" stroke-width="6" stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="0"/>
          </svg>
          <span class="ring-num num" id="dlCount">${formatNum(remaining)}</span>
        </div>
        <div id="dlReadyBox" style="margin-top:8px;">
          <p style="font-size:13.5px;color:var(--red-deep);font-weight:600;margin-bottom:10px;">
            ${t("ডাউনলোড লিংক তৈরি হচ্ছে…", "Preparing download link…")}
          </p>
          <div class="dl-modal-actions">
            <a href="${esc(r.download_url)}" target="_blank" rel="noopener" id="dlSkipBtn" class="btn btn-outline btn-sm">
              ${t("এখনই খুলুন", "Open now")} ↗
            </a>
            <a href="support.html?resource=${encodeURIComponent(r.id)}" class="btn btn-yellow btn-sm">
              ${t("সাপোর্ট করুন", "Support Shikhi")}
            </a>
          </div>
        </div>
      </div>
    `;

    bindDownloadTrack(document.getElementById("dlSkipBtn"));
    showModalSmooth(modal);

    clearInterval(dlInterval);
    dlInterval = setInterval(() => {
      remaining -= 1;
      const ring = document.getElementById("dlRing");
      const numEl = document.getElementById("dlCount");
      const readyBox = document.getElementById("dlReadyBox");
      if (!ring || !numEl || !readyBox) {
        clearInterval(dlInterval);
        dlInterval = null;
        return;
      }

      if (remaining > 0) {
        numEl.textContent = formatNum(remaining);
        ring.style.strokeDashoffset = String(circ * (1 - remaining / total));
      } else {
        clearInterval(dlInterval);
        dlInterval = null;
        numEl.textContent = "✓";
        ring.style.strokeDashoffset = String(circ);
        recordDlOnce();
        readyBox.innerHTML = `
          <p style="font-size:14.5px;color:var(--red-deep);font-weight:700;margin-bottom:12px;">
            ${t("আপনার ফাইল ডাউনলোডের জন্য প্রস্তুত!", "Your file is ready to download!")}
          </p>
          <div class="dl-modal-actions">
            <a href="${esc(r.download_url)}" target="_blank" rel="noopener" id="dlGoBtn" class="btn btn-primary">
              ${t("Google Drive থেকে নিন", "Download on Google Drive")} ↗
            </a>
            <a href="support.html?resource=${encodeURIComponent(r.id)}" class="btn btn-yellow">
              ${t("পাশে থাকুন (ঐচ্ছিক)", "Support (optional)")}
            </a>
          </div>
        `;
        bindDownloadTrack(document.getElementById("dlGoBtn"));
      }
    }, 1000);
  }

  /* ---------- Support Widget (bKash Only · Step Card) ---------- */
  function mountSupportForm(containerId, opts = {}) {
    const root = document.getElementById(containerId);
    if (!root) return;
    const presets = (DATA.settings.support_presets || [20, 50, 100]).slice(0, 3);
    let selectedAmount = presets[0] || 20;
    let customMode = false;
    const draft = {
      target: opts.resourceId || "",
      trx: "",
      name: "",
      showName: true,
      msg: "",
      optOpen: Boolean(opts.resourceId),
    };

    const bkashNum = () => DATA.settings.pay?.bkash || "01754441574";

    function updateDynamicTotals() {
      const payNum = bkashNum();
      const step2El = document.getElementById("payStep2Title");
      const numEl = document.getElementById("payNumText");
      const btnEl = document.getElementById("paySubmitBtn");
      if (step2El) {
        step2El.textContent = t(
          `এই নম্বরে ${formatTaka(selectedAmount)} Send Money করুন`,
          `Send Money ${formatTaka(selectedAmount)} to this number`
        );
      }
      if (numEl) numEl.textContent = payNum;
      if (btnEl) {
        btnEl.textContent = t(`${formatTaka(selectedAmount)} সাপোর্ট জমা দিন`, `Submit ${formatTaka(selectedAmount)} support`);
      }
    }

    function captureDraft() {
      const tEl = document.getElementById("supTarget");
      const trxEl = document.getElementById("trxInput");
      const nameEl = document.getElementById("supName");
      const showEl = document.getElementById("showNameCheck");
      const msgEl = document.getElementById("supMsg");
      const optEl = document.getElementById("optDetailsBox");
      if (tEl) draft.target = tEl.value;
      if (trxEl) draft.trx = trxEl.value;
      if (nameEl) draft.name = nameEl.value;
      if (showEl) draft.showName = showEl.checked;
      if (msgEl) draft.msg = msgEl.value;
      if (optEl) draft.optOpen = optEl.open;
    }

    function renderForm(showSuccessNotice = false) {
      const resourceOpts = DATA.resources
        .map((r) => `<option value="${esc(r.id)}" ${draft.target === r.id ? "selected" : ""}>${esc(t(r.title_bn, r.title_en))}</option>`)
        .join("");

      root.innerHTML = `
        <form id="mgPayForm">
          <div class="field">
            <div class="step-row-title">
              <span class="step-badge num">${formatNum(1)}</span>
              <span>${t("কত দেবেন", "Choose amount")}</span>
            </div>
            <div class="seg-track" role="radiogroup" style="--seg-count:${presets.length + 1};">
              <span class="seg-slider" id="segSlider" style="--seg-idx:${customMode ? presets.length : Math.max(0, presets.indexOf(selectedAmount))};" aria-hidden="true"></span>
              ${presets
                .map(
                  (amt, idx) => `<button type="button" class="seg-btn num ${!customMode && selectedAmount === amt ? "active" : ""}" data-amt="${amt}" data-seg-i="${idx}">${formatTaka(amt)}</button>`
                )
                .join("")}
              <button type="button" class="seg-btn ${customMode ? "active" : ""}" data-amt="custom" data-seg-i="${presets.length}">${t("অন্য", "Other")}</button>
            </div>
            <div class="custom-amt-wrap ${customMode ? "open" : ""}" id="customAmtWrap">
              <div class="custom-amt-inner">
                <input type="number" inputmode="numeric" min="1" id="customAmtInput" class="input" ${customMode ? "" : "disabled tabindex=\"-1\""} value="${selectedAmount}" placeholder="${t("পরিমাণ লিখুন (৳)", "Enter amount (৳)")}">
              </div>
            </div>
          </div>

          <div class="field">
            <div class="step-row-title">
              <span class="step-badge num">${formatNum(2)}</span>
              <span id="payStep2Title"></span>
            </div>
            <div class="bkash-bar">
              <span class="bkash-brand">
                <img src="assets/bkash.svg" alt="bKash" class="bkash-logo-img">
              </span>
              <span class="bkash-tag">Send Money</span>
            </div>
            <div class="pay-box">
              <div>
                <div style="font-size:12.5px;font-weight:700;color:var(--muted);">bKash · Personal</div>
                <div id="payNumText" class="pay-number num"></div>
              </div>
              <button type="button" class="copy-pill-btn" id="copyPayBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <span>${t("কপি", "Copy")}</span>
              </button>
            </div>
          </div>

          <div class="field">
            <div class="step-row-title">
              <span class="step-badge num">${formatNum(3)}</span>
              <label for="trxInput" style="margin:0;cursor:pointer;">${t("SMS থেকে Transaction ID দিন", "Transaction ID from SMS")}</label>
            </div>
            <input id="trxInput" class="input" required minlength="4" autocapitalize="characters" autocomplete="off" spellcheck="false" value="${esc(draft.trx)}" placeholder="${t("যেমন 8N4K2XA9QD", "e.g. 8N4K2XA9QD")}">
          </div>

          <details class="opt-details" id="optDetailsBox" ${draft.optOpen ? "open" : ""}>
            <summary>
              <span class="opt-caret">⌄</span>
              <span>${t("নাম ও রিভিউ যোগ করুন (ঐচ্ছিক)", "Add name & review (optional)")}</span>
            </summary>
            <div class="opt-panel">
              <div class="field">
                <label for="supTarget">${t("কিসের জন্য সাপোর্ট", "Supporting")}</label>
                <select id="supTarget" class="select-input" style="width:100%;">
                  <option value="">${t("প্রজেক্ট সাপোর্ট (সাধারণ)", "Project support (General)")}</option>
                  ${resourceOpts}
                </select>
              </div>
              <div class="field">
                <label for="supName">${t("আপনার নাম", "Your name")}</label>
                <input id="supName" class="input" autocomplete="name" value="${esc(draft.name)}" placeholder="${t("খালি রাখলে 'নাম প্রকাশে অনিচ্ছুক' থাকবে", "Leave blank to stay Anonymous")}">
                <label class="check-row" style="margin-top:8px;">
                  <input type="checkbox" id="showNameCheck" ${draft.showName ? "checked" : ""}>
                  <span>${t("সাপোর্টার স্লাইডারে আমার নাম দেখান", "Show my name on supporters slider")}</span>
                </label>
              </div>
              <div class="field" style="margin-bottom:0;">
                <label for="supMsg">${t("আপনার রিভিউ বা কিছু কথা", "Your review or short note")}</label>
                <textarea id="supMsg" class="textarea" style="min-height:72px;" placeholder="${t("শিখি সম্পর্কে আপনার মতামত বা রিভিউ লিখুন…", "Share your review or feedback…")}">${esc(draft.msg)}</textarea>
              </div>
            </div>
          </details>

          <button type="submit" id="paySubmitBtn" class="btn btn-primary" style="width:100%;height:50px;font-size:15.5px;"></button>
          ${
            showSuccessNotice
              ? `<div class="inline-notice">
                  <span>✓ ${t("সাপোর্ট ও রিভিউ সংরক্ষিত হয়েছে!", "Support & review saved!")}</span>
                  <a href="me.html" class="link-underline">${t("আমার সাপোর্ট দেখুন", "View in My support")} →</a>
                </div>`
              : ""
          }
        </form>
      `;

      updateDynamicTotals();

      const segSlider = document.getElementById("segSlider");
      const customWrap = document.getElementById("customAmtWrap");
      const customInput = document.getElementById("customAmtInput");
      const segBtns = [...root.querySelectorAll("[data-amt]")];
      let focusTimer = null;

      segBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const val = btn.getAttribute("data-amt");
          const idx = Number(btn.getAttribute("data-seg-i") || 0);
          segBtns.forEach((b) => b.classList.toggle("active", b === btn));
          if (segSlider) segSlider.style.setProperty("--seg-idx", String(idx));
          clearTimeout(focusTimer);
          if (val === "custom") {
            customMode = true;
            if (customInput) {
              customInput.disabled = false;
              customInput.removeAttribute("tabindex");
              customInput.value = String(selectedAmount);
            }
            customWrap?.classList.add("open");
            focusTimer = setTimeout(() => {
              if (customMode && customInput) {
                try { customInput.focus({ preventScroll: true }); } catch { customInput.focus(); }
              }
            }, 250);
          } else {
            customMode = false;
            selectedAmount = Number(val);
            customWrap?.classList.remove("open");
            if (customInput) {
              customInput.disabled = true;
              customInput.setAttribute("tabindex", "-1");
            }
          }
          updateDynamicTotals();
        });
      });

      enhanceDetailsAccordion(root);

      customInput?.addEventListener("input", () => {
        selectedAmount = Math.max(1, Number(customInput.value) || 1);
        updateDynamicTotals();
      });
      customInput?.addEventListener("blur", () => {
        if (customMode) customInput.value = String(selectedAmount);
      });

      document.getElementById("copyPayBtn")?.addEventListener("click", () => {
        const payNum = bkashNum();
        copyText(payNum, t(`বিকাশ নম্বর ${payNum} কপি হয়েছে!`, `Copied bKash ${payNum}!`));
      });

      document.getElementById("mgPayForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        captureDraft();
        const trx = draft.trx.trim();
        if (trx.length < 4) {
          showToast(t("সঠিক bKash Transaction ID দিন", "Please enter a valid bKash Transaction ID"));
          return;
        }
        const name = draft.name.trim();
        const act = getActivity();
        const entry = {
          id: `sup_${Date.now()}`,
          amount: selectedAmount,
          method: "bkash",
          trx_id: trx.toUpperCase(),
          name: name || t("নাম প্রকাশে অনিচ্ছুক", "Anonymous"),
          show_name: Boolean(name) && draft.showName,
          message: draft.msg.trim(),
          resource_id: draft.target || null,
          status: "pending",
          created_at: new Date().toISOString(),
        };
        act.supports.unshift(entry);
        saveActivity(act);
        draft.trx = "";
        draft.msg = "";
        showToast(t("ধন্যবাদ! আপনার বিকাশ সাপোর্ট জমা হয়েছে।", "Thank you! Your bKash support is saved."));
        if (typeof opts.onSubmitted === "function") opts.onSubmitted(entry);
        renderForm(true);
      });
    }

    renderForm();
  }

  /* ---------- Supporters & Reviews Slider Loop (Hidden When Empty, Appears Automatically On Support) ---------- */
  const supShowcaseState = { paused: false, observers: {} };

  function mountSupportersShowcase(containerId, opts = {}) {
    const mount = document.getElementById(containerId);
    if (!mount) return;
    if (supShowcaseState.observers[containerId]) {
      try { supShowcaseState.observers[containerId].disconnect(); } catch {}
      delete supShowcaseState.observers[containerId];
    }
    const sectionWrap = opts.sectionId ? document.getElementById(opts.sectionId) : null;

    const act = getActivity();
    const verifiedIds = new Set(DATA.supporters.map((s) => s.id));
    const localPending = (act.supports || []).filter((s) => !verifiedIds.has(s.id) && s.status !== "rejected");
    const merged = [...localPending, ...DATA.supporters];
    const count = (Number(DATA.stats.verified_supporters_count) || 0) + localPending.length;

    // Empty state -> keep completely hidden until someone supports!
    if (merged.length === 0) {
      mount.innerHTML = "";
      mount.hidden = true;
      if (sectionWrap) sectionWrap.hidden = true;
      return;
    }

    mount.hidden = false;
    if (sectionWrap) sectionWrap.hidden = false;

    function buildSlideCard(item, idx) {
      const displayName = item.show_name && item.name ? item.name : t("নাম প্রকাশে অনিচ্ছুক", "Anonymous");
      const initial = Array.from(displayName)[0] || "★";
      const resObj = item.resource_id ? DATA.resources.find((r) => r.id === item.resource_id) : null;
      const targetLabel = resObj ? t(resObj.title_bn, resObj.title_en) : t("প্রজেক্ট সাপোর্ট", "Project support");
      return `
        <div class="sup-slide-card">
          <div>
            <div class="sup-slide-top">
              <span class="sup-avatar ${idx % 2 === 1 ? "yellow" : ""}">${esc(initial)}</span>
              <div style="min-width:0;">
                <div style="font-weight:800;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(displayName)}</div>
                <div style="font-size:12px;font-weight:700;color:var(--red);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(targetLabel)}</div>
              </div>
            </div>
            <p style="font-size:13.5px;color:var(--muted);margin-top:10px;line-height:1.5;">
              ${item.message ? `“${esc(item.message)}”` : t("শিখির পাশে থেকেছেন বিকাশ সাপোর্টের মাধ্যমে।", "Supported Shikhi via bKash.")}
            </p>
          </div>
          <div class="sup-slide-foot">
            <span style="display:inline-flex;align-items:center;gap:6px;">
              <img src="assets/bkash.svg" alt="bKash" class="bkash-mini-logo">
              <span>${formatRelative(item.created_at)}</span>
            </span>
            <span class="pill-status ${item.status === "pending" ? "pending" : "verified"}">
              ${item.status === "pending" ? t("যাচাই চলছে", "Pending") : t("যাচাইকৃত", "Verified")}
            </span>
          </div>
        </div>
      `;
    }

    let baseSlides = merged.slice(0, 24);
    while (baseSlides.length < 6) {
      baseSlides = [...baseSlides, ...baseSlides];
    }
    const loopSlides = [...baseSlides, ...baseSlides];

    mount.innerHTML = `
      <div class="sup-showcase-head">
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <h2 style="font-size:22px;font-weight:800;">${t("যারা পাশে আছেন ও রিভিউ", "Supporters & Reviews")}</h2>
            <span class="badge-free num">${formatNum(count)} ${t("জন", "people")}</span>
          </div>
          <p style="font-size:13.5px;color:var(--muted);margin-top:2px;">
            ${t("যারা বিকাশে সাপোর্ট করেছেন আর যা বললেন।", "Everyone supporting via bKash and what they shared.")}
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="${esc(containerId)}_pauseBtn">
            ${supShowcaseState.paused ? `▶ ${t("চালু করুন", "Play")}` : `⏸ ${t("বিরতি", "Pause")}`}
          </button>
          ${
            opts.showCta
              ? `<a href="support.html" class="btn btn-primary btn-sm">${t("পাশে থাকুন", "Support now")} →</a>`
              : ""
          }
        </div>
      </div>

      <div class="sup-slider-shell ${supShowcaseState.paused ? "paused" : ""}" id="${esc(containerId)}_slider">
        <div class="sup-marquee-track" style="animation-duration:${Math.max(20, baseSlides.length * 4.5)}s;">
          ${loopSlides.map((item, i) => buildSlideCard(item, i)).join("")}
        </div>
      </div>
    `;

    document.getElementById(`${containerId}_pauseBtn`)?.addEventListener("click", () => {
      supShowcaseState.paused = !supShowcaseState.paused;
      const sh = document.getElementById(`${containerId}_slider`);
      sh?.classList.toggle("paused", supShowcaseState.paused);
      const pb = document.getElementById(`${containerId}_pauseBtn`);
      if (pb) pb.textContent = supShowcaseState.paused ? `▶ ${t("চালু করুন", "Play")}` : `⏸ ${t("বিরতি", "Pause")}`;
    });

    const sliderEl = document.getElementById(`${containerId}_slider`);
    if (typeof IntersectionObserver === "function" && sliderEl) {
      const obs = new IntersectionObserver(
        (entries) => {
          sliderEl.classList.toggle("offscreen-paused", entries[0]?.isIntersecting === false);
        },
        { threshold: 0.02 }
      );
      obs.observe(sliderEl);
      supShowcaseState.observers[containerId] = obs;
    }
  }

  /* ---------- Page Controllers ---------- */
  function pageHome() {
    document.title = t("শিখি · shikhi.xyz", "Shikhi · Free Library");
    const heroMount = document.getElementById("heroMount");
    const statsMount = document.getElementById("statsMount");
    const featuredMount = document.getElementById("featuredMount");
    const catMount = document.getElementById("homeCatMount");
    const recentMount = document.getElementById("recentMount");
    const ctaMount = document.getElementById("homeCtaMount");

    const h = DATA.settings.hero;
    // Pick up to 6 unique resources for 60fps 3D Open-Book Page-Turn Showcase
    const seenIds = new Set();
    const bookPicks = [];
    for (const r of [...DATA.resources.slice(0, 3), ...DATA.resources.filter((x) => x.featured), ...DATA.resources]) {
      if (r && !seenIds.has(r.id)) {
        seenIds.add(r.id);
        bookPicks.push(r);
        if (bookPicks.length >= 6) break;
      }
    }
    const N = bookPicks.length;
    if (heroState.index >= N) heroState.index = 0;

    // Pre-decode all showcase covers so every 60fps page turn has zero image decode stutter
    bookPicks.forEach((item) => {
      const pre = new Image();
      pre.src = item.cover;
      if (typeof pre.decode === "function") pre.decode().catch(() => {});
    });

    const initRightIdx = heroState.index;
    const initLeftIdx = (heroState.index - 1 + N) % N;
    const initRight = bookPicks[initRightIdx] || bookPicks[0];
    const initLeft = bookPicks[initLeftIdx] || initRight;

    function buildSlotsHtml(activeIdx) {
      return bookPicks
        .map(
          (item, i) => `<img class="book-slot-img ${i === activeIdx ? "active" : ""}" data-slot="${i}" src="${esc(item.cover)}" alt="" decoding="async">`
        )
        .join("");
    }

    heroMount.innerHTML = `
      <div class="hero-bento">
          <div class="hero-left">
            <div>
              <h1 class="hero-title">
                ${esc(t(h.title_bn, h.title_en))}<br>
                <span class="brush-accent">${esc(t(h.accent_bn, h.accent_en))}</span>
              </h1>
              <p class="hero-body" style="margin-top:10px;">${esc(t(h.body_bn, h.body_en))}</p>
            </div>

            <form class="hero-search-form" id="heroSearchForm" role="search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#D71920" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input id="heroSearchInput" type="search" value="${esc(heroState.query)}" placeholder="${t("বই, গাইড বা Skill খুঁজুন…", "Search books, guides…")}" aria-label="${t("রিসোর্স খুঁজুন", "Search resources")}">
              <button type="submit" class="btn btn-primary btn-sm">${t("খুঁজুন", "Search")}</button>
            </form>

            <div class="hero-quick-tags">
              <a href="resources.html?q=ChatGPT" class="hero-tag-chip">
                <img src="assets/logos/chatgpt.svg" alt="" class="ai-tag-logo" aria-hidden="true">
                <span>ChatGPT</span>
              </a>
              <a href="resources.html?q=AI" class="hero-tag-chip">
                <img src="assets/logos/gemini.svg" alt="" class="ai-tag-logo" aria-hidden="true">
                <span>Gemini</span>
              </a>
              <a href="resources.html?q=Claude" class="hero-tag-chip">
                <img src="assets/logos/claude.svg" alt="" class="ai-tag-logo" aria-hidden="true">
                <span>Claude</span>
              </a>
            </div>

            <div class="hero-ctas">
              <a href="resources.html" class="btn btn-primary">${t("রিসোর্স দেখুন", "Browse library")} →</a>
              <a href="support.html" class="btn btn-yellow">${t("সাপোর্ট করুন", "Support")}</a>
            </div>
          </div>

          <div class="hero-book-box" id="heroBookBox">
            <div class="hero-book-scene" id="heroBookScene" tabindex="0" aria-label="${t("রিসোর্স বই প্রিভিউ — সোয়াইপ করে পাতা উল্টান", "Interactive resource book — swipe or use arrow keys to turn pages")}">
              <div class="book-body">
                <div class="book-stack-left" aria-hidden="true"></div>
                <div class="book-stack-right" aria-hidden="true"></div>

                <button type="button" class="book-page book-page-left" id="bookLeftPage" aria-label="${esc(initLeft ? t(initLeft.title_bn, initLeft.title_en) : "")}">
                  ${buildSlotsHtml(initLeftIdx)}
                  <div class="book-gutter-left" aria-hidden="true"></div>
                  <div class="book-cast-shadow book-cast-left" id="bookCastLeft" aria-hidden="true"></div>
                </button>

                <button type="button" class="book-page book-page-right" id="bookRightPage" aria-label="${esc(initRight ? t(initRight.title_bn, initRight.title_en) : "")}">
                  ${buildSlotsHtml(initRightIdx)}
                  <div class="book-gutter-right" aria-hidden="true"></div>
                  <div class="book-cast-shadow book-cast-right" id="bookCastRight" aria-hidden="true"></div>
                </button>

                <div class="book-spine" aria-hidden="true"></div>

                <div class="book-leaf" id="bookLeaf" aria-hidden="true">
                  <div class="book-leaf-face book-leaf-front" id="bookLeafFront">
                    ${buildSlotsHtml(initRightIdx)}
                    <div class="book-gutter-right"></div>
                    <div class="book-leaf-shade" id="bookFrontShade"></div>
                    <div class="book-leaf-sheen" id="bookFrontSheen"></div>
                  </div>
                  <div class="book-leaf-face book-leaf-back" id="bookLeafBack">
                    ${buildSlotsHtml(initRightIdx)}
                    <div class="book-gutter-left"></div>
                    <div class="book-leaf-shade" id="bookBackShade"></div>
                    <div class="book-leaf-sheen" id="bookBackSheen"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    `;

    stopHeroTimer();

    const boxEl = document.getElementById("heroBookBox");
    const sceneEl = document.getElementById("heroBookScene");
    const leftPageBtn = document.getElementById("bookLeftPage");
    const rightPageBtn = document.getElementById("bookRightPage");
    const leafEl = document.getElementById("bookLeaf");
    const leafFrontEl = document.getElementById("bookLeafFront");
    const leafBackEl = document.getElementById("bookLeafBack");

    const leftSlots = [...(leftPageBtn?.querySelectorAll(".book-slot-img") || [])];
    const rightSlots = [...(rightPageBtn?.querySelectorAll(".book-slot-img") || [])];
    const leafFrontSlots = [...(leafFrontEl?.querySelectorAll(".book-slot-img") || [])];
    const leafBackSlots = [...(leafBackEl?.querySelectorAll(".book-slot-img") || [])];

    function setActiveSlot(slots, activeIdx) {
      for (let i = 0; i < slots.length; i++) {
        slots[i].classList.toggle("active", i === activeIdx);
      }
    }

    const FIRST_HOLD_MS = 550;
    const HOLD_MS = 1150;
    const TURN_FALLBACK_MS = 920;

    let alive = true;
    let hovered = false;
    let inView = true;
    let turning = false;
    let hasTurnedOnce = false;
    let holdTimer = 0;
    let turnFallbackTimer = 0;
    let pendingState = null;
    let suppressClickUntil = 0;
    let bookObserver = null;

    function syncPageLabels() {
      if (N === 0) return;
      const rItem = bookPicks[heroState.index];
      const lItem = bookPicks[(heroState.index - 1 + N) % N];
      if (leftPageBtn && lItem) leftPageBtn.setAttribute("aria-label", t(lItem.title_bn, lItem.title_en));
      if (rightPageBtn && rItem) rightPageBtn.setAttribute("aria-label", t(rItem.title_bn, rItem.title_en));
    }

    function scheduleNextTurn(delayOverride) {
      clearTimeout(holdTimer);
      if (!alive || N <= 1 || hovered || !inView || heroState.paused || document.hidden) return;
      const waitMs = typeof delayOverride === "number" ? delayOverride : (hasTurnedOnce ? HOLD_MS : FIRST_HOLD_MS);
      holdTimer = setTimeout(() => {
        if (alive && !hovered && inView && !heroState.paused && !document.hidden) startTurn(1);
      }, waitMs);
    }

    function commitTurn() {
      clearTimeout(turnFallbackTimer);
      if (pendingState) {
        if (pendingState.settledSide === "left") {
          setActiveSlot(leftSlots, pendingState.settledIdx);
        } else {
          setActiveSlot(rightSlots, pendingState.settledIdx);
        }
        heroState.index = pendingState.nextIdx;
        pendingState = null;
      }
      sceneEl?.classList.remove("is-turning-fwd", "is-turning-bwd");
      turning = false;
      hasTurnedOnce = true;
      syncPageLabels();
    }

    function startTurn(dir = 1) {
      if (!alive || N <= 1 || !sceneEl || !leafEl) return;
      clearTimeout(holdTimer);
      if (turning) commitTurn();

      const forward = dir > 0;
      let leafIdx, nextIdx, settledSide;
      if (forward) {
        leafIdx = heroState.index;
        nextIdx = (heroState.index + 1) % N;
        settledSide = "left";
        setActiveSlot(leafFrontSlots, leafIdx);
        setActiveSlot(leafBackSlots, leafIdx);
        setActiveSlot(rightSlots, nextIdx);
      } else {
        const prevIdx = (heroState.index - 1 + N) % N;
        const prevLeftIdx = (prevIdx - 1 + N) % N;
        leafIdx = prevIdx;
        nextIdx = prevIdx;
        settledSide = "right";
        setActiveSlot(leafFrontSlots, leafIdx);
        setActiveSlot(leafBackSlots, leafIdx);
        setActiveSlot(leftSlots, prevLeftIdx);
      }

      turning = true;
      pendingState = { nextIdx, settledSide, settledIdx: leafIdx };

      sceneEl.classList.remove("is-turning-fwd", "is-turning-bwd");
      void leafEl.offsetWidth;
      sceneEl.classList.add(forward ? "is-turning-fwd" : "is-turning-bwd");

      clearTimeout(turnFallbackTimer);
      turnFallbackTimer = setTimeout(() => {
        if (!alive || !turning) return;
        commitTurn();
        scheduleNextTurn();
      }, TURN_FALLBACK_MS);
    }

    leafEl?.addEventListener("animationend", (e) => {
      if (e.target !== leafEl || !alive || !turning) return;
      commitTurn();
      scheduleNextTurn();
    });

    if (N > 0) {
      leftPageBtn?.addEventListener("click", () => {
        if (Date.now() < suppressClickUntil) return;
        const target = bookPicks[(heroState.index - 1 + N) % N];
        if (target) navigateSmooth(`resource.html?slug=${encodeURIComponent(target.slug)}`);
      });
      rightPageBtn?.addEventListener("click", () => {
        if (Date.now() < suppressClickUntil) return;
        const target = bookPicks[heroState.index];
        if (target) navigateSmooth(`resource.html?slug=${encodeURIComponent(target.slug)}`);
      });
    }

    const onVisChange = () => {
      if (document.hidden) {
        clearTimeout(holdTimer);
      } else if (!turning) {
        scheduleNextTurn();
      }
    };

    if (N > 1) {
      // Pause on hover ONLY for real mouse pointers (touchscreens NEVER get stuck hovered!)
      boxEl?.addEventListener("pointerenter", (e) => {
        if (e.pointerType !== "mouse") return;
        hovered = true;
        clearTimeout(holdTimer);
      });
      boxEl?.addEventListener("pointerleave", (e) => {
        if (e.pointerType !== "mouse") return;
        hovered = false;
        if (!turning) scheduleNextTurn();
      });
      sceneEl?.addEventListener("focus", () => {
        if (sceneEl.matches(":focus-visible")) {
          hovered = true;
          clearTimeout(holdTimer);
        }
      });
      sceneEl?.addEventListener("blur", () => {
        if (hovered) {
          hovered = false;
          if (!turning) scheduleNextTurn();
        }
      });
      document.addEventListener("visibilitychange", onVisChange);
      if (typeof IntersectionObserver === "function" && boxEl) {
        bookObserver = new IntersectionObserver(
          (entries) => {
            inView = entries[0]?.isIntersecting !== false;
            if (!inView) {
              clearTimeout(holdTimer);
            } else if (!turning) {
              scheduleNextTurn();
            }
          },
          { threshold: 0.01, rootMargin: "80px 0px" }
        );
        bookObserver.observe(boxEl);
      }

      sceneEl?.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          startTurn(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          startTurn(-1);
        }
      });

      // Reliable swipe on BOTH iOS/Android touchscreens AND desktop mouse drag
      let swipeX = 0;
      let swipeY = 0;
      let swipeActive = false;
      let usedTouch = false;

      sceneEl?.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        usedTouch = true;
        swipeX = e.touches[0].clientX;
        swipeY = e.touches[0].clientY;
        swipeActive = true;
      }, { passive: true });
      sceneEl?.addEventListener("touchend", (e) => {
        if (!swipeActive || !e.changedTouches.length) return;
        swipeActive = false;
        const dx = e.changedTouches[0].clientX - swipeX;
        const dy = e.changedTouches[0].clientY - swipeY;
        if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) {
          suppressClickUntil = Date.now() + 340;
          startTurn(dx < 0 ? 1 : -1);
        }
      }, { passive: true });
      sceneEl?.addEventListener("touchcancel", () => { swipeActive = false; }, { passive: true });

      sceneEl?.addEventListener("pointerdown", (e) => {
        if (usedTouch || e.pointerType === "touch" || (e.button && e.button !== 0)) return;
        swipeX = e.clientX;
        swipeY = e.clientY;
        swipeActive = true;
      });
      sceneEl?.addEventListener("pointerup", (e) => {
        if (usedTouch || e.pointerType === "touch" || !swipeActive) return;
        swipeActive = false;
        const dx = e.clientX - swipeX;
        const dy = e.clientY - swipeY;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.1) {
          suppressClickUntil = Date.now() + 260;
          startTurn(dx < 0 ? 1 : -1);
        }
      });
      sceneEl?.addEventListener("pointercancel", () => { swipeActive = false; });

      scheduleNextTurn(FIRST_HOLD_MS);
    }

    heroState.stopFn = () => {
      alive = false;
      clearTimeout(holdTimer);
      clearTimeout(turnFallbackTimer);
      sceneEl?.classList.remove("is-turning-fwd", "is-turning-bwd");
      bookObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisChange);
    };

    const heroSearchInput = document.getElementById("heroSearchInput");
    heroSearchInput?.addEventListener("input", () => {
      heroState.query = heroSearchInput.value;
    });
    document.getElementById("heroSearchForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = heroSearchInput?.value.trim() || "";
      navigateSmooth(q ? `resources.html?q=${encodeURIComponent(q)}` : "resources.html");
    });

    const act = getActivity();
    const verifiedIds = new Set(DATA.supporters.map((x) => x.id));
    const localSupCount = (act.supports || []).filter((x) => !verifiedIds.has(x.id) && x.status !== "rejected").length;
    const totalSupporters = (Number(DATA.stats.verified_supporters_count) || 0) + localSupCount;
    const totalDl = DATA.resources.reduce((sum, r) => sum + getDownloadCount(r), 0);

    statsMount.innerHTML = `
      <div class="stat-metric">
        <div class="stat-val num">${formatNum(DATA.resources.length)}</div>
        <div class="stat-label">${t("রিসোর্স", "Resources")}</div>
      </div>
      <div class="stat-metric">
        <div class="stat-val num">${formatNum(DATA.categories.length)}</div>
        <div class="stat-label">${t("ক্যাটাগরি", "Categories")}</div>
      </div>
      <div class="stat-metric">
        <div class="stat-val num" id="homeTotalDlVal">${formatNum(totalDl)}</div>
        <div class="stat-label">${t("ডাউনলোড", "Downloads")}</div>
      </div>
      <a href="support.html" class="stat-metric">
        <div class="stat-val num" id="homeTotalSupVal">${formatNum(totalSupporters)}</div>
        <div class="stat-label">${t("সাপোর্টার", "Supporters")}</div>
      </a>
    `;

    // Featured
    document.getElementById("featuredHeading").textContent = t("বাছাই করা রিসোর্স", "Featured resources");
    document.getElementById("featuredAllLink").textContent = t("সব দেখুন", "View all") + " →";
    const featured = DATA.resources.filter((r) => r.featured).slice(0, 4);
    featuredMount.innerHTML = featured.map(renderResourceCard).join("");

    // Categories (show only populated categories on public home for a clean minimalist strip)
    catMount.innerHTML = DATA.categories
      .map((c) => ({ c, count: DATA.resources.filter((r) => r.category_id === c.id).length }))
      .filter(({ count }) => count > 0)
      .map(
        ({ c, count }) => `<a href="resources.html?c=${encodeURIComponent(c.slug)}" class="cat-pill">
          <span>${esc(t(c.name_bn, c.name_en))}</span>
          <span class="count num">${formatNum(count)}</span>
        </a>`
      )
      .join("");

    // Recent
    document.getElementById("recentHeading").textContent = t("নতুন যোগ হয়েছে", "Recently added");
    const recLink = document.getElementById("recentAllLink");
    if (recLink) recLink.textContent = t("সব দেখুন", "View all") + " →";
    recentMount.innerHTML = DATA.resources.slice(0, 8).map(renderResourceCard).join("");

    // Supporters & Reviews Slider (Hidden while empty, reveals automatically when someone supports)
    mountSupportersShowcase("homeSupportersMount", { sectionId: "homeSupportersSection", showCta: true });

    // Minimal Bottom CTA
    ctaMount.innerHTML = `
      <div class="cta-banner">
        <div>
          <h2>${t("আমাদের পাশে থাকুন", "Support Us")}</h2>
          <p>${t(
            "সব রিসোর্স ফ্রি — ভালো লাগলে বিকাশে পে করে পাশে থাকতে পারেন।",
            "Every resource is free — if you like it, you can support us via bKash."
          )}</p>
        </div>
        <a href="support.html" class="btn btn-primary">${t("বিকাশে সাপোর্ট করুন", "Support via bKash")} →</a>
      </div>
    `;
  }

  const resState = { activeCat: "all", searchQuery: "", sortBy: "newest", kindFilter: "all", bound: false };
  function pageResources() {
    document.title = t("রিসোর্স · শিখি", "Resources · Shikhi");
    const params = new URLSearchParams(location.search);
    if (!resState.bound) {
      const rawCat = params.get("c") || "all";
      const matchedCat = DATA.categories.find((c) => c.slug === rawCat || c.id === rawCat);
      resState.activeCat = matchedCat ? matchedCat.slug : rawCat;
      resState.searchQuery = params.get("q") || "";
    }

    const headMount = document.getElementById("resPageHead");
    const catMount = document.getElementById("resCatMount");
    const gridMount = document.getElementById("resGridMount");
    const countMount = document.getElementById("resCountMount");
    const searchInput = document.getElementById("resSearchInput");
    const searchClear = document.getElementById("resSearchClear");
    const sortSelect = document.getElementById("resSortSelect");
    const kindSelect = document.getElementById("resKindSelect");

    function renderHead() {
      headMount.innerHTML = `
        <h1 class="page-title">${t("সব", "All")} <span class="brush-accent">${t("রিসোর্স", "resources")}</span></h1>
        <p class="section-sub">${t(
          "বই, PDF, গাইড ও AI টুল — একদম ফ্রি।",
          "Books, PDFs, guides & AI tools — completely free."
        )}</p>
      `;
      searchInput.placeholder = t("রিসোর্স খুঁজুন…", "Search resources…");
      searchInput.setAttribute("aria-label", t("রিসোর্স খুঁজুন", "Search resources"));
      sortSelect.setAttribute("aria-label", t("সাজান", "Sort by"));
      kindSelect.setAttribute("aria-label", t("ফরম্যাট", "Format"));
      sortSelect.innerHTML = `
        <option value="newest" ${resState.sortBy === "newest" ? "selected" : ""}>${t("নতুন আগে", "Newest first")}</option>
        <option value="downloads" ${resState.sortBy === "downloads" ? "selected" : ""}>${t("বেশি ডাউনলোড", "Most downloaded")}</option>
        <option value="name" ${resState.sortBy === "name" ? "selected" : ""}>${t("নাম অনুযায়ী", "By name")}</option>
      `;
      kindSelect.innerHTML = `
        <option value="all" ${resState.kindFilter === "all" ? "selected" : ""}>${t("সব ফরম্যাট", "All formats")}</option>
        <option value="pdf" ${resState.kindFilter === "pdf" ? "selected" : ""}>PDF</option>
        <option value="zip" ${resState.kindFilter === "zip" ? "selected" : ""}>ZIP / Skill</option>
      `;
      searchClear?.classList.toggle("visible", Boolean(resState.searchQuery));
    }

    function renderCats() {
      const visibleCats = DATA.categories
        .map((c) => ({ c, cnt: DATA.resources.filter((r) => r.category_id === c.id).length }))
        .filter(({ c, cnt }) => cnt > 0 || resState.activeCat === c.slug || resState.activeCat === c.id);

      catMount.innerHTML = `
        <button type="button" class="cat-pill ${resState.activeCat === "all" ? "active" : ""}" data-cat="all">
          <span>${t("সব", "All")}</span>
          <span class="count num">${formatNum(DATA.resources.length)}</span>
        </button>
        ${visibleCats
          .map(({ c, cnt }) => {
            const isAct = resState.activeCat === c.slug || resState.activeCat === c.id;
            return `<button type="button" class="cat-pill ${isAct ? "active" : ""} ${cnt === 0 ? "empty" : ""}" data-cat="${esc(c.slug)}">
              <span>${esc(t(c.name_bn, c.name_en))}</span>
              <span class="count num">${formatNum(cnt)}</span>
            </button>`;
          })
          .join("")}
      `;
      catMount.querySelectorAll("[data-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const nextCat = btn.getAttribute("data-cat");
          if (resState.activeCat === nextCat) return;
          resState.activeCat = nextCat;
          catMount.querySelectorAll("[data-cat]").forEach((b) =>
            b.classList.toggle("active", b.getAttribute("data-cat") === resState.activeCat)
          );
          renderGrid(true);
        });
      });
      const activePill = catMount.querySelector(".cat-pill.active");
      if (activePill && resState.activeCat !== "all" && catMount.scrollWidth > catMount.clientWidth) {
        catMount.scrollLeft = Math.max(0, activePill.offsetLeft - 16);
      }
    }

    function renderGrid(animate = true) {
      const catObj = DATA.categories.find((c) => c.slug === resState.activeCat || c.id === resState.activeCat);
      const q = resState.searchQuery.trim().toLowerCase();

      let list = DATA.resources.filter((r) => {
        if (catObj && r.category_id !== catObj.id) return false;
        if (resState.kindFilter !== "all" && r.file_kind !== resState.kindFilter) return false;
        if (q) {
          const hay = `${r.title_bn} ${r.title_en} ${r.desc_bn} ${r.desc_en}`.toLowerCase();
          if (q === "ai") {
            if (!/\b(ai|gpt|chatgpt|claude|gemini|prompt)\b/i.test(hay)) return false;
          } else if (!hay.includes(q)) {
            return false;
          }
        }
        return true;
      });

      if (resState.sortBy === "downloads") {
        list.sort((a, b) => getDownloadCount(b) - getDownloadCount(a));
      } else if (resState.sortBy === "name") {
        list.sort((a, b) => t(a.title_bn, a.title_en).localeCompare(t(b.title_bn, b.title_en)));
      } else {
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      catMount.querySelectorAll("[data-cat]").forEach((b) =>
        b.classList.toggle("active", b.getAttribute("data-cat") === resState.activeCat)
      );

      countMount.textContent = t(`${formatNum(list.length)} টি রিসোর্স`, `${list.length} resources`);
      if (list.length === 0) {
        gridMount.innerHTML = `
          <div class="card card-yellow" style="grid-column:1/-1;text-align:center;padding:clamp(26px,5vw,42px);">
            <p style="font-weight:700;font-size:18px;margin-bottom:10px;">${t("কোনো রিসোর্স পাওয়া যায়নি", "No matching resources found")}</p>
            <button type="button" class="btn btn-primary btn-sm" id="resetFilterBtn">${t("ফিল্টার রিসেট করুন", "Reset filters")}</button>
          </div>
        `;
        document.getElementById("resetFilterBtn")?.addEventListener("click", () => {
          resState.activeCat = "all";
          resState.searchQuery = "";
          resState.kindFilter = "all";
          resState.sortBy = "newest";
          searchInput.value = "";
          renderHead();
          renderCats();
          renderGrid(true);
        });
      } else {
        gridMount.innerHTML = list.map(renderResourceCard).join("");
        if (animate) {
          gridMount.querySelectorAll(".res-card").forEach((card, i) => {
            card.style.setProperty("--stagger", `${Math.min(i, 7) * 18}ms`);
            card.classList.add("reveal-in");
          });
        }
      }
    }

    searchInput.value = resState.searchQuery;
    if (!resState.bound) {
      resState.bound = true;
      searchInput.addEventListener("input", () => {
        resState.searchQuery = searchInput.value;
        searchClear?.classList.toggle("visible", Boolean(resState.searchQuery));
        renderGrid(false);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (searchInput.value) {
            resState.searchQuery = "";
            searchInput.value = "";
            searchClear?.classList.remove("visible");
            renderGrid(false);
          } else {
            searchInput.blur();
          }
        }
      });
      searchClear?.addEventListener("click", () => {
        resState.searchQuery = "";
        searchInput.value = "";
        searchClear.classList.remove("visible");
        searchInput.focus();
        renderGrid(false);
      });
      sortSelect.addEventListener("change", () => {
        resState.sortBy = sortSelect.value;
        renderGrid(true);
      });
      kindSelect.addEventListener("change", () => {
        resState.kindFilter = kindSelect.value;
        renderGrid(true);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          searchInput.focus();
        }
      });
    }

    renderHead();
    renderCats();
    renderGrid(true);
  }

  let viewedSlug = null;
  const resBookState = { slug: null, isOpen: true, timerId: 0, layerTimerId: 0 };

  function stopResBookAnim() {
    clearTimeout(resBookState.timerId);
    clearTimeout(resBookState.layerTimerId);
  }

  function pageResourceDetail() {
    stopResBookAnim();
    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");
    const r = resourceBySlug(slug) || DATA.resources[0];
    const root = document.getElementById("resourceDetailRoot");
    if (!r) return;

    const isFreshOpen = resBookState.slug !== r.id;
    resBookState.slug = r.id;

    if (viewedSlug !== r.id) {
      viewedSlug = r.id;
      recordView(r.id);
    }

    const title = t(r.title_bn, r.title_en);
    document.title = `${title} · ${t("শিখি", "Shikhi")}`;
    const desc = t(r.desc_bn, r.desc_en);
    const dl = getDownloadCount(r);
    const views = getViewCount(r);
    const act = getActivity();
    const localComments = (act.comments || []).filter((c) => c.resource_id === r.id);
    const verifiedIds = new Set(DATA.supporters.map((s) => s.id));
    const relSupporters = [
      ...act.supports.filter((s) => s.resource_id === r.id && !verifiedIds.has(s.id) && s.status !== "rejected"),
      ...DATA.supporters.filter((s) => s.resource_id === r.id),
    ];
    const related = DATA.resources.filter((x) => x.id !== r.id && x.category_id === r.category_id).slice(0, 4);

    root.innerHTML = `
      <div style="margin-bottom:20px;">
        <a href="resources.html" class="link-underline">← ${t("সব রিসোর্স", "All resources")}</a>
      </div>
      <div class="two-col">
        <div>
          <div class="res-book-wrap ${!isFreshOpen && resBookState.isOpen ? "is-open no-anim" : ""}" id="resBookWrap">
            <div class="res-book-scene" id="resBookScene" tabindex="0" role="button" aria-label="${t("বই খুলুন বা বন্ধ করুন", "Open or close book preview")}">
              <div class="res-book-body" id="resBookBody">
                <div class="res-book-edges-left" aria-hidden="true"></div>
                <div class="res-book-edges-right" aria-hidden="true"></div>

                <div class="res-book-page-right">
                  <div class="res-inside-paper">
                    <div class="res-inside-top">
                      <span class="badge-kind">${esc(categoryName(r.category_id))}</span>
                      <span class="res-inside-format">${esc(r.file_kind.toUpperCase())} · ${t("ফ্রি", "FREE")}</span>
                    </div>
                    <h2 class="res-inside-title">${esc(title)}</h2>
                    <div class="res-inside-rule"></div>
                    <p class="res-inside-excerpt">${esc(desc)}</p>
                    <div class="res-inside-foot">
                      <span class="res-inside-brand">
                        <img src="assets/logo.svg" alt="" aria-hidden="true">
                        <span>${t("শিখি", "Shikhi")}</span>
                      </span>
                      <span id="resInsideStat" data-res-id="${esc(r.id)}" class="num">↓ ${formatNum(dl)} · 👁 ${formatNum(views)}</span>
                    </div>
                  </div>
                  <div class="book-gutter-right" aria-hidden="true"></div>
                  <div class="book-cast-shadow book-cast-right" id="resBookCastRight" aria-hidden="true"></div>
                </div>

                <div class="res-book-cover-leaf" id="resBookCoverLeaf">
                  <div class="res-cover-face res-cover-front">
                    <img id="resBookFrontImg" src="${esc(r.cover)}" alt="${esc(title)}" decoding="sync" fetchpriority="high">
                    <div class="res-cover-spine-crease" aria-hidden="true"></div>
                    <div class="book-leaf-shade" id="resCoverFrontShade"></div>
                    <div class="book-leaf-sheen" id="resCoverFrontSheen"></div>
                  </div>
                  <div class="res-cover-face res-cover-inside">
                    <div class="res-inside-left-plate">
                      <img src="${esc(r.cover)}" alt="${esc(title)}" decoding="sync" fetchpriority="high">
                    </div>
                    <div class="book-gutter-left" aria-hidden="true"></div>
                    <div class="book-leaf-shade" id="resCoverBackShade"></div>
                    <div class="book-leaf-sheen" id="resCoverBackSheen"></div>
                  </div>
                </div>

                <div class="book-spine res-book-spine" id="resBookSpine" aria-hidden="true"></div>
              </div>
            </div>

            <div class="res-book-bar">
              <button type="button" class="res-book-toggle" id="resBookToggleBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span id="resBookToggleText"></span>
              </button>
              <span class="res-book-hint">${t("ট্যাপ বা সোয়াইপ করে বই খুলুন / বন্ধ করুন", "Tap or swipe book to open / close")}</span>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;">
            <span class="badge-kind">${esc(categoryName(r.category_id))}</span>
            <span class="badge-free">${esc(r.file_kind.toUpperCase())} · ${t("ফ্রি", "FREE")}</span>
            <span id="detStatLine" data-res-id="${esc(r.id)}" class="num" style="font-size:13.5px;font-weight:700;color:var(--muted);">↓ ${formatNum(dl)} ${t("ডাউনলোড", "downloads")} · 👁 ${formatNum(views)} ${t("ভিউ", "views")}</span>
          </div>
          <h1 class="page-title" style="font-size:clamp(24px,3.6vw,42px);margin-bottom:14px;">${esc(title)}</h1>
          <div class="card" style="margin-bottom:20px;">
            <p style="white-space:pre-line;font-size:15.5px;color:var(--ink);">${esc(desc)}</p>
          </div>
          <div class="detail-actions">
            <button type="button" class="btn btn-primary detail-btn-main" id="detDownloadBtn">${t("ফ্রি ডাউনলোড করুন", "Download Free")} ↓</button>
            <a href="support.html?resource=${encodeURIComponent(r.id)}" class="btn btn-yellow">${t("সাপোর্ট করুন", "Support")}</a>
            <button type="button" class="btn btn-outline" id="detShareBtn">${t("শেয়ার / লিংক", "Share link")}</button>
          </div>

          <div class="card">
            <h2 style="font-size:20px;font-weight:800;margin-bottom:10px;">${t("মন্তব্য ও মতামত", "Comments & feedback")}</h2>
            <form id="resCommentForm" style="margin-bottom:16px;">
              <div class="field"><input id="cmName" class="input" autocomplete="name" required placeholder="${t("আপনার নাম", "Your name")}"></div>
              <div class="field"><textarea id="cmBody" class="textarea" required style="min-height:80px;" placeholder="${t("এই রিসোর্সটি কেমন লাগল?", "Share your thoughts on this resource…")}"></textarea></div>
              <button type="submit" class="btn btn-primary btn-sm">${t("মন্তব্য যোগ করুন", "Post comment")}</button>
            </form>
            <div class="list-stack" style="max-height:280px;">
              ${
                localComments.length === 0
                  ? `<p style="color:var(--muted);font-size:14px;">${t("এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যটি আপনিই করুন!", "No comments yet. Be the first to share feedback!")}</p>`
                  : localComments
                      .map(
                        (c) => `<div class="list-item"><div><strong>${esc(c.name)}</strong><p style="font-size:14px;color:var(--muted);margin-top:4px;">${esc(c.body)}</p></div><span style="font-size:12px;color:var(--muted);">${formatRelative(c.created_at)}</span></div>`
                      )
                      .join("")
              }
            </div>
          </div>
        </div>

        <aside class="card">
          <h2 style="font-size:20px;font-weight:800;margin-bottom:4px;">${t("যারা সাপোর্ট করেছেন", "Supporters")}</h2>
          <p style="font-size:13.5px;color:var(--muted);margin-bottom:14px;">
            ${t(`${formatNum(relSupporters.length)} জন সাম্প্রতিক সাপোর্টার`, `${relSupporters.length} recent supporters`)}
          </p>
          <div class="list-stack">
            ${
              relSupporters.length === 0
                ? `<p style="color:var(--muted);font-size:14px;">${t("এই রিসোর্সের প্রথম সাপোর্টার হতে পারেন আপনিই।", "You can be the first to support this resource.")}</p>`
                : relSupporters
                    .slice(0, 30)
                    .map(
                      (s) => `<div class="list-item">
                        <div>
                          <div style="font-weight:700;">${esc(s.show_name && s.name ? s.name : t("নাম প্রকাশে অনিচ্ছুক", "Anonymous"))}</div>
                          ${s.message ? `<p style="font-size:13.5px;color:var(--muted);margin-top:4px;">“${esc(s.message)}”</p>` : ""}
                        </div>
                        <div style="text-align:right;flex-shrink:0;">
                          <span class="pill-method">${esc(s.method)}</span>
                          <div style="font-size:11.5px;color:var(--muted);margin-top:4px;">${formatRelative(s.created_at)}</div>
                        </div>
                      </div>`
                    )
                    .join("")
            }
          </div>
        </aside>
      </div>
      ${
        related.length
          ? `<div style="margin-top:48px;">
              <div class="section-head">
                <h2 class="section-title">${t("আরও রিসোর্স", "Related resources")}</h2>
                <a href="resources.html" class="link-underline">${t("সব দেখুন", "View all")} →</a>
              </div>
              <div class="resource-grid">${related.map(renderResourceCard).join("")}</div>
            </div>`
          : ""
      }
    `;

    // 60fps GPU-Native Book Opening Controller (CSS Compositor Transition + CSS Keyframes — bulletproof on phones & PC)
    const bookWrap = document.getElementById("resBookWrap");
    const bookScene = document.getElementById("resBookScene");
    const toggleBtn = document.getElementById("resBookToggleBtn");
    const toggleText = document.getElementById("resBookToggleText");

    let suppressTapUntil = 0;
    let autoOpenDone = false;

    function updateBookToggleUI(isOpenNow) {
      resBookState.isOpen = isOpenNow;
      if (toggleText) {
        toggleText.textContent = isOpenNow
          ? t("কভার বন্ধ করুন", "Close cover")
          : t("বই খুলুন", "Open book");
      }
      bookScene?.setAttribute("aria-expanded", String(isOpenNow));
    }

    function setBookOpen(nextOpen) {
      autoOpenDone = true;
      clearTimeout(resBookState.timerId);
      clearTimeout(resBookState.layerTimerId);
      const want = Boolean(nextOpen);
      if (!bookWrap) return;
      bookWrap.classList.remove("no-anim");
      if (bookWrap.classList.contains("is-open") === want) {
        updateBookToggleUI(want);
        return;
      }
      bookWrap.classList.remove("fx-open", "fx-close");
      void bookWrap.offsetWidth;
      bookWrap.classList.add("is-animating", want ? "fx-open" : "fx-close");
      bookWrap.classList.toggle("is-open", want);
      updateBookToggleUI(want);
      resBookState.layerTimerId = setTimeout(() => {
        bookWrap.classList.remove("is-animating", "fx-open", "fx-close");
      }, 1020);
    }

    if (isFreshOpen) {
      updateBookToggleUI(true);
      const frontImg = document.getElementById("resBookFrontImg");
      const triggerOpen = () => {
        if (autoOpenDone) return;
        clearTimeout(resBookState.timerId);
        if (document.getElementById("resBookWrap") === bookWrap) {
          requestAnimationFrame(() => {
            if (!autoOpenDone) setBookOpen(true);
          });
        }
      };
      // Wait for main's 240ms page-enter + cover image decode so opening has ZERO flash/glitch!
      const minWait = new Promise((res) => { resBookState.timerId = setTimeout(res, 290); });
      const imgReady = frontImg && typeof frontImg.decode === "function"
        ? Promise.race([frontImg.decode().catch(() => {}), new Promise((res) => setTimeout(res, 260))])
        : Promise.resolve();
      Promise.all([minWait, imgReady]).then(triggerOpen);
    } else {
      updateBookToggleUI(resBookState.isOpen);
      requestAnimationFrame(() => requestAnimationFrame(() => bookWrap?.classList.remove("no-anim")));
    }

    toggleBtn?.addEventListener("click", () => setBookOpen(!bookWrap?.classList.contains("is-open")));
    bookScene?.addEventListener("click", () => {
      if (Date.now() < suppressTapUntil) return;
      setBookOpen(!bookWrap?.classList.contains("is-open"));
    });
    bookScene?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setBookOpen(!bookWrap?.classList.contains("is-open"));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setBookOpen(true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setBookOpen(false);
      }
    });

    let bStartX = 0;
    let bStartY = 0;
    let bSwipeActive = false;
    let bUsedTouch = false;

    bookScene?.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      bUsedTouch = true;
      bStartX = e.touches[0].clientX;
      bStartY = e.touches[0].clientY;
      bSwipeActive = true;
    }, { passive: true });
    bookScene?.addEventListener("touchend", (e) => {
      if (!bSwipeActive || !e.changedTouches.length) return;
      bSwipeActive = false;
      const dx = e.changedTouches[0].clientX - bStartX;
      const dy = e.changedTouches[0].clientY - bStartY;
      if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) {
        suppressTapUntil = Date.now() + 340;
        setBookOpen(dx < 0);
      }
    }, { passive: true });
    bookScene?.addEventListener("touchcancel", () => { bSwipeActive = false; }, { passive: true });

    bookScene?.addEventListener("pointerdown", (e) => {
      if (bUsedTouch || e.pointerType === "touch" || (e.button && e.button !== 0)) return;
      bStartX = e.clientX;
      bStartY = e.clientY;
      bSwipeActive = true;
    });
    bookScene?.addEventListener("pointerup", (e) => {
      if (bUsedTouch || e.pointerType === "touch" || !bSwipeActive) return;
      bSwipeActive = false;
      const dx = e.clientX - bStartX;
      const dy = e.clientY - bStartY;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        suppressTapUntil = Date.now() + 260;
        setBookOpen(dx < 0);
      }
    });
    bookScene?.addEventListener("pointercancel", () => { bSwipeActive = false; });

    function shareResource() {
      if (navigator.share) {
        navigator.share({ title, url: location.href }).catch(() => {});
      } else {
        copyText(location.href, t("রিসোর্স লিংক কপি হয়েছে!", "Resource link copied!"));
      }
    }

    document.getElementById("detDownloadBtn").addEventListener("click", () => openDownloadDrawer(r));
    document.getElementById("detShareBtn").addEventListener("click", shareResource);

    // Sticky mobile quick-download dock on phones
    let dock = document.getElementById("mobileDetailDock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "mobileDetailDock";
      dock.className = "mobile-detail-dock";
      document.body.appendChild(dock);
    }
    document.body.classList.add("has-detail-dock");
    dock.innerHTML = `
      <div class="dock-meta">
        <span class="badge-free" style="font-size:10px;padding:1px 7px;">${esc(r.file_kind.toUpperCase())} · ${t("ফ্রি", "FREE")}</span>
        <div class="dock-title">${esc(title)}</div>
      </div>
      <div class="dock-btns">
        <button type="button" class="icon-btn dock-share-btn" id="dockShareBtn" aria-label="${t("শেয়ার করুন", "Share")}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="dockDownloadBtn">${t("ফ্রি নিন", "Download")} ↓</button>
      </div>
    `;
    document.getElementById("dockDownloadBtn")?.addEventListener("click", () => openDownloadDrawer(r));
    document.getElementById("dockShareBtn")?.addEventListener("click", shareResource);
    document.getElementById("resCommentForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("cmName").value.trim();
      const body = document.getElementById("cmBody").value.trim();
      if (!name || !body) return;
      const a = getActivity();
      a.comments = a.comments || [];
      a.comments.unshift({ id: `cm_${Date.now()}`, resource_id: r.id, name, body, created_at: new Date().toISOString() });
      saveActivity(a);
      showToast(t("মন্তব্য যোগ হয়েছে!", "Comment posted!"));
      pageResourceDetail();
    });
  }

  function pageSupport() {
    document.title = t("সাপোর্ট · শিখি", "Support · Shikhi");
    const params = new URLSearchParams(location.search);
    const resId = params.get("resource") || "";
    const bkashNumber = DATA.settings.pay?.bkash || "01754441574";

    document.getElementById("supportHead").innerHTML = `
      <h1 class="page-title">${t("আমাদের পাশে থাকুন", "Support Us")}</h1>
      <p class="section-sub">${t(
        "সব রিসোর্স ফ্রি — ভালো লাগলে বিকাশে পে করে পাশে থাকতে পারেন।",
        "All resources stay free — if you like it, you can support us via bKash."
      )}</p>
    `;

    const guideMount = document.getElementById("supportGuideMount");
    if (guideMount) {
      guideMount.innerHTML = `
        <div class="card card-yellow" style="padding:18px 20px;">
          <div style="font-size:12.5px;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">
            ${t("বিকাশ Send Money নির্দেশিকা", "bKash Send Money guide")}
          </div>
          <ol style="padding-left:18px;display:grid;gap:6px;font-size:14px;color:var(--ink);">
            <li>${t("bKash অ্যাপ খুলুন বা *247# ডায়াল করুন।", "Open the bKash app or dial *247#.")}</li>
            <li>${t(`Send Money → <strong class="num">${esc(bkashNumber)}</strong> (Personal)।`, `Send Money → <strong class="num">${esc(bkashNumber)}</strong> (Personal).`)}</li>
            <li>${t("SMS-এর Transaction ID ও চাইলে রিভিউ ফর্মে দিন।", "Paste your SMS Transaction ID (and optional review) into the form.")}</li>
          </ol>
        </div>
      `;
    }

    function renderSupportersList() {
      mountSupportersShowcase("supportersWall", { showCta: false });
    }

    mountSupportForm("supportFormMount", {
      resourceId: resId,
      onSubmitted: renderSupportersList,
    });
    renderSupportersList();
  }

  function pageAbout() {
    document.title = t("আমাদের কথা · শিখি", "About · Shikhi");
    document.getElementById("aboutHead").innerHTML = `
      <h1 class="page-title">${t("শিখি", "About")} <span class="brush-accent">${t("সম্পর্কে", "Shikhi")}</span></h1>
      <p class="section-sub">${esc(t(DATA.settings.about_bn, DATA.settings.about_en))}</p>
    `;

    const pillars = [
      { bn: "চিরকাল ফ্রি", db: "রিসোর্স কখনো পেমেন্টের পেছনে আটকাবে না।", en: "Free, always", de: "Resources never sit behind a paywall." },
      { bn: "সরাসরি Google Drive", db: "কোনো অ্যাকাউন্ট ছাড়াই সরাসরি ডাউনলোড।", en: "Direct Google Drive", de: "Direct download with zero login walls." },
      { bn: "ঐচ্ছিক বিকাশ সাপোর্ট", db: "ভালো লাগলে বিকাশে পে করে পাশে থাকতে পারেন।", en: "Optional bKash support", de: "Optional bKash support if it helps." },
      { bn: "নিয়মিত নতুন গাইড", db: "প্র্যাকটিক্যাল বই, PDF ও AI গাইড নিয়মিত যোগ হয়।", en: "Regular new guides", de: "Fresh practical guides added continuously." },
    ];

    document.getElementById("pillarsMount").innerHTML = pillars
      .map(
        (p, i) => `<div class="step-card">
          <span class="step-num num">${formatNum(i + 1)}</span>
          <h3>${esc(t(p.bn, p.en))}</h3>
          <p>${esc(t(p.db, p.de))}</p>
        </div>`
      )
      .join("");

    document.getElementById("faqHeading").textContent = t("প্রশ্ন ও উত্তর", "Questions");
    const faqMount = document.getElementById("faqMount");
    faqMount.innerHTML = DATA.faqs
      .map(
        (f, idx) => `<details class="faq-item" ${idx === 0 ? "open" : ""}>
          <summary>${esc(t(f.q_bn, f.q_en))}</summary>
          <div class="faq-body">${esc(t(f.a_bn, f.a_en))}</div>
        </details>`
      )
      .join("");
    enhanceDetailsAccordion(faqMount);

    document.getElementById("aboutFooterBox").innerHTML = `
      <div class="cta-banner">
        <div>
          <h2>${t("কে বানিয়েছেন?", "Who made this?")}</h2>
          <p>${t("শিখি কেন বানানো হলো, প্রতিষ্ঠাতার নিজের কথায়।", "Why Shikhi exists, in the founder's own words.")}</p>
        </div>
        <div class="cta-actions">
          <a href="founder.html" class="btn btn-yellow">${t("প্রতিষ্ঠাতার কথা", "Meet the founder")} →</a>
          <a href="resources.html" class="btn btn-outline">${t("রিসোর্স দেখুন", "Browse resources")}</a>
        </div>
      </div>
    `;
  }

  function pageContact() {
    document.title = t("যোগাযোগ · শিখি", "Contact · Shikhi");
    document.getElementById("contactHead").innerHTML = `
      <h1 class="page-title">${t("যোগাযোগ", "Contact")} <span class="brush-accent">${t("করুন", "us")}</span></h1>
      <p class="section-sub">${t(
        "প্রশ্ন, সমস্যা বা নতুন গাইডের অনুরোধ থাকলে লিখে পাঠান।",
        "Send any question, issue, or resource request below."
      )}</p>
    `;

    document.getElementById("contactInfoMount").innerHTML = `
      <div class="card card-yellow" style="margin-bottom:18px;">
        <h2 style="font-size:19px;font-weight:800;margin-bottom:10px;">${t("কীভাবে কাজ করে", "How it works")}</h2>
        <ul style="padding-left:18px;display:grid;gap:7px;font-size:14.5px;">
          <li>${t("১. আপনার নাম আর প্রশ্নটা লিখুন।", "1. Write your name and question.")}</li>
          <li>${t("২. উত্তর কোথায় পেতে চান দিন: ইমেইল, WhatsApp বা Facebook।", "2. Share where to reply: Email, WhatsApp, or Facebook.")}</li>
          <li>${t("৩. মেসেজটা শুধু আমি দেখি, আর কেউ না।", "3. Messages remain private.")}</li>
        </ul>
      </div>
      <div class="card">
        <h3 style="font-size:17px;font-weight:800;margin-bottom:8px;">${t("যা নিয়ে লিখতে পারেন", "Topics")}</h3>
        <ul style="padding-left:18px;display:grid;gap:6px;font-size:14px;color:var(--muted);">
          <li>${t("ডাউনলোড বা ফাইল খুলতে সমস্যা", "Download or file access issues")}</li>
          <li>${t("সাপোর্ট বা Trx ID নিয়ে প্রশ্ন", "Questions about support or Trx IDs")}</li>
          <li>${t("নতুন বই বা গাইডের অনুরোধ", "Requests for new books or guides")}</li>
          <li>${t("AI, Claude, ChatGPT নিয়ে যেকোনো প্রশ্ন", "Questions on AI, Claude, or ChatGPT")}</li>
        </ul>
      </div>
    `;

    document.getElementById("contactFormMount").innerHTML = `
      <h2 style="font-size:21px;font-weight:800;margin-bottom:14px;">${t("মেসেজ লিখুন", "Send a message")}</h2>
      <form id="mgContactForm">
        <div class="field"><label>${t("আপনার নাম *", "Your name *")}</label><input id="ctName" class="input" autocomplete="name" required></div>
        <div class="field"><label>${t("ইমেইল", "Email")}</label><input id="ctEmail" type="email" autocomplete="email" class="input" placeholder="name@gmail.com"></div>
        <div class="field"><label>${t("WhatsApp নম্বর", "WhatsApp number")}</label><input id="ctWa" type="tel" inputmode="tel" autocomplete="tel" class="input" placeholder="01XXXXXXXXX"></div>
        <div class="field"><label>${t("Facebook প্রোফাইল বা পেজ", "Facebook profile or page")}</label><input id="ctFb" class="input" placeholder="${t("লিংক বা নাম", "Link or name")}"></div>
        <div class="field"><label>${t("আপনার সমস্যা বা প্রশ্ন *", "Your question or message *")}</label><textarea id="ctMsg" class="textarea" required placeholder="${t("বিস্তারিত লিখুন…", "Write details…")}"></textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%;min-height:48px;">${t("মেসেজ পাঠান", "Send message")}</button>
      </form>
    `;

    document.getElementById("mgContactForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("ctEmail").value.trim();
      const wa = document.getElementById("ctWa").value.trim();
      const fb = document.getElementById("ctFb").value.trim();
      if (!email && !wa && !fb) {
        showToast(t("উত্তর পাঠানোর জন্য অন্তত একটি মাধ্যম দিন", "Provide at least one reply contact"));
        return;
      }
      const act = getActivity();
      act.messages = act.messages || [];
      act.messages.unshift({
        id: `msg_${Date.now()}`,
        name: document.getElementById("ctName").value.trim(),
        email,
        whatsapp: wa,
        facebook: fb,
        body: document.getElementById("ctMsg").value.trim(),
        status: "pending",
        created_at: new Date().toISOString(),
      });
      saveActivity(act);
      e.target.reset();
      showToast(t("ধন্যবাদ! আপনার মেসেজ সংরক্ষিত হয়েছে।", "Thank you! Your message is saved."));
      if (!document.getElementById("ctSuccessNotice")) {
        document.getElementById("mgContactForm").insertAdjacentHTML("beforeend", `<div id="ctSuccessNotice" class="inline-notice"><span>✓ ${t("মেসেজ সংরক্ষিত হয়েছে!", "Message saved!")}</span><a href="me.html" class="link-underline">${t("আমার সাপোর্ট দেখুন", "View in My support")} →</a></div>`);
      }
    });
  }

  function pageFounder() {
    document.title = t("প্রতিষ্ঠাতা · শিখি", "Founder · Shikhi");
    document.getElementById("founderRoot").innerHTML = `
      <div class="two-col" style="align-items:center;">
        <div class="card founder-photo-card">
          <img src="assets/founder.webp" alt="Md Ashik Ali" class="founder-photo">
        </div>
        <div>
          <h1 class="page-title" style="margin-bottom:8px;">Md Ashik Ali</h1>
          <p style="font-size:16.5px;font-weight:700;color:var(--red);margin-bottom:18px;">
            ${t("Personal Brand Strategist, ডিজাইনার ও ওয়েব ডেভেলপার", "Personal Brand Strategist, Designer & Web Developer")}
          </p>
          <div class="card card-yellow" style="margin-bottom:20px;">
            <h2 style="font-size:19px;font-weight:800;margin-bottom:10px;">${t("কেন শিখি", "Why Shikhi")}</h2>
            <p style="margin-bottom:10px;">${t(
              "আমি আশিক। ২০১৮ সাল থেকে ডিজাইন, ব্র্যান্ডিং আর ওয়েবসাইট নিয়ে কাজ করছি।",
              "I'm Ashik. I've been working in design, branding, and websites since 2018."
            )}</p>
            <p>${t(
              "ভালো বই, গাইড আর দরকারি AI টুল সবার নাগালে রাখতেই শিখি বানানো — যেন যে কেউ ফ্রি শিখতে পারে।",
              "Shikhi exists to keep great books, guides, and practical AI tools open and free for everyone."
            )}</p>
          </div>
          <div class="founder-actions">
            <a href="contact.html" class="btn btn-primary btn-sm">${t("মেসেজ পাঠান", "Send a message")}</a>
            <a href="${DATA.brand.social.linkedin}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">LinkedIn</a>
            <a href="${DATA.brand.social.facebook}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Facebook</a>
            <a href="${DATA.brand.social.youtube}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">YouTube</a>
          </div>
        </div>
      </div>
    `;
  }

  function pageMe() {
    document.title = t("আমার · শিখি", "My Activity · Shikhi");
    document.getElementById("meHead").innerHTML = `
      <h1 class="page-title">${t("আমার", "My")} <span class="brush-accent">${t("কার্যক্রম", "activity")}</span></h1>
      <p class="section-sub">${t(
        "এই ডিভাইসের ডাউনলোড ও বিকাশ সাপোর্ট তালিকা।",
        "Your downloads and bKash support history on this device."
      )}</p>
    `;

    const act = getActivity();
    const dlEntries = Object.entries(act.downloads || {})
      .map(([id, count]) => ({ res: DATA.resources.find((r) => r.id === id), count }))
      .filter((x) => x.res && x.count > 0);

    const allItems = [
      ...act.supports.map((x) => ({ ...x, kindLabel: t("সাপোর্ট", "Support") })),
      ...act.messages.map((x) => ({ ...x, kindLabel: t("মেসেজ", "Message") })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const mount = document.getElementById("meMount");
    if (allItems.length === 0 && dlEntries.length === 0) {
      mount.innerHTML = `
        <div class="card card-yellow" style="text-align:center;padding:clamp(24px,5vw,44px);">
          <h2 style="font-size:21px;font-weight:800;margin-bottom:8px;">${t("এখনো কিছু নেই", "Nothing here yet")}</h2>
          <p style="color:var(--muted);margin-bottom:18px;">${t(
            "কোনো রিসোর্স ডাউনলোড বা বিকাশে সাপোর্ট করলে এখানে তার অবস্থা দেখবেন।",
            "When you download a resource or support via bKash, its status will appear here."
          )}</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <a href="resources.html" class="btn btn-primary">${t("রিসোর্স দেখুন", "Browse resources")}</a>
            <a href="support.html" class="btn btn-outline">${t("প্রজেক্ট সাপোর্ট", "Support project")}</a>
          </div>
        </div>
      `;
    } else {
      mount.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
          <button type="button" class="btn btn-outline btn-sm" id="clearMeBtn">${t("তালিকা পরিষ্কার করুন", "Clear local history")}</button>
        </div>
        ${
          allItems.length
            ? `<div class="list-stack" style="margin-bottom:24px;">
                ${allItems
                  .map(
                    (item) => `<div class="list-item">
                      <div>
                        <span class="badge-free" style="margin-bottom:6px;display:inline-block;">${esc(item.kindLabel)}</span>
                        <div style="font-weight:700;">${esc(item.name || item.category || "")}</div>
                        ${item.trx_id ? `<div style="font-size:12.5px;color:var(--muted);">TrxID: ${esc(item.trx_id)} · ${esc(item.method || "")}</div>` : ""}
                        ${item.message || item.details || item.body ? `<p style="font-size:13.5px;color:var(--muted);margin-top:4px;">${esc(item.message || item.details || item.body)}</p>` : ""}
                      </div>
                      <div style="text-align:right;">
                        ${item.amount ? `<div class="num" style="font-weight:800;color:var(--red);">${formatTaka(item.amount)}</div>` : ""}
                        <span class="pill-status ${item.status === "verified" || item.status === "resolved" ? "verified" : item.status === "rejected" ? "rejected" : "pending"}">${
                          item.status === "verified"
                            ? t("যাচাই হয়েছে", "Verified")
                            : item.status === "resolved"
                              ? t("সমাধান হয়েছে", "Resolved")
                              : item.status === "rejected"
                                ? t("মিলেনি", "Not matched")
                                : t("যাচাই চলছে", "Pending")
                        }</span>
                        <div style="font-size:11.5px;color:var(--muted);margin-top:4px;">${formatRelative(item.created_at)}</div>
                      </div>
                    </div>`
                  )
                  .join("")}
              </div>`
            : ""
        }
        ${
          dlEntries.length
            ? `<div class="card">
                <h2 style="font-size:19px;font-weight:800;margin-bottom:12px;">${t("আপনার ডাউনলোড করা রিসোর্স", "Your downloaded resources")}</h2>
                <div class="list-stack" style="max-height:280px;">
                  ${dlEntries
                    .map(
                      ({ res, count }) => `<div class="list-item">
                        <a href="resource.html?slug=${encodeURIComponent(res.slug)}" style="font-weight:700;color:var(--red-deep);">${esc(t(res.title_bn, res.title_en))}</a>
                        <span class="badge-free num">↓ ${formatNum(count)}×</span>
                      </div>`
                    )
                    .join("")}
                </div>
              </div>`
            : ""
        }
      `;
      document.getElementById("clearMeBtn")?.addEventListener("click", () => {
        saveActivity({ supports: [], donations: [], help_requests: [], messages: [], comments: [], downloads: {}, views: {} });
        showToast(t("তালিকা পরিষ্কার হয়েছে।", "Local history cleared."));
        pageMe();
      });
    }
  }

  const PAGES = {
    home: pageHome,
    resources: pageResources,
    resource: pageResourceDetail,
    support: pageSupport,
    about: pageAbout,
    contact: pageContact,
    founder: pageFounder,
    me: pageMe,
  };

  let navLeaveTimer = null;
  let navResetTimer = null;
  function clearLeavingState() {
    clearTimeout(navLeaveTimer);
    clearTimeout(navResetTimer);
    document.documentElement.classList.remove("page-leaving");
    document.querySelectorAll(".res-card.is-opening").forEach((el) => el.classList.remove("is-opening"));
  }

  let activePageKey = null;

  function navigateSmooth(url) {
    const nav = document.getElementById("mobileNav");
    const bd = document.getElementById("mobileNavBackdrop");
    const btn = document.getElementById("mobileMenuBtn");
    if (nav?.classList.contains("open")) {
      nav.classList.remove("open");
      bd?.classList.remove("open");
      if (btn) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "☰";
      }
      if (!document.querySelector(".modal-backdrop.open")) document.body.style.overflow = "";
    }
    clearTimeout(navLeaveTimer);
    clearTimeout(navResetTimer);
    document.documentElement.classList.add("page-leaving");
    navLeaveTimer = setTimeout(() => {
      location.href = url;
    }, 110);
    // Safety recovery: never allow page to remain stuck faded if navigation is aborted
    navResetTimer = setTimeout(clearLeavingState, 1600);
  }

  /* ---------- Native Compositor Smooth Scroll Helpers (Zero Wheel Blocking -> 60/120fps+) ---------- */
  function smoothScrollToY(y) {
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.max(0, Math.min(maxY, y));
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  function refreshActiveStats() {
    syncLiveStats();
    if (activePageKey === "me") pageMe();
  }

  function initSmoothTransitions() {
    if (window._mgTransitionBound) return;
    window._mgTransitionBound = true;

    if (!document.getElementById("mgNavBar")) {
      const bar = document.createElement("div");
      bar.id = "mgNavBar";
      bar.className = "nav-progress-line";
      bar.setAttribute("aria-hidden", "true");
      document.body.appendChild(bar);
    }

    window.addEventListener("pageshow", () => {
      clearLeavingState();
      refreshActiveStats();
    });
    window.addEventListener("focus", refreshActiveStats);
    window.addEventListener("storage", (e) => {
      if (!e.key || e.key === STORAGE_ACT || e.key === STORAGE_STATE) refreshActiveStats();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        clearLeavingState();
        refreshActiveStats();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a[href]");
      if (!a || a.target || a.hasAttribute("download")) return;
      const raw = a.getAttribute("href") || "";
      if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) return;
      if (raw.startsWith("#")) {
        const targetEl = raw.length > 1 ? document.querySelector(raw) : null;
        if (targetEl) {
          e.preventDefault();
          const top = targetEl.getBoundingClientRect().top + window.scrollY - 84;
          smoothScrollToY(top);
        }
        return;
      }
      let nextUrl;
      try {
        nextUrl = new URL(raw, location.href);
      } catch {
        return;
      }
      const sameProtocol = nextUrl.protocol === location.protocol;
      const sameOrigin = nextUrl.protocol === "file:" ? true : nextUrl.origin === location.origin;
      if (!sameProtocol || !sameOrigin) return;
      if (nextUrl.pathname === location.pathname && nextUrl.search === location.search) {
        e.preventDefault();
        if (nextUrl.hash && nextUrl.hash.length > 1) {
          const hashTarget = document.querySelector(nextUrl.hash);
          if (hashTarget) {
            smoothScrollToY(hashTarget.getBoundingClientRect().top + window.scrollY - 84);
            return;
          }
        }
        if (window.scrollY > 10) smoothScrollToY(0);
        return;
      }
      const parentCard = a.closest(".res-card");
      if (parentCard) parentCard.classList.add("is-opening");
      e.preventDefault();
      navigateSmooth(nextUrl.href);
    });
  }

  window.MG = {
    init(pageKey) {
      activePageKey = pageKey;
      initSmoothTransitions();
      ensureModals();
      const renderFn = PAGES[pageKey];
      renderShell(pageKey, renderFn);
      if (typeof renderFn === "function") renderFn();
    },
  };
})();
