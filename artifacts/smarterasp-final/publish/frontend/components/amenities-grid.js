/**
 * <amenities-grid> Web Component
 * 6-box luxury amenities showcase
 */
class AmenitiesGrid extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  setAmenities(items) {
    this.items = items;
    this.render();
  }

  render() {
    const defaultList = [
      { icon: "pin", title: "موقع مميز", subtitle: "في دير غبار" },
      { icon: "trees", title: "مساحات خضراء", subtitle: "ومناطق جلوس" },
      { icon: "playground", title: "منطقة أطفال", subtitle: "آمنة ومجهزة" },
      { icon: "car", title: "مواقف سيارات", subtitle: "خاصة للسكان" },
      { icon: "dumbbell", title: "نادي رياضي", subtitle: "مجهز بالكامل" },
      { icon: "shield", title: "أمن وحراسة", subtitle: "على مدار الساعة" }
    ];

    const list = this.items || defaultList;

    const iconMap = {
      pin: "📍",
      trees: "🌲",
      playground: "🎠",
      car: "🚗",
      dumbbell: "🏋️",
      shield: "🛡️"
    };

    this.innerHTML = `
      <section class="project-detail-section component-amenities-grid" id="tab-amenities">
        <div class="section-header-centered">
          <span class="section-gold-eyebrow">المرافق والخدمات</span>
          <h2 class="section-heading-lg">كل ما تحتاجه لحياة يومية مريحة ومتكاملة</h2>
        </div>
        <div class="project-amenities-grid">
          ${list
            .map(
              (item) => `
            <div class="amenity-card-item">
              <div class="amenity-card-icon">${iconMap[item.icon] || item.icon || "✨"}</div>
              <div class="amenity-card-title">${item.title}</div>
              <div class="amenity-card-sub">${item.subtitle}</div>
            </div>
          `
            )
            .join("")}
        </div>
      </section>
    `;
  }
}

if (!customElements.get("amenities-grid")) {
  customElements.define("amenities-grid", AmenitiesGrid);
}
