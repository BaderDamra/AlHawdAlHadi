/**
 * الحوض الهادي للإسكان - AL HAWD AL HADI HOUSING
 * Interactive Front-End Application (CMS-Driven + Light/Dark Theme Engine + Full UI/UX Enhancements)
 */

(function () {
  const urlTheme = new URLSearchParams(window.location.search).get("theme");
  let cmsData = null;
  let currentTheme = urlTheme || localStorage.getItem("alhawd_theme") || "light";
  let currentHeroSlide = 0;
  let heroInterval = null;
  let highlightedProjectIdx = 0;

  // Interactive Explorer State
  let selectedFloor = 4;
  let selectedUnitId = "unit-A";
  let selectedGalleryIdx = 0;
  let buildingViewIdx = 0;
  let highlightGlowVisible = true;

  // SVG Icons Library
  const ICONS = {
    sofa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 11h20v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/><line x1="6" y1="19" x2="6" y2="21"/><line x1="18" y1="19" x2="18" y2="21"/></svg>`,
    balcony: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="8" y1="14" x2="8" y2="21"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="16" y1="14" x2="16" y2="21"/></svg>`,
    kitchen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/></svg>`,
    bath: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/></svg>`,
    location: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    security: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
    kids: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    gym: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5l11 11"/><path d="M21 21l-1-1"/><path d="M3 3l1 1"/><path d="M18 22l4-4"/><path d="M2 6l4-4"/><path d="M3 10l7-7"/><path d="M14 21l7-7"/></svg>`,
    green: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-7"/><path d="M9 15c-3 0-5-2.5-5-5.5S6.5 3 12 3s8 3.5 8 6.5-2 5.5-5 5.5H9z"/></svg>`,
    parking: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><path d="M5 6l2-3h10l2 3"/></svg>`,
    pool: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 18c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M2 22c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M8 8V4a2 2 0 1 1 4 0v4"/><path d="M12 4a2 2 0 1 1 4 0v4"/><circle cx="16" cy="12" r="2"/></svg>`,
    elevator: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><polyline points="8 9 10 7 12 9"/><polyline points="12 15 14 17 16 15"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    ev: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    solar: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
    smarthome: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/><circle cx="12" cy="7" r="1"/></svg>`,
    ac: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/><circle cx="12" cy="12" r="2"/></svg>`,
    heating: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    view: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>`,
    lounge: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    mosque: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c-3 3-4 6-4 8h8c0-2-1-5-4-8z"/><path d="M4 21V12h16v9"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><circle cx="12" cy="2" r="0.8"/></svg>`,
    spa: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/></svg>`,
    cctv: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 7h15l4 4-4 4H2V7z"/><circle cx="8" cy="11" r="2"/><line x1="7" y1="15" x2="7" y2="21"/></svg>`,
    wifi: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    maintenance: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    shopping: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    padel: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="3.6" y1="9" x2="20.4" y2="9"/><line x1="3.6" y1="15" x2="20.4" y2="15"/><line x1="9" y1="3.6" x2="9" y2="20.4"/><line x1="15" y1="3.6" x2="15" y2="20.4"/></svg>`,
    soundproof: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    cinema: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
    bike: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><polyline points="15 6 9 6 12 12"/><path d="M5.5 17.5l6-5.5 7 5.5"/></svg>`,
    storage: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
    key: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3M18.5 4.5l3 3"/></svg>`,
    concierge: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    gate: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
    bbq: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 12c4.42 0 8-1.79 8-4H4c0 2.21 3.58 4 8 4z"/><line x1="7" y1="12" x2="5" y2="21"/><line x1="17" y1="12" x2="19" y2="21"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
    architecture: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 22h20M4 22V7l8-4 8 4v15M9 22V12h6v10"/></svg>`,
    star: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    school: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    mall: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    hospital: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    city: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="15" y2="14"/></svg>`,
    phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    whatsapp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    area: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    bed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
    finish: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 11V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z"/><path d="M19 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-9v6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-6H5"/></svg>`,
    landmark: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10"/></svg>`,
    tree: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-7"/><path d="M9 15c-3 0-5-2.5-5-5.5S6.5 3 12 3s8 3.5 8 6.5-2 5.5-5 5.5H9z"/></svg>`,
    sun: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`
  };

  // =========================================================================
  // THEME ENGINE (LightMood & DarkMood)
  // =========================================================================
  function applyTheme(theme) {
    currentTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("alhawd_theme", currentTheme);

    const iconWrap = document.getElementById("themeIconWrap");
    const labelText = document.getElementById("themeLabelText");
    if (iconWrap && labelText) {
      if (currentTheme === "dark") {
        iconWrap.textContent = "☀️";
        labelText.textContent = "الوضع النهاري";
      } else {
        iconWrap.textContent = "🌙";
        labelText.textContent = "الوضع الليلي";
      }
    }

    if (cmsData) {
      renderProjects();
      renderUnitDetails();
      renderLocationSection();
    }
  }

  function toggleTheme() {
    applyTheme(currentTheme === "light" ? "dark" : "light");
  }

  // =========================================================================
  // FETCH CMS DATA & INITIALIZE
  // =========================================================================
  async function initApp() {
    applyTheme(currentTheme);

    try {
      const res = await fetch("/api/cms");
      cmsData = await res.json();
      if (!urlTheme && !localStorage.getItem("alhawd_theme") && cmsData.settings?.defaultTheme) {
        applyTheme(cmsData.settings.defaultTheme);
      }
      renderAll();
    } catch (err) {
      console.error("Failed to load CMS data:", err);
    }

    setupEventListeners();
  }

  function renderAll() {
    if (!cmsData) return;

    const vis = cmsData.settings?.sectionVisibility || {};
    toggleEl("hero", vis.hero !== false);
    toggleEl("projects", vis.projects !== false);
    toggleEl("explorer", false);
    toggleEl("unitDetails", false);
    toggleEl("lifestyle", vis.lifestyle !== false);
    toggleEl("about", vis.about !== false);
    toggleEl("location", vis.location !== false);
    toggleEl("cta-banner", vis.ctaBanner !== false);
    toggleEl("footer", vis.footer !== false);

    renderHeaderAndHero();
    renderProjects();
    renderExplorer();
    renderUnitDetails();
    renderLifestyle();
    renderAbout();
    renderLocationSection();
    renderCtaBanner();
    renderFooter();
  }

  function toggleEl(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "" : "none";
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.textContent = val;
  }

  // =========================================================================
  // 1. HEADER & HERO RENDERING
  // =========================================================================
  function renderHeaderAndHero() {
    const { settings, navigation, hero } = cmsData;
    if (settings) {
      setText("headerBrandAr", settings.brandNameAr);
      setText("headerBrandEn", settings.brandNameEn);
      setText("headerCtaText", settings.headerCtaText);
      setText("headerLangLabel", settings.languageLabel || "EN");
    }

    if (Array.isArray(navigation)) {
      const navList = document.getElementById("mainNavList");
      if (navList) {
        navList.innerHTML = navigation
          .map(
            (item, idx) =>
              `<li><a href="${item.href}" class="${idx === 0 ? "active" : ""}">${item.label}</a></li>`
          )
          .join("");
      }
    }

    if (hero) {
      setText("heroEyebrow", hero.eyebrow);
      setText("heroTitle1", hero.titleLine1);
      setText("heroTitle2", hero.titleLine2);
      setText("heroSubtitle", hero.subtitle);
      setText("heroCtaText", hero.ctaText);
      setText("heroScrollText", hero.scrollDownText);
      setText("heroBottomTag1", hero.bottomTaglineLine1);
      setText("heroBottomTag2", hero.bottomTaglineLine2);
      setText("heroBottomLoc", hero.bottomLocation);

      const sliderEl = document.getElementById("heroBgSlider");
      const numsEl = document.getElementById("heroSliderNums");
      const slides = hero.slides || [];

      if (sliderEl && slides.length) {
        sliderEl.innerHTML = slides
          .map(
            (s, i) => `
          <div class="hero-slide theme-img-wrap ${i === currentHeroSlide ? "active" : ""}" data-slide="${i}">
            <img src="${s.imageLight}" alt="${s.title || ""}" class="img-light" />
            <img src="${s.imageDark || s.imageLight}" alt="${s.title || ""}" class="img-dark" />
          </div>
        `
          )
          .join("");
      }

      if (numsEl && slides.length) {
        numsEl.innerHTML = slides
          .map(
            (s, i) => `
          <button type="button" class="hero-num-btn ${i === currentHeroSlide ? "active" : ""}" data-index="${i}">
            ${s.number || String(i + 1).padStart(2, "0")}
          </button>
        `
          )
          .join("");

        numsEl.querySelectorAll(".hero-num-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            goToHeroSlide(parseInt(btn.dataset.index, 10));
          });
        });
      }

      startHeroAutoPlay(slides.length);
    }
  }

  function goToHeroSlide(idx) {
    const slides = cmsData?.hero?.slides || [];
    if (!slides.length) return;
    currentHeroSlide = (idx + slides.length) % slides.length;

    document.querySelectorAll(".hero-slide").forEach((el, i) => {
      el.classList.toggle("active", i === currentHeroSlide);
    });
    document.querySelectorAll(".hero-num-btn").forEach((el, i) => {
      el.classList.toggle("active", i === currentHeroSlide);
    });
  }

  function startHeroAutoPlay(count) {
    if (heroInterval) clearInterval(heroInterval);
    if (count <= 1) return;
    heroInterval = setInterval(() => {
      goToHeroSlide(currentHeroSlide + 1);
    }, 6500);
  }

  // =========================================================================
  // 2. FEATURED PROJECTS RENDERING & QUICK-VIEW MODAL
  // =========================================================================
  function renderProjects() {
    const sec = cmsData.projectsSection;
    if (!sec) return;

    setText("projEyebrow", sec.eyebrow);
    setText("projTitle", sec.title);
    setText("projSubtitle", sec.subtitle);
    setText("projViewAll", sec.viewAllText);

    const grid = document.getElementById("projectsGrid");
    if (!grid) return;

    const projects = sec.projects || [];
    grid.innerHTML = "";

    projects.forEach((p, idx) => {
      const pid = p.id || `proj-${idx + 1}`;
      if (customElements.get("project-card")) {
        const cardEl = document.createElement("project-card");
        cardEl.setAttribute("project-id", pid);
        grid.appendChild(cardEl);
        cardEl.setProjectData({ ...p, id: pid }, idx);
      } else {
        const loc = currentTheme === "dark" ? p.locationDark || p.locationLight : p.locationLight;
        const floors = currentTheme === "dark" ? p.floorsCountDark || p.floorsCountLight : p.floorsCountLight;
        const art = document.createElement("article");
        art.className = "project-card";
        art.dataset.projectIdx = idx;
        art.innerHTML = `
          <div class="project-card-media theme-img-wrap">
            <span class="project-status-badge ${p.statusType || "available"}">${p.statusText}</span>
            <img src="${p.imageLight}" alt="${p.title}" class="img-light" />
            <img src="${p.imageDark || p.imageLight}" alt="${p.title}" class="img-dark" />
          </div>
          <div class="project-card-body">
            <div class="project-card-info">
              <h3 class="project-card-title">${p.title}</h3>
              <p class="project-card-loc">${loc}</p>
              <div class="project-card-meta">
                <span class="project-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/>
                  </svg>
                  <span>${p.unitsCount}</span>
                </span>
                <span class="project-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="12 17 12 22 22 17"/><polyline points="12 12 12 17 22 12"/>
                  </svg>
                  <span>${floors}</span>
                </span>
              </div>
            </div>
            <button type="button" class="project-arrow-btn" title="استكشف تفاصيل المشروع">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
          </div>
        `;
        art.onclick = () => {
          if (p && p.id) {
            window.location.href = `/project?id=${encodeURIComponent(p.id)}`;
          } else {
            openProjectDetailModal(idx);
          }
        };
        grid.appendChild(art);
      }
    });
  }

  function openProjectDetailModal(idx) {
    const projects = cmsData?.projectsSection?.projects || [];
    const p = projects[idx];
    const pid = (p && p.id) ? p.id : `proj-${(idx || 0) + 1}`;
    window.location.href = `/project?id=${encodeURIComponent(pid)}`;
    return;

    const modal = document.getElementById("projectDetailModal");
    const img = document.getElementById("projModalImg");
    const status = document.getElementById("projModalStatus");

    if (img) img.src = currentTheme === "dark" ? p.imageDark || p.imageLight : p.imageLight;
    if (status) {
      status.textContent = p.statusText;
      status.className = `project-status-badge ${p.statusType || "available"}`;
    }
    setText("projModalLoc", currentTheme === "dark" ? p.locationDark || p.locationLight : p.locationLight);
    setText("projModalTitle", p.title);
    setText("projModalDesc", p.description || "مجمع سكني عصري متكامل الخدمات مصمم وفق أعلى المعايير الهندسية والمعمارية.");
    setText("projModalUnits", p.unitsCount);
    setText("projModalFloors", currentTheme === "dark" ? p.floorsCountDark || p.floorsCountLight : p.floorsCountLight);

    const bookBtn = document.getElementById("projModalBookBtn");
    if (bookBtn) {
      bookBtn.onclick = () => {
        modal?.classList.remove("open");
        const projSelect = document.getElementById("bkProject");
        if (projSelect) projSelect.value = p.title;
        document.getElementById("bookingModal")?.classList.add("open");
      };
    }

    const expBtn = document.getElementById("projModalExploreBtn");
    if (expBtn) {
      expBtn.onclick = () => {
        modal?.classList.remove("open");
        document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" });
      };
    }

    modal?.classList.add("open");
  }

  // =========================================================================
  // 3A. INTERACTIVE RESIDENTIAL SHOWCASE RENDERING (استكشف وحدتك السكنية)
  // =========================================================================
  let selectedShowcaseUnitId = "apt-a";
  let activeShowcaseCategory = "شقق";

  function renderExplorer() {
    const exp = cmsData.explorerSection;
    if (!exp) return;

    setText("expEyebrow", exp.eyebrow || "وحدات متنوعة");
    setText("expTitle", exp.title || "خيارات سكنية تناسب أسلوب حياتك");
    setText("expSubtitle", exp.subtitle || "اختر نوع الوحدة التي تناسب احتياجاتك من حيث المساحة وعدد الغرف والإطلالة، واستمتع بتصميمات عصرية تلبي تطلعاتك.");
    setText("expCtaText", exp.ctaText || "استعرض الوحدات المتاحة");

    const ctaBtn = document.getElementById("expCtaBtn");
    if (ctaBtn && exp.ctaLink) {
      ctaBtn.href = exp.ctaLink;
    }

    const units = exp.units || [];
    if (!units.find((u) => u.id === selectedShowcaseUnitId) && units.length > 0) {
      selectedShowcaseUnitId = units[0].id;
    }

    const activeUnit = units.find((u) => u.id === selectedShowcaseUnitId) || units[0];

    // Categories tabs
    const categories = exp.categories || ["شقق", "دوبلكس", "بنتهاوس"];
    if (activeUnit && activeUnit.category && !activeShowcaseCategory) {
      activeShowcaseCategory = activeUnit.category;
    }

    const tabsContainer = document.getElementById("expCategoryTabs");
    if (tabsContainer) {
      tabsContainer.innerHTML = categories
        .map(
          (cat) => `
        <button type="button" class="exp-tab-pill ${cat === activeShowcaseCategory ? "active" : ""}" data-exp-category="${cat}">
          ${cat}
        </button>
      `
        )
        .join("");

      tabsContainer.querySelectorAll("[data-exp-category]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cat = btn.dataset.expCategory;
          activeShowcaseCategory = cat;
          const match = units.find((u) => u.category === cat);
          if (match) {
            selectedShowcaseUnitId = match.id;
          }
          renderExplorer();
        });
      });
    }

    // Top Preview Image & Caption
    const mainImg = document.getElementById("expMainImage");
    if (mainImg && activeUnit) {
      const targetSrc = activeUnit.mainImage || "/images/light/scene-2.webp";
      if (!mainImg.src.endsWith(targetSrc) && mainImg.getAttribute("src") !== targetSrc) {
        mainImg.style.opacity = "0.2";
        setTimeout(() => {
          mainImg.src = targetSrc;
          mainImg.style.opacity = "1";
        }, 120);
      }
    }
    setText("expImageCaption", (activeUnit && activeUnit.caption) || "تصميم عصري ومساحات رحبة");

    // Summary 4 Metrics Grid
    const metricsGrid = document.getElementById("expMetricsGrid");
    if (metricsGrid) {
      const defaultMetrics = [
        { id: "area", icon: "area", label: "المساحة", value: "60 - 280 م²" },
        { id: "rooms", icon: "bed", label: "عدد الغرف", value: "1 - 4 غرف" },
        { id: "view", icon: "view", label: "الإطلالة", value: "متنوعة" },
        { id: "finish", icon: "finish", label: "التشطيب", value: "فاخر" }
      ];
      const metricsList = exp.summaryMetrics || defaultMetrics;

      metricsGrid.innerHTML = metricsList
        .map((m) => {
          const iconSvg = ICONS[m.icon] || ICONS.area;
          return `
          <div class="exp-metric-item">
            <div class="exp-metric-top">
              <span class="exp-metric-icon">${iconSvg}</span>
              <span>${m.label}</span>
            </div>
            <div class="exp-metric-val">${m.value}</div>
          </div>
        `;
        })
        .join("");
    }

    // Unit Cards Grid (Filtered by category, displaying all matching apartments)
    const cardsGrid = document.getElementById("expCardsGrid");
    if (cardsGrid) {
      const displayUnits = (activeShowcaseCategory && activeShowcaseCategory !== "الكل")
        ? units.filter((u) => u.category === activeShowcaseCategory)
        : units;
      const listToRender = displayUnits.length ? displayUnits : units;

      cardsGrid.innerHTML = listToRender
        .map((u) => {
          const isActive = u.id === selectedShowcaseUnitId;
          const featIconSvg = ICONS[u.featureIcon] || ICONS.landmark;
          const bedIconSvg = ICONS.bed;
          return `
          <div class="exp-unit-card ${isActive ? "active" : ""}" data-unit-card-id="${u.id}">
            <div class="exp-card-plan-wrap">
              <img src="${u.planImage || "/images/ui/unit-plan-a.webp"}" alt="${u.title}" class="exp-card-plan-img" />
            </div>
            <div class="exp-card-info-row">
              <h3 class="exp-card-title">${u.title}</h3>
              <span class="exp-card-area">${u.area}</span>
            </div>
            <div class="exp-card-chips">
              <div class="exp-card-chip">
                ${bedIconSvg}
                <span>${u.bedrooms || "3 غرف"}</span>
              </div>
              <div class="exp-card-chip">
                ${featIconSvg}
                <span>${u.featureBadge || "إطلالة مميزة"}</span>
              </div>
            </div>
            <div class="exp-card-bottom">
              <div class="exp-card-arrow-circle">←</div>
            </div>
          </div>
        `;
        })
        .join("");

      cardsGrid.querySelectorAll("[data-unit-card-id]").forEach((card) => {
        card.addEventListener("click", () => {
          const uid = card.dataset.unitCardId;
          selectedShowcaseUnitId = uid;
          const found = units.find((u) => u.id === uid);
          if (found && found.category) {
            activeShowcaseCategory = found.category;
          }
          // Sync with the apartment details section
          selectUnit(uid);
          renderExplorer();
        });
      });
    }
  }

  function selectUnit(unitId) {
    selectedUnitId = unitId;
    selectedGalleryIdx = 0;
    selectedShowcaseUnitId = unitId;

    renderUnitDetails();
  }

  function selectFloor(floorNum) {
    selectedFloor = floorNum;
    document.querySelectorAll(".floor-btn").forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.floor, 10) === floorNum);
    });

    const glow = document.getElementById("buildingFloorGlow");
    if (glow) {
      glow.setAttribute("data-floor", String(floorNum));
    }
    setText("floorGlowBadge", `الطابق ${floorNum}`);

    renderUnitDetails();
  }

  // =========================================================================
  // 3B. SELECTED APARTMENT DETAILS & INTERIOR GALLERY
  // =========================================================================
  let selectedBuildingFilter = "all";

  function renderUnitDetails() {
    const exp = cmsData.explorerSection;
    if (!exp || !Array.isArray(exp.apartments)) return;

    const allApts = exp.apartments;
    const projects = cmsData?.projectsSection?.projects || [];
    const projMap = {};
    projects.forEach((p) => {
      projMap[p.id] = p.title;
    });

    // Render Building Filter Bar
    const bBar = document.getElementById("buildingFilterBar");
    if (bBar && projects.length) {
      bBar.innerHTML = [
        `<button type="button" class="unit-selector-pill ${selectedBuildingFilter === "all" ? "active" : ""}" data-sel-bldg="all">🏢 جميع العمارات (${allApts.length})</button>`,
        ...projects.map((p) => {
          const count = allApts.filter((a) => (a.buildingId || "proj-1") === p.id).length;
          return `<button type="button" class="unit-selector-pill ${selectedBuildingFilter === p.id ? "active" : ""}" data-sel-bldg="${p.id}">🏢 ${p.title} (${count} شقق)</button>`;
        })
      ].join("");

      bBar.querySelectorAll("[data-sel-bldg]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedBuildingFilter = btn.dataset.selBldg;
          const matching = selectedBuildingFilter === "all"
            ? allApts
            : allApts.filter((a) => (a.buildingId || "proj-1") === selectedBuildingFilter);
          if (matching.length && !matching.find((a) => a.id === selectedUnitId)) {
            selectedUnitId = matching[0].id;
            selectedGalleryIdx = 0;
          }
          renderUnitDetails();
        });
      });
    }

    const apts = selectedBuildingFilter === "all"
      ? allApts
      : allApts.filter((a) => (a.buildingId || "proj-1") === selectedBuildingFilter);
    const listToUse = apts.length ? apts : allApts;

    if (!listToUse.find((a) => a.id === selectedUnitId) && listToUse.length) {
      selectedUnitId = listToUse[0].id;
    }

    // Render Apartment Selector Pills Bar so visitor can choose any apartment!
    const bar = document.getElementById("unitSelectorBar");
    if (bar && listToUse.length) {
      bar.innerHTML = listToUse
        .map(
          (a) => `
        <button type="button" class="unit-selector-pill ${a.id === selectedUnitId ? "active" : ""}" data-sel-apt="${a.id}">
          <span>🏠 ${a.title}</span>
          <span class="pill-area" style="color:var(--accent-gold); font-weight:700;">(${a.price || a.area})</span>
        </button>
      `
        )
        .join("");

      bar.querySelectorAll("[data-sel-apt]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectUnit(btn.dataset.selApt);
        });
      });
    }

    const unit = listToUse.find((a) => a.id === selectedUnitId) || listToUse[0];
    if (!unit) return;

    const statusBadge = document.getElementById("unitStatusBadge");
    if (statusBadge) {
      statusBadge.textContent = unit.statusText || "متاحة";
      statusBadge.className = `unit-status-pill ${unit.status || "available"}`;
    }

    const bldgBadge = document.getElementById("unitBuildingBadge");
    if (bldgBadge) {
      bldgBadge.textContent = projMap[unit.buildingId] || unit.buildingName || "مشروع الهدوء 1";
    }

    setText("unitTitleHeading", unit.title);
    setText("unitPriceVal", unit.price || "عند الطلب");
    setText("unitPriceNoteVal", unit.priceNote || "تشطيبات سوبر ديلوكس");
    setText("unitAreaVal", unit.area);
    setText("unitFloorVal", unit.floor || String(selectedFloor));
    setText("unitBedroomsVal", unit.bedrooms);
    setText("unitDirectionVal", unit.direction);
    setText("unitBookBtnText", unit.bookCtaText || "احجز موعد مشاهدة");
    setText("unitDownloadBtnText", unit.downloadPlanText || "تحميل المخطط");

    const openPageBtn = document.getElementById("unitOpenFullPageBtn");
    if (openPageBtn) {
      openPageBtn.href = `/apartment?id=${encodeURIComponent(unit.id || unit.code)}&project=${encodeURIComponent(unit.buildingId || "proj-1")}`;
    }

    const featRow = document.getElementById("unitFeaturesRow");
    if (featRow && Array.isArray(unit.features)) {
      featRow.innerHTML = unit.features
        .map((f, idx) => {
          let label = currentTheme === "dark" ? f.labelDark || f.labelLight : f.labelLight;
          // Ensure clean single-line label
          if (label && label.includes("/")) {
            label = currentTheme === "dark" ? "شرفة مطلة" : "مطبخ مستقل";
          }
          const iconSvg = ICONS[f.icon] || ICONS.sofa;
          const targetGal = f.galleryIndex !== undefined ? f.galleryIndex : idx;
          return `
          <div class="unit-feature-item ${selectedGalleryIdx === targetGal ? "active" : ""}" data-gal-idx="${targetGal}">
            ${iconSvg}
            <span class="unit-feature-label">${label}</span>
          </div>
        `;
        })
        .join("");

      featRow.querySelectorAll(".unit-feature-item").forEach((item) => {
        item.addEventListener("click", () => {
          const gIdx = parseInt(item.dataset.galIdx, 10);
          if (!isNaN(gIdx)) setUnitGalleryPhoto(gIdx);
        });
      });
    }

    renderUnitGallery(unit);
  }

  function renderUnitGallery(unit) {
    const gallery = unit.gallery || [];
    if (!gallery.length) return;

    if (selectedGalleryIdx >= gallery.length) selectedGalleryIdx = 0;
    const activeItem = gallery[selectedGalleryIdx];

    const mainLight = document.getElementById("unitMainImgLight");
    const mainDark = document.getElementById("unitMainImgDark");
    const caption = document.getElementById("unitPhotoCaption");

    if (mainLight) mainLight.src = activeItem.imageLight;
    if (mainDark) mainDark.src = activeItem.imageDark || activeItem.imageLight;
    if (caption) caption.textContent = `${unit.title} — ${activeItem.title || ""}`;

    // Also update Lightbox if open
    const lbImg = document.getElementById("lightboxImg");
    const lbCap = document.getElementById("lightboxCaption");
    if (lbImg) lbImg.src = currentTheme === "dark" ? activeItem.imageDark || activeItem.imageLight : activeItem.imageLight;
    if (lbCap) lbCap.textContent = `${unit.title} — ${activeItem.title || ""}`;

    const thumbsList = document.getElementById("unitThumbsList");
    if (thumbsList) {
      const visibleThumbs = gallery.slice(0, 3);
      thumbsList.innerHTML = visibleThumbs
        .map(
          (g, idx) => `
        <div class="unit-thumb-item theme-img-wrap ${idx === selectedGalleryIdx ? "active" : ""}" data-idx="${idx}" title="${g.title || ""}">
          <img src="${g.imageLight}" alt="${g.title || ""}" class="img-light" />
          <img src="${g.imageDark || g.imageLight}" alt="${g.title || ""}" class="img-dark" />
        </div>
      `
        )
        .join("");

      thumbsList.querySelectorAll(".unit-thumb-item").forEach((thumb) => {
        thumb.addEventListener("click", () => {
          setUnitGalleryPhoto(parseInt(thumb.dataset.idx, 10));
        });
      });
    }
  }

  function setUnitGalleryPhoto(idx) {
    const exp = cmsData.explorerSection;
    const unit = exp?.apartments?.find((a) => a.id === selectedUnitId) || exp?.apartments?.[0];
    if (!unit || !unit.gallery?.length) return;

    selectedGalleryIdx = (idx + unit.gallery.length) % unit.gallery.length;
    renderUnitDetails();
  }

  // =========================================================================
  // 4. LIFESTYLE SECTION RENDERING
  // =========================================================================
  function renderLifestyle() {
    const life = cmsData.lifestyleSection;
    if (!life) return;

    setText("lifeTitle", life.title);
    setText("lifeSubtitle", life.subtitle);

    const imgL = document.getElementById("lifeImgLight");
    const imgD = document.getElementById("lifeImgDark");
    if (imgL && life.imageLight) imgL.src = life.imageLight;
    if (imgD && life.imageDark) imgD.src = life.imageDark;

    const row = document.getElementById("amenitiesRow");
    if (row && Array.isArray(life.amenities)) {
      const customCats = life.customCategories || [];
      row.innerHTML = life.amenities
        .map(
          (am) => {
            let iconHtml = "";
            const rawIcon = am.icon || "location";

            // Check if it's in built-in SVGs
            if (ICONS[rawIcon]) {
              iconHtml = ICONS[rawIcon];
            } else {
              // Check if it's a custom category
              const foundCustom = customCats.find((c) => c.key === rawIcon);
              const displayIcon = foundCustom ? foundCustom.icon : rawIcon;

              if (ICONS[displayIcon]) {
                iconHtml = ICONS[displayIcon];
              } else if (typeof displayIcon === "string" && displayIcon.trim().startsWith("<svg")) {
                iconHtml = displayIcon;
              } else {
                // Formal luxury fallback: Star / Diamond Vector
                iconHtml = ICONS.star || ICONS.location;
              }
            }

            return `
              <div class="amenity-item">
                <div class="amenity-icon-circle">
                  ${iconHtml}
                </div>
                <span class="amenity-label">${am.label || ""}</span>
              </div>
            `;
          }
        )
        .join("");
    }
  }

  // =========================================================================
  // 5. ABOUT SECTION RENDERING
  // =========================================================================
  function renderAbout() {
    const about = cmsData.aboutSection;
    if (!about) return;

    setText("aboutTitle", about.title);
    setText("aboutDesc", about.description);
    setText("aboutCtaText", about.ctaText);

    const imgL = document.getElementById("aboutImgLight");
    const imgD = document.getElementById("aboutImgDark");
    if (imgL && about.imageLight) imgL.src = about.imageLight;
    if (imgD && about.imageDark) imgD.src = about.imageDark;

    const statsRow = document.getElementById("aboutStatsRow");
    if (statsRow && Array.isArray(about.stats)) {
      statsRow.innerHTML = about.stats
        .map(
          (st) => `
        <div class="about-stat-item">
          <div class="stat-number" dir="ltr">${st.value}</div>
          <div class="stat-label">${st.label}</div>
        </div>
      `
        )
        .join("");
    }
  }

  // =========================================================================
  // 6. STRATEGIC LOCATION & INTERACTIVE MAP RENDERING
  // =========================================================================
  function renderLocationSection() {
    const loc = cmsData.locationSection;
    if (!loc) return;

    setText("locEyebrow", loc.eyebrow);
    setText("locTitle", loc.title);
    setText("locSubtitle", loc.subtitle);
    setText("locCtaText", loc.ctaText);

    if (loc.mainPin) {
      setText("mapMainTitle", loc.mainPin.title);
      const sub = currentTheme === "dark" ? loc.mainPin.subtitleDark || loc.mainPin.subtitleLight : loc.mainPin.subtitleLight;
      setText("mapMainSub", sub);
      const callout = document.getElementById("mapMainCallout");
      if (callout) {
        callout.style.left = `${loc.mainPin.x || 56}%`;
        callout.style.top = `${loc.mainPin.y || 36}%`;
      }
    }

    const proxList = document.getElementById("proximityList");
    if (proxList && Array.isArray(loc.proximities)) {
      proxList.innerHTML = loc.proximities
        .map(
          (p) => `
        <div class="proximity-row" data-pin-id="${p.pinId || ""}">
          <span class="prox-cat">
            ${ICONS[p.icon] || ICONS.city}
            <span>${p.label}</span>
          </span>
          <span class="prox-time">
            <span>${p.time}</span>
            ${ICONS.clock}
          </span>
        </div>
      `
        )
        .join("");

      proxList.querySelectorAll(".proximity-row").forEach((row) => {
        row.addEventListener("mouseenter", () => highlightMapPin(row.dataset.pinId));
        row.addEventListener("mouseleave", () => highlightMapPin(null));
        row.addEventListener("click", () => highlightMapPin(row.dataset.pinId));
      });
    }

    const pinsContainer = document.getElementById("mapPinsContainer");
    if (pinsContainer && Array.isArray(loc.mapPins)) {
      pinsContainer.innerHTML = loc.mapPins
        .map((pin) => {
          const label = currentTheme === "dark" ? pin.labelDark || pin.labelLight : pin.labelLight;
          // Clamp Y coordinate so bottom labels are never clipped
          const safeY = Math.min(pin.y || 50, 68);
          return `
          <div class="map-poi-pin" id="${pin.id}" data-x="${pin.x}" data-y="${safeY}" style="left: ${pin.x}%; top: ${safeY}%;">
            <div class="poi-badge-circle">
              ${ICONS[pin.icon] || ICONS.city}
            </div>
            <span class="poi-pin-label">${label}</span>
          </div>
        `;
        })
        .join("");

      pinsContainer.querySelectorAll(".map-poi-pin").forEach((pinEl) => {
        pinEl.addEventListener("mouseenter", () => highlightMapPin(pinEl.id));
        pinEl.addEventListener("mouseleave", () => highlightMapPin(null));
      });
    }
  }

  function highlightMapPin(pinId) {
    const routeLine = document.getElementById("mapActiveRouteLine");
    document.querySelectorAll(".map-poi-pin").forEach((el) => {
      const isMatch = el.id === pinId;
      el.classList.toggle("active", isMatch);
      if (isMatch && routeLine) {
        const mainX = ((cmsData?.locationSection?.mainPin?.x || 56) / 100) * 800;
        const mainY = ((cmsData?.locationSection?.mainPin?.y || 36) / 100) * 500;
        const targetX = (parseFloat(el.dataset.x || "50") / 100) * 800;
        const targetY = (parseFloat(el.dataset.y || "50") / 100) * 500;
        routeLine.setAttribute("x1", String(mainX));
        routeLine.setAttribute("y1", String(mainY));
        routeLine.setAttribute("x2", String(targetX));
        routeLine.setAttribute("y2", String(targetY));
        routeLine.setAttribute("opacity", "0.95");
      }
    });

    if (!pinId && routeLine) {
      routeLine.setAttribute("opacity", "0");
    }
  }

  // =========================================================================
  // 7. PRE-FOOTER CTA BANNER RENDERING
  // =========================================================================
  function renderCtaBanner() {
    const cta = cmsData.ctaBanner;
    if (!cta) return;

    setText("ctaTitle", cta.title);
    setText("ctaSub", cta.subtitle);
    setText("ctaButtonText", cta.buttonText);

    const imgL = document.getElementById("ctaImgLight");
    const imgD = document.getElementById("ctaImgDark");
    if (imgL && cta.imageLight) imgL.src = cta.imageLight;
    if (imgD && cta.imageDark) imgD.src = cta.imageDark;

    const qcRow = document.getElementById("quickContactsRow");
    if (qcRow && Array.isArray(cta.quickContacts)) {
      qcRow.innerHTML = cta.quickContacts
        .map((qc) => {
          const iconSvg = ICONS[qc.icon] || ICONS.location;
          const href = qc.action === "map" ? "#location" : qc.action || "#cta-banner";
          const target = href.startsWith("http") ? `target="_blank" rel="noopener"` : "";
          return `
          <a href="${href}" ${target} class="quick-contact-link">
            ${iconSvg}
            <span>${qc.label}</span>
          </a>
        `;
        })
        .join("");
    }
  }

  // =========================================================================
  // 8. FOOTER RENDERING
  // =========================================================================
  function renderFooter() {
    const f = cmsData.footer;
    if (!f) return;

    const siteFooter = document.querySelector("site-footer");
    if (siteFooter && typeof siteFooter.setCMSData === "function") {
      siteFooter.setCMSData(cmsData);
    }

    setText("footerContactHeading", f.contactHeading);
    setText("footerAddress", f.address);
    setText("footerPhone", f.phone);
    setText("footerEmail", f.email);
    setText("footerServicesHeading", f.servicesHeading);
    setText("footerQuickHeading", f.quickLinksHeading);
    setText("footerPrivacy", f.privacyText);
    setText("footerTerms", f.termsText);
    setText("footerCopyright", f.copyrightText);

    if (cmsData.settings) {
      setText("footerBrandAr", cmsData.settings.brandNameAr);
      setText("footerBrandEn", cmsData.settings.brandNameEn);
    }

    const srvList = document.getElementById("footerServicesList");
    if (srvList && Array.isArray(f.services)) {
      srvList.innerHTML = f.services.map((s) => `<li><a href="${s.href}">${s.label}</a></li>`).join("");
    }

    const qlList = document.getElementById("footerQuickList");
    if (qlList && Array.isArray(f.quickLinks)) {
      qlList.innerHTML = f.quickLinks.map((q) => `<li><a href="${q.href}">${q.label}</a></li>`).join("");
    }
  }

  // =========================================================================
  // EVENT LISTENERS & INTERACTIONS
  // =========================================================================
  function setupEventListeners() {
    // Sticky Header on scroll
    window.addEventListener("scroll", () => {
      const header = document.getElementById("siteHeader");
      if (header) {
        header.classList.toggle("scrolled", window.scrollY > 40);
      }
    });

    // Theme Toggle Buttons
    document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);

    // Mobile Navigation Drawer
    const mobileDrawer = document.getElementById("mobileDrawerBackdrop");
    document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
      mobileDrawer?.classList.add("open");
    });
    document.getElementById("closeMobileDrawer")?.addEventListener("click", () => {
      mobileDrawer?.classList.remove("open");
    });
    mobileDrawer?.addEventListener("click", (e) => {
      if (e.target === mobileDrawer) mobileDrawer.classList.remove("open");
    });
    document.querySelectorAll("#mobileNavList a").forEach((link) => {
      link.addEventListener("click", () => mobileDrawer?.classList.remove("open"));
    });
    document.getElementById("mobileThemeSwitchBtn")?.addEventListener("click", () => {
      toggleTheme();
      mobileDrawer?.classList.remove("open");
    });
    document.getElementById("mobileBookBtn")?.addEventListener("click", () => {
      mobileDrawer?.classList.remove("open");
      document.getElementById("bookingModal")?.classList.add("open");
    });

    // Quick Search Modal
    const searchModal = document.getElementById("searchModal");
    const searchInput = document.getElementById("quickSearchInput");
    const searchResults = document.getElementById("quickSearchResults");

    function renderSearchResults(q = "") {
      if (!searchResults || !cmsData) return;
      const query = q.trim().toLowerCase();
      const items = [];

      (cmsData.projectsSection?.projects || []).forEach((p, idx) => {
        if (!query || p.title.toLowerCase().includes(query) || p.locationLight.toLowerCase().includes(query) || p.locationDark.toLowerCase().includes(query)) {
          items.push({
            type: "مشروع سكني",
            title: p.title,
            sub: `${p.locationLight} • ${p.unitsCount}`,
            badge: p.statusText,
            action: () => {
              searchModal.classList.remove("open");
              openProjectDetailModal(idx);
            }
          });
        }
      });

      (cmsData.explorerSection?.apartments || []).forEach((a) => {
        if (!query || a.title.toLowerCase().includes(query) || a.area.toLowerCase().includes(query) || a.direction.toLowerCase().includes(query)) {
          items.push({
            type: "وحدة سكنية",
            title: `${a.title} (${a.area})`,
            sub: `${a.bedrooms} غرف نوم • اتجاه ${a.direction}`,
            badge: a.statusText,
            action: () => {
              searchModal.classList.remove("open");
              selectUnit(a.id);
              document.getElementById("unitDetails")?.scrollIntoView({ behavior: "smooth" });
            }
          });
        }
      });

      searchResults.innerHTML = items.length
        ? items
            .map(
              (it, i) => `
          <div data-res-idx="${i}" style="padding:12px 16px; border-radius:10px; border:1px solid var(--border-card); background:var(--bg-primary); display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <div>
              <small style="color:var(--gold-deep); font-weight:700;">${it.type}</small>
              <div style="font-weight:800; font-size:1rem;">${it.title}</div>
              <div style="font-size:0.84rem; color:var(--text-secondary);">${it.sub}</div>
            </div>
            <span class="unit-status-pill">${it.badge}</span>
          </div>
        `
            )
            .join("")
        : `<div style="text-align:center; padding:20px; color:var(--text-secondary);">لا توجد نتائج مطابقة</div>`;

      searchResults.querySelectorAll("[data-res-idx]").forEach((el) => {
        el.addEventListener("click", () => items[parseInt(el.dataset.resIdx, 10)].action());
      });
    }

    document.getElementById("headerSearchBtn")?.addEventListener("click", () => {
      renderSearchResults("");
      searchModal?.classList.add("open");
      setTimeout(() => searchInput?.focus(), 100);
    });
    document.getElementById("closeSearchModal")?.addEventListener("click", () => {
      searchModal?.classList.remove("open");
    });
    searchInput?.addEventListener("input", () => renderSearchResults(searchInput.value));

    // Close Project Detail Modal
    document.getElementById("closeProjectModal")?.addEventListener("click", () => {
      document.getElementById("projectDetailModal")?.classList.remove("open");
    });

    // Projects Carousel Controls
    function highlightProjectCard(idx) {
      const cards = document.querySelectorAll(".project-card");
      if (!cards.length) return;
      highlightedProjectIdx = (idx + cards.length) % cards.length;
      cards.forEach((c, i) => c.classList.toggle("highlighted-card", i === highlightedProjectIdx));
      document.querySelectorAll("#projectsDots .carousel-dot").forEach((d, i) => {
        d.classList.toggle("active", i === highlightedProjectIdx);
      });
    }

    document.getElementById("projPrevBtn")?.addEventListener("click", () => {
      highlightProjectCard(highlightedProjectIdx - 1);
    });
    document.getElementById("projNextBtn")?.addEventListener("click", () => {
      highlightProjectCard(highlightedProjectIdx + 1);
    });
    document.querySelectorAll("#projectsDots .carousel-dot").forEach((dot) => {
      dot.addEventListener("click", () => highlightProjectCard(parseInt(dot.dataset.dot || "0", 10)));
    });

    // Floor Selector Buttons (6 down to 1)
    document.querySelectorAll(".floor-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectFloor(parseInt(btn.dataset.floor, 10));
      });
    });

    // 3D Floor Plan Apartment Zones (A, B, C) + Hover Tooltip
    const tooltip = document.getElementById("fpUnitTooltip");
    document.querySelectorAll(".fp-unit-zone").forEach((zone) => {
      zone.addEventListener("click", () => {
        selectUnit(zone.dataset.unit);
      });
      zone.addEventListener("mouseenter", () => {
        const unit = cmsData?.explorerSection?.apartments?.find((a) => a.id === zone.dataset.unit);
        if (unit && tooltip) {
          tooltip.innerHTML = `<strong>${unit.title}</strong> • ${unit.area} • ${unit.bedrooms} غرف • <span style="color:var(--gold-primary)">${unit.statusText}</span> ${unit.price ? `(${unit.price})` : ""}`;
          tooltip.classList.add("show");
        }
      });
      zone.addEventListener("mouseleave", () => {
        tooltip?.classList.remove("show");
      });
    });

    // Explorer Tabs (المبنى | مخطط الطابق | تفاصيل الشقة)
    document.querySelectorAll(".explorer-tab-btn").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".explorer-tab-btn").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const mode = tab.dataset.tab;
        const dimBar = document.getElementById("fpDimensionsBar");
        const svgCont = document.querySelector(".floorplan-svg-container");

        if (mode === "floorplan") {
          if (dimBar) dimBar.style.display = "grid";
          svgCont?.classList.add("zoomed-blueprint");
        } else {
          if (dimBar) dimBar.style.display = "none";
          svgCont?.classList.remove("zoomed-blueprint");
        }

        if (mode === "details") {
          document.getElementById("unitDetails")?.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // Toggle Building Floor Highlight Glow
    const toggleGlowBtn = document.getElementById("toggleGlowBtn");
    toggleGlowBtn?.addEventListener("click", () => {
      highlightGlowVisible = !highlightGlowVisible;
      toggleGlowBtn.classList.toggle("off", !highlightGlowVisible);
      document.getElementById("buildingFloorGlow")?.classList.toggle("hidden-glow", !highlightGlowVisible);
    });

    // Rotate Building View
    document.getElementById("rotateBldgBtn")?.addEventListener("click", () => {
      const views = cmsData?.explorerSection?.buildingAltViews || [];
      if (!views.length) return;
      buildingViewIdx = (buildingViewIdx + 1) % views.length;
      const v = views[buildingViewIdx];
      const imgL = document.getElementById("bldgImgLight");
      const imgD = document.getElementById("bldgImgDark");
      if (imgL) imgL.src = v.imageLight;
      if (imgD) imgD.src = v.imageDark || v.imageLight;
    });

    // Interior Gallery Prev / Next Arrows + Full-Screen Lightbox
    document.getElementById("unitGalleryPrev")?.addEventListener("click", () => {
      setUnitGalleryPhoto(selectedGalleryIdx - 1);
    });
    document.getElementById("unitGalleryNext")?.addEventListener("click", () => {
      setUnitGalleryPhoto(selectedGalleryIdx + 1);
    });

    const lightboxModal = document.getElementById("lightboxModal");
    document.getElementById("unitMainPhotoWrap")?.addEventListener("click", () => {
      lightboxModal?.classList.add("open");
    });
    document.getElementById("closeLightboxModal")?.addEventListener("click", () => {
      lightboxModal?.classList.remove("open");
    });
    document.getElementById("lightboxPrevBtn")?.addEventListener("click", () => {
      setUnitGalleryPhoto(selectedGalleryIdx - 1);
    });
    document.getElementById("lightboxNextBtn")?.addEventListener("click", () => {
      setUnitGalleryPhoto(selectedGalleryIdx + 1);
    });

    // Strategic Location CTA button scrolls to map / opens booking
    document.getElementById("locExploreBtn")?.addEventListener("click", () => {
      highlightMapPin("pin-mall");
      document.getElementById("stylizedMapStage")?.scrollIntoView({ behavior: "smooth" });
    });

    // Booking Modal Triggers
    const openBooking = (unitLabel, projectTitle) => {
      const modalComp = document.querySelector("booking-modal");
      if (modalComp && typeof modalComp.openModal === "function") {
        modalComp.openModal({ unit: unitLabel, project: projectTitle });
        return;
      }
      const modal = document.getElementById("bookingModal");
      const unitInput = document.getElementById("bkUnit");
      if (unitLabel && unitInput) unitInput.value = unitLabel;
      if (modal) modal.classList.add("open");
    };

    document.getElementById("headerBookBtn")?.addEventListener("click", () => {
      openBooking();
    });
    document.getElementById("unitBookViewingBtn")?.addEventListener("click", () => {
      openBooking();
    });
    document.getElementById("ctaBannerBookBtn")?.addEventListener("click", () => {
      openBooking();
    });
    document.getElementById("closeBookingModal")?.addEventListener("click", () => {
      document.getElementById("bookingModal")?.classList.remove("open");
    });

    // Floorplan Download/Spec Modal
    document.getElementById("unitDownloadPlanBtn")?.addEventListener("click", () => {
      const exp = cmsData?.explorerSection;
      const unit = exp?.apartments?.find((a) => a.id === selectedUnitId) || exp?.apartments?.[0];
      if (unit) {
        setText("fpModalTitle", `المخطط الهندسي — ${unit.title} (${unit.area})`);
        const specsBox = document.getElementById("fpModalSpecs");
        if (specsBox) {
          specsBox.innerHTML = `
            <div style="background:rgba(150,150,150,0.1);padding:10px;border-radius:8px;">
              <div style="font-size:0.8rem;color:var(--text-secondary);">المساحة</div>
              <div style="font-weight:800;font-size:1.1rem;">${unit.area}</div>
            </div>
            <div style="background:rgba(150,150,150,0.1);padding:10px;border-radius:8px;">
              <div style="font-size:0.8rem;color:var(--text-secondary);">الطابق</div>
              <div style="font-weight:800;font-size:1.1rem;">${selectedFloor}</div>
            </div>
            <div style="background:rgba(150,150,150,0.1);padding:10px;border-radius:8px;">
              <div style="font-size:0.8rem;color:var(--text-secondary);">غرف النوم</div>
              <div style="font-weight:800;font-size:1.1rem;">${unit.bedrooms}</div>
            </div>
            <div style="background:rgba(150,150,150,0.1);padding:10px;border-radius:8px;">
              <div style="font-size:0.8rem;color:var(--text-secondary);">الاتجاه</div>
              <div style="font-weight:800;font-size:1.1rem;">${unit.direction}</div>
            </div>
          `;
        }
      }
      document.getElementById("floorplanModal")?.classList.add("open");
    });

    document.getElementById("closeFloorplanModal")?.addEventListener("click", () => {
      document.getElementById("floorplanModal")?.classList.remove("open");
    });

    document.getElementById("fpModalBookBtn")?.addEventListener("click", () => {
      document.getElementById("floorplanModal")?.classList.remove("open");
      openBooking();
    });

    // Submit Booking Form to CMS API
    const bookingForm = document.getElementById("bookingForm");
    bookingForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("bkSubmitBtn");
      const msgBox = document.getElementById("bkSuccessMsg");
      if (submitBtn) submitBtn.disabled = true;

      const payload = {
        name: document.getElementById("bkName").value,
        phone: document.getElementById("bkPhone").value,
        email: document.getElementById("bkEmail").value,
        project: document.getElementById("bkProject").value,
        unit: document.getElementById("bkUnit").value,
        preferredDate: document.getElementById("bkDate").value,
        preferredTime: document.getElementById("bkTime").value,
        notes: document.getElementById("bkNotes").value
      };

      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok && msgBox) {
          msgBox.style.display = "block";
          bookingForm.reset();
          setTimeout(() => {
            msgBox.style.display = "none";
            document.getElementById("bookingModal")?.classList.remove("open");
          }, 2200);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initApp);
})();
