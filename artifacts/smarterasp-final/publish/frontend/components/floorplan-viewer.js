/**
 * <floorplan-viewer> Web Component
 * Architectural site plans, floor plans, and unit layout viewer with full Lightbox modal
 */
class FloorplanViewer extends HTMLElement {
  connectedCallback() {
    this.activeTab = "sitePlan";
    this.render();
  }

  setPlans(plans) {
    this.plans = plans;
    this.render();
  }

  render() {
    const plans = this.plans || {
      sitePlan: { title: "المخطط العام للموقع", image: "/images/projects/10_architectural_site_plan.webp" },
      floorPlans: { title: "مخططات الطوابق", image: "/images/ui/floorplan-3d-light.webp" },
      unitPlans: { title: "مخططات الشقق", image: "/images/ui/building-interactive-light.webp" }
    };

    this.plans = plans;
    const current = plans[this.activeTab] || plans.sitePlan;

    this.innerHTML = `
      <section class="project-detail-section component-floorplan-viewer" id="tab-floorplans">
        <div class="section-header-centered">
          <span class="section-gold-eyebrow">المخططات والرسومات</span>
          <h2 class="section-heading-lg">تفاصيل التوزيع المعماري والمخطط العام</h2>
        </div>

        <div class="floorplan-tabs-row" id="compPlanTabs">
          <button type="button" class="plan-tab-btn ${this.activeTab === 'sitePlan' ? 'active' : ''}" data-tab="sitePlan">المخطط العام للموقع</button>
          <button type="button" class="plan-tab-btn ${this.activeTab === 'floorPlans' ? 'active' : ''}" data-tab="floorPlans">مخططات الطوابق</button>
          <button type="button" class="plan-tab-btn ${this.activeTab === 'unitPlans' ? 'active' : ''}" data-tab="unitPlans">مخططات الشقق</button>
        </div>

        <div class="floorplan-display-stage">
          <div class="floorplan-image-box">
            <img src="${current.image}" alt="${current.title}" id="compPlanImg" />
            <button type="button" class="expand-plan-btn" id="compExpandPlanBtn" title="تكبير المخطط">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Lightbox Modal -->
        <div class="plan-lightbox-modal" id="compLightboxModal">
          <button type="button" class="plan-lightbox-close" id="compLightboxClose">✕</button>
          <img src="${current.image}" alt="${current.title}" id="compLightboxImg" />
        </div>
      </section>
    `;

    this.setupEvents();
  }

  setupEvents() {
    this.querySelectorAll(".plan-tab-btn").forEach((btn) => {
      btn.onclick = () => {
        this.activeTab = btn.dataset.tab;
        this.updatePlan();
      };
    });

    const expandBtn = this.querySelector("#compExpandPlanBtn");
    const closeBtn = this.querySelector("#compLightboxClose");
    const modal = this.querySelector("#compLightboxModal");

    if (expandBtn && modal) {
      expandBtn.onclick = () => modal.classList.add("open");
    }
    if (closeBtn && modal) {
      closeBtn.onclick = () => modal.classList.remove("open");
    }
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove("open");
      };
    }
  }

  updatePlan() {
    const current = this.plans[this.activeTab] || this.plans.sitePlan;
    const imgEl = this.querySelector("#compPlanImg");
    const lightboxImg = this.querySelector("#compLightboxImg");

    if (imgEl && current) {
      imgEl.src = current.image;
      imgEl.alt = current.title;
    }
    if (lightboxImg && current) {
      lightboxImg.src = current.image;
      lightboxImg.alt = current.title;
    }

    this.querySelectorAll(".plan-tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === this.activeTab);
    });
  }
}

if (!customElements.get("floorplan-viewer")) {
  customElements.define("floorplan-viewer", FloorplanViewer);
}
