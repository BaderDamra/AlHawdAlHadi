/**
 * <interactive-map> Web Component
 * Real interactive Leaflet map with custom gold pulse project pin, dynamic landmarks, and theme auto-switching
 */
class InteractiveMap extends HTMLElement {
  connectedCallback() {
    this.render();
    if (window.L) {
      this.initMap();
    } else {
      window.addEventListener("load", () => this.initMap());
    }
    window.addEventListener("alhawd:themechange", () => this.onThemeChange());
  }

  setLocationData(loc, project) {
    this.locationData = loc;
    this.projectData = project;
    this.render();
    this.initMap();
  }

  getTileConfig(isDark) {
    if (isDark) {
      return {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        options: { maxZoom: 16, attribution: '&copy; Esri' }
      };
    }
    return {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }
    };
  }

  render() {
    const loc = this.locationData || {};
    const title = loc.title || "الموقع والمعالم القريبة";
    const subtitle = loc.subtitle || "موقع استراتيجي بالقرب من أهم الخدمات في عمان";

    this.innerHTML = `
      <section class="project-detail-section component-interactive-map" id="tab-location">
        <div class="location-split-card">
          <!-- Right: Landmarks list -->
          <div class="location-details-side">
            <span class="section-gold-eyebrow">الموقع والمعالم القريبة</span>
            <h2 class="section-heading-md">${title}</h2>
            <p class="location-desc-text">${subtitle}</p>

            <div class="landmarks-list-grid" id="compLandmarksList">
              <!-- Populated by JS -->
            </div>
          </div>

          <!-- Left: Real Interactive Leaflet Map Container -->
          <div class="location-map-side">
            <div class="real-map-wrapper">
              <div id="compLeafletCanvas" class="real-project-leaflet-map" role="region" aria-label="خريطة الموقع الحقيقية"></div>
              
              <!-- Floating Map Actions Bar -->
              <div class="map-floating-actions">
                <button type="button" class="map-action-pill" id="compResetMapBtn" title="إعادة تركيز الخريطة على المشروع">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>موقع المشروع</span>
                </button>
                <button type="button" class="map-action-pill" id="compViewAllBtn" title="عرض جميع المعالم">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                  <span>شامل المعالم</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  initMap() {
    const canvas = this.querySelector("#compLeafletCanvas");
    if (!canvas || !window.L) return;

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }

    const loc = this.locationData || {};
    const proj = this.projectData || {};
    const defaultLat = loc.lat || parseFloat(this.getAttribute("lat")) || 31.9360;
    const defaultLng = loc.lng || parseFloat(this.getAttribute("lng")) || 35.8645;
    const defaultZoom = loc.zoom || parseInt(this.getAttribute("zoom"), 10) || 15;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    this.mapInstance = L.map(canvas, {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: true,
      scrollWheelZoom: false
    });

    const tileConf = this.getTileConfig(isDark);
    this.tileLayer = L.tileLayer(tileConf.url, tileConf.options).addTo(this.mapInstance);

    const iconMap = {
      road: "🛣️",
      mall: "🛍️",
      school: "🏫",
      hospital: "🏥",
      pin: "📍",
      park: "🌳",
      airport: "✈️",
      mosque: "🕌",
      gym: "🏋️"
    };

    const locationText = isDark ? proj.locationDark || proj.locationLight || "عمان" : proj.locationLight || "عمان";

    // 1. Add Main Project Marker
    const mainIcon = L.divIcon({
      className: "custom-leaflet-pin",
      html: `
        <div class="leaflet-real-marker-wrap main-project" id="compMainPin">
          <div class="marker-core-circle">
            <span class="marker-pulse-glow"></span>
            <span>🏢</span>
          </div>
          <div class="marker-callout-box">
            <strong>${proj.title || "مشروع الهدوء 2"}</strong>
            <small>${locationText}</small>
          </div>
        </div>
      `,
      iconSize: [160, 90],
      iconAnchor: [80, 22]
    });

    L.marker([defaultLat, defaultLng], { icon: mainIcon, zIndexOffset: 1000 }).addTo(this.mapInstance);

    // 2. Add Landmarks Markers
    const landmarks = Array.isArray(loc.landmarks) ? loc.landmarks : [];
    const allLatLngs = [[defaultLat, defaultLng]];
    this.landmarkMarkers = [];

    landmarks.forEach((l, idx) => {
      const lmLat = l.lat !== undefined ? l.lat : defaultLat + (idx % 2 === 0 ? 0.003 * (idx + 1) : -0.003 * (idx + 1));
      const lmLng = l.lng !== undefined ? l.lng : defaultLng + (idx < 2 ? -0.004 * (idx + 1) : 0.004 * (idx + 1));

      allLatLngs.push([lmLat, lmLng]);

      const lmIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: `
          <div class="leaflet-real-marker-wrap landmark" id="compLmPin-${idx}" data-lm-idx="${idx}">
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

      const marker = L.marker([lmLat, lmLng], { icon: lmIcon }).addTo(this.mapInstance);
      marker.on("click", () => {
        this.highlightItem(idx, true);
        this.mapInstance.flyTo([lmLat, lmLng], 16, { duration: 0.8 });
      });

      this.landmarkMarkers.push({ marker, lat: lmLat, lng: lmLng, idx });
    });

    // 3. Render Right-side Landmarks List
    const listGrid = this.querySelector("#compLandmarksList");
    if (listGrid) {
      listGrid.innerHTML = landmarks
        .map(
          (l, idx) => `
        <div class="landmark-item-row" id="compLmRow-${idx}" data-lm-idx="${idx}">
          <div class="landmark-name-side">
            <span class="landmark-icon">${iconMap[l.icon] || "📍"}</span>
            <span>${l.name}</span>
          </div>
          <div class="landmark-time-badge">${l.time}</div>
        </div>
      `
        )
        .join("");

      landmarks.forEach((l, idx) => {
        const row = this.querySelector(`#compLmRow-${idx}`);
        const lmData = this.landmarkMarkers[idx];

        if (row) {
          row.addEventListener("mouseenter", () => this.highlightItem(idx, true));
          row.addEventListener("mouseleave", () => this.highlightItem(idx, false));
          row.addEventListener("click", () => {
            this.highlightItem(idx, true);
            if (lmData) {
              this.mapInstance.flyTo([lmData.lat, lmData.lng], 16, { duration: 0.8 });
            }
          });
        }
      });
    }

    // 4. Action buttons
    const resetBtn = this.querySelector("#compResetMapBtn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.mapInstance.flyTo([defaultLat, defaultLng], defaultZoom, { duration: 0.8 });
      };
    }

    const viewAllBtn = this.querySelector("#compViewAllBtn");
    if (viewAllBtn && allLatLngs.length > 1) {
      viewAllBtn.onclick = () => {
        this.mapInstance.fitBounds(allLatLngs, { padding: [50, 50], maxZoom: 16 });
      };
    }

    setTimeout(() => {
      if (this.mapInstance) this.mapInstance.invalidateSize();
    }, 150);
  }

  highlightItem(idx, on) {
    const row = this.querySelector(`#compLmRow-${idx}`);
    const pin = this.querySelector(`#compLmPin-${idx}`);
    if (row) row.classList.toggle("active", on);
    if (pin) pin.classList.toggle("highlighted", on);
  }

  onThemeChange() {
    if (!this.mapInstance || !window.L) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (this.tileLayer) {
      this.mapInstance.removeLayer(this.tileLayer);
    }
    const tileConf = this.getTileConfig(isDark);
    this.tileLayer = L.tileLayer(tileConf.url, tileConf.options).addTo(this.mapInstance);
  }
}

if (!customElements.get("interactive-map")) {
  customElements.define("interactive-map", InteractiveMap);
}
