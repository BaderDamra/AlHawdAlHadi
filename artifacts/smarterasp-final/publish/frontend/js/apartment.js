/**
 * AL HAWD AL HADI HOUSING - APARTMENT DETAIL PAGE LOGIC
 * Dynamic unit loader, price management, room gallery, and direct booking
 */

(function () {
  let cmsData = null;
  let activeApartment = null;
  let activeBuilding = null;
  let activeGalleryIndex = 0;

  const FORMAL_SVGS = {
    area: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    bed: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
    bath: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1zM6 12V5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1"/></svg>`,
    floor: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    compass: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    parking: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><path d="M5 6l2-3h10l2 3"/></svg>`,
    heating: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    ac: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/><circle cx="12" cy="12" r="2"/></svg>`,
    shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    sofa: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 14v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5"/><path d="M4 11h16a2 2 0 0 1 2 2v1H2v-1a2 2 0 0 1 2-2z"/></svg>`,
    kitchen: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2v20M21 2v20M3 12h18M7 7v2M17 7v2"/></svg>`,
    balcony: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="8" y1="14" x2="8" y2="21"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="16" y1="14" x2="16" y2="21"/></svg>`,
    smarthome: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="2"/></svg>`,
    sun: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
    tree: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22v-7"/><path d="M9 15c-3 0-5-2.5-5-5.5S6.5 3 12 3s8 3.5 8 6.5-2 5.5-5 5.5H9z"/></svg>`,
    star: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    architecture: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 22h20M4 22V7l8-4 8 4v15M9 22V12h6v10"/></svg>`,
    elevator: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><polyline points="8 9 10 7 12 9"/><polyline points="12 15 14 17 16 15"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`
  };

  async function initApartmentPage() {
    try {
      const res = await fetch("/api/cms");
      cmsData = await res.json();
    } catch (e) {
      console.warn("Could not fetch CMS data, using local state:", e);
      cmsData = {};
    }

    const params = new URLSearchParams(window.location.search);
    const aptId = params.get("id");
    const projId = params.get("project") || params.get("building");

    const apartments = cmsData?.explorerSection?.apartments || [];
    const projects = cmsData?.projectsSection?.projects || [];

    // Find requested apartment
    if (aptId) {
      activeApartment = apartments.find((a) => a.id === aptId || a.code === aptId);
    }
    if (!activeApartment && projId) {
      activeApartment = apartments.find((a) => a.buildingId === projId);
    }
    if (!activeApartment && apartments.length > 0) {
      activeApartment = apartments[0];
    }

    if (!activeApartment) {
      console.error("No apartment data found.");
      return;
    }

    // Find parent building
    activeBuilding = projects.find((p) => p.id === activeApartment.buildingId) || projects[0] || {
      id: "proj-1",
      title: "مشروع الهدوء 1",
      locationLight: "عمان - عبدون",
      locationDark: "عمان - عبدون"
    };

    renderPage();
    setupEvents();
  }

  function getActiveTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function renderPage() {
    const apt = activeApartment;
    const bld = activeBuilding;
    const theme = getActiveTheme();

    // 1. Page Title & Meta
    document.title = `${apt.title || apt.code} | ${bld.title || "الحوض الهادي للإسكان"}`;
    const pageTitleEl = document.getElementById("pageTitle");
    if (pageTitleEl) pageTitleEl.textContent = document.title;

    // 2. Breadcrumbs
    const breadProjectLink = document.getElementById("breadProjectLink");
    if (breadProjectLink) {
      breadProjectLink.textContent = bld.title || "المشروع السكني";
      breadProjectLink.href = `/project.html?id=${bld.id || "proj-1"}`;
    }
    const breadAptTitle = document.getElementById("breadAptTitle");
    if (breadAptTitle) breadAptTitle.textContent = apt.code || apt.title;

    // 3. Top Header Badges & Titles
    const bldNameEl = document.getElementById("aptBuildingName");
    if (bldNameEl) bldNameEl.textContent = bld.title || apt.buildingName || "مشروع الهدوء";

    const mainTitleEl = document.getElementById("aptMainTitle");
    if (mainTitleEl) mainTitleEl.textContent = apt.title || `شقة ${apt.code}`;

    const locTextEl = document.getElementById("aptLocationText");
    if (locTextEl) locTextEl.textContent = bld.locationLight || "عمان";

    const dirTextEl = document.getElementById("aptDirectionText");
    if (dirTextEl) dirTextEl.textContent = apt.direction || "إطلالة بانورامية";

    const statusPill = document.getElementById("aptStatusPill");
    if (statusPill) {
      statusPill.className = `apt-status-pill ${apt.status || "available"}`;
      statusPill.textContent = apt.statusText || (apt.status === "available" ? "متاحة للبيع ✓" : "محجوزة");
    }

    // 4. Golden Price Card
    const priceTextEl = document.getElementById("aptPriceText");
    if (priceTextEl) priceTextEl.textContent = apt.price || "اتصل لمعرفة السعر";

    const priceNoteEl = document.getElementById("aptPriceNote");
    if (priceNoteEl) priceNoteEl.textContent = apt.priceNote || "شامل موقف سيارات خاص ومستودع";

    // 5. Quick 4 Metrics
    const specArea = document.getElementById("specArea");
    if (specArea) specArea.textContent = apt.area || "150 م²";

    const specFloor = document.getElementById("specFloor");
    if (specFloor) specFloor.textContent = apt.floor || "الأرضي";

    const specBedrooms = document.getElementById("specBedrooms");
    if (specBedrooms) specBedrooms.textContent = apt.bedrooms || "3 غرف";

    const specBathrooms = document.getElementById("specBathrooms");
    if (specBathrooms) specBathrooms.textContent = apt.bathrooms || "3 حمامات";

    // 6. Gallery Thumbnails & Main Viewer
    renderGallery();

    // 7. Specifications Matrix
    renderSpecsMatrix();

    // 8. Features Grid
    renderFeatures();

    // 9. Floor Plan
    renderFloorPlan();

    // 10. WhatsApp Button with dynamic pre-filled text
    const waBtn = document.getElementById("whatsappInquiryBtn");
    if (waBtn) {
      const waText = encodeURIComponent(
        `مرحباً، أود الاستفسار وحجز موعد معاينة للشقة (${apt.title || apt.code}) في (${bld.title}) بسعر (${apt.price}).`
      );
      waBtn.href = `https://wa.me/962790000000?text=${waText}`;
    }

    // 11. Other units in this building
    renderOtherUnits();

    // 12. Back to project button
    const backBtn = document.getElementById("backToProjectBtn");
    if (backBtn) {
      backBtn.href = `/project.html?id=${bld.id || "proj-1"}`;
    }
  }

  function renderGallery() {
    const apt = activeApartment;
    const theme = getActiveTheme();
    const gallery = (apt.gallery && apt.gallery.length) ? apt.gallery : [
      { id: "g1", title: "الصالة الرئيسية وغرفة المعيشة", imageLight: apt.mainImage || "/images/light/scene-2.webp", imageDark: "/images/dark/scene-2.webp" },
      { id: "g2", title: "المطبخ العصري ومنطقة الطعام", imageLight: "/images/light/scene-9.webp", imageDark: "/images/dark/scene-9.webp" },
      { id: "g3", title: "غرفة النوم الرئيسية (الماستر)", imageLight: "/images/light/scene-6.webp", imageDark: "/images/dark/scene-6.webp" },
      { id: "g4", title: "الحمام الرئيسي الفاخر", imageLight: "/images/light/scene-5.webp", imageDark: "/images/dark/scene-5.webp" },
      { id: "g5", title: "التراس الخارجي والإطلالة", imageLight: "/images/light/scene-8.webp", imageDark: "/images/dark/scene-8.webp" }
    ];

    if (activeGalleryIndex >= gallery.length) activeGalleryIndex = 0;
    const currentItem = gallery[activeGalleryIndex];
    const currentUrl = (theme === "dark" && currentItem.imageDark) ? currentItem.imageDark : currentItem.imageLight;

    const mainImg = document.getElementById("aptActiveImage");
    const captionEl = document.getElementById("aptViewerCaption");

    if (mainImg) {
      mainImg.src = currentUrl;
      mainImg.alt = currentItem.title || apt.title;
    }
    if (captionEl) {
      captionEl.textContent = currentItem.title || apt.title;
    }

    // Thumbnails strip
    const thumbsStrip = document.getElementById("aptThumbsStrip");
    if (thumbsStrip) {
      thumbsStrip.innerHTML = gallery
        .map((item, idx) => {
          const thumbUrl = (theme === "dark" && item.imageDark) ? item.imageDark : item.imageLight;
          return `
            <div class="apt-thumb-item ${idx === activeGalleryIndex ? "active" : ""}" data-gallery-idx="${idx}">
              <img src="${thumbUrl}" alt="${item.title}" loading="lazy" decoding="async" />
              <div class="apt-thumb-title">${item.title}</div>
            </div>
          `;
        })
        .join("");

      thumbsStrip.querySelectorAll("[data-gallery-idx]").forEach((thumb) => {
        thumb.addEventListener("click", () => {
          activeGalleryIndex = parseInt(thumb.dataset.galleryIdx, 10);
          renderGallery();
        });
      });
    }
  }

  function renderSpecsMatrix() {
    const apt = activeApartment;
    const matrixEl = document.getElementById("aptSpecsMatrix");
    if (!matrixEl) return;

    const specs = [
      { icon: "area", label: "المساحة الداخلية الإجمالية", val: apt.area || "165 م²" },
      { icon: "floor", label: "رقم الطابق وموقعه", val: apt.floor || "الأرضي" },
      { icon: "bed", label: "عدد غرف النوم", val: apt.bedrooms || "3 غرف نوم" },
      { icon: "bath", label: "عدد دورات المياه والحمامات", val: apt.bathrooms || "3 حمامات ماستر" },
      { icon: "compass", label: "اتجاه واجهات الشقة", val: apt.direction || "جنوبية غربية مشمسة" },
      { icon: "parking", label: "موقف سيارات مخصص", val: "موقف سيارة مغطى مع نقطة شحن EV" },
      { icon: "heating", label: "نظام التدفئة", val: "تدفئة تحت البلاط مركزية مستقلة" },
      { icon: "ac", label: "نظام التكييف", val: "تكييف مركزي متطور انفيرتر VRF" },
      { icon: "shield", label: "العزل والتشطيبات", val: "عزل صوتي وحراري ألماني + زجاج دبل جلاس" }
    ];

    matrixEl.innerHTML = specs
      .map(
        (s) => `
      <div class="matrix-item">
        <div class="matrix-item-icon">
          ${FORMAL_SVGS[s.icon] || FORMAL_SVGS.area}
        </div>
        <div class="matrix-item-content">
          <span class="matrix-item-label">${s.label}</span>
          <span class="matrix-item-value">${s.val}</span>
        </div>
      </div>
    `
      )
      .join("");
  }

  function renderFeatures() {
    const apt = activeApartment;
    const gridEl = document.getElementById("aptFeaturesGrid");
    if (!gridEl) return;

    const features = (apt.features && apt.features.length) ? apt.features : [
      { icon: "sofa", labelLight: "صالون استقبال رحب", desc: "مساحات معيشة واسعة بإطلالة بانورامية" },
      { icon: "kitchen", labelLight: "مطبخ إيطالي عصري راكب", desc: "خزائن إيطالية وتشطيبات جرانيت فاخرة" },
      { icon: "bath", labelLight: "أطقم صحية أوروبية معلقة", desc: "ماركات عالمية نخب أول مع تدفئة خاصة" },
      { icon: "balcony", labelLight: "تراس خارجي بإطلالة مفتوحة", desc: "جلسة خارجية مميزة مع باربكيو" },
      { icon: "smarthome", labelLight: "نظام المنزل الذكي الكامل", desc: "تحكم بالإضاءة والستائر والتكييف عن بعد" },
      { icon: "star", labelLight: "أبواب أمان مصفحة ومصاعد ذكية", desc: "أعلى معايير الخصوصية والأمان" }
    ];

    gridEl.innerHTML = features
      .map(
        (f) => `
      <div class="apt-feature-card">
        <div class="apt-feat-icon">
          ${FORMAL_SVGS[f.icon] || FORMAL_SVGS.star}
        </div>
        <div>
          <div class="apt-feat-title">${f.labelLight || f.label || "ميزة فاخرة"}</div>
          <div class="apt-feat-desc">${f.desc || "تشطيبات فاخرة وتصاميم هندسية مدروسة"}</div>
        </div>
      </div>
    `
      )
      .join("");
  }

  function renderFloorPlan() {
    const apt = activeApartment;
    const planImg = document.getElementById("aptPlanImage");
    const downloadBtn = document.getElementById("downloadPlanBtn");
    const planUrl = apt.planImage || "/images/ui/unit-plan-a.webp";

    if (planImg) {
      planImg.src = planUrl;
      planImg.alt = `مخطط ${apt.title || apt.code}`;
    }
    if (downloadBtn) {
      downloadBtn.href = planUrl;
      downloadBtn.setAttribute("download", `مخطط_${apt.code || "شقة"}.webp`);
    }
  }

  function renderOtherUnits() {
    const apt = activeApartment;
    const bld = activeBuilding;
    const allApts = cmsData?.explorerSection?.apartments || [];
    const otherUnits = allApts.filter((a) => a.id !== apt.id && a.buildingId === apt.buildingId);

    const otherGrid = document.getElementById("otherUnitsGrid");
    if (!otherGrid) return;

    if (!otherUnits.length) {
      otherGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:24px; color:var(--text-muted);">
          هذه الشقة هي النموذج المعروض حالياً في هذا المشروع.
        </div>
      `;
      return;
    }

    otherGrid.innerHTML = otherUnits
      .slice(0, 3)
      .map(
        (u) => `
      <a href="/apartment.html?id=${u.id}&project=${bld.id}" class="other-unit-card">
        <img src="${u.mainImage || "/images/light/scene-2.webp"}" alt="${u.title}" class="other-unit-thumb" loading="lazy" decoding="async" />
        <div class="other-unit-body">
          <div class="other-unit-title">${u.title || u.code}</div>
          <div class="other-unit-specs">${u.area || "150 م²"} • ${u.floor || "طابق مميز"} • ${u.bedrooms || "3 غرف"}</div>
          <div class="other-unit-price-row">
            <div>
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">السعر</span>
              <span class="other-unit-price">${u.price || "عند الطلب"}</span>
            </div>
            <span class="btn btn-secondary btn-xs">تفاصيل الشقة ←</span>
          </div>
        </div>
      </a>
    `
      )
      .join("");
  }

  function setupEvents() {
    // Booking modal trigger
    document.getElementById("bookViewingBtn")?.addEventListener("click", () => {
      const modal = document.querySelector("booking-modal");
      if (modal && typeof modal.openModal === "function") {
        modal.openModal({
          project: activeBuilding?.title || "مشروع الحوض الهادي",
          unit: `${activeApartment?.code || "شقة"} - ${activeApartment?.title || ""}`
        });
      }
    });

    // Fullscreen lightbox for main viewer
    document.getElementById("aptFullscreenBtn")?.addEventListener("click", () => {
      const img = document.getElementById("aptActiveImage");
      if (img && img.requestFullscreen) {
        img.requestFullscreen();
      }
    });

    // Zoom for floor plan
    document.getElementById("viewPlanFullscreenBtn")?.addEventListener("click", () => {
      const plan = document.getElementById("aptPlanImage");
      if (plan && plan.requestFullscreen) {
        plan.requestFullscreen();
      }
    });

    // Theme changes listener to update gallery images seamlessly
    const observer = new MutationObserver(() => {
      renderGallery();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApartmentPage);
  } else {
    initApartmentPage();
  }
})();
