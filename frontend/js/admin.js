/**
 * الحوض الهادي للإسكان - AL HAWD AL HADI HOUSING
 * Enterprise SaaS CMS Dashboard Logic v2.0 (admin.js)
 */

(function () {
  let cms = null;
  let mediaCatalog = { pairs: [], uploads: [] };
  let bookingsList = [];
  let usersList = [];
  let currentAdminUser = null;
  let activePickerCallback = null;

  // Sub-tab & Filter State
  let selectedProjectIdx = 0;
  let selectedApartmentIdx = 0;
  let selectedShowcaseUnitIdx = 0;
  let bookingStatusFilter = "all";
  let bookingSearchQuery = "";
  let cmsTheme = localStorage.getItem("alhawd_cms_theme") || "dark";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const SECTION_META = [
    { key: "hero", num: "01", title: "الواجهة الرئيسية (Hero Slider)", desc: "العنوان الترحيبي وشرائح العرض الخلفية (01 - 04)", panel: "panel-hero" },
    { key: "projects", num: "02", title: "المشاريع السكنية (مشاريعنا السكنية)", desc: "بطاقات المشاريع السكنية وحالات التوفر والمواقع", panel: "panel-projects" },
    { key: "explorer", num: "03", title: "مستكشف الوحدات التفاعلي", desc: "واجهة المبنى التفاعلية وأزرار الطوابق والمخطط ثلاثي الأبعاد", panel: "panel-explorer" },
    { key: "unitDetails", num: "04", title: "تفاصيل الشقة والمعرض الداخلي", desc: "مواصفات الشقة المختارة ومعرض الصور الداخلي", panel: "panel-explorer" },
    { key: "lifestyle", num: "05", title: "أسلوب الحياة المتكامل والمرافق", desc: "بانر المسبح والحدائق والأيقونات الست للمرافق", panel: "panel-lifestyle" },
    { key: "about", num: "06", title: "عن الشركة والإحصائيات", desc: "الرسالة التعريفية للشركة والأرقام والإنجازات", panel: "panel-about" },
    { key: "location", num: "07", title: "الموقع الاستراتيجي والخريطة التفاعلية", desc: "خريطة غرب عمان التفاعلية والدبابيس والمسافات الزمنية", panel: "panel-location" },
    { key: "ctaBanner", num: "08", title: "بانر الحجز السفلي", desc: "دعوة الحجز النهائية وقنوات التواصل المباشر", panel: "panel-footer" },
    { key: "footer", num: "09", title: "الفوتر ومعلومات الاتصال", desc: "بيانات الاتصال والروابط السريعة وحقوق الملكية", panel: "panel-footer" }
  ];

  async function initAdmin() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("theme") === "light" || params.get("theme") === "dark") {
      cmsTheme = params.get("theme");
    }
    applyCmsTheme(cmsTheme);

    if (params.get("tab")) {
      switchToPanel(`panel-${params.get("tab")}`);
    }

    await Promise.all([loadCmsData(), loadMediaCatalog(), loadAdminUsers()]);
    renderAllPanels();
    bindGlobalEvents();

    if (params.get("tab")) {
      switchToPanel(`panel-${params.get("tab")}`);
    }
    if (params.get("preview") === "1") {
      document.getElementById("cmsBodySplit")?.classList.add("preview-open");
    }

    // Load bookings asynchronously in background without blocking CMS panels rendering
    loadBookings().then(() => {
      renderBookingsPanel();
      const bBadge = document.getElementById("navBookingsBadge");
      if (bBadge) bBadge.textContent = String(bookingsList.length);
    });
  }

  function applyCmsTheme(theme) {
    cmsTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-cms-theme", cmsTheme);
    localStorage.setItem("alhawd_cms_theme", cmsTheme);
    const iconEl = document.getElementById("cmsThemeIcon");
    if (iconEl) iconEl.textContent = cmsTheme === "dark" ? "☀️" : "🌙";
  }

  async function loadCmsData() {
    const res = await fetch("/api/cms");
    cms = await res.json();
  }

  async function loadMediaCatalog() {
    const res = await fetch("/api/media");
    mediaCatalog = await res.json();
  }

  async function loadBookings() {
    const res = await fetch("/api/bookings");
    bookingsList = await res.json();
    const badge = document.getElementById("navBookingsBadge");
    if (badge) badge.textContent = String(bookingsList.length);
  }

  async function loadAdminUsers() {
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch("/api/admin/me"),
        fetch("/api/admin/users")
      ]);
      if (meRes.ok) {
        currentAdminUser = await meRes.json();
        const nameEl = document.getElementById("sidebarUserName");
        const roleEl = document.getElementById("sidebarUserRole");
        if (nameEl && currentAdminUser.displayName) nameEl.textContent = currentAdminUser.displayName;
        if (roleEl && currentAdminUser.username) roleEl.textContent = `${currentAdminUser.username} • ${currentAdminUser.roleLabel || ""}`;
      }
      if (usersRes.ok) {
        const list = await usersRes.json();
        if (Array.isArray(list)) usersList = list;
      }
      const uBadge = document.getElementById("navUsersBadge");
      if (uBadge) uBadge.textContent = String(usersList.length || 1);
    } catch (e) {
      console.warn("Could not load admin users:", e);
    }
  }

  function markDirty(isDirty = true) {
    const pill = document.getElementById("syncStatusPill");
    const txt = document.getElementById("syncStatusText");
    if (!pill || !txt) return;
    if (isDirty) {
      pill.className = "sync-status-pill dirty";
      txt.textContent = "لديك تعديلات غير محفوظة •";
    } else {
      pill.className = "sync-status-pill synced";
      txt.textContent = "كافة التعديلات محفوظة";
    }
  }

  function showToast(msg, isError = false) {
    const toast = document.getElementById("cmsToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = isError ? "#DC4E4E" : "#389E5F";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  async function saveCms() {
    const btn = document.getElementById("saveAllBtn");
    if (btn) btn.disabled = true;
    try {
      const res = await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cms)
      });
      if (res.ok) {
        markDirty(false);
        showToast("تم حفظ جميع التعديلات وتحديث الموقع بنجاح!");
        refreshLivePreview();
        renderOverviewPanel();
      } else {
        showToast("حدث خطأ أثناء الحفظ", true);
      }
    } catch (err) {
      showToast("تعذر الاتصال بالخادم", true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function refreshLivePreview() {
    const iframe = document.getElementById("livePreviewIframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.location.reload();
    }
  }

  function switchToPanel(panelId) {
    const btn = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".cms-panel").forEach((p) => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    const target = document.getElementById(panelId);
    if (target) target.classList.add("active");

    const title = btn?.dataset.title || "";
    const sub = btn?.dataset.sub || "";
    const titleEl = document.getElementById("activePanelTitle");
    if (titleEl) titleEl.textContent = title;
    const bcEl = document.getElementById("breadcrumbCurrent");
    if (bcEl) bcEl.textContent = title;
    const subEl = document.getElementById("activePanelSub");
    if (subEl) subEl.textContent = sub;
  }

  // Dual Image Picker Component (LightMood + DarkMood)
  function dualImageHtml(lightVal, darkVal, targetKey) {
    return `
      <div class="dual-img-picker" data-dual-key="${targetKey}">
        <div class="img-slot">
          <div class="img-slot-preview">
            <span class="img-slot-badge">☀️ الوضع النهاري (Light Mode)</span>
            <img src="${lightVal || "/images/light/scene-1.webp"}" alt="Light" data-preview-light="${targetKey}" />
          </div>
          <input type="text" class="input" dir="ltr" value="${lightVal || ""}" data-input-light="${targetKey}" placeholder="/images/light/scene-1.webp" />
          <button type="button" class="btn btn-secondary btn-sm" data-pick-mode="light" data-pick-key="${targetKey}">
            اختر صورة نهارية / زوج متطابق
          </button>
        </div>
        <div class="img-slot">
          <div class="img-slot-preview">
            <span class="img-slot-badge">🌙 الوضع الليلي (Dark Mode)</span>
            <img src="${darkVal || "/images/dark/scene-1.webp"}" alt="Dark" data-preview-dark="${targetKey}" />
          </div>
          <input type="text" class="input" dir="ltr" value="${darkVal || ""}" data-input-dark="${targetKey}" placeholder="/images/dark/scene-1.webp" />
          <button type="button" class="btn btn-secondary btn-sm" data-pick-mode="dark" data-pick-key="${targetKey}">
            اختر صورة ليلية / زوج متطابق
          </button>
        </div>
      </div>
    `;
  }

  function renderAllPanels() {
    if (!cms) return;
    const pBadge = document.getElementById("navProjectsBadge");
    const uBadge = document.getElementById("navUnitsBadge");
    if (pBadge) pBadge.textContent = String(cms.projectsSection?.projects?.length || 0);
    if (uBadge) uBadge.textContent = String(cms.explorerSection?.apartments?.length || 0);

    renderOverviewPanel();
    renderGeneralPanel();
    renderHeroPanel();
    renderProjectsPanel();
    renderExplorerPanel();
    renderLifestylePanel();
    renderAboutPanel();
    renderLocationPanel();
    renderFooterPanel();
    renderMediaPanel();
    renderBookingsPanel();
    renderUsersPanel();
    bindDynamicInputs();
  }

  // =========================================================================
  // PANEL 0: EXECUTIVE OVERVIEW DASHBOARD
  // =========================================================================
  function renderOverviewPanel() {
    const kpiGrid = document.getElementById("overviewKpiGrid");
    const projectsCount = cms.projectsSection?.projects?.length || 0;
    const unitsCount = cms.explorerSection?.apartments?.length || 0;
    const mediaCount = (mediaCatalog.pairs?.length || 10) * 2 + (mediaCatalog.uploads?.length || 0);
    const bookingsCount = bookingsList.length;

    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi-card">
          <div>
            <div class="kpi-value">${projectsCount}</div>
            <div class="kpi-label">المشاريع السكنية النشطة</div>
          </div>
          <div class="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          </div>
        </div>
        <div class="kpi-card">
          <div>
            <div class="kpi-value">${unitsCount} نماذج</div>
            <div class="kpi-label">الشقق في المستكشف التفاعلي</div>
          </div>
          <div class="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
        </div>
        <div class="kpi-card">
          <div>
            <div class="kpi-value">${mediaCount} صورة</div>
            <div class="kpi-label">مكتبة الصور (Light & Dark)</div>
          </div>
          <div class="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        </div>
        <div class="kpi-card">
          <div>
            <div class="kpi-value">${bookingsCount}</div>
            <div class="kpi-label">طلبات حجز المواعيد</div>
          </div>
          <div class="kpi-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
        </div>
      `;
    }

    const vis = cms.settings.sectionVisibility || {};
    const mgrList = document.getElementById("overviewSectionManager");
    if (mgrList) {
      mgrList.innerHTML = SECTION_META.map((sec) => {
        const isEnabled = vis[sec.key] !== false;
        return `
          <div class="section-mgr-row">
            <div class="section-mgr-info">
              <div class="section-mgr-num">${sec.num}</div>
              <div>
                <div style="font-weight:700; font-size:0.92rem;">${sec.title}</div>
                <div style="font-size:0.78rem; color:var(--cms-text-secondary);">${sec.desc}</div>
              </div>
            </div>
            <div class="section-mgr-actions">
              <button type="button" class="btn btn-secondary btn-xs" data-goto-panel="${sec.panel}">
                تحرير القسم ←
              </button>
              <label class="ios-switch" title="إظهار / إخفاء القسم">
                <input type="checkbox" data-vis-key="${sec.key}" ${isEnabled ? "checked" : ""} />
                <span class="ios-slider"></span>
              </label>
            </div>
          </div>
        `;
      }).join("");

      mgrList.querySelectorAll("input[data-vis-key]").forEach((cb) => {
        cb.addEventListener("change", () => {
          cms.settings.sectionVisibility[cb.dataset.visKey] = cb.checked;
          markDirty(true);
        });
      });
    }

    const recentBox = document.getElementById("overviewRecentBookings");
    if (recentBox) {
      const recent = bookingsList.slice(0, 3);
      if (!recent.length) {
        recentBox.innerHTML = `<div style="color:var(--cms-text-muted); text-align:center; padding:18px;">لا توجد طلبات حجز حالياً</div>`;
      } else {
        recentBox.innerHTML = recent
          .map(
            (b) => `
          <div style="padding:12px; border-radius:10px; background:var(--cms-surface-alt); border:1px solid var(--cms-border); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="font-size:0.9rem;">${b.name}</strong>
              <div style="font-size:0.78rem; color:var(--cms-gold);">${b.project} — ${b.unit}</div>
              <div style="font-size:0.75rem; color:var(--cms-text-secondary);" dir="ltr">${b.phone} • ${b.preferredDate || ""}</div>
            </div>
            <span class="nav-badge subtle">${b.status === "confirmed" ? "مؤكد" : b.status === "contacted" ? "تم التواصل" : "جديد"}</span>
          </div>
        `
          )
          .join("");
      }
    }

    document.querySelectorAll("[data-goto-panel]").forEach((btn) => {
      btn.addEventListener("click", () => switchToPanel(btn.dataset.gotoPanel));
    });
  }

  // =========================================================================
  // PANEL 1: BRANDING, GENERAL SETTINGS & NAVIGATION
  // =========================================================================
  function renderGeneralPanel() {
    const s = cms.settings;
    const form = document.getElementById("generalSettingsForm");
    if (form) {
      form.innerHTML = `
        <div class="field">
          <label>اسم الشركة (بالعربية)</label>
          <input class="input" value="${s.brandNameAr || ""}" data-bind="settings.brandNameAr" />
        </div>
        <div class="field">
          <label>اسم الشركة (بالإنجليزية)</label>
          <input class="input" dir="ltr" value="${s.brandNameEn || ""}" data-bind="settings.brandNameEn" />
        </div>
        <div class="field">
          <label>المظهر الافتراضي عند فتح الموقع</label>
          <select class="select" data-bind="settings.defaultTheme">
            <option value="light" ${s.defaultTheme === "light" ? "selected" : ""}>☀️ الوضع النهاري (Light Mode)</option>
            <option value="dark" ${s.defaultTheme === "dark" ? "selected" : ""}>🌙 الوضع الليلي (Dark Mode)</option>
          </select>
        </div>
        <div class="field">
          <label>نص زر الحجز في الهيدر</label>
          <input class="input" value="${s.headerCtaText || ""}" data-bind="settings.headerCtaText" />
        </div>
        <div class="field">
          <label>رقم الهاتف الرسمي</label>
          <input class="input" dir="ltr" value="${s.phone || ""}" data-bind="settings.phone" />
        </div>
        <div class="field">
          <label>البريد الإلكتروني الرسمي</label>
          <input class="input" dir="ltr" value="${s.email || ""}" data-bind="settings.email" />
        </div>
      `;
    }

    const navEditor = document.getElementById("navLinksEditor");
    if (navEditor) {
      navEditor.innerHTML = (cms.navigation || [])
        .map(
          (item, i) => `
        <div class="grid-3" style="margin-bottom:10px; align-items:center;">
          <input class="input" value="${item.label}" data-nav-idx="${i}" data-nav-field="label" placeholder="عنوان الرابط" />
          <input class="input" dir="ltr" value="${item.href}" data-nav-idx="${i}" data-nav-field="href" placeholder="#section" />
          <button type="button" class="btn btn-danger btn-sm" data-del-nav="${i}">حذف الرابط</button>
        </div>
      `
        )
        .join("");

      navEditor.querySelectorAll("[data-nav-idx]").forEach((inp) => {
        inp.addEventListener("input", () => {
          const idx = parseInt(inp.dataset.navIdx, 10);
          cms.navigation[idx][inp.dataset.navField] = inp.value;
          markDirty(true);
        });
      });

      navEditor.querySelectorAll("[data-del-nav]").forEach((btn) => {
        btn.addEventListener("click", () => {
          cms.navigation.splice(parseInt(btn.dataset.delNav, 10), 1);
          markDirty(true);
          renderGeneralPanel();
          bindDynamicInputs();
        });
      });
    }
  }

  // =========================================================================
  // PANEL 2: HERO SECTION & SLIDES
  // =========================================================================
  function renderHeroPanel() {
    const h = cms.hero;
    const editor = document.getElementById("heroTextsEditor");
    if (editor) {
      editor.innerHTML = `
        <div class="grid-3">
          <div class="field">
            <label>النص التمهيدي العلوي (Eyebrow)</label>
            <input class="input" value="${h.eyebrow || ""}" data-bind="hero.eyebrow" />
          </div>
          <div class="field">
            <label>العنوان الرئيسي - السطر الأول</label>
            <input class="input" value="${h.titleLine1 || ""}" data-bind="hero.titleLine1" />
          </div>
          <div class="field">
            <label>العنوان الرئيسي - السطر الثاني</label>
            <input class="input" value="${h.titleLine2 || ""}" data-bind="hero.titleLine2" />
          </div>
        </div>
        <div class="field">
          <label>الوصف الفرعي تحت العنوان</label>
          <input class="input" value="${h.subtitle || ""}" data-bind="hero.subtitle" />
        </div>
        <div class="grid-4">
          <div class="field">
            <label>نص الزر الرئيسي</label>
            <input class="input" value="${h.ctaText || ""}" data-bind="hero.ctaText" />
          </div>
          <div class="field">
            <label>نص التمرير للأسفل</label>
            <input class="input" value="${h.scrollDownText || ""}" data-bind="hero.scrollDownText" />
          </div>
          <div class="field">
            <label>شعار الموقع السفلي (سطر 1)</label>
            <input class="input" value="${h.bottomTaglineLine1 || ""}" data-bind="hero.bottomTaglineLine1" />
          </div>
          <div class="field">
            <label>الموقع الجغرافي السفلي</label>
            <input class="input" value="${h.bottomLocation || ""}" data-bind="hero.bottomLocation" />
          </div>
        </div>
      `;
    }

    const slidesEl = document.getElementById("heroSlidesEditor");
    if (slidesEl) {
      slidesEl.innerHTML = (h.slides || [])
        .map(
          (s, i) => `
        <div class="subcard">
          <div class="subcard-top">
            <strong style="color:var(--cms-gold);">الشريحة رقم ${s.number || `0${i + 1}`} — ${s.title || ""}</strong>
            <button type="button" class="btn btn-danger btn-xs" data-del-slide="${i}">حذف الشريحة</button>
          </div>
          <div class="grid-2">
            <div class="field">
              <label>رقم الشريحة (مثال: 01)</label>
              <input class="input" dir="ltr" value="${s.number || ""}" data-bind="hero.slides.${i}.number" />
            </div>
            <div class="field">
              <label>عنوان وصفي للشريحة</label>
              <input class="input" value="${s.title || ""}" data-bind="hero.slides.${i}.title" />
            </div>
          </div>
          ${dualImageHtml(s.imageLight, s.imageDark, `hero.slides.${i}`)}
        </div>
      `
        )
        .join("");

      slidesEl.querySelectorAll("[data-del-slide]").forEach((btn) => {
        btn.addEventListener("click", () => {
          cms.hero.slides.splice(parseInt(btn.dataset.delSlide, 10), 1);
          markDirty(true);
          renderHeroPanel();
          bindDynamicInputs();
        });
      });
    }
  }

  // =========================================================================
  // PANEL 3: FEATURED PROJECTS (Clean Sub-Tab Selector)
  // =========================================================================
  function renderProjectsPanel() {
    const pSec = cms.projectsSection;
    const headerEl = document.getElementById("projectsHeaderEditor");
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="grid-2">
          <div class="field">
            <label>العنوان الفرعي الذهبي</label>
            <input class="input" value="${pSec.eyebrow || ""}" data-bind="projectsSection.eyebrow" />
          </div>
          <div class="field">
            <label>العنوان الرئيسي للقسم</label>
            <input class="input" value="${pSec.title || ""}" data-bind="projectsSection.title" />
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label>الوصف الفرعي</label>
            <input class="input" value="${pSec.subtitle || ""}" data-bind="projectsSection.subtitle" />
          </div>
          <div class="field">
            <label>نص رابط عرض الكل</label>
            <input class="input" value="${pSec.viewAllText || ""}" data-bind="projectsSection.viewAllText" />
          </div>
        </div>
      `;
    }

    const projects = pSec.projects || [];
    if (selectedProjectIdx >= projects.length) selectedProjectIdx = Math.max(0, projects.length - 1);

    const subtabsEl = document.getElementById("projectsSubtabs");
    if (subtabsEl) {
      subtabsEl.innerHTML = projects
        .map(
          (p, idx) => `
        <button type="button" class="subtab-pill ${idx === selectedProjectIdx ? "active" : ""}" data-proj-tab="${idx}">
          <span>🏢 ${p.title || `مشروع ${idx + 1}`}</span>
        </button>
      `
        )
        .join("");

      subtabsEl.querySelectorAll("[data-proj-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedProjectIdx = parseInt(btn.dataset.projTab, 10);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });
    }

    const listEl = document.getElementById("projectsListEditor");
    if (listEl) {
      if (!projects.length) {
        listEl.innerHTML = `<div style="padding:24px; text-align:center; color:var(--cms-text-muted);">لا توجد مشاريع حالياً. اضغط "+ إضافة مشروع سكني" للبدء.</div>`;
        return;
      }
      const i = selectedProjectIdx;
      const p = projects[i];
      listEl.innerHTML = `
        <div class="subcard">
          <div class="subcard-top">
            <strong style="color:var(--cms-gold); font-size:1.05rem;">تحرير: ${p.title || `مشروع ${i + 1}`}</strong>
            <button type="button" class="btn btn-danger btn-xs" data-del-proj="${i}">حذف هذا المشروع</button>
          </div>
          <div class="grid-3">
            <div class="field">
              <label>اسم المشروع</label>
              <input class="input" value="${p.title || ""}" data-bind="projectsSection.projects.${i}.title" />
            </div>
            <div class="field">
              <label>الموقع (الوضع النهاري)</label>
              <input class="input" value="${p.locationLight || ""}" data-bind="projectsSection.projects.${i}.locationLight" />
            </div>
            <div class="field">
              <label>الموقع (الوضع الليلي)</label>
              <input class="input" value="${p.locationDark || ""}" data-bind="projectsSection.projects.${i}.locationDark" />
            </div>
          </div>
          <div class="grid-4">
            <div class="field">
              <label>عدد الشقق (مثال: 48 شقة)</label>
              <input class="input" value="${p.unitsCount || ""}" data-bind="projectsSection.projects.${i}.unitsCount" />
            </div>
            <div class="field">
              <label>عدد الطوابق (نهاري)</label>
              <input class="input" value="${p.floorsCountLight || ""}" data-bind="projectsSection.projects.${i}.floorsCountLight" />
            </div>
            <div class="field">
              <label>نص شارة الحالة (مثال: متاح الآن)</label>
              <input class="input" value="${p.statusText || ""}" data-bind="projectsSection.projects.${i}.statusText" />
            </div>
            <div class="field">
              <label>لون شارة الحالة</label>
              <select class="select" data-bind="projectsSection.projects.${i}.statusType">
                <option value="available" ${p.statusType === "available" ? "selected" : ""}>أخضر (متاح الآن)</option>
                <option value="completed" ${p.statusType === "completed" ? "selected" : ""}>رمادي داكن (مكتمل)</option>
                <option value="construction" ${p.statusType === "construction" ? "selected" : ""}>رمادي متوسط (قيد الإنشاء)</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>وصف المشروع التفصيلي (يظهر في نافذة استعراض المشروع)</label>
            <textarea class="textarea" rows="2" data-bind="projectsSection.projects.${i}.description">${p.description || ""}</textarea>
          </div>
          <div class="field" style="margin-top: 10px;">
            <label>وصف مختصر لصفحة تفاصيل المشروع</label>
            <textarea class="textarea" rows="2" data-bind="projectsSection.projects.${i}.shortDescription">${p.shortDescription || p.description || ""}</textarea>
          </div>
          <div class="grid-2">
            <div class="field">
              <label>المساحة الابتدائية (مثال: 120 م²)</label>
              <input class="input" value="${p.startingArea || "120 م²"}" data-bind="projectsSection.projects.${i}.startingArea" />
            </div>
            <div class="field">
              <label>حالة المشروع (مثال: جاهز للسكن)</label>
              <input class="input" value="${p.projectStatus || "جاهز للسكن"}" data-bind="projectsSection.projects.${i}.projectStatus" />
            </div>
          </div>
          ${dualImageHtml(p.imageLight, p.imageDark, `projectsSection.projects.${i}`)}

          <!-- Detailed Page Customizer Section -->
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--cms-border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <strong style="color:var(--cms-gold); font-size:1.05rem;">
                🏛️ تخصيص صفحة تفاصيل المشروع الكاملة (${p.title || `مشروع ${i + 1}`})
              </strong>
              <a href="/project?id=${encodeURIComponent(p.id)}" target="_blank" class="btn btn-secondary btn-xs">
                🔗 فتح صفحة المشروع للمعاينة ↗
              </a>
            </div>

            <!-- Overview Box Customizer -->
            <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:16px; margin-bottom:16px;">
              <strong style="color:var(--cms-text-primary); font-size:0.95rem; display:block; margin-bottom:10px;">
                1. قسم "نظرة عامة" والمواصفات البارزة:
              </strong>
              <div class="grid-2">
                <div class="field">
                  <label>الشارة الذهبية (العنوان الصغير)</label>
                  <input class="input" value="${p.overview?.badge || "نظرة عامة"}" data-bind="projectsSection.projects.${i}.overview.badge" />
                </div>
                <div class="field">
                  <label>العنوان الرئيسي للنظرة العامة</label>
                  <input class="input" value="${p.overview?.title || "حياة استثنائية في قلب دير غبار"}" data-bind="projectsSection.projects.${i}.overview.title" />
                </div>
              </div>
              <div class="field">
                <label>النص التعريفي والتفصيلي للمشروع</label>
                <textarea class="textarea" rows="3" data-bind="projectsSection.projects.${i}.overview.text">${p.overview?.text || ""}</textarea>
              </div>
              <div class="grid-2">
                <div class="field">
                  <label>صورة النظرة العامة (معاينة ورفع مباشر):</label>
                  <div style="display:flex; gap:12px; align-items:center; background:var(--cms-surface-alt); padding:8px 12px; border-radius:8px; border:1px solid var(--cms-border);">
                    <img src="${p.overview?.imageLight || "/images/projects/09_living_room_overview.webp"}" alt="نظرة عامة" style="width:75px; height:50px; object-fit:cover; border-radius:6px; border:1px solid var(--cms-border);" />
                    <div style="flex:1;">
                      <div style="display:flex; gap:6px;">
                        <label class="btn btn-primary btn-xs" style="cursor:pointer;" title="رفع صورة من جهازك">
                          ⬆️ رفع صورة جديدة
                          <input type="file" accept="image/*" style="display:none;" data-upload-overview="${i}" />
                        </label>
                        <button type="button" class="btn btn-secondary btn-xs" data-pick-overview="${i}">
                          🖼️ اختيار من المكتبة
                        </button>
                      </div>
                      <div style="font-size:0.72rem; color:var(--cms-text-muted); margin-top:4px;" dir="ltr">${p.overview?.imageLight || ""}</div>
                    </div>
                  </div>
                </div>
                <div class="field">
                  <label>تسمية توضيحية على الصورة</label>
                  <input class="input" value="${p.overview?.imageCaption || "تصميم داخلي نموذجي"}" data-bind="projectsSection.projects.${i}.overview.imageCaption" />
                </div>
              </div>
            </div>

            <!-- Gallery Images Customizer (100% Upload-Driven & No Manual Paths) -->
            <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:18px; margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                <div>
                  <strong style="color:var(--cms-gold); font-size:1.02rem; display:block;">
                    📸 2. معرض الصور الرئيسي (${(p.gallery || []).length} صور):
                  </strong>
                  <span style="font-size:0.8rem; color:var(--cms-text-secondary);">
                    ارفع صور المعرض مباشرة من جهازك — يتم حفظها تلقائياً على السيرفر وضغطها بدون فقدان الجودة (جاهزة للهوستينغ)
                  </span>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <label class="btn btn-primary btn-sm" style="cursor:pointer;" title="رفع صورة واحدة من جهازك وإضافتها للمعرض">
                    ⬆️ رفع صورة جديدة
                    <input type="file" accept="image/*" style="display:none;" data-upload-gal-single="${i}" />
                  </label>
                  <label class="btn btn-secondary btn-sm" style="cursor:pointer;" title="تحديد ورفع عدة صور معاً دفعة واحدة">
                    📁 رفع عدة صور دفعة واحدة
                    <input type="file" accept="image/*" multiple style="display:none;" data-upload-gal-multi="${i}" />
                  </label>
                  <button type="button" class="btn btn-outline btn-sm" data-pick-gal-new="${i}">
                    🖼️ اختيار من المكتبة
                  </button>
                </div>
              </div>

              <!-- Gallery Cards List -->
              <div class="project-gallery-cards-list" style="display:flex; flex-direction:column; gap:10px;">
                ${(p.gallery || []).length === 0 ? `
                  <div style="text-align:center; padding:24px; color:var(--cms-text-muted); border:1px dashed var(--cms-border); border-radius:8px;">
                    لم تتم إضافة صور للمعرض بعد. اضغط على أزرار الرفع أعلاه لإضافة الصور مباشرة من جهازك.
                  </div>
                ` : (p.gallery || []).map((g, gi) => `
                  <div style="display:flex; gap:14px; align-items:center; background:var(--cms-surface-alt, #151A21); border:1px solid var(--cms-border); border-radius:8px; padding:10px 14px; transition:border-color 0.2s ease;">
                    <!-- Thumbnail Preview -->
                    <div style="width:80px; height:56px; flex-shrink:0; border-radius:6px; overflow:hidden; border:1.5px solid var(--cms-border); background:#000;">
                      <img src="${g.imageLight || g.imageDark || '/images/projects/01_main_building_gallery.webp'}" alt="${g.title || 'صورة المعرض'}" style="width:100%; height:100%; object-fit:cover;" />
                    </div>

                    <!-- Title / Description input -->
                    <div style="flex:1;">
                      <input class="input" style="width:100%; font-size:0.88rem;" value="${g.title || ""}" data-bind="projectsSection.projects.${i}.gallery.${gi}.title" placeholder="وصف الصورة (مثال: واجهة المبنى النهارية، التراس البانورامي، الصالة الرئيسية...)" />
                      <div style="font-size:0.72rem; color:var(--cms-text-muted); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" dir="ltr">
                        ${g.imageLight || ''}
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                      <label class="btn btn-secondary btn-xs" style="cursor:pointer;" title="تغيير هذه الصورة برفع صورة جديدة من جهازك">
                        ⬆️ تغيير
                        <input type="file" accept="image/*" style="display:none;" data-change-proj-gal="${i}:${gi}" />
                      </label>
                      <button type="button" class="btn btn-secondary btn-xs" data-pick-proj-gal="${i}:${gi}" title="اختيار صورة من مكتبة الوسائط">
                        🖼️ المكتبة
                      </button>
                      <button type="button" class="btn btn-danger btn-xs" data-del-proj-gal="${i}:${gi}" title="حذف الصورة من المعرض">
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Available Units Table Customizer -->
            <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:16px; margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <strong style="color:var(--cms-text-primary); font-size:0.95rem;">
                  3. جدول الشقق المتاحة في المشروع (${(p.availableUnits || []).length} شقق):
                </strong>
                <button type="button" class="btn btn-primary btn-xs" data-add-proj-unit="${i}">+ إضافة شقة للجدول</button>
              </div>
              ${(p.availableUnits || [])
                .map(
                  (u, ui) => `
                <div style="display:grid; grid-template-columns: 80px 1.2fr 100px 70px 70px 80px 100px 40px; gap:6px; margin-bottom:8px; align-items:center;">
                  <input class="input" value="${u.unitNo || ""}" data-bind="projectsSection.projects.${i}.availableUnits.${ui}.unitNo" placeholder="رقم الشقة" />
                  <input class="input" value="${u.type || ""}" data-bind="projectsSection.projects.${i}.availableUnits.${ui}.type" placeholder="النوع" />
                  <input class="input" value="${u.area || ""}" data-bind="projectsSection.projects.${i}.availableUnits.${ui}.area" placeholder="المساحة" />
                  <input class="input" type="number" value="${u.bedrooms || 3}" data-bind="projectsSection.projects.${i}.availableUnits.${ui}.bedrooms" placeholder="غرف" title="غرف النوم" />
                  <input class="input" type="number" value="${u.bathrooms || 3}" data-bind="projectsSection.projects.${i}.availableUnits.${ui}.bathrooms" placeholder="حمامات" title="الحمامات" />
                  <input class="input" value="${u.floor || "1"}" data-bind="projectsSection.projects.${i}.availableUnits.${ui}.floor" placeholder="الطابق" />
                  <input class="input" value="${u.statusText || "متوفرة"}" data-bind="projectsSection.projects.${i}.availableUnits.${ui}.statusText" placeholder="الحالة" />
                  <button type="button" class="btn btn-danger btn-xs" data-del-proj-unit="${i}:${ui}">✕</button>
                </div>
              `
                )
                .join("")}
            </div>

            <!-- Floorplans Customizer (With Direct Upload) -->
            <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:18px; margin-bottom:16px;">
              <strong style="color:var(--cms-gold); font-size:1rem; display:block; margin-bottom:4px;">
                📐 4. مخططات المشروع الهندسية والمعمارية:
              </strong>
              <span style="font-size:0.8rem; color:var(--cms-text-secondary); display:block; margin-bottom:14px;">
                ارفع مخططات المشروع المعمارية (PNG أو JPG أو WebP) — يتم ضغطها تلقائياً مع الحفاظ على وضوح التفاصيل الدقيقة
              </span>
              <div class="grid-3">
                <!-- Site Plan -->
                <div style="background:var(--cms-surface-alt); border:1px solid var(--cms-border); border-radius:8px; padding:12px;">
                  <strong style="font-size:0.86rem; color:var(--cms-text-primary); display:block; margin-bottom:8px;">المخطط العام للموقع (Site Plan)</strong>
                  <div style="height:100px; border-radius:6px; overflow:hidden; border:1px solid var(--cms-border); margin-bottom:10px; background:#000;">
                    <img src="${p.floorplans?.sitePlan?.image || "/images/projects/10_architectural_site_plan.webp"}" alt="Site Plan" style="width:100%; height:100%; object-fit:cover;" />
                  </div>
                  <div style="display:flex; gap:6px;">
                    <label class="btn btn-primary btn-xs" style="flex:1; cursor:pointer;">
                      ⬆️ رفع مخطط
                      <input type="file" accept="image/*" style="display:none;" data-upload-plan="${i}:sitePlan" />
                    </label>
                    <button type="button" class="btn btn-secondary btn-xs" data-pick-plan="${i}:sitePlan">🖼️ المكتبة</button>
                  </div>
                </div>

                <!-- Floor Plans -->
                <div style="background:var(--cms-surface-alt); border:1px solid var(--cms-border); border-radius:8px; padding:12px;">
                  <strong style="font-size:0.86rem; color:var(--cms-text-primary); display:block; margin-bottom:8px;">مخططات الطوابق (Floor Plans)</strong>
                  <div style="height:100px; border-radius:6px; overflow:hidden; border:1px solid var(--cms-border); margin-bottom:10px; background:#000;">
                    <img src="${p.floorplans?.floorPlans?.image || "/images/ui/floorplan-3d-light.webp"}" alt="Floor Plans" style="width:100%; height:100%; object-fit:cover;" />
                  </div>
                  <div style="display:flex; gap:6px;">
                    <label class="btn btn-primary btn-xs" style="flex:1; cursor:pointer;">
                      ⬆️ رفع مخطط
                      <input type="file" accept="image/*" style="display:none;" data-upload-plan="${i}:floorPlans" />
                    </label>
                    <button type="button" class="btn btn-secondary btn-xs" data-pick-plan="${i}:floorPlans">🖼️ المكتبة</button>
                  </div>
                </div>

                <!-- Unit Plans -->
                <div style="background:var(--cms-surface-alt); border:1px solid var(--cms-border); border-radius:8px; padding:12px;">
                  <strong style="font-size:0.86rem; color:var(--cms-text-primary); display:block; margin-bottom:8px;">مخططات الشقق (Unit Plans)</strong>
                  <div style="height:100px; border-radius:6px; overflow:hidden; border:1px solid var(--cms-border); margin-bottom:10px; background:#000;">
                    <img src="${p.floorplans?.unitPlans?.image || "/images/ui/building-interactive-light.webp"}" alt="Unit Plans" style="width:100%; height:100%; object-fit:cover;" />
                  </div>
                  <div style="display:flex; gap:6px;">
                    <label class="btn btn-primary btn-xs" style="flex:1; cursor:pointer;">
                      ⬆️ رفع مخطط
                      <input type="file" accept="image/*" style="display:none;" data-upload-plan="${i}:unitPlans" />
                    </label>
                    <button type="button" class="btn btn-secondary btn-xs" data-pick-plan="${i}:unitPlans">🖼️ المكتبة</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Location & Nearby Landmarks Customizer -->
            <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div>
                  <strong style="color:var(--cms-text-primary); font-size:0.95rem; display:block;">
                    5. خريطة الموقع والمعالم القريبة (${(p.location?.landmarks || []).length} معالم):
                  </strong>
                  <span style="font-size:0.8rem; color:var(--cms-text-secondary);">
                    تحكم بالخريطة، المعلم، الوقت بالدقائق، ونسبة الإحداثيات على الخريطة (X% و Y%)
                  </span>
                </div>
                <button type="button" class="btn btn-primary btn-xs" data-add-proj-landmark="${i}">+ إضافة معلم قريب للخريطة</button>
              </div>

              <div class="grid-2" style="margin-bottom:14px;">
                <div class="field">
                  <label>عنوان قسم الموقع</label>
                  <input class="input" value="${p.location?.title || "الموقع والمعالم القريبة"}" data-bind="projectsSection.projects.${i}.location.title" />
                </div>
                <div class="field">
                  <label>صورة خريطة المشروع الثابتة (رفع ومعاينة مباشرة):</label>
                  <div style="display:flex; gap:10px; align-items:center; background:var(--cms-surface-alt); padding:6px 12px; border-radius:8px; border:1px solid var(--cms-border);">
                    <img src="${p.location?.mapImage || "/images/projects/11_location_map.webp"}" alt="خريطة" style="width:65px; height:42px; object-fit:cover; border-radius:6px; border:1px solid var(--cms-border);" />
                    <label class="btn btn-primary btn-xs" style="cursor:pointer;">
                      ⬆️ رفع خريطة
                      <input type="file" accept="image/*" style="display:none;" data-upload-loc-map="${i}" />
                    </label>
                    <button type="button" class="btn btn-secondary btn-xs" data-pick-loc-map="${i}">🖼️ المكتبة</button>
                  </div>
                </div>
              </div>

              <!-- Real Leaflet Map Customizer -->
              <div style="margin-top: 14px; background:var(--cms-surface-alt); border:1px solid var(--cms-border); border-radius:12px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                  <div>
                    <strong style="color:var(--cms-gold); font-size:0.95rem; display:block;">
                      🗺️ خريطة الموقع الحقيقية وتحديد المعالم (Real Interactive Map)
                    </strong>
                    <span style="font-size:0.78rem; color:var(--cms-text-secondary);" id="cmsMapHelpText">
                      انقر على الخريطة أو اسحب أي دبوس (المشروع أو المعالم) لتعديل إحداثياته الحقيقية
                    </span>
                  </div>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-primary btn-xs" id="cmsPickProjectLocBtn">
                      📍 تحديد موقع المشروع بالنقر على الخريطة
                    </button>
                    <button type="button" class="btn btn-secondary btn-xs" id="cmsResetViewBtn">
                      🎯 تركيز على المشروع
                    </button>
                  </div>
                </div>

                <!-- Neighborhoods Quick Jump -->
                <div style="display:flex; gap:6px; align-items:center; margin-bottom:10px; flex-wrap:wrap;">
                  <span style="font-size:0.75rem; color:var(--cms-text-muted);">انتقال سريع في عمان:</span>
                  <button type="button" class="btn btn-secondary btn-xs cms-jump-btn" data-lat="31.9360" data-lng="35.8645">دير غبار</button>
                  <button type="button" class="btn btn-secondary btn-xs cms-jump-btn" data-lat="31.9680" data-lng="35.9020">الشميساني</button>
                  <button type="button" class="btn btn-secondary btn-xs cms-jump-btn" data-lat="31.9480" data-lng="35.8880">عبدون</button>
                  <button type="button" class="btn btn-secondary btn-xs cms-jump-btn" data-lat="31.9540" data-lng="35.8560">الصويفية</button>
                  <button type="button" class="btn btn-secondary btn-xs cms-jump-btn" data-lat="32.0150" data-lng="35.8690">الجبيهة</button>
                </div>

                <!-- Map Canvas Container -->
                <div id="cmsAdminMap" style="height:360px; width:100%; border-radius:10px; border:1px solid var(--cms-border); margin-bottom:12px; position:relative; z-index:1;"></div>

                <!-- Project Real Coordinates Inputs -->
                <div class="grid-3" style="margin-bottom:14px; background:var(--cms-surface); padding:10px 12px; border-radius:8px; border:1px solid var(--cms-border);">
                  <div class="field">
                    <label style="font-size:0.76rem;">خط العرض للمشروع (Latitude)</label>
                    <input type="number" step="0.000001" class="input" id="cmsProjLatInput" value="${p.location?.lat || 31.9360}" data-bind="projectsSection.projects.${i}.location.lat" />
                  </div>
                  <div class="field">
                    <label style="font-size:0.76rem;">خط الطول للمشروع (Longitude)</label>
                    <input type="number" step="0.000001" class="input" id="cmsProjLngInput" value="${p.location?.lng || 35.8645}" data-bind="projectsSection.projects.${i}.location.lng" />
                  </div>
                  <div class="field">
                    <label style="font-size:0.76rem;">مستوى التكبير الافتراضي (Zoom 10-18)</label>
                    <input type="number" min="10" max="19" class="input" value="${p.location?.zoom || 15}" data-bind="projectsSection.projects.${i}.location.zoom" />
                  </div>
                </div>

                <!-- Landmarks Repeater -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <strong style="font-size:0.86rem; color:var(--cms-text-secondary);">
                    قائمة المعالم القريبة على الخريطة (قابلة للسحب والتحديد):
                  </strong>
                  <button type="button" class="btn btn-secondary btn-xs" data-add-proj-landmark="${i}">
                    + إضافة معلم جديد
                  </button>
                </div>

                ${(p.location?.landmarks || [])
                  .map(
                    (lm, lmi) => `
                  <div style="display:grid; grid-template-columns: 1.3fr 110px 130px 110px 110px 95px 36px; gap:8px; margin-bottom:8px; align-items:center; background:var(--cms-surface); padding:8px 10px; border-radius:8px; border:1px solid var(--cms-border);">
                    <div>
                      <label style="font-size:0.70rem;">اسم المعلم</label>
                      <input class="input" value="${lm.name || ""}" data-bind="projectsSection.projects.${i}.location.landmarks.${lmi}.name" placeholder="اسم المعلم" />
                    </div>
                    <div>
                      <label style="font-size:0.70rem;">الوقت</label>
                      <input class="input" value="${lm.time || ""}" data-bind="projectsSection.projects.${i}.location.landmarks.${lmi}.time" placeholder="3 دقائق" />
                    </div>
                    <div>
                      <label style="font-size:0.70rem;">الأيقونة</label>
                      <select class="select" data-bind="projectsSection.projects.${i}.location.landmarks.${lmi}.icon">
                        <option value="road" ${lm.icon === "road" ? "selected" : ""}>🛣️ شارع رئيسي</option>
                        <option value="mall" ${lm.icon === "mall" ? "selected" : ""}>🛍️ مول / تجاري</option>
                        <option value="school" ${lm.icon === "school" ? "selected" : ""}>🏫 مدرسة / جامعة</option>
                        <option value="hospital" ${lm.icon === "hospital" ? "selected" : ""}>🏥 مستشفى / صحي</option>
                        <option value="park" ${lm.icon === "park" ? "selected" : ""}>🌳 حديقة / متنزه</option>
                        <option value="airport" ${lm.icon === "airport" ? "selected" : ""}>✈️ مطار</option>
                        <option value="mosque" ${lm.icon === "mosque" ? "selected" : ""}>🕌 مسجد</option>
                      </select>
                    </div>
                    <div>
                      <label style="font-size:0.70rem;">خط العرض Lat</label>
                      <input type="number" step="0.000001" class="input" id="cmsLmLat-${lmi}" value="${lm.lat || ""}" data-bind="projectsSection.projects.${i}.location.landmarks.${lmi}.lat" placeholder="31.93..." />
                    </div>
                    <div>
                      <label style="font-size:0.70rem;">خط الطول Lng</label>
                      <input type="number" step="0.000001" class="input" id="cmsLmLng-${lmi}" value="${lm.lng || ""}" data-bind="projectsSection.projects.${i}.location.landmarks.${lmi}.lng" placeholder="35.86..." />
                    </div>
                    <div style="padding-top:14px;">
                      <button type="button" class="btn btn-secondary btn-xs" data-pick-lm="${i}:${lmi}" title="انقر لتحديد موقع هذا المعلم على الخريطة">
                        📍 تحديد
                      </button>
                    </div>
                    <div style="padding-top:14px;">
                      <button type="button" class="btn btn-danger btn-xs" data-del-proj-landmark="${i}:${lmi}" title="حذف المعلم">✕</button>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

          </div>
        </div>
      `;

      listEl.querySelectorAll("[data-del-proj]").forEach((btn) => {
        btn.addEventListener("click", () => {
          cms.projectsSection.projects.splice(parseInt(btn.dataset.delProj, 10), 1);
          selectedProjectIdx = 0;
          markDirty(true);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });

      // Single Upload for Project Gallery
      listEl.querySelectorAll("[data-upload-gal-single]").forEach((inp) => {
        inp.addEventListener("change", async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const idx = parseInt(inp.dataset.uploadGalSingle, 10);
          showToast("جاري رفع وضغط صورة المعرض...");
          const url = await uploadSingleFile(file);
          if (url) {
            if (!cms.projectsSection.projects[idx].gallery) {
              cms.projectsSection.projects[idx].gallery = [];
            }
            cms.projectsSection.projects[idx].gallery.push({
              id: `g-${Date.now()}`,
              title: file.name.replace(/\.[^.]+$/, ""),
              imageLight: url,
              imageDark: url
            });
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تمت إضافة الصورة إلى معرض المشروع بنجاح!");
          }
        });
      });

      // Multi-Upload for Project Gallery
      listEl.querySelectorAll("[data-upload-gal-multi]").forEach((inp) => {
        inp.addEventListener("change", async (e) => {
          const files = e.target.files;
          if (!files || !files.length) return;
          const idx = parseInt(inp.dataset.uploadGalMulti, 10);
          if (!cms.projectsSection.projects[idx].gallery) {
            cms.projectsSection.projects[idx].gallery = [];
          }
          const uploadedList = await uploadMultipleFiles(files);
          uploadedList.forEach((item) => {
            cms.projectsSection.projects[idx].gallery.push({
              id: `g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              title: item.title,
              imageLight: item.url,
              imageDark: item.url
            });
          });
          markDirty(true);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });

      // Pick from library for new gallery item
      listEl.querySelectorAll("[data-pick-gal-new]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.pickGalNew, 10);
          openMediaPicker(null, (url) => {
            if (!cms.projectsSection.projects[idx].gallery) {
              cms.projectsSection.projects[idx].gallery = [];
            }
            cms.projectsSection.projects[idx].gallery.push({
              id: `g-${Date.now()}`,
              title: "صورة من المكتبة",
              imageLight: url,
              imageDark: url
            });
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تمت إضافة الصورة من المكتبة!");
          });
        });
      });

      // Change existing gallery item image via Upload
      listEl.querySelectorAll("[data-change-proj-gal]").forEach((inp) => {
        inp.addEventListener("change", async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const [pi, gi] = inp.dataset.changeProjGal.split(":").map(Number);
          showToast("جاري رفع وتحديث الصورة...");
          const url = await uploadSingleFile(file);
          if (url && cms.projectsSection.projects[pi]?.gallery?.[gi]) {
            cms.projectsSection.projects[pi].gallery[gi].imageLight = url;
            cms.projectsSection.projects[pi].gallery[gi].imageDark = url;
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تم تحديث صورة المعرض بنجاح!");
          }
        });
      });

      // Pick existing gallery item image from Media Library
      listEl.querySelectorAll("[data-pick-proj-gal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [pi, gi] = btn.dataset.pickProjGal.split(":").map(Number);
          openMediaPicker(null, (url) => {
            if (cms.projectsSection.projects[pi]?.gallery?.[gi]) {
              cms.projectsSection.projects[pi].gallery[gi].imageLight = url;
              cms.projectsSection.projects[pi].gallery[gi].imageDark = url;
              markDirty(true);
              renderProjectsPanel();
              bindDynamicInputs();
              showToast("تم تحديث صورة المعرض من المكتبة!");
            }
          });
        });
      });

      // Delete gallery item
      listEl.querySelectorAll("[data-del-proj-gal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [pi, gi] = btn.dataset.delProjGal.split(":").map(Number);
          cms.projectsSection.projects[pi].gallery.splice(gi, 1);
          markDirty(true);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });

      // Overview Image Upload & Pick
      listEl.querySelectorAll("[data-upload-overview]").forEach((inp) => {
        inp.addEventListener("change", async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const idx = parseInt(inp.dataset.uploadOverview, 10);
          showToast("جاري رفع صورة النظرة العامة...");
          const url = await uploadSingleFile(file);
          if (url) {
            if (!cms.projectsSection.projects[idx].overview) cms.projectsSection.projects[idx].overview = {};
            cms.projectsSection.projects[idx].overview.imageLight = url;
            cms.projectsSection.projects[idx].overview.imageDark = url;
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تم تحديث صورة النظرة العامة بنجاح!");
          }
        });
      });

      listEl.querySelectorAll("[data-pick-overview]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.pickOverview, 10);
          openMediaPicker(null, (url) => {
            if (!cms.projectsSection.projects[idx].overview) cms.projectsSection.projects[idx].overview = {};
            cms.projectsSection.projects[idx].overview.imageLight = url;
            cms.projectsSection.projects[idx].overview.imageDark = url;
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تم تحديث صورة النظرة العامة!");
          });
        });
      });

      // Floorplans Upload & Pick
      listEl.querySelectorAll("[data-upload-plan]").forEach((inp) => {
        inp.addEventListener("change", async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const [pi, planKey] = inp.dataset.uploadPlan.split(":");
          const idx = parseInt(pi, 10);
          showToast("جاري رفع المخطط المعماري...");
          const url = await uploadSingleFile(file);
          if (url) {
            if (!cms.projectsSection.projects[idx].floorplans) cms.projectsSection.projects[idx].floorplans = {};
            if (!cms.projectsSection.projects[idx].floorplans[planKey]) cms.projectsSection.projects[idx].floorplans[planKey] = {};
            cms.projectsSection.projects[idx].floorplans[planKey].image = url;
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تم تحديث المخطط بنجاح!");
          }
        });
      });

      listEl.querySelectorAll("[data-pick-plan]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [pi, planKey] = btn.dataset.pickPlan.split(":");
          const idx = parseInt(pi, 10);
          openMediaPicker(null, (url) => {
            if (!cms.projectsSection.projects[idx].floorplans) cms.projectsSection.projects[idx].floorplans = {};
            if (!cms.projectsSection.projects[idx].floorplans[planKey]) cms.projectsSection.projects[idx].floorplans[planKey] = {};
            cms.projectsSection.projects[idx].floorplans[planKey].image = url;
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تم تحديث المخطط من المكتبة!");
          });
        });
      });

      // Location Map Image Upload & Pick
      listEl.querySelectorAll("[data-upload-loc-map]").forEach((inp) => {
        inp.addEventListener("change", async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const idx = parseInt(inp.dataset.uploadLocMap, 10);
          showToast("جاري رفع صورة الخريطة...");
          const url = await uploadSingleFile(file);
          if (url) {
            if (!cms.projectsSection.projects[idx].location) cms.projectsSection.projects[idx].location = {};
            cms.projectsSection.projects[idx].location.mapImage = url;
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تم تحديث صورة الخريطة بنجاح!");
          }
        });
      });

      listEl.querySelectorAll("[data-pick-loc-map]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.pickLocMap, 10);
          openMediaPicker(null, (url) => {
            if (!cms.projectsSection.projects[idx].location) cms.projectsSection.projects[idx].location = {};
            cms.projectsSection.projects[idx].location.mapImage = url;
            markDirty(true);
            renderProjectsPanel();
            bindDynamicInputs();
            showToast("تم تحديث صورة الخريطة!");
          });
        });
      });

      listEl.querySelectorAll("[data-add-proj-unit]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.addProjUnit, 10);
          if (!cms.projectsSection.projects[idx].availableUnits) {
            cms.projectsSection.projects[idx].availableUnits = [];
          }
          cms.projectsSection.projects[idx].availableUnits.push({
            unitNo: "105",
            type: "شقة سكنية",
            area: "140 م²",
            bedrooms: 3,
            bathrooms: 3,
            floor: "1",
            status: "available",
            statusText: "متوفرة"
          });
          markDirty(true);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });

      listEl.querySelectorAll("[data-del-proj-unit]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [pi, ui] = btn.dataset.delProjUnit.split(":").map(Number);
          cms.projectsSection.projects[pi].availableUnits.splice(ui, 1);
          markDirty(true);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });

      listEl.querySelectorAll("[data-add-proj-landmark]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.addProjLandmark, 10);
          if (!cms.projectsSection.projects[idx].location) {
            cms.projectsSection.projects[idx].location = {};
          }
          if (!cms.projectsSection.projects[idx].location.landmarks) {
            cms.projectsSection.projects[idx].location.landmarks = [];
          }
          const baseLat = cms.projectsSection.projects[idx].location.lat || 31.9360;
          const baseLng = cms.projectsSection.projects[idx].location.lng || 35.8645;
          const count = cms.projectsSection.projects[idx].location.landmarks.length;
          cms.projectsSection.projects[idx].location.landmarks.push({
            id: `lm-${Date.now()}`,
            name: "معلم جديد",
            time: "5 دقائق",
            icon: "mall",
            lat: parseFloat((baseLat + (count % 2 === 0 ? 0.002 * (count + 1) : -0.002 * (count + 1))).toFixed(6)),
            lng: parseFloat((baseLng + (count < 2 ? -0.003 * (count + 1) : 0.003 * (count + 1))).toFixed(6))
          });
          markDirty(true);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });

      listEl.querySelectorAll("[data-del-proj-landmark]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const [pi, lmi] = btn.dataset.delProjLandmark.split(":").map(Number);
          cms.projectsSection.projects[pi].location.landmarks.splice(lmi, 1);
          markDirty(true);
          renderProjectsPanel();
          bindDynamicInputs();
        });
      });

      // Initialize the Real Leaflet Map Picker in CMS
      initCmsProjectMap(p, selectedProjectIdx);
    }
  }

  // =========================================================================
  // CMS REAL LEAFLET MAP ENGINE (Draggable Pins & Click-to-Pick Coords)
  // =========================================================================
  let activeCmsMap = null;
  let activeProjectMarker = null;
  let activeLandmarkMarkers = [];
  let pickingMode = null; // null | 'project' | { landmarkIdx: number }

  function initCmsProjectMap(project, projIndex) {
    const mapEl = document.getElementById("cmsAdminMap");
    if (!mapEl || !window.L) return;

    if (activeCmsMap) {
      activeCmsMap.remove();
      activeCmsMap = null;
      activeProjectMarker = null;
      activeLandmarkMarkers = [];
      pickingMode = null;
    }

    if (!project.location) project.location = {};
    const defaultLat = project.location.lat || 31.9360;
    const defaultLng = project.location.lng || 35.8645;
    const defaultZoom = project.location.zoom || 15;

    activeCmsMap = L.map("cmsAdminMap", {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom
    });

    const isDark = document.documentElement.getAttribute("data-cms-theme") !== "light";
    const tileUrl = isDark
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      maxZoom: isDark ? 16 : 19,
      attribution: '&copy; OpenStreetMap &copy; Esri'
    }).addTo(activeCmsMap);

    const helpTextEl = document.getElementById("cmsMapHelpText");
    const pickProjBtn = document.getElementById("cmsPickProjectLocBtn");
    const resetBtn = document.getElementById("cmsResetViewBtn");
    const latInput = document.getElementById("cmsProjLatInput");
    const lngInput = document.getElementById("cmsProjLngInput");

    // Project Marker (Draggable)
    const projIcon = L.divIcon({
      className: "cms-proj-pin",
      html: `
        <div style="transform:translate(-50%,-50%); text-align:center; cursor:grab;">
          <div style="width:38px; height:38px; background:#14171C; border:2.5px solid #D4AF37; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; box-shadow:0 4px 14px rgba(0,0,0,0.5);">
            🏢
          </div>
          <div style="background:#111827; border:1px solid #D4AF37; color:#E6C575; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:6px; margin-top:4px; white-space:nowrap;">
            ${project.title || "المشروع"}
          </div>
        </div>
      `,
      iconSize: [120, 65],
      iconAnchor: [60, 19]
    });

    activeProjectMarker = L.marker([defaultLat, defaultLng], {
      draggable: true,
      icon: projIcon,
      zIndexOffset: 1000
    }).addTo(activeCmsMap);

    activeProjectMarker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      const nLat = parseFloat(pos.lat.toFixed(6));
      const nLng = parseFloat(pos.lng.toFixed(6));
      project.location.lat = nLat;
      project.location.lng = nLng;
      if (latInput) latInput.value = nLat;
      if (lngInput) lngInput.value = nLng;
      markDirty(true);
      if (helpTextEl) helpTextEl.textContent = `✅ تم تحديث موقع المشروع: (${nLat}, ${nLng})`;
    });

    // Add Landmarks Markers (Draggable)
    const iconEmojis = {
      road: "🛣️",
      mall: "🛍️",
      school: "🏫",
      hospital: "🏥",
      park: "🌳",
      airport: "✈️",
      mosque: "🕌"
    };

    const landmarks = Array.isArray(project.location.landmarks) ? project.location.landmarks : [];
    landmarks.forEach((lm, lmi) => {
      const lmLat = lm.lat !== undefined ? lm.lat : defaultLat + (lmi % 2 === 0 ? 0.003 * (lmi + 1) : -0.003 * (lmi + 1));
      const lmLng = lm.lng !== undefined ? lm.lng : defaultLng + (lmi < 2 ? -0.004 * (lmi + 1) : 0.004 * (lmi + 1));
      lm.lat = parseFloat(lmLat.toFixed(6));
      lm.lng = parseFloat(lmLng.toFixed(6));

      const lmIcon = L.divIcon({
        className: "cms-lm-pin",
        html: `
          <div style="transform:translate(-50%,-50%); text-align:center; cursor:grab;">
            <div style="width:32px; height:32px; background:#FFFFFF; color:#1A1E24; border:2px solid #333; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1rem; box-shadow:0 3px 10px rgba(0,0,0,0.4);">
              ${iconEmojis[lm.icon] || "📍"}
            </div>
            <div style="background:#1F2937; border:1px solid #4B5563; color:#F9FAFB; font-size:0.72rem; padding:2px 6px; border-radius:5px; margin-top:3px; white-space:nowrap;">
              ${lm.name || `معلم ${lmi + 1}`}
            </div>
          </div>
        `,
        iconSize: [110, 58],
        iconAnchor: [55, 16]
      });

      const lmMarker = L.marker([lmLat, lmLng], { draggable: true, icon: lmIcon }).addTo(activeCmsMap);

      lmMarker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        const nLat = parseFloat(pos.lat.toFixed(6));
        const nLng = parseFloat(pos.lng.toFixed(6));
        lm.lat = nLat;
        lm.lng = nLng;
        const latEl = document.getElementById(`cmsLmLat-${lmi}`);
        const lngEl = document.getElementById(`cmsLmLng-${lmi}`);
        if (latEl) latEl.value = nLat;
        if (lngEl) lngEl.value = nLng;
        markDirty(true);
        if (helpTextEl) helpTextEl.textContent = `✅ تم تحديث موقع المعلم "${lm.name}": (${nLat}, ${nLng})`;
      });

      activeLandmarkMarkers.push(lmMarker);
    });

    // Map Click Listener
    activeCmsMap.on("click", (e) => {
      const clickLat = parseFloat(e.latlng.lat.toFixed(6));
      const clickLng = parseFloat(e.latlng.lng.toFixed(6));

      if (pickingMode === "project") {
        project.location.lat = clickLat;
        project.location.lng = clickLng;
        activeProjectMarker.setLatLng([clickLat, clickLng]);
        if (latInput) latInput.value = clickLat;
        if (lngInput) lngInput.value = clickLng;
        pickingMode = null;
        if (pickProjBtn) {
          pickProjBtn.textContent = "📍 تحديد موقع المشروع بالنقر على الخريطة";
          pickProjBtn.classList.remove("btn-gold-solid");
        }
        if (helpTextEl) helpTextEl.textContent = `✅ تم تحديد موقع المشروع: (${clickLat}, ${clickLng})`;
        markDirty(true);
      } else if (pickingMode && pickingMode.landmarkIdx !== undefined) {
        const lmi = pickingMode.landmarkIdx;
        const targetLm = landmarks[lmi];
        if (targetLm) {
          targetLm.lat = clickLat;
          targetLm.lng = clickLng;
          const marker = activeLandmarkMarkers[lmi];
          if (marker) marker.setLatLng([clickLat, clickLng]);
          const latEl = document.getElementById(`cmsLmLat-${lmi}`);
          const lngEl = document.getElementById(`cmsLmLng-${lmi}`);
          if (latEl) latEl.value = clickLat;
          if (lngEl) lngEl.value = clickLng;
          if (helpTextEl) helpTextEl.textContent = `✅ تم تحديد موقع المعلم "${targetLm.name}": (${clickLat}, ${clickLng})`;
          markDirty(true);
        }
        pickingMode = null;
        document.querySelectorAll("[data-pick-lm]").forEach((b) => {
          b.textContent = "📍 تحديد";
          b.classList.remove("btn-gold-solid");
        });
      }
    });

    // Buttons
    if (pickProjBtn) {
      pickProjBtn.onclick = () => {
        if (pickingMode === "project") {
          pickingMode = null;
          pickProjBtn.textContent = "📍 تحديد موقع المشروع بالنقر على الخريطة";
          pickProjBtn.classList.remove("btn-gold-solid");
          if (helpTextEl) helpTextEl.textContent = "انقر على الخريطة أو اسحب أي دبوس لتعديل إحداثياته الحقيقية";
        } else {
          pickingMode = "project";
          pickProjBtn.textContent = "👉 انقر الآن على أي نقطة بالخريطة لتثبيت المشروع";
          pickProjBtn.classList.add("btn-gold-solid");
          if (helpTextEl) helpTextEl.textContent = "👉 وضع التحديد نشط: انقر في المكان المطلوب لتثبيت موقع المشروع الرئيسي";
        }
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        activeCmsMap.flyTo([project.location.lat || 31.9360, project.location.lng || 35.8645], project.location.zoom || 15);
      };
    }

    // Neighborhood jump buttons
    document.querySelectorAll(".cms-jump-btn").forEach((btn) => {
      btn.onclick = () => {
        const jLat = parseFloat(btn.dataset.lat);
        const jLng = parseFloat(btn.dataset.lng);
        activeCmsMap.flyTo([jLat, jLng], 15);
      };
    });

    // Landmark pick buttons
    document.querySelectorAll("[data-pick-lm]").forEach((btn) => {
      btn.onclick = () => {
        const [pi, lmi] = btn.dataset.pickLm.split(":").map(Number);
        const lm = landmarks[lmi];
        pickingMode = { landmarkIdx: lmi };
        document.querySelectorAll("[data-pick-lm]").forEach((b) => {
          b.textContent = "📍 تحديد";
          b.classList.remove("btn-gold-solid");
        });
        btn.textContent = "👉 انقر على الخريطة";
        btn.classList.add("btn-gold-solid");
        if (helpTextEl) helpTextEl.textContent = `👉 انقر على الخريطة لتحديد موقع "${lm?.name || "المعلم"}"`;
      };
    });

    setTimeout(() => {
      if (activeCmsMap) activeCmsMap.invalidateSize();
    }, 150);
  }

  // =========================================================================
  const FORMAL_SVGS = {
    area: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    bed: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
    finish: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 11V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z"/><path d="M19 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-9v6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-6H5"/></svg>`,
    landmark: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10"/></svg>`,
    tree: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-7"/><path d="M9 15c-3 0-5-2.5-5-5.5S6.5 3 12 3s8 3.5 8 6.5-2 5.5-5 5.5H9z"/></svg>`,
    sun: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
    location: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    security: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
    kids: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    gym: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5l11 11"/><path d="M21 21l-1-1"/><path d="M3 3l1 1"/><path d="M18 22l4-4"/><path d="M2 6l4-4"/><path d="M3 10l7-7"/><path d="M14 21l7-7"/></svg>`,
    green: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-7"/><path d="M9 15c-3 0-5-2.5-5-5.5S6.5 3 12 3s8 3.5 8 6.5-2 5.5-5 5.5H9z"/></svg>`,
    parking: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><path d="M5 6l2-3h10l2 3"/></svg>`,
    pool: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 17c3 0 4 1 6 1s4-1 6-1 4 1 6 1"/><path d="M2 21c3 0 4 1 6 1s4-1 6-1 4 1 6 1"/><path d="M8 13V5a3 3 0 0 1 6 0v8"/><circle cx="17" cy="8" r="2"/></svg>`,
    padel: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><line x1="6" y1="10" x2="14" y2="10"/><line x1="10" y1="6" x2="10" y2="14"/><path d="M15 15l6 6"/><circle cx="19" cy="5" r="2"/></svg>`,
    elevator: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><polyline points="8 9 10 7 12 9"/><polyline points="12 15 14 17 16 15"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    ev: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    solar: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
    smarthome: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="2"/><line x1="12" y1="15" x2="12" y2="18"/></svg>`,
    ac: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/><circle cx="12" cy="12" r="2"/></svg>`,
    heating: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    view: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>`,
    lounge: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    mosque: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c-3 3-4 6-4 8h8c0-2-1-5-4-8z"/><path d="M4 21V12h16v9"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><circle cx="12" cy="2" r="0.8"/></svg>`,
    spa: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2C6.5 2 2 6.5 2 12c0 3 1.5 5.5 4 7l2-3c-1.5-1-2.5-2.5-2.5-4 0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5c0 1.5-1 3-2.5 4l2 3c2.5-1.5 4-4 4-7 0-5.5-4.5-10-10-10z"/><circle cx="12" cy="12" r="2"/></svg>`,
    cctv: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 7h15l4 4-4 4H2V7z"/><circle cx="8" cy="11" r="2"/><line x1="7" y1="15" x2="7" y2="21"/></svg>`,
    wifi: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    maintenance: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    shopping: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    balcony: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="8" y1="14" x2="8" y2="21"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="16" y1="14" x2="16" y2="21"/></svg>`,
    soundproof: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    cinema: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
    bike: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><polyline points="15 6 9 6 12 12"/><path d="M5.5 17.5l6-5.5 7 5.5"/></svg>`,
    storage: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
    key: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3M18.5 4.5l3 3"/></svg>`,
    concierge: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    gate: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
    bbq: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 12c4.42 0 8-1.79 8-4H4c0 2.21 3.58 4 8 4z"/><line x1="7" y1="12" x2="5" y2="21"/><line x1="17" y1="12" x2="19" y2="21"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
    star: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    architecture: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 22h20M4 22V7l8-4 8 4v15M9 22V12h6v10"/></svg>`
  };

  
  // PANEL 4: INTERACTIVE UNIT EXPLORER & APARTMENTS (Clean Sub-Tab Selector)
  // =========================================================================
  function renderExplorerPanel() {
    const exp = cms.explorerSection = cms.explorerSection || {};
    if (!Array.isArray(exp.units)) {
      exp.units = [
        {
          id: "apt-a",
          category: "شقق",
          title: "شقة A",
          area: "145 م²",
          bedrooms: "3 غرف",
          featureBadge: "إطلالة على المدينة",
          featureIcon: "landmark",
          planImage: "/images/ui/unit-plan-a.webp",
          mainImage: "/images/light/scene-2.webp",
          caption: "تصميم عصري ومساحات رحبة"
        },
        {
          id: "duplex",
          category: "دوبلكس",
          title: "دوبلكس",
          area: "220 م²",
          bedrooms: "4 غرف",
          featureBadge: "حديقة خاصة",
          featureIcon: "tree",
          planImage: "/images/ui/unit-plan-duplex.webp",
          mainImage: "/images/light/scene-1.webp",
          caption: "دوبلكس فسيح مع مدخل وحديقة مستقلة"
        },
        {
          id: "penthouse",
          category: "بنتهاوس",
          title: "بنتهاوس",
          area: "280 م²",
          bedrooms: "4 غرف",
          featureBadge: "إطلالة بانورامية",
          featureIcon: "sun",
          planImage: "/images/ui/unit-plan-penthouse.webp",
          mainImage: "/images/light/scene-4.webp",
          caption: "إطلالة بانورامية ساحرة على أفق المدينة"
        }
      ];
    }
    if (!Array.isArray(exp.categories)) {
      exp.categories = ["شقق", "دوبلكس", "بنتهاوس"];
    }
    if (!Array.isArray(exp.summaryMetrics)) {
      exp.summaryMetrics = [
        { id: "metric-area", icon: "area", label: "المساحة", value: "60 - 280 م²" },
        { id: "metric-rooms", icon: "bed", label: "عدد الغرف", value: "1 - 4 غرف" },
        { id: "metric-view", icon: "view", label: "الإطلالة", value: "متنوعة" },
        { id: "metric-finish", icon: "finish", label: "التشطيب", value: "فاخر" }
      ];
    }
    if (!Array.isArray(exp.apartments)) {
      exp.apartments = [];
    }

    // 1. Header Editor
    const headerEl = document.getElementById("explorerHeaderEditor");
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="grid-3">
          <div class="field">
            <label>العنوان الفرعي الذهبي (Eyebrow)</label>
            <input class="input" value="${exp.eyebrow || "وحدات متنوعة"}" data-bind="explorerSection.eyebrow" placeholder="وحدات متنوعة" />
          </div>
          <div class="field">
            <label>العنوان الرئيسي للقسم (Title)</label>
            <input class="input" value="${exp.title || ""}" data-bind="explorerSection.title" placeholder="خيارات سكنية تناسب أسلوب حياتك" />
          </div>
          <div class="field">
            <label>نص زر الإجراء (CTA Text)</label>
            <input class="input" value="${exp.ctaText || "استعرض الوحدات المتاحة"}" data-bind="explorerSection.ctaText" />
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label>الوصف التوضيحي للقسم (Subtitle)</label>
            <textarea class="textarea" rows="2" data-bind="explorerSection.subtitle">${exp.subtitle || ""}</textarea>
          </div>
          <div class="field">
            <label>رابط زر الإجراء (CTA Link)</label>
            <input class="input" dir="ltr" value="${exp.ctaLink || "#booking"}" data-bind="explorerSection.ctaLink" placeholder="#booking" />
          </div>
        </div>
      `;
    }

    // 2. Metrics Editor
    const metricsEl = document.getElementById("explorerMetricsEditor");
    if (metricsEl) {
      metricsEl.innerHTML = `
        <div class="grid-4">
          ${exp.summaryMetrics
            .map(
              (m, mi) => `
            <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="color:var(--cms-gold); font-size:0.88rem;">مؤشر ${mi + 1}</strong>
                <span style="display:inline-flex; align-items:center; color:var(--cms-gold);">${FORMAL_SVGS[m.icon] || FORMAL_SVGS.area || ""}</span>
              </div>
              <div class="field" style="margin-bottom:8px;">
                <label style="font-size:0.78rem;">تسمية المؤشر (Label)</label>
                <input class="input" value="${m.label || ""}" data-bind="explorerSection.summaryMetrics.${mi}.label" />
              </div>
              <div class="field" style="margin-bottom:8px;">
                <label style="font-size:0.78rem;">القيمة (Value)</label>
                <input class="input" value="${m.value || ""}" data-bind="explorerSection.summaryMetrics.${mi}.value" />
              </div>
              <div class="field">
                <label style="font-size:0.78rem;">نوع الأيقونة</label>
                <select class="select" data-bind="explorerSection.summaryMetrics.${mi}.icon">
                  <option value="area" ${m.icon === "area" ? "selected" : ""}>📐 مساحة (Area)</option>
                  <option value="bed" ${m.icon === "bed" ? "selected" : ""}>🛏️ غرف نوم (Bed)</option>
                  <option value="view" ${m.icon === "view" ? "selected" : ""}>👁️ إطلالة (View)</option>
                  <option value="finish" ${m.icon === "finish" ? "selected" : ""}>✨ تشطيب (Finish)</option>
                  <option value="landmark" ${m.icon === "landmark" ? "selected" : ""}>🏛️ معلم/مدينة (City)</option>
                  <option value="tree" ${m.icon === "tree" ? "selected" : ""}>🌳 حديقة (Garden)</option>
                  <option value="star" ${m.icon === "star" ? "selected" : ""}>⭐ ميزة خاصة (Star)</option>
                </select>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    // 3. Categories Editor
    const catEl = document.getElementById("explorerCategoriesEditor");
    if (catEl) {
      catEl.innerHTML = `
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          ${exp.categories
            .map(
              (cat, ci) => `
            <div style="display:inline-flex; align-items:center; gap:8px; background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:9999px; padding:6px 14px;">
              <span style="font-weight:700; color:var(--cms-text-primary); font-size:0.9rem;">${cat}</span>
              <button type="button" class="btn btn-danger btn-xs" style="padding:2px 6px; border-radius:50%; min-width:auto; font-size:0.75rem;" data-del-exp-cat="${ci}" title="حذف الفئة">✕</button>
            </div>
          `
            )
            .join("")}
          <div style="display:inline-flex; align-items:center; gap:6px;">
            <input type="text" id="newExpCategoryInput" class="input" style="width:140px; padding:6px 10px; font-size:0.85rem;" placeholder="اسم الفئة الجديدة..." />
            <button type="button" class="btn btn-secondary btn-sm" id="confirmAddExpCatBtn">+ إضافة</button>
          </div>
        </div>
      `;

      catEl.querySelectorAll("[data-del-exp-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const ci = parseInt(btn.dataset.delExpCat, 10);
          exp.categories.splice(ci, 1);
          markDirty(true);
          renderExplorerPanel();
          bindDynamicInputs();
        });
      });

      const addCatBtn = document.getElementById("confirmAddExpCatBtn");
      const addCatInp = document.getElementById("newExpCategoryInput");
      if (addCatBtn && addCatInp) {
        addCatBtn.addEventListener("click", () => {
          const val = addCatInp.value.trim();
          if (val && !exp.categories.includes(val)) {
            exp.categories.push(val);
            markDirty(true);
            renderExplorerPanel();
            bindDynamicInputs();
            showToast(`تمت إضافة الفئة "${val}" بنجاح!`);
          }
        });
      }
    }

    // 4. Showcase Units Repeater (Card 4: شقة A، دوبلكس، بنتهاوس)
    const units = exp.units || [];
    if (selectedShowcaseUnitIdx >= units.length) selectedShowcaseUnitIdx = Math.max(0, units.length - 1);

    const scSubtabsEl = document.getElementById("showcaseUnitsSubtabs");
    if (scSubtabsEl) {
      scSubtabsEl.innerHTML = units
        .map(
          (u, idx) => `
        <button type="button" class="subtab-pill ${idx === selectedShowcaseUnitIdx ? "active" : ""}" data-sc-unit-tab="${idx}">
          <span>🏠 ${u.title || "وحدة سكنية"} (${u.area || ""}) [${u.category || "عام"}]</span>
        </button>
      `
        )
        .join("");

      scSubtabsEl.querySelectorAll("[data-sc-unit-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedShowcaseUnitIdx = parseInt(btn.dataset.scUnitTab, 10);
          renderExplorerPanel();
          bindDynamicInputs();
        });
      });
    }

    const scEditorEl = document.getElementById("showcaseUnitsEditor");
    if (scEditorEl) {
      if (!units.length) {
        scEditorEl.innerHTML = `<div style="padding:24px; text-align:center; color:var(--cms-text-muted);">لا توجد وحدات سكنية حالياً. انقر على "+ إضافة وحدة سكنية جديدة" بالأعلى.</div>`;
      } else {
        const i = selectedShowcaseUnitIdx;
        const u = units[i];

        scEditorEl.innerHTML = `
          <div class="subcard">
            <div class="subcard-top">
              <strong style="color:var(--cms-gold); font-size:1.1rem;">تحرير بطاقة ومواصفات: ${u.title} (${u.category})</strong>
              <button type="button" class="btn btn-danger btn-xs" data-del-sc-unit="${i}">حذف هذه الوحدة</button>
            </div>
            <div class="grid-4">
              <div class="field">
                <label>اسم / عنوان الوحدة (Title)</label>
                <input class="input" value="${u.title || ""}" data-bind="explorerSection.units.${i}.title" placeholder="شقة A" />
              </div>
              <div class="field">
                <label>الفئة السكنية (Category)</label>
                <select class="select" data-bind="explorerSection.units.${i}.category">
                  ${(exp.categories || ["شقق", "دوبلكس", "بنتهاوس"])
                    .map((c) => `<option value="${c}" ${u.category === c ? "selected" : ""}>${c}</option>`)
                    .join("")}
                </select>
              </div>
              <div class="field">
                <label>المساحة الإجمالية (Area)</label>
                <input class="input" value="${u.area || ""}" data-bind="explorerSection.units.${i}.area" placeholder="145 م²" />
              </div>
              <div class="field">
                <label>عدد الغرف (Bedrooms)</label>
                <input class="input" value="${u.bedrooms || ""}" data-bind="explorerSection.units.${i}.bedrooms" placeholder="3 غرف" />
              </div>
            </div>
            <div class="grid-3">
              <div class="field">
                <label>وسم الميزة والإطلالة (Feature Badge)</label>
                <input class="input" value="${u.featureBadge || ""}" data-bind="explorerSection.units.${i}.featureBadge" placeholder="إطلالة على المدينة" />
              </div>
              <div class="field">
                <label>أيقونة الميزة (Feature Icon)</label>
                <select class="select" data-bind="explorerSection.units.${i}.featureIcon">
                  <option value="landmark" ${u.featureIcon === "landmark" ? "selected" : ""}>🏛️ مدينة / معلم (City)</option>
                  <option value="tree" ${u.featureIcon === "tree" ? "selected" : ""}>🌳 حديقة خاصة (Garden)</option>
                  <option value="sun" ${u.featureIcon === "sun" ? "selected" : ""}>🌅 إطلالة بانورامية / شمس (Panorama)</option>
                  <option value="view" ${u.featureIcon === "view" ? "selected" : ""}>👁️ إطلالة مفتوحة (View)</option>
                  <option value="balcony" ${u.featureIcon === "balcony" ? "selected" : ""}>🏡 تراس / بلكونة (Balcony)</option>
                  <option value="pool" ${u.featureIcon === "pool" ? "selected" : ""}>🏊 إطلالة مسبح (Pool)</option>
                  <option value="star" ${u.featureIcon === "star" ? "selected" : ""}>⭐ ميزة فاخرة (Luxury)</option>
                </select>
              </div>
              <div class="field">
                <label>تسمية شارة الصورة التوضيحية (Photo Caption)</label>
                <input class="input" value="${u.caption || ""}" data-bind="explorerSection.units.${i}.caption" placeholder="تصميم عصري ومساحات رحبة" />
              </div>
            </div>

            <!-- Floor Plan and Main Image Uploaders -->
            <div class="grid-2" style="margin-top:14px; padding-top:14px; border-top:1px solid var(--cms-border);">
              <!-- Floor Plan Box -->
              <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:14px;">
                <strong style="color:var(--cms-gold); font-size:0.9rem; display:block; margin-bottom:8px;">📐 صورة المخطط الهندسي (Floor Plan):</strong>
                <div style="height:140px; border-radius:8px; overflow:hidden; border:1px solid var(--cms-border); margin-bottom:10px; background:#111; display:flex; align-items:center; justify-content:center; padding:8px;">
                  <img src="${u.planImage || "/images/ui/unit-plan-a.webp"}" alt="Floorplan" style="max-height:100%; max-width:100%; object-fit:contain;" />
                </div>
                <input class="input" style="margin-bottom:8px;" dir="ltr" value="${u.planImage || ""}" data-bind="explorerSection.units.${i}.planImage" placeholder="/images/ui/unit-plan-a.webp" />
                <div style="display:flex; gap:8px;">
                  <label class="btn btn-primary btn-sm" style="flex:1; cursor:pointer; text-align:center;">
                    ⬆️ رفع مخطط جديد
                    <input type="file" accept="image/*" style="display:none;" data-upload-sc-plan="${i}" />
                  </label>
                  <button type="button" class="btn btn-secondary btn-sm" data-pick-sc-plan="${i}">🖼️ المكتبة</button>
                </div>
              </div>

              <!-- Living Room Main Photo Box -->
              <div style="background:var(--cms-surface); border:1px solid var(--cms-border); border-radius:10px; padding:14px;">
                <strong style="color:var(--cms-gold); font-size:0.9rem; display:block; margin-bottom:8px;">📸 صورة المعاينة المعمارية للوحدة (Main Living Photo):</strong>
                <div style="height:140px; border-radius:8px; overflow:hidden; border:1px solid var(--cms-border); margin-bottom:10px; background:#111;">
                  <img src="${u.mainImage || "/images/light/scene-2.webp"}" alt="Main View" style="width:100%; height:100%; object-fit:cover;" />
                </div>
                <input class="input" style="margin-bottom:8px;" dir="ltr" value="${u.mainImage || ""}" data-bind="explorerSection.units.${i}.mainImage" placeholder="/images/light/scene-2.webp" />
                <div style="display:flex; gap:8px;">
                  <label class="btn btn-primary btn-sm" style="flex:1; cursor:pointer; text-align:center;">
                    ⬆️ رفع صورة جديدة
                    <input type="file" accept="image/*" style="display:none;" data-upload-sc-main="${i}" />
                  </label>
                  <button type="button" class="btn btn-secondary btn-sm" data-pick-sc-main="${i}">🖼️ المكتبة</button>
                </div>
              </div>
            </div>
          </div>
        `;

        scEditorEl.querySelectorAll("[data-upload-sc-plan]").forEach((inp) => {
          inp.addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const idx = parseInt(inp.dataset.uploadScPlan, 10);
            showToast("جاري ضغط ورفع المخطط الهندسي...");
            const url = await uploadSingleFile(file);
            if (url) {
              cms.explorerSection.units[idx].planImage = url;
              markDirty(true);
              renderExplorerPanel();
              bindDynamicInputs();
              showToast("تم تحديث المخطط الهندسي بنجاح!");
            }
          });
        });

        scEditorEl.querySelectorAll("[data-pick-sc-plan]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.pickScPlan, 10);
            openMediaPicker(null, (url) => {
              cms.explorerSection.units[idx].planImage = url;
              markDirty(true);
              renderExplorerPanel();
              bindDynamicInputs();
            });
          });
        });

        scEditorEl.querySelectorAll("[data-upload-sc-main]").forEach((inp) => {
          inp.addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const idx = parseInt(inp.dataset.uploadScMain, 10);
            showToast("جاري ضغط ورفع صورة الوحدة...");
            const url = await uploadSingleFile(file);
            if (url) {
              cms.explorerSection.units[idx].mainImage = url;
              markDirty(true);
              renderExplorerPanel();
              bindDynamicInputs();
              showToast("تم تحديث صورة الوحدة بنجاح!");
            }
          });
        });

        scEditorEl.querySelectorAll("[data-pick-sc-main]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.pickScMain, 10);
            openMediaPicker(null, (url) => {
              cms.explorerSection.units[idx].mainImage = url;
              markDirty(true);
              renderExplorerPanel();
              bindDynamicInputs();
            });
          });
        });

        scEditorEl.querySelectorAll("[data-del-sc-unit]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.delScUnit, 10);
            cms.explorerSection.units.splice(idx, 1);
            selectedShowcaseUnitIdx = 0;
            markDirty(true);
            renderExplorerPanel();
            bindDynamicInputs();
            showToast("تم حذف الوحدة السكنية");
          });
        });
      }
    }

    // 5. Card 5: Apartment Specifications & Full Interior Gallery (شقة - A، B، C)
    const apts = exp.apartments || [];
    if (selectedApartmentIdx >= apts.length) selectedApartmentIdx = Math.max(0, apts.length - 1);

    const aptSubtabsEl = document.getElementById("apartmentsSubtabs");
    if (aptSubtabsEl) {
      const projMap = {};
      (cms.projectsSection?.projects || []).forEach((p) => {
        projMap[p.id] = p.title;
      });

      aptSubtabsEl.innerHTML = apts
        .map(
          (apt, idx) => `
        <button type="button" class="subtab-pill ${idx === selectedApartmentIdx ? "active" : ""}" data-apt-tab="${idx}">
          <span>🏠 [${projMap[apt.buildingId] || apt.buildingId || "مشروع 1"}] ${apt.title || apt.code} — <b style="color:var(--cms-gold);">${apt.price || "غير محدد"}</b></span>
        </button>
      `
        )
        .join("");

      aptSubtabsEl.querySelectorAll("[data-apt-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedApartmentIdx = parseInt(btn.dataset.aptTab, 10);
          renderExplorerPanel();
          bindDynamicInputs();
        });
      });
    }

    const aptsEl = document.getElementById("apartmentsEditor");
    if (aptsEl) {
      if (!apts.length) {
        aptsEl.innerHTML = `<div style="padding:24px; text-align:center; color:var(--cms-text-muted);">لا توجد نماذج شقق حالياً. انقر على "+ إضافة نموذج شقة جديد" بالأعلى.</div>`;
      } else {
        const i = selectedApartmentIdx;
        const apt = apts[i];

        const projMap = {};
        (cms.projectsSection?.projects || []).forEach((p) => {
          projMap[p.id] = p.title;
        });

        aptsEl.innerHTML = `
          <div class="subcard">
            <div class="subcard-top" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div>
                <strong style="color:var(--cms-gold); font-size:1.1rem;">تحرير مواصفات ومعرض الشقة: ${apt.title} (الرمز: ${apt.code || apt.id})</strong>
                <span class="badge subtle" style="margin-right:8px;">${projMap[apt.buildingId] || apt.buildingId || "مشروع 1"}</span>
              </div>
              <div style="display:flex; gap:8px;">
                <a href="/apartment?id=${apt.id || apt.code}&project=${apt.buildingId || 'proj-1'}" target="_blank" class="btn btn-secondary btn-xs" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                  <span>🔗 معاينة صفحة الشقة</span>
                </a>
                <button type="button" class="btn btn-danger btn-xs" data-del-apt="${i}">حذف هذه الشقة</button>
              </div>
            </div>

            <div class="grid-4">
              <div class="field">
                <label>العمارة / المجمع السكني التابع له</label>
                <select class="select" data-bind="explorerSection.apartments.${i}.buildingId">
                  ${(cms.projectsSection?.projects || []).map((p) => `
                    <option value="${p.id}" ${(apt.buildingId || "proj-1") === p.id ? "selected" : ""}>
                      ${p.title} (${p.id})
                    </option>
                  `).join("")}
                </select>
              </div>
              <div class="field">
                <label>رمز / رقم الشقة (مثال: A-101)</label>
                <input class="input" value="${apt.code || ""}" data-bind="explorerSection.apartments.${i}.code" placeholder="A-101" />
              </div>
              <div class="field">
                <label>عنوان الشقة (مثال: شقة فاخرة A-101)</label>
                <input class="input" value="${apt.title || ""}" data-bind="explorerSection.apartments.${i}.title" />
              </div>
              <div class="field">
                <label>نوع الشقة (طابقية / دوبلكس / روف)</label>
                <input class="input" value="${apt.type || ""}" data-bind="explorerSection.apartments.${i}.type" placeholder="شقة طابقية فاخرة" />
              </div>
            </div>

            <div class="grid-4" style="background:rgba(219,197,152,0.06); padding:12px; border-radius:10px; border:1px solid rgba(219,197,152,0.25); margin-top:10px;">
              <div class="field">
                <label style="color:var(--cms-gold); font-weight:700;">سعر الشقة (مع العملة)</label>
                <input class="input" style="border-color:var(--cms-gold); font-weight:700; font-size:1.05rem;" value="${apt.price || ""}" data-bind="explorerSection.apartments.${i}.price" placeholder="مثال: 145,000 د.أ" />
              </div>
              <div class="field">
                <label>ملاحظة السعر / شروط الدفع</label>
                <input class="input" value="${apt.priceNote || ""}" data-bind="explorerSection.apartments.${i}.priceNote" placeholder="مثال: شامل رسوم التسجيل / دفعة 25%" />
              </div>
              <div class="field">
                <label>حالة التوفر</label>
                <select class="select" data-bind="explorerSection.apartments.${i}.status">
                  <option value="available" ${apt.status === "available" ? "selected" : ""}>🟢 متاحة للبيع</option>
                  <option value="reserved" ${apt.status === "reserved" ? "selected" : ""}>⚪ محجوزة</option>
                  <option value="sold" ${apt.status === "sold" ? "selected" : ""}>🔴 تم البيع</option>
                </select>
              </div>
              <div class="field">
                <label>نص شارة الحالة</label>
                <input class="input" value="${apt.statusText || ""}" data-bind="explorerSection.apartments.${i}.statusText" placeholder="متاحة" />
              </div>
            </div>

            <div class="grid-4" style="margin-top:10px;">
              <div class="field">
                <label>المساحة (م²)</label>
                <input class="input" value="${apt.area || ""}" data-bind="explorerSection.apartments.${i}.area" placeholder="185 م²" />
              </div>
              <div class="field">
                <label>الطابق</label>
                <input class="input" value="${apt.floor || ""}" data-bind="explorerSection.apartments.${i}.floor" placeholder="الطابق الأول" />
              </div>
              <div class="field">
                <label>غرف النوم</label>
                <input class="input" value="${apt.bedrooms || ""}" data-bind="explorerSection.apartments.${i}.bedrooms" placeholder="3 نوم (1 ماستر)" />
              </div>
              <div class="field">
                <label>الحمامات</label>
                <input class="input" value="${apt.bathrooms || ""}" data-bind="explorerSection.apartments.${i}.bathrooms" placeholder="3 حمامات" />
              </div>
            </div>

            <div class="grid-3" style="margin-top:10px;">
              <div class="field">
                <label>الاتجاه والإطلالة</label>
                <input class="input" value="${apt.direction || ""}" data-bind="explorerSection.apartments.${i}.direction" placeholder="جنوبي شرقي - إطلالة مفتوحة" />
              </div>
              <div class="field">
                <label>رابط الصورة الرئيسية للشقة</label>
                <input class="input" value="${apt.mainImage || ""}" data-bind="explorerSection.apartments.${i}.mainImage" placeholder="/images/living-room.webp" />
              </div>
              <div class="field">
                <label>رابط المخطط الهندسي (Floor Plan)</label>
                <input class="input" value="${apt.planImage || ""}" data-bind="explorerSection.apartments.${i}.planImage" placeholder="/images/floorplan-apt-a.webp" />
              </div>
            </div>

            <div class="grid-2" style="margin-top:10px;">
              <div class="field">
                <label>نص زر حجز المشاهدة (الذهبي)</label>
                <input class="input" value="${apt.bookCtaText || "احجز موعد مشاهدة"}" data-bind="explorerSection.apartments.${i}.bookCtaText" />
              </div>
              <div class="field">
                <label>نص زر تحميل المخطط</label>
                <input class="input" value="${apt.downloadPlanText || "تحميل المخطط"}" data-bind="explorerSection.apartments.${i}.downloadPlanText" />
              </div>
            </div>

            <!-- 4 Features Editor (صالة واسعة، مطبخ مقفلة، مطبخ حديث، 3 حمامات) -->
            <div style="margin-top:12px; padding-top:14px; border-top:1px solid var(--cms-border);">
              <strong style="display:block; margin-bottom:10px; font-size:0.92rem; color:var(--cms-gold);">أزرار ومزايا الشقة الأربع (تظهر أسفل المواصفات):</strong>
              <div class="grid-4">
                ${(apt.features || [])
                  .map(
                    (f, fi) => `
                  <div class="field" style="background:var(--cms-surface); border:1px solid var(--cms-border); padding:10px; border-radius:8px;">
                    <label style="font-size:0.8rem; margin-bottom:6px;">ميزة ${fi + 1}</label>
                    <input class="input" style="margin-bottom:6px;" value="${f.labelLight || ""}" data-bind="explorerSection.apartments.${i}.features.${fi}.labelLight" placeholder="التسمية النهارية" />
                    <input class="input" style="margin-bottom:6px;" value="${f.labelDark || ""}" data-bind="explorerSection.apartments.${i}.features.${fi}.labelDark" placeholder="التسمية الليلية" />
                    <select class="select" data-bind="explorerSection.apartments.${i}.features.${fi}.icon">
                      <option value="sofa" ${f.icon === "sofa" ? "selected" : ""}>🛋️ صالة واسعة</option>
                      <option value="balcony" ${f.icon === "balcony" ? "selected" : ""}>🏡 بلكونة / شرفة</option>
                      <option value="kitchen" ${f.icon === "kitchen" ? "selected" : ""}>🍳 مطبخ حديث</option>
                      <option value="bath" ${f.icon === "bath" ? "selected" : ""}>🚿 حمام</option>
                      <option value="view" ${f.icon === "view" ? "selected" : ""}>👁️ إطلالة</option>
                    </select>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

            <!-- Interior Gallery Editor (معرض الصور الداخلي للغرف) -->
            <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--cms-border);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <strong style="color:var(--cms-gold); font-size:0.95rem;">📸 معرض الصور الداخلية للشقة (${apt.title}) — (${(apt.gallery || []).length} صور):</strong>
                <button type="button" class="btn btn-primary btn-sm" data-add-apt-gal="${i}">+ إضافة غرفة / صورة داخلية</button>
              </div>
              ${(apt.gallery || [])
                .map(
                  (g, gi) => `
                <div style="background:var(--cms-surface); border:1px solid var(--cms-border); padding:14px; border-radius:10px; margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <input class="input" style="max-width:380px;" value="${g.title || ""}" data-bind="explorerSection.apartments.${i}.gallery.${gi}.title" placeholder="وصف الغرفة (مثال: الصالة الرئيسية وغرفة المعيشة)" />
                    <button type="button" class="btn btn-danger btn-xs" data-del-apt-gal="${i}:${gi}">حذف الغرفة</button>
                  </div>
                  ${dualImageHtml(g.imageLight, g.imageDark, `explorerSection.apartments.${i}.gallery.${gi}`)}
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `;

        aptsEl.querySelectorAll("[data-add-apt-gal]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.addAptGal, 10);
            if (!cms.explorerSection.apartments[idx].gallery) cms.explorerSection.apartments[idx].gallery = [];
            cms.explorerSection.apartments[idx].gallery.push({
              id: `gal-${Date.now()}`,
              title: "غرفة داخلية جديدة",
              imageLight: "/images/light/scene-2.webp",
              imageDark: "/images/dark/scene-2.webp"
            });
            markDirty(true);
            renderExplorerPanel();
            bindDynamicInputs();
            showToast("تمت إضافة غرفة جديدة للمعرض!");
          });
        });

        aptsEl.querySelectorAll("[data-del-apt-gal]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const [ai, gi] = btn.dataset.delAptGal.split(":").map(Number);
            cms.explorerSection.apartments[ai].gallery.splice(gi, 1);
            markDirty(true);
            renderExplorerPanel();
            bindDynamicInputs();
            showToast("تم حذف الصورة من المعرض");
          });
        });

        aptsEl.querySelectorAll("[data-del-apt]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.delApt, 10);
            cms.explorerSection.apartments.splice(idx, 1);
            selectedApartmentIdx = 0;
            markDirty(true);
            renderExplorerPanel();
            bindDynamicInputs();
            showToast("تم حذف نموذج الشقة");
          });
        });
      }
    }
  }

  // =========================================================================
  // PANEL 5: LIFESTYLE & AMENITIES & FORMAL CATEGORY MANAGEMENT
  // =========================================================================
  const BUILTIN_CATEGORIES = [
    { key: "location", label: "موقع مميز وحيوي", iconKey: "location" },
    { key: "security", label: "خدمات أمنية وحراسة 24/7", iconKey: "security" },
    { key: "kids", label: "منطقة ألعاب أطفال آمنة", iconKey: "kids" },
    { key: "gym", label: "نادي رياضي وجم متكامل", iconKey: "gym" },
    { key: "green", label: "مساحات وحدائق خضراء", iconKey: "green" },
    { key: "parking", label: "مواقف سيارات خاصة ومغطاة", iconKey: "parking" },
    { key: "pool", label: "مسبح ومرافق مائية", iconKey: "pool" },
    { key: "padel", label: "ملاعب بادل ورياضات", iconKey: "padel" },
    { key: "elevator", label: "مصاعد بانورامية ذكية", iconKey: "elevator" },
    { key: "ev", label: "شواحن سيارات كهربائية EV", iconKey: "ev" },
    { key: "solar", label: "طاقة شمسية مستدامة", iconKey: "solar" },
    { key: "smarthome", label: "أنظمة منازل ذكية Smart Home", iconKey: "smarthome" },
    { key: "ac", label: "تكييف وتبريد مركزي", iconKey: "ac" },
    { key: "heating", label: "تدفئة تحت البلاط", iconKey: "heating" },
    { key: "view", label: "إطلالات بانورامية مفتوحة", iconKey: "view" },
    { key: "lounge", label: "صالة ضيافة ولاونج للسكان", iconKey: "lounge" },
    { key: "mosque", label: "مسجد ومصلى قريب", iconKey: "mosque" },
    { key: "spa", label: "جاكوزي وسبا وساونا", iconKey: "spa" },
    { key: "cctv", label: "كاميرات مراقبة CCTV متطورة", iconKey: "cctv" },
    { key: "wifi", label: "إنترنت وألياف ضوئية فائقة السرعة", iconKey: "wifi" },
    { key: "maintenance", label: "خدمات صيانة وإدارة مرافق", iconKey: "maintenance" },
    { key: "shopping", label: "مرافق تجارية وسوبرماركت", iconKey: "shopping" },
    { key: "balcony", label: "شرفات وتراسات واسعة", iconKey: "balcony" },
    { key: "soundproof", label: "عزل صوتي وحراري متقدم", iconKey: "soundproof" },
    { key: "cinema", label: "صالة سينما خاصة", iconKey: "cinema" },
    { key: "bike", label: "مسار ومواقف دراجات", iconKey: "bike" },
    { key: "storage", label: "مستودعات تخزين خاصة", iconKey: "storage" },
    { key: "key", label: "تسليم فوري / جاهز للسكن", iconKey: "key" },
    { key: "concierge", label: "خدمات استقبال وكونسيرج", iconKey: "concierge" },
    { key: "gate", label: "بوابات إلكترونية ذكية", iconKey: "gate" },
    { key: "bbq", label: "جلسات وشواء عائلي خارجي", iconKey: "bbq" },
    { key: "architecture", label: "تصميم معماري معاصر", iconKey: "architecture" }
  ];

  let pendingCategoryCallback = null;

  function getCategoryDisplaySvg(iconKey) {
    if (!iconKey) return FORMAL_SVGS.location;
    if (FORMAL_SVGS[iconKey]) return FORMAL_SVGS[iconKey];

    const customCats = cms.lifestyleSection?.customCategories || [];
    const foundCustom = customCats.find((c) => c.key === iconKey || c.icon === iconKey);
    if (foundCustom) {
      if (FORMAL_SVGS[foundCustom.icon]) return FORMAL_SVGS[foundCustom.icon];
      if (typeof foundCustom.icon === "string" && foundCustom.icon.trim().startsWith("<svg")) {
        return foundCustom.icon;
      }
    }

    return FORMAL_SVGS.star;
  }

  function getCategoryDisplayLabel(key) {
    if (!key) return "موقع مميز";
    const customCats = cms.lifestyleSection?.customCategories || [];
    const foundCustom = customCats.find((c) => c.key === key || c.icon === key || c.label === key);
    if (foundCustom) return foundCustom.label;

    const foundBuiltin = BUILTIN_CATEGORIES.find((c) => c.key === key || c.iconKey === key);
    if (foundBuiltin) return foundBuiltin.label;

    return key;
  }

  function renderCategorySelectOptions(currentKey) {
    const customCats = cms.lifestyleSection?.customCategories || [];
    let html = "";

    if (customCats.length > 0) {
      html += `<optgroup label="⭐ فئاتي المخصصة (${customCats.length})">`;
      customCats.forEach((c) => {
        const isSel = currentKey === c.key || currentKey === c.icon;
        html += `<option value="${escapeHtml(c.key)}" ${isSel ? "selected" : ""}>✦ ${escapeHtml(c.label)}</option>`;
      });
      html += `</optgroup>`;
    }

    html += `<optgroup label="🏢 فئات ومرافق معمارية متوفرة (${BUILTIN_CATEGORIES.length})">`;
    BUILTIN_CATEGORIES.forEach((c) => {
      const isSel = currentKey === c.key || currentKey === c.iconKey;
      html += `<option value="${c.key}" ${isSel ? "selected" : ""}>${c.label}</option>`;
    });
    html += `</optgroup>`;

    html += `<optgroup label="✨ تخصيص">`;
    html += `<option value="__NEW_CUSTOM__">➕ إضافة فئة جديدة مخصصة...</option>`;
    html += `</optgroup>`;

    return html;
  }

  function openCategoryCreatorModal(callback = null) {
    pendingCategoryCallback = callback;
    const modal = document.getElementById("customCategoryModal");
    if (!modal) return;

    const labelInput = document.getElementById("newCategoryLabelInput");
    const iconInput = document.getElementById("newCategoryIconInput");
    const previewEl = document.getElementById("newCategoryIconPreview");
    const nameEl = document.getElementById("newCategoryIconName");
    const gridEl = document.getElementById("formalIconGrid");

    if (labelInput) labelInput.value = "";
    if (iconInput) iconInput.value = "pool";
    if (previewEl) previewEl.innerHTML = FORMAL_SVGS.pool;
    if (nameEl) nameEl.textContent = "مسبح ومرافق مائية";

    if (gridEl) {
      gridEl.innerHTML = BUILTIN_CATEGORIES.map((c) => `
        <div class="formal-icon-card ${c.key === "pool" ? "active" : ""}" data-formal-key="${c.key}" data-formal-label="${escapeHtml(c.label)}" title="${escapeHtml(c.label)}">
          ${FORMAL_SVGS[c.key] || FORMAL_SVGS.star}
          <span>${escapeHtml(c.label)}</span>
        </div>
      `).join("");

      gridEl.querySelectorAll("[data-formal-key]").forEach((card) => {
        card.addEventListener("click", () => {
          gridEl.querySelectorAll(".formal-icon-card").forEach(b => b.classList.remove("active"));
          card.classList.add("active");
          const k = card.dataset.formalKey;
          const l = card.dataset.formalLabel;
          if (iconInput) iconInput.value = k;
          if (previewEl) previewEl.innerHTML = FORMAL_SVGS[k] || FORMAL_SVGS.star;
          if (nameEl) nameEl.textContent = l;
          if (labelInput && (!labelInput.value || labelInput.value.trim() === "")) {
            labelInput.placeholder = l;
          }
        });
      });
    }

    modal.classList.add("open");
    setTimeout(() => {
      labelInput?.focus();
    }, 100);
  }

  function closeCategoryModal() {
    const modal = document.getElementById("customCategoryModal");
    if (modal) modal.classList.remove("open");
    pendingCategoryCallback = null;
  }

  function renderLifestylePanel() {
    const life = cms.lifestyleSection;
    if (!life) return;

    if (!Array.isArray(life.customCategories)) {
      life.customCategories = [];
    }

    const headerEl = document.getElementById("lifestyleHeaderEditor");
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="grid-2">
          <div class="field">
            <label>عنوان القسم</label>
            <input class="input" value="${life.title || ""}" data-bind="lifestyleSection.title" />
          </div>
          <div class="field">
            <label>الوصف الفرعي</label>
            <input class="input" value="${life.subtitle || ""}" data-bind="lifestyleSection.subtitle" />
          </div>
        </div>
        ${dualImageHtml(life.imageLight, life.imageDark, "lifestyleSection")}
      `;
    }

    // Render Custom Categories Management Bar
    const barEl = document.getElementById("customCategoriesBar");
    if (barEl) {
      const customCats = life.customCategories || [];
      if (customCats.length === 0) {
        barEl.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; background:var(--cms-surface-alt); border:1px dashed var(--cms-border); border-radius:10px; padding:12px 16px; flex-wrap:wrap; gap:10px;">
            <div style="font-size:0.83rem; color:var(--cms-text-secondary);">
              🏛️ <strong style="color:var(--cms-gold);">نظام الأيقونات المعمارية الرسمية:</strong> يتوفر لديك <strong style="color:var(--cms-text-primary);">${BUILTIN_CATEGORIES.length} فئة هندسية معتمدة</strong>، ويمكنك إنشاء وتسمية أي فئات مخصصة بأيقونات خطية فاخرة.
            </div>
            <button type="button" class="btn btn-secondary btn-xs" id="quickAddCustomCatBtn">✨ + إضافة فئة مخصصة جديدة</button>
          </div>
        `;
      } else {
        barEl.innerHTML = `
          <div style="background:var(--cms-surface-alt); border:1px solid var(--cms-border); border-radius:10px; padding:12px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
              <span style="font-size:0.85rem; font-weight:700; color:var(--cms-gold); display:flex; align-items:center; gap:6px;">
                ⭐ الفئات المعمارية المخصصة (${customCats.length} فئات):
              </span>
              <button type="button" class="btn btn-primary btn-xs" id="quickAddCustomCatBtn">✨ + إضافة فئة مخصصة</button>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${customCats.map((c, ci) => `
                <span style="display:inline-flex; align-items:center; gap:8px; background:var(--cms-surface); border:1px solid rgba(212,175,55,0.45); padding:6px 14px; border-radius:20px; font-size:0.84rem; box-shadow:0 2px 6px rgba(0,0,0,0.2); color:var(--cms-gold);">
                  <span style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px;">${FORMAL_SVGS[c.icon] || FORMAL_SVGS.star}</span>
                  <strong style="color:var(--cms-text-primary); font-weight:600;">${escapeHtml(c.label)}</strong>
                  <button type="button" data-del-custom-cat="${ci}" title="حذف هذه الفئة المخصصة" style="background:none; border:none; color:var(--cms-danger); cursor:pointer; font-size:0.9rem; padding:0 3px; line-height:1;">✕</button>
                </span>
              `).join("")}
            </div>
          </div>
        `;
      }

      barEl.querySelector("#quickAddCustomCatBtn")?.addEventListener("click", () => {
        openCategoryCreatorModal();
      });

      barEl.querySelectorAll("[data-del-custom-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const ci = parseInt(btn.dataset.delCustomCat, 10);
          const cat = customCats[ci];
          if (confirm(`هل أنت متأكد من حذف الفئة المخصصة "${cat.label}"؟`)) {
            customCats.splice(ci, 1);
            markDirty(true);
            renderLifestylePanel();
            bindDynamicInputs();
            showToast("تم حذف الفئة المخصصة بنجاح");
          }
        });
      });
    }

    // Render Amenities Repeater
    const listEl = document.getElementById("amenitiesListEditor");
    if (listEl) {
      if (!Array.isArray(life.amenities) || life.amenities.length === 0) {
        listEl.innerHTML = `<div style="padding:24px; text-align:center; color:var(--cms-text-muted); border:1px dashed var(--cms-border); border-radius:8px; grid-column:1 / -1;">لا توجد مرافق مضافة حالياً. اضغط "+ إضافة مرفق جديد" أعلاه.</div>`;
        return;
      }

      listEl.innerHTML = life.amenities.map((am, i) => {
        const svgIcon = getCategoryDisplaySvg(am.icon);
        const labelText = escapeHtml(am.label || getCategoryDisplayLabel(am.icon));
        return `
          <div class="subcard" style="margin-bottom:0; display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--cms-surface-alt); border:1px solid var(--cms-border); border-radius:10px; transition:border-color 0.2s ease;">
            <!-- Live Formal SVG Icon Badge -->
            <div style="width:42px; height:42px; border-radius:50%; background:rgba(212,175,55,0.12); border:1.5px solid var(--cms-gold); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--cms-gold);" title="الأيقونة الرسمية">
              ${svgIcon}
            </div>

            <!-- Label Input -->
            <div style="flex:1;">
              <input class="input" style="width:100%; font-size:0.9rem;" value="${labelText}" data-bind="lifestyleSection.amenities.${i}.label" placeholder="اسم المرفق أو الخدمة" />
            </div>

            <!-- Category / Icon Select Dropdown -->
            <div style="min-width:180px;">
              <select class="select" style="width:100%; font-size:0.86rem;" data-amenity-icon-select="${i}">
                ${renderCategorySelectOptions(am.icon)}
              </select>
            </div>

            <!-- Delete Button -->
            <button type="button" class="btn btn-danger btn-xs" data-del-amenity="${i}" title="حذف هذا المرفق" style="padding:6px 10px;">✕</button>
          </div>
        `;
      }).join("");

      // Select change event listener
      listEl.querySelectorAll("[data-amenity-icon-select]").forEach((sel) => {
        sel.addEventListener("change", () => {
          const i = parseInt(sel.dataset.amenityIconSelect, 10);
          const val = sel.value;

          if (val === "__NEW_CUSTOM__") {
            openCategoryCreatorModal((newCatKey) => {
              if (cms.lifestyleSection.amenities[i]) {
                cms.lifestyleSection.amenities[i].icon = newCatKey;
                const found = (cms.lifestyleSection.customCategories || []).find(c => c.key === newCatKey);
                if (found && (!cms.lifestyleSection.amenities[i].label || cms.lifestyleSection.amenities[i].label === "مرفق جديد")) {
                  cms.lifestyleSection.amenities[i].label = found.label;
                }
              }
              markDirty(true);
              renderLifestylePanel();
              bindDynamicInputs();
            });
            sel.value = cms.lifestyleSection.amenities[i]?.icon || "location";
            return;
          }

          if (cms.lifestyleSection.amenities[i]) {
            cms.lifestyleSection.amenities[i].icon = val;
            const customCats = cms.lifestyleSection?.customCategories || [];
            const foundCustom = customCats.find(c => c.key === val);
            const foundBuiltin = BUILTIN_CATEGORIES.find(c => c.key === val);
            const found = foundCustom || foundBuiltin;
            if (found && (!cms.lifestyleSection.amenities[i].label || cms.lifestyleSection.amenities[i].label === "مرفق جديد")) {
              cms.lifestyleSection.amenities[i].label = found.label;
            }
            markDirty(true);
            renderLifestylePanel();
            bindDynamicInputs();
          }
        });
      });

      // Delete amenity event listener
      listEl.querySelectorAll("[data-del-amenity]").forEach((btn) => {
        btn.addEventListener("click", () => {
          cms.lifestyleSection.amenities.splice(parseInt(btn.dataset.delAmenity, 10), 1);
          markDirty(true);
          renderLifestylePanel();
          bindDynamicInputs();
        });
      });
    }
  }

  // =========================================================================
  // PANEL 6: ABOUT COMPANY & STATS
  // =========================================================================
  function renderAboutPanel() {
    const ab = cms.aboutSection;
    const headerEl = document.getElementById("aboutHeaderEditor");
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="grid-2">
          <div class="field">
            <label>عنوان القسم</label>
            <input class="input" value="${ab.title || ""}" data-bind="aboutSection.title" />
          </div>
          <div class="field">
            <label>نص الزر</label>
            <input class="input" value="${ab.ctaText || ""}" data-bind="aboutSection.ctaText" />
          </div>
        </div>
        <div class="field">
          <label>النص التعريفي بالشركة</label>
          <textarea class="textarea" rows="3" data-bind="aboutSection.description">${ab.description || ""}</textarea>
        </div>
        ${dualImageHtml(ab.imageLight, ab.imageDark, "aboutSection")}
      `;
    }

    const statsEl = document.getElementById("statsListEditor");
    if (statsEl) {
      statsEl.innerHTML = (ab.stats || [])
        .map(
          (st, i) => `
        <div class="grid-3" style="margin-bottom:10px; align-items:center;">
          <input class="input" dir="ltr" value="${st.value || ""}" data-bind="aboutSection.stats.${i}.value" placeholder="الرقم (مثال: +1,000)" />
          <input class="input" value="${st.label || ""}" data-bind="aboutSection.stats.${i}.label" placeholder="الوصف (مثال: وحدة سكنية)" />
          <button type="button" class="btn btn-danger btn-sm" data-del-stat="${i}">حذف</button>
        </div>
      `
        )
        .join("");

      statsEl.querySelectorAll("[data-del-stat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          cms.aboutSection.stats.splice(parseInt(btn.dataset.delStat, 10), 1);
          markDirty(true);
          renderAboutPanel();
          bindDynamicInputs();
        });
      });
    }
  }

  // =========================================================================
  // PANEL 7: STRATEGIC LOCATION & INTERACTIVE MAP
  // =========================================================================
  function renderLocationPanel() {
    const loc = cms.locationSection;
    const headerEl = document.getElementById("locationHeaderEditor");
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="grid-3">
          <div class="field">
            <label>العنوان الفرعي الذهبي</label>
            <input class="input" value="${loc.eyebrow || ""}" data-bind="locationSection.eyebrow" />
          </div>
          <div class="field">
            <label>العنوان الرئيسي</label>
            <input class="input" value="${loc.title || ""}" data-bind="locationSection.title" />
          </div>
          <div class="field">
            <label>نص الزر</label>
            <input class="input" value="${loc.ctaText || ""}" data-bind="locationSection.ctaText" />
          </div>
        </div>
        <div class="field">
          <label>الوصف الفرعي</label>
          <input class="input" value="${loc.subtitle || ""}" data-bind="locationSection.subtitle" />
        </div>
        <div class="grid-3">
          <div class="field">
            <label>اسم المشروع على الدبوس الرئيسي</label>
            <input class="input" value="${loc.mainPin?.title || ""}" data-bind="locationSection.mainPin.title" />
          </div>
          <div class="field">
            <label>موقع الدبوس (نهاري)</label>
            <input class="input" value="${loc.mainPin?.subtitleLight || ""}" data-bind="locationSection.mainPin.subtitleLight" />
          </div>
          <div class="field">
            <label>موقع الدبوس (ليلي)</label>
            <input class="input" value="${loc.mainPin?.subtitleDark || ""}" data-bind="locationSection.mainPin.subtitleDark" />
          </div>
        </div>
      `;
    }

    const proxEl = document.getElementById("proximitiesEditor");
    if (proxEl) {
      proxEl.innerHTML = (loc.proximities || [])
        .map(
          (p, i) => `
        <div style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
          <input class="input" value="${p.label || ""}" data-bind="locationSection.proximities.${i}.label" placeholder="الفئة (مثال: المدارس)" />
          <input class="input" style="max-width:130px;" value="${p.time || ""}" data-bind="locationSection.proximities.${i}.time" placeholder="5 دقائق" />
          <button type="button" class="btn btn-danger btn-xs" data-del-prox="${i}">✕</button>
        </div>
      `
        )
        .join("");

      proxEl.querySelectorAll("[data-del-prox]").forEach((btn) => {
        btn.addEventListener("click", () => {
          cms.locationSection.proximities.splice(parseInt(btn.dataset.delProx, 10), 1);
          markDirty(true);
          renderLocationPanel();
          bindDynamicInputs();
        });
      });
    }

    const pinsEl = document.getElementById("mapPinsEditor");
    if (pinsEl) {
      pinsEl.innerHTML = (loc.mapPins || [])
        .map(
          (pin, i) => `
        <div style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
          <input class="input" value="${pin.labelLight || ""}" data-bind="locationSection.mapPins.${i}.labelLight" placeholder="الاسم (نهاري)" />
          <input class="input" value="${pin.labelDark || ""}" data-bind="locationSection.mapPins.${i}.labelDark" placeholder="الاسم (ليلي)" />
          <input type="number" class="input" style="width:72px;" value="${pin.x || 50}" data-bind="locationSection.mapPins.${i}.x" title="X%" />
          <input type="number" class="input" style="width:72px;" value="${pin.y || 50}" data-bind="locationSection.mapPins.${i}.y" title="Y%" />
          <button type="button" class="btn btn-danger btn-xs" data-del-pin="${i}">✕</button>
        </div>
      `
        )
        .join("");

      pinsEl.querySelectorAll("[data-del-pin]").forEach((btn) => {
        btn.addEventListener("click", () => {
          cms.locationSection.mapPins.splice(parseInt(btn.dataset.delPin, 10), 1);
          markDirty(true);
          renderLocationPanel();
          bindDynamicInputs();
        });
      });
    }
  }

  // =========================================================================
  // PANEL 8: CTA BANNER & FOOTER
  // =========================================================================
  function renderFooterPanel() {
    const cta = cms.ctaBanner;
    const ctaEl = document.getElementById("ctaBannerEditor");
    if (ctaEl) {
      ctaEl.innerHTML = `
        <div class="grid-2">
          <div class="field">
            <label>العنوان الرئيسي للبانر</label>
            <input class="input" value="${cta.title || ""}" data-bind="ctaBanner.title" />
          </div>
          <div class="field">
            <label>نص زر الحجز</label>
            <input class="input" value="${cta.buttonText || ""}" data-bind="ctaBanner.buttonText" />
          </div>
        </div>
        <div class="field">
          <label>النص الفرعي</label>
          <input class="input" value="${cta.subtitle || ""}" data-bind="ctaBanner.subtitle" />
        </div>
        ${dualImageHtml(cta.imageLight, cta.imageDark, "ctaBanner")}
      `;
    }

    const f = cms.footer;
    const fEl = document.getElementById("footerEditor");
    if (fEl) {
      fEl.innerHTML = `
        <div class="grid-3">
          <div class="field">
            <label>العنوان في الفوتر</label>
            <input class="input" value="${f.address || ""}" data-bind="footer.address" />
          </div>
          <div class="field">
            <label>رقم الهاتف في الفوتر</label>
            <input class="input" dir="ltr" value="${f.phone || ""}" data-bind="footer.phone" />
          </div>
          <div class="field">
            <label>البريد الإلكتروني في الفوتر</label>
            <input class="input" dir="ltr" value="${f.email || ""}" data-bind="footer.email" />
          </div>
        </div>
        <div class="field">
          <label>نص حقوق الملكية أسفل الموقع</label>
          <input class="input" value="${f.copyrightText || ""}" data-bind="footer.copyrightText" />
        </div>
      `;
    }
  }

  // =========================================================================
  // PANEL 9: MEDIA LIBRARY & UPLOADER
  // =========================================================================
  function renderMediaPanel() {
    const pairsEl = document.getElementById("mediaPairsShowcase");
    if (pairsEl) {
      pairsEl.innerHTML = (mediaCatalog.pairs || [])
        .map(
          (p) => `
        <div class="scene-pair-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--cms-gold); font-size:0.92rem;">${p.title}</strong>
            <span class="nav-badge subtle">${p.category}</span>
          </div>
          <div class="scene-pair-thumbs">
            <div>
              <img src="${p.lightUrl}" alt="Light" />
              <div style="font-size:0.74rem; color:var(--cms-text-secondary); margin-top:4px;" dir="ltr">☀️ ${p.lightUrl}</div>
            </div>
            <div>
              <img src="${p.darkUrl}" alt="Dark" />
              <div style="font-size:0.74rem; color:var(--cms-text-secondary); margin-top:4px;" dir="ltr">🌙 ${p.darkUrl}</div>
            </div>
          </div>
        </div>
      `
        )
        .join("");
    }

    const uploadsEl = document.getElementById("customUploadsShowcase");
    if (uploadsEl) {
      if (!mediaCatalog.uploads?.length) {
        uploadsEl.innerHTML = `<div style="color:var(--cms-text-muted); grid-column: 1 / -1; text-align:center; padding:18px;">لم يتم رفع صور إضافية بعد. يمكنك رفع أي صورة من صندوق الرفع أعلاه.</div>`;
      } else {
        uploadsEl.innerHTML = mediaCatalog.uploads
          .map(
            (u) => {
              const kb = u.sizeBytes ? (u.sizeBytes / 1024).toFixed(1) + " KB" : "";
              return `
          <div class="scene-pair-card">
            <div style="position:relative;">
              <img src="${u.url}" alt="${u.filename}" style="width:100%; height:110px; object-fit:cover; border-radius:6px;" />
              ${kb ? `<span style="position:absolute; top:6px; left:6px; background:rgba(15,23,42,0.82); color:#DFB97B; padding:2px 8px; border-radius:20px; font-size:0.7rem; font-weight:700;" dir="ltr">⚡ ${kb}</span>` : ""}
            </div>
            <input class="input" dir="ltr" value="${u.url}" readonly style="margin-top:8px; font-size:0.76rem;" />
          </div>
        `;
            }
          )
          .join("");
      }
    }
  }

  // =========================================================================
  // PANEL 10: CUSTOMER BOOKINGS CRM
  // =========================================================================
  function renderBookingsPanel() {
    const tbody = document.getElementById("bookingsTableBody");
    if (!tbody) return;

    const filtered = bookingsList.filter((b) => {
      if (bookingStatusFilter !== "all" && b.status !== bookingStatusFilter) return false;
      if (bookingSearchQuery) {
        const q = bookingSearchQuery.toLowerCase();
        return (
          (b.name || "").toLowerCase().includes(q) ||
          (b.phone || "").toLowerCase().includes(q) ||
          (b.project || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--cms-text-muted);">لا توجد طلبات حجز مطابقة</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((b) => {
        const cleanPhone = (b.phone || "").replace(/[^0-9+]/g, "");
        return `
      <tr>
        <td>
          <strong>${b.name}</strong>
          <div style="font-size:0.76rem; color:var(--cms-text-secondary);" dir="ltr">${b.email || ""}</div>
        </td>
        <td>
          <div dir="ltr" style="font-weight:700; margin-bottom:4px;">${b.phone}</div>
          <div style="display:flex; gap:6px;">
            <a href="tel:${cleanPhone}" class="btn btn-secondary btn-xs">📞 اتصال</a>
            <a href="https://wa.me/${cleanPhone.replace("+", "")}" target="_blank" class="btn btn-secondary btn-xs">💬 واتساب</a>
          </div>
        </td>
        <td>
          <div style="font-weight:700;">${b.project || ""}</div>
          <div style="font-size:0.8rem; color:var(--cms-gold);">${b.unit || ""}</div>
        </td>
        <td>${b.preferredDate || "-"} <br/><small style="color:var(--cms-text-secondary);">${b.preferredTime || ""}</small></td>
        <td style="max-width:220px; font-size:0.82rem; color:var(--cms-text-secondary);">${b.notes || "-"}</td>
        <td>
          <select class="select" data-bk-status="${b.id}" style="padding:6px 10px; font-size:0.82rem;">
            <option value="new" ${b.status === "new" ? "selected" : ""}>طلب جديد</option>
            <option value="contacted" ${b.status === "contacted" ? "selected" : ""}>تم التواصل</option>
            <option value="confirmed" ${b.status === "confirmed" ? "selected" : ""}>مؤكد ✓</option>
            <option value="cancelled" ${b.status === "cancelled" ? "selected" : ""}>ملغى</option>
          </select>
        </td>
        <td>
          <button type="button" class="btn btn-danger btn-xs" data-del-bk="${b.id}">حذف</button>
        </td>
      </tr>
    `;
      })
      .join("");

    tbody.querySelectorAll("[data-bk-status]").forEach((sel) => {
      sel.addEventListener("change", async () => {
        await fetch(`/api/bookings/${sel.dataset.bkStatus}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: sel.value })
        });
        await loadBookings();
        renderOverviewPanel();
        showToast("تم تحديث حالة الحجز");
      });
    });

    tbody.querySelectorAll("[data-del-bk]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch(`/api/bookings/${btn.dataset.delBk}`, { method: "DELETE" });
        await loadBookings();
        renderBookingsPanel();
        renderOverviewPanel();
        showToast("تم حذف الطلب");
      });
    });
  }

  // =========================================================================
  // PANEL 11: EMPLOYEES, USERS & PASSWORD MANAGEMENT
  // =========================================================================
  function getRoleBadgeHtml(role, roleLabel) {
    const colors = {
      admin: { bg: "rgba(212, 175, 55, 0.16)", border: "rgba(212, 175, 55, 0.45)", text: "var(--cms-gold)" },
      sales: { bg: "rgba(56, 158, 95, 0.16)", border: "rgba(56, 158, 95, 0.45)", text: "#5cd68d" },
      editor: { bg: "rgba(59, 130, 246, 0.16)", border: "rgba(59, 130, 246, 0.45)", text: "#7ab3ff" },
      viewer: { bg: "rgba(154, 176, 184, 0.15)", border: "rgba(154, 176, 184, 0.35)", text: "#b8c7ce" }
    };
    const st = colors[role] || colors.sales;
    return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; font-size:0.78rem; font-weight:600; background:${st.bg}; border:1px solid ${st.border}; color:${st.text};">${escapeHtml(roleLabel || role)}</span>`;
  }

  function openEditUserModal(user, focusPassword = false) {
    const modal = document.getElementById("editUserModal");
    if (!modal || !user) return;
    document.getElementById("editUserIdInput").value = user.id || "";
    document.getElementById("editUserDisplayName").value = user.displayName || "";
    document.getElementById("editUserUsername").value = user.username || "";
    document.getElementById("editUserRole").value = user.role || "sales";
    document.getElementById("editUserActive").value = user.isActive !== false ? "true" : "false";
    const pwInp = document.getElementById("editUserNewPassword");
    if (pwInp) {
      pwInp.value = "";
      pwInp.type = "password";
    }
    const toggleBtn = document.getElementById("toggleEditUserPwBtn");
    if (toggleBtn) toggleBtn.textContent = "إظهار";

    modal.classList.add("open");
    if (focusPassword && pwInp) {
      setTimeout(() => pwInp.focus(), 80);
    }
  }

  function renderUsersPanel() {
    const uBadge = document.getElementById("navUsersBadge");
    if (uBadge) uBadge.textContent = String(usersList.length || 1);

    // 1. Populate Change Password Target Select
    const targetSelect = document.getElementById("changePwTargetSelect");
    if (targetSelect) {
      const prevVal = targetSelect.value;
      targetSelect.innerHTML = usersList
        .map((u) => {
          const isMe = currentAdminUser && u.username.toLowerCase() === currentAdminUser.username.toLowerCase();
          return `<option value="${escapeHtml(u.id)}">${escapeHtml(u.displayName)} (${escapeHtml(u.username)}) ${isMe ? "— حسابك الحالي" : `— ${escapeHtml(u.roleLabel || "")}`}</option>`;
        })
        .join("");
      if (prevVal && usersList.some((u) => u.id === prevVal)) {
        targetSelect.value = prevVal;
      } else if (currentAdminUser?.id) {
        targetSelect.value = currentAdminUser.id;
      }
    }

    // 2. Populate Users Table
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    if (!usersList.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--cms-text-muted);">لا يوجد مستخدمون مسجلون</td></tr>`;
      return;
    }

    const activeAdminsCount = usersList.filter((u) => u.isActive !== false && u.role === "admin").length;

    tbody.innerHTML = usersList
      .map((u) => {
        const isMe = currentAdminUser && u.username.toLowerCase() === currentAdminUser.username.toLowerCase();
        const isLastAdmin = u.role === "admin" && u.isActive !== false && activeAdminsCount <= 1;
        const dateStr = (u.createdAt || "").slice(0, 10) || "2026-10-27";

        return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:10px; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.35); color:var(--cms-gold); display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">
                  ${escapeHtml((u.displayName || u.username || "م").charAt(0).toUpperCase())}
                </div>
                <div>
                  <strong style="font-size:0.92rem; color:var(--cms-text-primary);">${escapeHtml(u.displayName)}</strong>
                  ${isMe ? `<span style="margin-right:6px; font-size:0.7rem; padding:2px 7px; border-radius:6px; background:rgba(212,175,55,0.2); color:var(--cms-gold);">حسابك الحالي</span>` : ""}
                </div>
              </div>
            </td>
            <td>
              <code dir="ltr" style="background:var(--cms-surface-alt); border:1px solid var(--cms-border); padding:4px 10px; border-radius:6px; font-size:0.86rem; color:var(--cms-text-primary); font-weight:600;">${escapeHtml(u.username)}</code>
            </td>
            <td>${getRoleBadgeHtml(u.role, u.roleLabel)}</td>
            <td>
              ${
                u.isActive !== false
                  ? `<span style="display:inline-flex; align-items:center; gap:6px; color:#5cd68d; font-size:0.82rem; font-weight:600;"><span style="width:8px; height:8px; border-radius:50%; background:#389E5F;"></span>نشط</span>`
                  : `<span style="display:inline-flex; align-items:center; gap:6px; color:#ff8080; font-size:0.82rem; font-weight:600;"><span style="width:8px; height:8px; border-radius:50%; background:#DC4E4E;"></span>موقوف</span>`
              }
            </td>
            <td dir="ltr" style="font-size:0.82rem; color:var(--cms-text-secondary);">${escapeHtml(dateStr)}</td>
            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-xs" data-pw-user="${escapeHtml(u.id)}" title="تغيير كلمة المرور لهذا الحساب">
                  تغيير كلمة السر
                </button>
                <button type="button" class="btn btn-secondary btn-xs" data-edit-user="${escapeHtml(u.id)}" title="تعديل الاسم أو الصلاحية">
                  تعديل
                </button>
                ${
                  !isLastAdmin
                    ? `<button type="button" class="btn btn-secondary btn-xs" data-toggle-user="${escapeHtml(u.id)}" title="${u.isActive !== false ? "إيقاف الحساب مؤقتاً" : "إعادة تفعيل الحساب"}">
                        ${u.isActive !== false ? "إيقاف" : "تفعيل"}
                      </button>
                      <button type="button" class="btn btn-danger btn-xs" data-del-user="${escapeHtml(u.id)}" title="حذف الحساب نهائياً">
                        حذف
                      </button>`
                    : `<span style="font-size:0.74rem; color:var(--cms-text-muted); align-self:center; padding:0 4px;">حساب رئيسي محمي</span>`
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    // Attach table action listeners
    tbody.querySelectorAll("[data-pw-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = usersList.find((x) => x.id === btn.dataset.pwUser);
        if (!u) return;
        const sel = document.getElementById("changePwTargetSelect");
        if (sel) sel.value = u.id;
        openEditUserModal(u, true);
      });
    });

    tbody.querySelectorAll("[data-edit-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = usersList.find((x) => x.id === btn.dataset.editUser);
        if (u) openEditUserModal(u, false);
      });
    });

    tbody.querySelectorAll("[data-toggle-user]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const u = usersList.find((x) => x.id === btn.dataset.toggleUser);
        if (!u) return;
        const nextState = u.isActive === false;
        const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextState })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          await loadAdminUsers();
          renderUsersPanel();
          showToast(nextState ? `تم تفعيل حساب (${u.displayName})` : `تم إيقاف حساب (${u.displayName}) مؤقتاً`);
        } else {
          showToast(data.error || "تعذر تحديث حالة الحساب", true);
        }
      });
    });

    tbody.querySelectorAll("[data-del-user]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const u = usersList.find((x) => x.id === btn.dataset.delUser);
        if (!u) return;
        if (!confirm(`هل أنت متأكد من حذف حساب الموظف "${u.displayName}" (${u.username}) نهائياً؟`)) return;
        const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          await loadAdminUsers();
          renderUsersPanel();
          showToast(`تم حذف حساب (${u.displayName}) بنجاح`);
        } else {
          showToast(data.error || "تعذر حذف الحساب", true);
        }
      });
    });
  }

  // =========================================================================
  // DATA BINDING & MEDIA PICKER LOGIC
  // =========================================================================
  function setDeepValue(obj, pathStr, value) {
    const parts = pathStr.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function applyDualImageByKey(targetKey, lightUrl, darkUrl) {
    if (targetKey === "explorerSection.building") {
      if (lightUrl) cms.explorerSection.buildingImageLight = lightUrl;
      if (darkUrl) cms.explorerSection.buildingImageDark = darkUrl;
    } else {
      const parts = targetKey.split(".");
      let cur = cms;
      for (const p of parts) cur = cur[p];
      if (cur) {
        if (lightUrl) cur.imageLight = lightUrl;
        if (darkUrl) cur.imageDark = darkUrl;
      }
    }

    const inpL = document.querySelector(`[data-input-light="${targetKey}"]`);
    const inpD = document.querySelector(`[data-input-dark="${targetKey}"]`);
    const prevL = document.querySelector(`[data-preview-light="${targetKey}"]`);
    const prevD = document.querySelector(`[data-preview-dark="${targetKey}"]`);

    if (lightUrl && inpL) inpL.value = lightUrl;
    if (darkUrl && inpD) inpD.value = darkUrl;
    if (lightUrl && prevL) prevL.src = lightUrl;
    if (darkUrl && prevD) prevD.src = darkUrl;
    markDirty(true);
  }

  function bindDynamicInputs() {
    document.querySelectorAll("[data-bind]").forEach((el) => {
      const handleUpdate = () => {
        const val = el.type === "number" ? Number(el.value) : el.value;
        setDeepValue(cms, el.dataset.bind, val);
        if (el.dataset.bind && el.dataset.bind.endsWith(".buildingId")) {
          const proj = (cms.projectsSection?.projects || []).find((p) => p.id === val);
          if (proj) {
            const nameBind = el.dataset.bind.replace(/\.buildingId$/, ".buildingName");
            setDeepValue(cms, nameBind, proj.title);
          }
        }
        markDirty(true);
      };
      el.addEventListener("input", handleUpdate);
      el.addEventListener("change", handleUpdate);
    });

    document.querySelectorAll("[data-input-light]").forEach((inp) => {
      inp.addEventListener("input", () => {
        applyDualImageByKey(inp.dataset.inputLight, inp.value, null);
      });
    });

    document.querySelectorAll("[data-input-dark]").forEach((inp) => {
      inp.addEventListener("input", () => {
        applyDualImageByKey(inp.dataset.inputDark, null, inp.value);
      });
    });

    document.querySelectorAll("[data-pick-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openMediaPicker(btn.dataset.pickKey);
      });
    });
  }

  function openMediaPicker(targetKey, customCallback) {
    const modal = document.getElementById("mediaPickerModal");
    const grid = document.getElementById("pickerPairsGrid");
    if (!modal || !grid) return;

    activePickerCallback = (lightUrl, darkUrl) => {
      if (typeof customCallback === "function") {
        customCallback(lightUrl || darkUrl, darkUrl || lightUrl);
      } else if (typeof targetKey === "function") {
        targetKey(lightUrl || darkUrl, darkUrl || lightUrl);
      } else if (typeof targetKey === "string") {
        applyDualImageByKey(targetKey, lightUrl, darkUrl);
      }
      modal.classList.remove("open");
    };

    let html = "";

    // 1. Uploaded Custom Media Section
    if (mediaCatalog.uploads && mediaCatalog.uploads.length) {
      html += `
        <div style="grid-column: 1 / -1; margin-bottom: 8px;">
          <h4 style="color:var(--cms-gold); font-size:1rem; margin-bottom:4px;">📁 الصور المرفوعة الخاصة بك (${mediaCatalog.uploads.length} صور)</h4>
          <span style="font-size:0.8rem; color:var(--cms-text-secondary);">اختر أي صورة تم رفعها مسبقاً لاستخدامها مباشرة</span>
        </div>
        <div style="grid-column: 1 / -1; display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px; margin-bottom:20px;">
          ${mediaCatalog.uploads.map(u => `
            <div class="uploaded-pick-card" data-pick-upload="${u.url}" style="cursor:pointer; border:1.5px solid var(--cms-border); border-radius:8px; overflow:hidden; background:var(--cms-surface); text-align:center; transition:all 0.2s ease;">
              <img src="${u.url}" alt="${u.filename}" style="width:100%; height:85px; object-fit:cover;" />
              <div style="padding:6px; font-size:0.75rem; color:var(--cms-text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" dir="ltr">
                ${u.filename}
              </div>
            </div>
          `).join("")}
        </div>
        <div style="grid-column: 1 / -1; border-top:1px solid var(--cms-border); margin:12px 0; padding-top:12px;">
          <h4 style="color:var(--cms-text-primary); font-size:0.95rem; margin-bottom:4px;">🖼️ أو اختر من مشاهد التصميم الجاهزة (نهاري / ليلي)</h4>
        </div>
      `;
    }

    // 2. Built-in Scene Pairs
    html += (mediaCatalog.pairs || [])
      .map(
        (p) => `
      <div class="scene-pair-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:var(--cms-gold); font-size:0.88rem;">${p.title}</strong>
          <button type="button" class="btn btn-primary btn-xs" data-select-pair="${p.lightUrl}|${p.darkUrl}">
            اختيار الزوج معاً (نهاري + ليلي)
          </button>
        </div>
        <div class="scene-pair-thumbs">
          <div data-select-single="light|${p.lightUrl}">
            <img src="${p.lightUrl}" alt="Light" />
            <div style="font-size:0.74rem; text-align:center; margin-top:4px;">☀️ اختيار النهارية فقط</div>
          </div>
          <div data-select-single="dark|${p.darkUrl}">
            <img src="${p.darkUrl}" alt="Dark" />
            <div style="font-size:0.74rem; text-align:center; margin-top:4px;">🌙 اختيار الليلية فقط</div>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    grid.innerHTML = html;

    // Attach click events for uploaded cards
    grid.querySelectorAll("[data-pick-upload]").forEach((card) => {
      card.addEventListener("click", () => {
        const u = card.dataset.pickUpload;
        if (activePickerCallback) activePickerCallback(u, u);
      });
    });

    grid.querySelectorAll("[data-select-pair]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [l, d] = btn.dataset.selectPair.split("|");
        if (activePickerCallback) activePickerCallback(l, d);
      });
    });

    grid.querySelectorAll("[data-select-single]").forEach((box) => {
      box.addEventListener("click", () => {
        const [m, url] = box.dataset.selectSingle.split("|");
        if (activePickerCallback) {
          if (m === "light") activePickerCallback(url, null);
          else activePickerCallback(null, url);
        }
      });
    });

    modal.classList.add("open");
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 KB";
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  }

  /**
   * Compresses an image file in the browser without any loss of resolution or visual quality
   * (100% original pixel dimensions, WebP q=0.96 high-precision chroma).
   * Falls back to original file bytes if already smaller or animated.
   */
  function compressImageLosslessClient(file) {
    return new Promise((resolve) => {
      const rawReader = new FileReader();
      rawReader.onload = () => {
        const originalDataUrl = rawReader.result;
        if (file.type === "image/gif" || file.type === "image/svg+xml") {
          resolve({ dataUrl: originalDataUrl, filename: file.name, originalSize: file.size });
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const webpDataUrl = canvas.toDataURL("image/webp", 0.96);
            // Estimate byte size of base64 payload
            const webpBase64Len = webpDataUrl.split(",")[1]?.length || 0;
            const estimatedWebpBytes = Math.floor((webpBase64Len * 3) / 4);

            if (webpDataUrl.startsWith("data:image/webp") && estimatedWebpBytes > 0 && estimatedWebpBytes < file.size) {
              const baseName = file.name.replace(/\.[^.]+$/, "");
              resolve({
                dataUrl: webpDataUrl,
                filename: `${baseName}.webp`,
                originalSize: file.size
              });
            } else {
              resolve({ dataUrl: originalDataUrl, filename: file.name, originalSize: file.size });
            }
          } catch (err) {
            resolve({ dataUrl: originalDataUrl, filename: file.name, originalSize: file.size });
          }
        };
        img.onerror = () => {
          resolve({ dataUrl: originalDataUrl, filename: file.name, originalSize: file.size });
        };
        img.src = originalDataUrl;
      };
      rawReader.readAsDataURL(file);
    });
  }

  /**
   * Helper to upload a single File object with client+server lossless compression.
   */
  async function uploadSingleFile(file) {
    if (!file) return null;
    try {
      const prepared = await compressImageLosslessClient(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: prepared.filename,
          dataUrl: prepared.dataUrl,
          originalSize: prepared.originalSize
        })
      });
      const data = await res.json();
      if (data.success) {
        await loadMediaCatalog();
        return data.url;
      }
      return null;
    } catch (e) {
      console.error("Upload error:", e);
      return null;
    }
  }

  /**
   * Helper to upload multiple files with lossless compression.
   */
  async function uploadMultipleFiles(fileList) {
    const urls = [];
    showToast(`جاري رفع وضغط ${fileList.length} صور بجودة عالية...`);
    for (let i = 0; i < fileList.length; i++) {
      const url = await uploadSingleFile(fileList[i]);
      if (url) {
        urls.push({
          url,
          title: fileList[i].name.replace(/\.[^.]+$/, "")
        });
      }
    }
    await loadMediaCatalog();
    renderMediaPanel();
    renderOverviewPanel();
    showToast(`تم رفع وضغط ${urls.length} صور وإضافتها بنجاح!`);
    return urls;
  }

  async function uploadFileHelper(fileInput) {
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast("يرجى اختيار ملف صورة أولاً", true);
      return null;
    }

    try {
      const prepared = await compressImageLosslessClient(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: prepared.filename,
          dataUrl: prepared.dataUrl,
          originalSize: prepared.originalSize
        })
      });
      const data = await res.json();
      if (data.success) {
        await loadMediaCatalog();
        renderMediaPanel();
        renderOverviewPanel();
        if (data.originalBytes && data.compressedBytes && data.savedPercent > 0) {
          showToast(
            `تم رفع وضغط الصورة بدون فقدان الجودة! (${formatBytes(data.originalBytes)} ← ${formatBytes(data.compressedBytes)} | توفير ${data.savedPercent}%)`
          );
        } else {
          showToast("تم رفع الصورة بأعلى جودة بنجاح!");
        }
        return data.url;
      } else {
        showToast(data.error || "فشل الرفع", true);
        return null;
      }
    } catch (err) {
      showToast("حدث خطأ أثناء رفع وضغط الصورة", true);
      return null;
    }
  }

  // =========================================================================
  // GLOBAL EVENTS, SHORTCUTS & PREVIEW DOCK
  // =========================================================================
  function bindGlobalEvents() {
    // Sidebar Navigation
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".cms-panel").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.panel);
        if (target) target.classList.add("active");

        const title = btn.dataset.title || "";
        const sub = btn.dataset.sub || "";
        document.getElementById("activePanelTitle").textContent = title;
        document.getElementById("breadcrumbCurrent").textContent = title;
        document.getElementById("activePanelSub").textContent = sub;
      });
    });

    // CMS Theme Switcher (Dark / Light)
    document.getElementById("cmsThemeToggleBtn")?.addEventListener("click", () => {
      applyCmsTheme(cmsTheme === "dark" ? "light" : "dark");
    });

    // Live Preview Split-Screen Toggle
    const bodySplit = document.getElementById("cmsBodySplit");
    const previewIframe = document.getElementById("livePreviewIframe");
    document.getElementById("toggleLivePreviewBtn")?.addEventListener("click", () => {
      bodySplit?.classList.toggle("preview-open");
    });
    document.getElementById("closePreviewPaneBtn")?.addEventListener("click", () => {
      bodySplit?.classList.remove("preview-open");
    });
    document.getElementById("previewLightBtn")?.addEventListener("click", () => {
      if (previewIframe) previewIframe.src = "/?theme=light";
    });
    document.getElementById("previewDarkBtn")?.addEventListener("click", () => {
      if (previewIframe) previewIframe.src = "/?theme=dark";
    });
    document.getElementById("refreshPreviewBtn")?.addEventListener("click", refreshLivePreview);

    // Save All + Ctrl+S Shortcut
    document.getElementById("saveAllBtn")?.addEventListener("click", saveCms);
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveCms();
      }
    });

    // Export / Import JSON Backup
    document.getElementById("exportJsonBtn")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(cms, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alhawd-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تحميل ملف النسخة الاحتياطية بنجاح");
    });

    document.getElementById("importJsonInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (parsed && parsed.settings && parsed.hero) {
            cms = parsed;
            await saveCms();
            renderAllPanels();
            showToast("تم استيراد النسخة الاحتياطية بنجاح!");
          } else {
            showToast("ملف JSON غير متوافق", true);
          }
        } catch (err) {
          showToast("خطأ في قراءة ملف JSON", true);
        }
      };
      reader.readAsText(file);
    });

    // Reset Defaults
    document.getElementById("resetDefaultBtn")?.addEventListener("click", async () => {
      if (!confirm("هل أنت متأكد من استعادة كافة البيانات والإعدادات الافتراضية؟")) return;
      const res = await fetch("/api/cms/reset", { method: "POST" });
      if (res.ok) {
        await loadCmsData();
        markDirty(false);
        renderAllPanels();
        refreshLivePreview();
        showToast("تمت استعادة الإعدادات الافتراضية بنجاح");
      }
    });

    // Repeater Add Buttons
    document.getElementById("addNavBtn")?.addEventListener("click", () => {
      cms.navigation.push({ id: `nav-${Date.now()}`, label: "رابط جديد", href: "#projects" });
      markDirty(true);
      renderGeneralPanel();
      bindDynamicInputs();
    });

    document.getElementById("addHeroSlideBtn")?.addEventListener("click", () => {
      const nextNum = String((cms.hero.slides?.length || 0) + 1).padStart(2, "0");
      cms.hero.slides.push({
        id: `slide-${Date.now()}`,
        number: nextNum,
        title: "شريحة عرض جديدة",
        imageLight: "/images/light/scene-1.webp",
        imageDark: "/images/dark/scene-1.webp"
      });
      markDirty(true);
      renderHeroPanel();
      bindDynamicInputs();
    });

    document.getElementById("addProjectBtn")?.addEventListener("click", () => {
      cms.projectsSection.projects.push({
        id: `proj-${Date.now()}`,
        title: `مشروع الهدوء ${(cms.projectsSection.projects?.length || 0) + 1}`,
        locationLight: "عمان - عبدون",
        locationDark: "عمان - عبدون",
        unitsCount: "40 شقة",
        floorsCountLight: "5 طوابق",
        floorsCountDark: "5 طوابق",
        statusText: "متاح الآن",
        statusType: "available",
        imageLight: "/images/light/scene-10.webp",
        imageDark: "/images/dark/scene-10.webp",
        description: "مشروع سكني فاخر بتصاميم عصرية وتشطيبات فندقية."
      });
      selectedProjectIdx = cms.projectsSection.projects.length - 1;
      markDirty(true);
      renderProjectsPanel();
      bindDynamicInputs();
    });

    document.getElementById("addShowcaseUnitBtn")?.addEventListener("click", () => {
      cms.explorerSection.units = cms.explorerSection.units || [];
      const count = cms.explorerSection.units.length + 1;
      const cats = cms.explorerSection.categories || ["شقق", "دوبلكس", "بنتهاوس"];
      cms.explorerSection.units.push({
        id: `unit-${Date.now()}`,
        category: cats[0] || "شقق",
        title: `شقة نموذج ${count}`,
        area: "150 م²",
        bedrooms: "3 غرف",
        featureBadge: "إطلالة مميزة",
        featureIcon: "landmark",
        planImage: "/images/ui/unit-plan-a.webp",
        mainImage: "/images/light/scene-2.webp",
        caption: "تصميم عصري وتشطيبات فندقية راقية"
      });
      selectedShowcaseUnitIdx = cms.explorerSection.units.length - 1;
      markDirty(true);
      renderExplorerPanel();
      bindDynamicInputs();
      showToast("تمت إضافة نموذج وحدة سكنية جديد!");
    });

    document.getElementById("addApartmentBtn")?.addEventListener("click", () => {
      cms.explorerSection.apartments = cms.explorerSection.apartments || [];
      const nextLetter = String.fromCharCode(65 + (cms.explorerSection.apartments.length % 26));
      const firstProj = cms.projectsSection?.projects?.[0] || { id: "proj-1", title: "مشروع الحوض الهادي 1" };
      cms.explorerSection.apartments.push({
        id: `apt-${Date.now()}`,
        buildingId: firstProj.id,
        buildingName: firstProj.title,
        code: `${nextLetter}-10${cms.explorerSection.apartments.length + 1}`,
        title: `شقة فاخرة ${nextLetter}-10${cms.explorerSection.apartments.length + 1}`,
        type: "شقة طابقية فاخرة",
        status: "available",
        statusText: "متاحة للبيع",
        area: "175 م²",
        floor: "الطابق الثاني",
        bedrooms: "3 غرف نوم (1 ماستر)",
        bathrooms: "3 حمامات",
        direction: "واجهة أمامية جنوبية",
        price: "140,000 د.أ",
        priceNote: "شامل رسوم التسجيل",
        planImage: "/images/floorplan-apt-a.webp",
        mainImage: "/images/living-room.webp",
        bookCtaText: "احجز موعد مشاهدة",
        downloadPlanText: "تحميل المخطط",
        features: [
          { id: "feat-1", icon: "sofa", labelLight: "صالة واسعة", labelDark: "صالة واسعة", galleryIndex: 0 },
          { id: "feat-2", icon: "balcony", labelLight: "بلكونة واسعة", labelDark: "بلكونة واسعة", galleryIndex: 1 },
          { id: "feat-3", icon: "kitchen", labelLight: "مطبخ حديث", labelDark: "مطبخ حديث", galleryIndex: 2 },
          { id: "feat-4", icon: "bath", labelLight: "3 حمامات", labelDark: "3 حمامات", galleryIndex: 3 }
        ],
        gallery: [
          {
            id: `gal-${Date.now()}`,
            title: "الصالة الرئيسية وغرفة المعيشة",
            imageLight: "/images/living-room.webp",
            imageDark: "/images/living-room.webp"
          }
        ]
      });
      selectedApartmentIdx = cms.explorerSection.apartments.length - 1;
      markDirty(true);
      renderExplorerPanel();
      bindDynamicInputs();
      showToast("تمت إضافة شقة جديدة بنجاح!");
    });

    document.getElementById("addExpCategoryBtn")?.addEventListener("click", () => {
      const catInp = document.getElementById("newExpCategoryInput");
      if (catInp) {
        catInp.focus();
        catInp.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    document.getElementById("addAmenityBtn")?.addEventListener("click", () => {
      cms.lifestyleSection.amenities = cms.lifestyleSection.amenities || [];
      cms.lifestyleSection.amenities.push({ id: `am-${Date.now()}`, icon: "location", label: "مرفق جديد" });
      markDirty(true);
      renderLifestylePanel();
      bindDynamicInputs();
    });

    document.getElementById("openAddCategoryBtn")?.addEventListener("click", () => {
      openCategoryCreatorModal();
    });

    document.getElementById("closeCategoryModal")?.addEventListener("click", () => {
      closeCategoryModal();
    });

    document.getElementById("cancelCategoryBtn")?.addEventListener("click", () => {
      closeCategoryModal();
    });

    document.getElementById("saveCategoryBtn")?.addEventListener("click", () => {
      const labelInput = document.getElementById("newCategoryLabelInput");
      const iconInput = document.getElementById("newCategoryIconInput");
      const label = labelInput?.value.trim() || labelInput?.placeholder?.trim();
      const iconKey = iconInput?.value.trim() || "star";

      if (!label) {
        alert("يرجى كتابة اسم الفئة الجديدة");
        labelInput?.focus();
        return;
      }

      const key = `cat-${Date.now()}`;
      if (!Array.isArray(cms.lifestyleSection.customCategories)) {
        cms.lifestyleSection.customCategories = [];
      }

      cms.lifestyleSection.customCategories.push({
        key: key,
        label: label,
        icon: iconKey
      });

      markDirty(true);
      closeCategoryModal();
      showToast(`تمت إضافة الفئة "${label}" بالأيقونة المعمارية بنجاح!`);

      if (pendingCategoryCallback) {
        const cb = pendingCategoryCallback;
        pendingCategoryCallback = null;
        cb(key);
      } else {
        renderLifestylePanel();
        bindDynamicInputs();
      }
    });

    document.getElementById("addStatBtn")?.addEventListener("click", () => {
      cms.aboutSection.stats.push({ id: `st-${Date.now()}`, value: "+15", label: "جائزة تميز" });
      markDirty(true);
      renderAboutPanel();
      bindDynamicInputs();
    });

    document.getElementById("addProximityBtn")?.addEventListener("click", () => {
      cms.locationSection.proximities.push({
        id: `prox-${Date.now()}`,
        icon: "city",
        label: "الحدائق العامة",
        time: "6 دقائق",
        pinId: "pin-school"
      });
      markDirty(true);
      renderLocationPanel();
      bindDynamicInputs();
    });

    document.getElementById("addMapPinBtn")?.addEventListener("click", () => {
      cms.locationSection.mapPins.push({
        id: `pin-${Date.now()}`,
        icon: "city",
        labelLight: "معلم جديد",
        labelDark: "معلم جديد",
        x: 50,
        y: 50
      });
      markDirty(true);
      renderLocationPanel();
      bindDynamicInputs();
    });

    // Bookings Filter & Search
    document.querySelectorAll("#bookingFilterBar [data-bk-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#bookingFilterBar .subtab-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        bookingStatusFilter = btn.dataset.bkFilter;
        renderBookingsPanel();
      });
    });

    document.getElementById("bookingSearchInput")?.addEventListener("input", (e) => {
      bookingSearchQuery = e.target.value;
      renderBookingsPanel();
    });

    // Media Upload Buttons
    document.getElementById("uploadMediaBtn")?.addEventListener("click", () => {
      uploadFileHelper(document.getElementById("mediaUploadInput"));
    });

    document.getElementById("modalUploadBtn")?.addEventListener("click", async () => {
      const url = await uploadFileHelper(document.getElementById("modalQuickUpload"));
      if (url && activePickerCallback) {
        activePickerCallback(url, url);
      }
    });

    document.getElementById("closePickerModal")?.addEventListener("click", () => {
      document.getElementById("mediaPickerModal")?.classList.remove("open");
    });

    document.getElementById("refreshBookingsBtn")?.addEventListener("click", async () => {
      await loadBookings();
      renderBookingsPanel();
      renderOverviewPanel();
      showToast("تم تحديث قائمة الحجوزات");
    });

    // =====================================================================
    // USER & EMPLOYEE MANAGEMENT + PASSWORD CHANGE EVENTS
    // =====================================================================
    document.getElementById("toggleNewUserPwBtn")?.addEventListener("click", (e) => {
      const inp = document.getElementById("newUserPassword");
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
      e.currentTarget.textContent = inp.type === "password" ? "إظهار" : "إخفاء";
    });

    document.getElementById("genEmployeePwBtn")?.addEventListener("click", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      let rand = "Hawd@";
      for (let i = 0; i < 5; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const inp = document.getElementById("newUserPassword");
      const toggleBtn = document.getElementById("toggleNewUserPwBtn");
      if (inp) {
        inp.value = rand;
        inp.type = "text";
      }
      if (toggleBtn) toggleBtn.textContent = "إخفاء";
      showToast(`تم توليد كلمة مرور: ${rand}`);
    });

    document.getElementById("createNewUserBtn")?.addEventListener("click", async () => {
      const displayNameEl = document.getElementById("newUserDisplayName");
      const usernameEl = document.getElementById("newUserUsername");
      const roleEl = document.getElementById("newUserRole");
      const passwordEl = document.getElementById("newUserPassword");

      const displayName = displayNameEl?.value.trim() || "";
      const username = usernameEl?.value.trim() || "";
      const role = roleEl?.value || "sales";
      const password = passwordEl?.value || "";

      if (!username || username.length < 2) {
        showToast("يرجى إدخال اسم مستخدم صالح للدخول (حرفين على الأقل)", true);
        usernameEl?.focus();
        return;
      }
      if (!password || password.length < 4) {
        showToast("يرجى إدخال كلمة مرور لا تقل عن 4 خانات", true);
        passwordEl?.focus();
        return;
      }

      const btn = document.getElementById("createNewUserBtn");
      if (btn) btn.disabled = true;
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName || username,
            username,
            role,
            password
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          if (displayNameEl) displayNameEl.value = "";
          if (usernameEl) usernameEl.value = "";
          if (passwordEl) passwordEl.value = "";
          await loadAdminUsers();
          renderUsersPanel();
          showToast(`تمت إضافة الموظف (${data.user?.displayName || username}) وتفعيل حسابه بنجاح!`);
        } else {
          showToast(data.error || "تعذر إضافة المستخدم", true);
        }
      } catch (err) {
        showToast("تعذر الاتصال بالخادم", true);
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById("toggleChangePwBtn")?.addEventListener("click", (e) => {
      const inp1 = document.getElementById("changePwNewInput");
      const inp2 = document.getElementById("changePwConfirmInput");
      if (!inp1) return;
      const nextType = inp1.type === "password" ? "text" : "password";
      inp1.type = nextType;
      if (inp2) inp2.type = nextType;
      e.currentTarget.textContent = nextType === "password" ? "إظهار" : "إخفاء";
    });

    document.getElementById("submitChangePwBtn")?.addEventListener("click", async () => {
      const targetSelect = document.getElementById("changePwTargetSelect");
      const newInp = document.getElementById("changePwNewInput");
      const confirmInp = document.getElementById("changePwConfirmInput");

      const userId = targetSelect?.value || "";
      const newPassword = newInp?.value || "";
      const confirmPassword = confirmInp?.value || "";

      if (!newPassword || newPassword.length < 4) {
        showToast("كلمة المرور الجديدة يجب أن تتكون من 4 خانات على الأقل", true);
        newInp?.focus();
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast("كلمتا المرور غير متطابقتين، يرجى التأكد من التطابق", true);
        confirmInp?.focus();
        return;
      }

      const btn = document.getElementById("submitChangePwBtn");
      if (btn) btn.disabled = true;
      try {
        const res = await fetch("/api/admin/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, newPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          if (newInp) newInp.value = "";
          if (confirmInp) confirmInp.value = "";
          await loadAdminUsers();
          renderUsersPanel();
          showToast(data.message || "تم تغيير كلمة المرور بنجاح!");
        } else {
          showToast(data.error || "حدث خطأ أثناء تغيير كلمة المرور", true);
        }
      } catch (err) {
        showToast("تعذر الاتصال بالخادم", true);
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    document.getElementById("refreshUsersBtn")?.addEventListener("click", async () => {
      await loadAdminUsers();
      renderUsersPanel();
      showToast("تم تحديث قائمة الموظفين والمستخدمين");
    });

    // Edit User Modal Events
    const closeEditModal = () => document.getElementById("editUserModal")?.classList.remove("open");
    document.getElementById("closeEditUserModal")?.addEventListener("click", closeEditModal);
    document.getElementById("cancelEditUserBtn")?.addEventListener("click", closeEditModal);

    document.getElementById("toggleEditUserPwBtn")?.addEventListener("click", (e) => {
      const inp = document.getElementById("editUserNewPassword");
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
      e.currentTarget.textContent = inp.type === "password" ? "إظهار" : "إخفاء";
    });

    document.getElementById("saveEditUserBtn")?.addEventListener("click", async () => {
      const id = document.getElementById("editUserIdInput")?.value || "";
      const displayName = document.getElementById("editUserDisplayName")?.value.trim() || "";
      const username = document.getElementById("editUserUsername")?.value.trim() || "";
      const role = document.getElementById("editUserRole")?.value || "sales";
      const isActive = document.getElementById("editUserActive")?.value === "true";
      const password = document.getElementById("editUserNewPassword")?.value || "";

      if (!id) return;
      if (!username || username.length < 2) {
        showToast("اسم المستخدم يجب أن يتكون من حرفين على الأقل", true);
        return;
      }
      if (password && password.length < 4) {
        showToast("كلمة المرور الجديدة يجب أن تتكون من 4 خانات على الأقل", true);
        return;
      }

      const btn = document.getElementById("saveEditUserBtn");
      if (btn) btn.disabled = true;
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName || username,
            username,
            role,
            isActive,
            password: password || undefined
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          closeEditModal();
          await loadAdminUsers();
          renderUsersPanel();
          showToast(password ? "تم تحديث بيانات الموظف وكلمة المرور بنجاح!" : "تم تحديث بيانات الموظف بنجاح!");
        } else {
          showToast(data.error || "تعذر حفظ التعديلات", true);
        }
      } catch (err) {
        showToast("تعذر الاتصال بالخادم", true);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
  } else {
    initAdmin();
  }
})();
