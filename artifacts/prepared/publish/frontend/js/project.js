/**
 * AL HAWD AL HADI HOUSING - SINGLE PROJECT DETAILS LOGIC
 * Loads dynamic project data from /api/cms with full Light/Dark support
 */

(function () {
  let cmsData = null;
  let currentProject = null;
  let activeGalleryIdx = 0;
  let currentFilter = "all";
  let activePlanType = "sitePlan";

  // Theme Management
  function initTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTheme = urlParams.get("theme");
    const savedTheme = paramTheme || localStorage.getItem("alhawd_theme") || "light";
    setTheme(savedTheme);

    const toggleBtn = document.getElementById("themeToggleBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        setTheme(next);
      });
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("alhawd_theme", theme);
    const icon = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");
    if (icon) icon.textContent = theme === "dark" ? "🌙" : "☀️";
    if (label) label.textContent = theme === "dark" ? "الوضع النهاري" : "الوضع الليلي";

    // Refresh theme-dependent elements if project is loaded
    if (currentProject) {
      updateThemeMedia();
    }
  }

  // Fetch CMS Data
  async function loadProjectData() {
    try {
      const res = await fetch("/api/cms");
      cmsData = await res.json();

      const urlParams = new URLSearchParams(window.location.search);
      const projId = urlParams.get("id") || "proj-2"; // default to proj-2 (مشروع الهدوء 2)

      const projects = cmsData?.projectsSection?.projects || [];
      currentProject = projects.find((p) => p.id === projId) || projects[1] || projects[0];

      if (!currentProject) {
        console.error("Project not found:", projId);
        return;
      }

      renderProjectDetails();
    } catch (err) {
      console.error("Error loading project data:", err);
    }
  }

  function updateThemeMedia() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    // Update real map theme
    updateMapTheme();

    // Update location text
    const locText = document.getElementById("projectLocationText");
    if (locText) {
      locText.textContent = isDark ? currentProject.locationDark || currentProject.locationLight : currentProject.locationLight;
    }

    // Update main gallery image
    const gallery = currentProject.gallery || [];
    if (gallery.length && gallery[activeGalleryIdx]) {
      const g = gallery[activeGalleryIdx];
      const mainImg = document.getElementById("galleryMainImg");
      if (mainImg) {
        mainImg.src = isDark ? g.imageDark || g.imageLight : g.imageLight;
      }
    }

    // Update overview image
    if (currentProject.overview) {
      const ovImg = document.getElementById("overviewImg");
      if (ovImg) {
        ovImg.src = isDark ? currentProject.overview.imageDark || currentProject.overview.imageLight : currentProject.overview.imageLight;
      }
    }
  }

  function renderProjectDetails() {
    const p = currentProject;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    // 1. Page Title & Breadcrumbs
    document.title = `${p.title} | الحوض الهادي للإسكان`;
    const bcTitle = document.getElementById("breadcrumbProjectTitle");
    if (bcTitle) bcTitle.textContent = p.title;

    // 2. Summary Card
    const titleEl = document.getElementById("projectMainTitle");
    if (titleEl) titleEl.textContent = p.title;

    const statusBadge = document.getElementById("projectStatusBadge");
    if (statusBadge) {
      statusBadge.textContent = p.statusText || "متاح الآن";
      statusBadge.className = `project-badge-pill ${p.statusType || "available"}`;
    }

    const locText = document.getElementById("projectLocationText");
    if (locText) locText.textContent = isDark ? p.locationDark || p.locationLight : p.locationLight;

    const descEl = document.getElementById("projectSummaryDesc");
    if (descEl) descEl.textContent = p.shortDescription || p.description;

    // Specs
    const flVal = document.getElementById("specFloorsVal");
    if (flVal) flVal.textContent = isDark ? p.floorsCountDark || p.floorsCountLight : p.floorsCountLight;

    const unVal = document.getElementById("specUnitsVal");
    if (unVal) unVal.textContent = p.unitsCount || "48";

    const arVal = document.getElementById("specAreaVal");
    if (arVal) arVal.textContent = p.startingArea || "120 م²";

    const stVal = document.getElementById("specStatusVal");
    if (stVal) stVal.textContent = p.projectStatus || p.statusText;

    // Update Native Web Components
    const galComp = document.querySelector("gallery-viewer");
    if (galComp && typeof galComp.setGallery === "function") {
      galComp.setGallery(p.gallery);
    }

    const amenComp = document.querySelector("amenities-grid");
    if (amenComp && typeof amenComp.setAmenities === "function") {
      amenComp.setAmenities(p.amenities);
    }

    const unitsComp = document.querySelector("available-units-table");
    if (unitsComp && typeof unitsComp.setUnits === "function") {
      unitsComp.setUnits(p.availableUnits);
    }

    const planComp = document.querySelector("floorplan-viewer");
    if (planComp && typeof planComp.setPlans === "function") {
      planComp.setPlans(p.floorplans);
    }

    const mapComp = document.querySelector("interactive-map");
    if (mapComp && typeof mapComp.setLocationData === "function") {
      mapComp.setLocationData(p.location, p);
    }

    const bannerComp = document.querySelector("booking-banner");
    if (bannerComp && typeof bannerComp.setBannerData === "function") {
      bannerComp.setBannerData(p.ctaBanner);
    }

    const footerComp = document.querySelector("site-footer");
    if (footerComp && typeof footerComp.setCMSData === "function") {
      footerComp.setCMSData(cmsData);
    }

    // Fallback direct rendering for static DOM elements if present
    renderGallery();
    renderOverview();
    renderAmenities();
    renderUnits();
    renderFloorplans();
    renderLocation();
    renderCtaBanner();

    // Setup interactive events
    bindEvents();
  }

  // Gallery Logic
  function renderGallery() {
    const gallery = currentProject.gallery || [
      { id: "g1", title: "واجهة المشروع", imageLight: currentProject.imageLight, imageDark: currentProject.imageDark }
    ];

    const strip = document.getElementById("galleryThumbsStrip");
    if (!strip) return;

    strip.innerHTML = gallery
      .map(
        (g, idx) => `
      <div class="gallery-thumb-item ${idx === activeGalleryIdx ? "active" : ""}" data-idx="${idx}">
        <img src="${g.imageLight}" alt="${g.title}" />
        ${g.isVideo ? '<div class="gallery-thumb-video-icon">▶</div>' : ""}
      </div>
    `
      )
      .join("");

    strip.querySelectorAll(".gallery-thumb-item").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        setGallerySlide(parseInt(thumb.dataset.idx, 10));
      });
    });

    setGallerySlide(activeGalleryIdx);
  }

  function setGallerySlide(idx) {
    const gallery = currentProject.gallery || [];
    if (!gallery.length) return;
    if (idx < 0) idx = gallery.length - 1;
    if (idx >= gallery.length) idx = 0;

    activeGalleryIdx = idx;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const g = gallery[idx];

    const mainImg = document.getElementById("galleryMainImg");
    if (mainImg) {
      mainImg.style.opacity = "0.7";
      setTimeout(() => {
        mainImg.src = isDark ? g.imageDark || g.imageLight : g.imageLight;
        mainImg.style.opacity = "1";
      }, 150);
    }

    const pill = document.getElementById("galleryCounterPill");
    if (pill) pill.textContent = `${idx + 1} / ${gallery.length}`;

    // Highlight active thumbnail
    document.querySelectorAll(".gallery-thumb-item").forEach((t, i) => {
      t.classList.toggle("active", i === idx);
    });
  }

  // Overview Logic
  function renderOverview() {
    const ov = currentProject.overview || {};
    if (ov.badge) {
      const b = document.getElementById("overviewBadge");
      if (b) b.textContent = ov.badge;
    }
    if (ov.title) {
      const t = document.getElementById("overviewTitle");
      if (t) t.textContent = ov.title;
    }
    if (ov.text) {
      const txt = document.getElementById("overviewText");
      if (txt) txt.textContent = ov.text;
    }
    if (ov.imageLight) {
      const img = document.getElementById("overviewImg");
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (img) img.src = isDark ? ov.imageDark || ov.imageLight : ov.imageLight;
    }
    if (ov.imageCaption) {
      const cap = document.getElementById("overviewCaptionBadge");
      if (cap) cap.textContent = ov.imageCaption;
    }

    const highlightsList = document.getElementById("overviewHighlightsList");
    if (highlightsList && Array.isArray(ov.highlights)) {
      const iconMap = { home: "🏠", leaf: "🌿", star: "✨" };
      highlightsList.innerHTML = ov.highlights
        .map(
          (h) => `
        <div class="highlight-box">
          <div class="highlight-box-icon">${iconMap[h.icon] || "🏢"}</div>
          <div class="highlight-box-title">${h.title}</div>
          <div class="highlight-box-sub">${h.subtitle}</div>
        </div>
      `
        )
        .join("");
    }
  }

  // Amenities Logic
  function renderAmenities() {
    const grid = document.getElementById("projectAmenitiesGrid");
    if (!grid) return;

    const amenities = currentProject.amenities || [
      { icon: "pin", title: "موقع مميز", subtitle: "في دير غبار" },
      { icon: "trees", title: "مساحات خضراء", subtitle: "ومناطق جلوس" },
      { icon: "playground", title: "منطقة أطفال", subtitle: "آمنة ومجهزة" },
      { icon: "car", title: "مواقف سيارات", subtitle: "خاصة للسكان" },
      { icon: "dumbbell", title: "نادي رياضي", subtitle: "مجهز بالكامل" },
      { icon: "shield", title: "أمن وحراسة", subtitle: "على مدار الساعة" }
    ];

    const iconSvgMap = {
      pin: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
      location: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
      trees: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-7"/><path d="M9 15c-3 0-5-2.5-5-5.5S6.5 3 12 3s8 3.5 8 6.5-2 5.5-5 5.5H9z"/></svg>`,
      green: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-7"/><path d="M9 15c-3 0-5-2.5-5-5.5S6.5 3 12 3s8 3.5 8 6.5-2 5.5-5 5.5H9z"/></svg>`,
      playground: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      kids: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      car: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><path d="M5 6l2-3h10l2 3"/></svg>`,
      parking: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><path d="M5 6l2-3h10l2 3"/></svg>`,
      dumbbell: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5l11 11"/><path d="M21 21l-1-1"/><path d="M3 3l1 1"/><path d="M18 22l4-4"/><path d="M2 6l4-4"/><path d="M3 10l7-7"/><path d="M14 21l7-7"/></svg>`,
      gym: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5l11 11"/><path d="M21 21l-1-1"/><path d="M3 3l1 1"/><path d="M18 22l4-4"/><path d="M2 6l4-4"/><path d="M3 10l7-7"/><path d="M14 21l7-7"/></svg>`,
      shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
      security: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
      pool: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 17c3 0 4 1 6 1s4-1 6-1 4 1 6 1"/><path d="M2 21c3 0 4 1 6 1s4-1 6-1 4 1 6 1"/><path d="M8 13V5a3 3 0 0 1 6 0v8"/><circle cx="17" cy="8" r="2"/></svg>`,
      padel: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><line x1="6" y1="10" x2="14" y2="10"/><line x1="10" y1="6" x2="10" y2="14"/><path d="M15 15l6 6"/><circle cx="19" cy="5" r="2"/></svg>`,
      elevator: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><polyline points="8 9 10 7 12 9"/><polyline points="12 15 14 17 16 15"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
      ev: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
      solar: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
      smarthome: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="2"/><line x1="12" y1="15" x2="12" y2="18"/></svg>`,
      ac: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/><circle cx="12" cy="12" r="2"/></svg>`,
      heating: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
      view: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>`,
      lounge: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
      mosque: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c-3 3-4 6-4 8h8c0-2-1-5-4-8z"/><path d="M4 21V12h16v9"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><circle cx="12" cy="2" r="0.8"/></svg>`,
      spa: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2C6.5 2 2 6.5 2 12c0 3 1.5 5.5 4 7l2-3c-1.5-1-2.5-2.5-2.5-4 0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5c0 1.5-1 3-2.5 4l2 3c2.5-1.5 4-4 4-7 0-5.5-4.5-10-10-10z"/><circle cx="12" cy="12" r="2"/></svg>`,
      cctv: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 7h15l4 4-4 4H2V7z"/><circle cx="8" cy="11" r="2"/><line x1="7" y1="15" x2="7" y2="21"/></svg>`,
      wifi: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
      padel: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><line x1="6" y1="10" x2="14" y2="10"/><line x1="10" y1="6" x2="10" y2="14"/><path d="M15 15l6 6"/><circle cx="19" cy="5" r="2"/></svg>`
    };

    grid.innerHTML = amenities
      .map(
        (a) => `
      <div class="amenity-card-item">
        <div class="amenity-card-icon">${iconSvgMap[a.icon] || (typeof a.icon === 'string' && a.icon.startsWith('<svg') ? a.icon : iconSvgMap.location)}</div>
        <div class="amenity-card-title">${a.title}</div>
        <div class="amenity-card-sub">${a.subtitle}</div>
      </div>
    `
      )
      .join("");
  }

  // Available Units Table
  function renderUnits() {
    const tbody = document.getElementById("unitsTableBody");
    if (!tbody) return;

    const allUnits = currentProject.availableUnits || [
      { unitNo: "101", type: "شقة أرضية", area: "120 م²", bedrooms: "3", bathrooms: "3", floor: "الأرضي", status: "available", statusText: "متوفرة" },
      { unitNo: "202", type: "شقة", area: "135 م²", bedrooms: "3", bathrooms: "3", floor: "2", status: "available", statusText: "متوفرة" },
      { unitNo: "303", type: "شقة", area: "150 م²", bedrooms: "4", bathrooms: "4", floor: "3", status: "available", statusText: "متوفرة" },
      { unitNo: "404", type: "شقة", area: "160 م²", bedrooms: "4", bathrooms: "4", floor: "4", status: "available", statusText: "متوفرة" }
    ];

    const filtered = allUnits.filter((u) => {
      if (currentFilter === "all") return true;
      return String(u.bedrooms) === currentFilter;
    });

    tbody.innerHTML = filtered
      .map(
        (u) => `
      <tr>
        <td><strong>${u.unitNo}</strong></td>
        <td>${u.type}</td>
        <td>${u.area}</td>
        <td>${u.bedrooms}</td>
        <td>${u.bathrooms}</td>
        <td>${u.floor}</td>
        <td>
          <span class="unit-status-indicator ${u.status === "reserved" ? "reserved" : ""}">
            ${u.statusText || "متوفرة"}
          </span>
        </td>
        <td>
          <a href="#bookingSection" class="unit-action-link" data-unit-book="${u.unitNo}">
            <span>احجز مشاهدة</span>
            <span>←</span>
          </a>
        </td>
      </tr>
    `
      )
      .join("");

    tbody.querySelectorAll("[data-unit-book]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uNum = btn.dataset.unitBook;
        const msg = document.getElementById("bName");
        if (msg) msg.focus();
      });
    });
  }

  // Floorplans Logic
  function renderFloorplans() {
    const plans = currentProject.floorplans || {
      sitePlan: { title: "المخطط العام للموقع", image: "/images/projects/10_architectural_site_plan.png" },
      floorPlans: { title: "مخططات الطوابق", image: "/images/ui/floorplan-3d-light.png" },
      unitPlans: { title: "مخططات الشقق", image: "/images/ui/building-interactive-light.png" }
    };

    const target = plans[activePlanType] || plans.sitePlan;
    const imgEl = document.getElementById("floorplanMainImg");
    if (imgEl && target) {
      imgEl.src = target.image;
      imgEl.alt = target.title;
    }
  }

  // Real Leaflet Map state
  let projectMap = null;
  let currentTileLayer = null;
  let landmarkMarkers = [];
  let mainProjectMarker = null;

  function getMapTileConfig(isDark) {
    if (isDark) {
      return {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        options: {
          maxZoom: 16,
          attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        }
      };
    }
    return {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    };
  }

  function updateMapTheme() {
    if (!projectMap || !window.L) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (currentTileLayer) {
      projectMap.removeLayer(currentTileLayer);
    }
    const tileConf = getMapTileConfig(isDark);
    currentTileLayer = L.tileLayer(tileConf.url, tileConf.options).addTo(projectMap);
  }

  // Location & Landmarks Logic with Real Leaflet Map
  function renderLocation() {
    const loc = currentProject.location || {};
    if (loc.title) {
      const t = document.getElementById("locationTitle");
      if (t) t.textContent = loc.title;
    }
    if (loc.subtitle) {
      const sub = document.getElementById("locationSubtitle");
      if (sub) sub.textContent = loc.subtitle;
    }

    const mapContainer = document.getElementById("projectLeafletMap");
    if (!mapContainer || !window.L) return;

    // Destroy existing map if already created
    if (projectMap) {
      projectMap.remove();
      projectMap = null;
      landmarkMarkers = [];
      mainProjectMarker = null;
    }

    const defaultLat = loc.lat || 31.9360;
    const defaultLng = loc.lng || 35.8645;
    const defaultZoom = loc.zoom || 15;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    projectMap = L.map("projectLeafletMap", {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: true,
      scrollWheelZoom: false // prevents accidental scroll while reading page
    });

    const tileConf = getMapTileConfig(isDark);
    currentTileLayer = L.tileLayer(tileConf.url, tileConf.options).addTo(projectMap);

    const iconMap = {
      road: "🛣️",
      mall: "🛍️",
      school: "🏫",
      hospital: "🏥",
      pin: "📍",
      park: "🌳",
      airport: "✈️",
      gym: "🏋️",
      mosque: "🕌"
    };

    const locationText = isDark ? currentProject.locationDark || currentProject.locationLight || "عمان" : currentProject.locationLight || "عمان";

    // 1. Add Main Project Pin
    const mainIcon = L.divIcon({
      className: "custom-leaflet-pin",
      html: `
        <div class="leaflet-real-marker-wrap main-project" id="mainProjectRealPin">
          <div class="marker-core-circle">
            <span class="marker-pulse-glow"></span>
            <span>🏢</span>
          </div>
          <div class="marker-callout-box">
            <strong>${currentProject.title}</strong>
            <small>${locationText}</small>
          </div>
        </div>
      `,
      iconSize: [160, 90],
      iconAnchor: [80, 22]
    });

    mainProjectMarker = L.marker([defaultLat, defaultLng], { icon: mainIcon, zIndexOffset: 1000 }).addTo(projectMap);

    // 2. Add Landmarks Pins
    const landmarks = Array.isArray(loc.landmarks) ? loc.landmarks : [];
    const allLatLngs = [[defaultLat, defaultLng]];

    landmarks.forEach((l, idx) => {
      // Fallback relative offset if lat/lng missing
      const lmLat = l.lat !== undefined ? l.lat : defaultLat + (idx % 2 === 0 ? 0.003 * (idx + 1) : -0.003 * (idx + 1));
      const lmLng = l.lng !== undefined ? l.lng : defaultLng + (idx < 2 ? -0.004 * (idx + 1) : 0.004 * (idx + 1));

      allLatLngs.push([lmLat, lmLng]);

      const lmIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: `
          <div class="leaflet-real-marker-wrap landmark" id="landmarkRealPin-${idx}" data-lm-idx="${idx}">
            <div class="marker-core-circle">
              <span>${iconMap[l.icon] || "📍"}</span>
            </div>
            <div class="marker-callout-box">
              <strong>${l.name}</strong>
              <small>${l.time || ""}</small>
            </div>
          </div>
        `,
        iconSize: [140, 75],
        iconAnchor: [70, 20]
      });

      const marker = L.marker([lmLat, lmLng], { icon: lmIcon }).addTo(projectMap);

      marker.on("click", () => {
        highlightItem(idx, true);
        projectMap.flyTo([lmLat, lmLng], 16, { duration: 0.8 });
      });

      landmarkMarkers.push({ marker, lat: lmLat, lng: lmLng, idx });
    });

    // 3. Render Right-side Landmarks List
    const grid = document.getElementById("landmarksListGrid");
    if (grid) {
      grid.innerHTML = landmarks
        .map(
          (l, idx) => `
        <div class="landmark-item-row" id="landmarkRow-${idx}" data-lm-idx="${idx}">
          <div class="landmark-name-side">
            <span class="landmark-icon">${iconMap[l.icon] || "📍"}</span>
            <span>${l.name}</span>
          </div>
          <div class="landmark-time-badge">${l.time}</div>
        </div>
      `
        )
        .join("");

      // Hover / Click synchronization between list items and map pins
      landmarks.forEach((l, idx) => {
        const row = document.getElementById(`landmarkRow-${idx}`);
        const lmData = landmarkMarkers[idx];

        if (row) {
          row.addEventListener("mouseenter", () => highlightItem(idx, true));
          row.addEventListener("mouseleave", () => highlightItem(idx, false));
          row.addEventListener("click", () => {
            highlightItem(idx, true);
            if (lmData) {
              projectMap.flyTo([lmData.lat, lmData.lng], 16, { duration: 0.8 });
            }
          });
        }
      });
    }

    function highlightItem(idx, on) {
      const row = document.getElementById(`landmarkRow-${idx}`);
      const pinEl = document.getElementById(`landmarkRealPin-${idx}`);
      if (row) row.classList.toggle("active", on);
      if (pinEl) pinEl.classList.toggle("highlighted", on);
    }

    // 4. Floating Action Buttons (Reset to Project / View All)
    const resetBtn = document.getElementById("resetMapZoomBtn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        projectMap.flyTo([defaultLat, defaultLng], defaultZoom, { duration: 0.8 });
      };
    }

    const viewAllBtn = document.getElementById("viewAllPinsBtn");
    if (viewAllBtn && allLatLngs.length > 1) {
      viewAllBtn.onclick = () => {
        projectMap.fitBounds(allLatLngs, { padding: [50, 50], maxZoom: 16 });
      };
    }
  }

  // CTA Banner Logic
  function renderCtaBanner() {
    const cta = currentProject.ctaBanner || {};
    if (cta.title) {
      const t = document.getElementById("ctaBannerTitle");
      if (t) t.textContent = cta.title;
    }
    if (cta.subtitle) {
      const sub = document.getElementById("ctaBannerSubtitle");
      if (sub) sub.textContent = cta.subtitle;
    }
    if (cta.image) {
      const img = document.getElementById("ctaBannerImg");
      if (img) img.src = cta.image;
    }
  }

  // Event Listeners Setup
  function bindEvents() {
    // Gallery Prev / Next
    document.getElementById("galleryPrevBtn")?.addEventListener("click", () => {
      setGallerySlide(activeGalleryIdx - 1);
    });
    document.getElementById("galleryNextBtn")?.addEventListener("click", () => {
      setGallerySlide(activeGalleryIdx + 1);
    });

    // In-page navigation tabs highlight on click
    document.querySelectorAll(".section-tab-item").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".section-tab-item").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
      });
    });

    // Units Filter Pills
    document.querySelectorAll("#unitFilterPills .filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll("#unitFilterPills .filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        currentFilter = pill.dataset.unitFilter;
        renderUnits();
      });
    });

    // Floorplan Tabs
    document.querySelectorAll("#floorplanTabsRow .plan-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#floorplanTabsRow .plan-tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activePlanType = btn.dataset.planType;
        renderFloorplans();
      });
    });

    // Floorplan Lightbox Modal
    const lightboxModal = document.getElementById("planLightboxModal");
    const lightboxImg = document.getElementById("planLightboxImg");
    document.getElementById("expandPlanBtn")?.addEventListener("click", () => {
      const curImg = document.getElementById("floorplanMainImg");
      if (lightboxModal && lightboxImg && curImg) {
        lightboxImg.src = curImg.src;
        lightboxModal.classList.add("open");
      }
    });

    document.getElementById("planLightboxClose")?.addEventListener("click", () => {
      lightboxModal?.classList.remove("open");
    });
    lightboxModal?.addEventListener("click", (e) => {
      if (e.target === lightboxModal) lightboxModal.classList.remove("open");
    });

    // Booking Form Submission
    const bookingForm = document.getElementById("projectBookingForm");
    if (bookingForm) {
      bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = document.getElementById("bookingResultMsg");
        const name = document.getElementById("bName").value.trim();
        const phone = document.getElementById("bPhone").value.trim();
        const date = document.getElementById("bDate").value;

        try {
          const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              phone,
              project: currentProject.title,
              preferredDate: date,
              notes: `حجز معاينة من صفحة تفاصيل ${currentProject.title}`
            })
          });

          if (res.ok) {
            if (msg) {
              msg.textContent = "✓ تم استلام طلب الحجز بنجاح! سيتواصل معك فريق المبيعات قريباً.";
              msg.className = "booking-result-msg success";
            }
            bookingForm.reset();
          } else {
            throw new Error("فشل إرسال الطلب");
          }
        } catch (err) {
          if (msg) {
            msg.textContent = "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.";
            msg.className = "booking-result-msg error";
          }
        }
      });
    }
  }

  // Init on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    loadProjectData();
  });
})();
