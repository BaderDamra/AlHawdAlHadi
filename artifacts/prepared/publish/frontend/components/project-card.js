/**
 * <project-card> Web Component
 * Luxury residential project showcase card with dual-theme media and direct link to details page
 */
class ProjectCard extends HTMLElement {
  constructor() {
    super();
    this._boundEvents = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventsOnce();
  }

  setProjectData(data, idx = 0) {
    this.data = data;
    this.projectIdx = idx;
    this.render();
  }

  getProjectId() {
    if (this.data && this.data.id) return this.data.id;
    const attrId = this.getAttribute("project-id");
    if (attrId) return attrId;
    if (typeof this.projectIdx === "number") return `proj-${this.projectIdx + 1}`;
    return "proj-2";
  }

  render() {
    const d = this.data || {
      id: this.getAttribute("project-id") || "proj-2",
      title: this.getAttribute("title") || "مشروع الهدوء 2",
      locationLight: this.getAttribute("location-light") || "عمان - دير غبار",
      locationDark: this.getAttribute("location-dark") || "عمان - دير غبار",
      unitsCount: this.getAttribute("units-count") || "48 شقة",
      floorsCountLight: this.getAttribute("floors-count") || "6 طوابق",
      statusText: this.getAttribute("status-text") || "متاح الآن",
      statusType: this.getAttribute("status-type") || "available",
      imageLight: this.getAttribute("image-light") || "/images/light/scene-2.png",
      imageDark: this.getAttribute("image-dark") || "/images/dark/scene-2.png"
    };

    const projectId = this.getProjectId();
    const targetUrl = `/project?id=${encodeURIComponent(projectId)}`;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const loc = isDark ? d.locationDark || d.locationLight : d.locationLight;
    const img = isDark ? d.imageDark || d.imageLight : d.imageLight;
    const floors = isDark ? d.floorsCountDark || d.floorsCountLight : d.floorsCountLight;

    this.innerHTML = `
      <article class="project-card" data-project-id="${projectId}" role="link" tabindex="0" aria-label="عرض تفاصيل ${d.title}" onclick="window.location.href='${targetUrl}'">
        <div class="project-card-media theme-img-wrap">
          <span class="project-status-badge ${d.statusType || 'available'}">${d.statusText}</span>
          <img src="${img}" alt="${d.title}" class="project-card-img" loading="lazy" style="width:100%; height:100%; object-fit:cover;" />
        </div>
        <div class="project-card-body">
          <div class="project-card-info">
            <h3 class="project-card-title">${d.title}</h3>
            <p class="project-card-loc">${loc}</p>
            <div class="project-card-meta">
              <span class="project-meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/>
                </svg>
                <span>${d.unitsCount}</span>
              </span>
              <span class="project-meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
                </svg>
                <span>${floors || '6 طوابق'}</span>
              </span>
            </div>
          </div>
          <a href="${targetUrl}" class="project-arrow-btn" title="استكشف تفاصيل المشروع" aria-label="استكشف تفاصيل المشروع">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </a>
        </div>
      </article>
    `;
  }

  setupEventsOnce() {
    if (this._boundEvents) return;
    this._boundEvents = true;

    const navigate = (e) => {
      const id = this.getProjectId();
      window.location.href = `/project?id=${encodeURIComponent(id)}`;
    };

    this.addEventListener("click", navigate);
    this.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(e);
      }
    });

    window.addEventListener("alhawd:themechange", () => this.render());
  }
}

if (!customElements.get("project-card")) {
  customElements.define("project-card", ProjectCard);
}
