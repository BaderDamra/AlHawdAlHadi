/**
 * <available-units-table> Web Component
 * Filterable luxury units table with room count filters, prices, and direct links to dedicated apartment pages
 */
class AvailableUnitsTable extends HTMLElement {
  connectedCallback() {
    this.filter = "all";
    this.projectId = this.getAttribute("project-id") || "proj-1";
    this.render();
  }

  setUnits(units, projectId) {
    this.units = units;
    if (projectId) this.projectId = projectId;
    this.render();
  }

  render() {
    const list = this.units || [
      { id: "apt-101", buildingId: this.projectId, code: "A-101", type: "شقة أرضية مع حديقة", area: "165 م²", bedrooms: "3", bathrooms: "3", floor: "الأرضي", price: "145,000 د.أ", priceNote: "شامل التسجيل", status: "available", statusText: "متوفرة" },
      { id: "apt-102", buildingId: this.projectId, code: "B-102", type: "شقة طابق أول مع بلكونة", area: "150 م²", bedrooms: "3", bathrooms: "3", floor: "1", price: "135,000 د.أ", priceNote: "شامل موقف ومستودع", status: "available", statusText: "متوفرة" },
      { id: "apt-103", buildingId: this.projectId, code: "D-103", type: "دوبلكس مع حديقة خاصة", area: "220 م²", bedrooms: "4", bathrooms: "4", floor: "شبه أرضي وأرضي", price: "210,000 د.أ", priceNote: "تقسيط ميسر", status: "available", statusText: "متوفرة" },
      { id: "apt-104", buildingId: this.projectId, code: "P-104", type: "بنتهاوس روف 360°", area: "280 م²", bedrooms: "4", bathrooms: "5", floor: "الروف الأخير", price: "275,000 د.أ", priceNote: "سوبر ديلوكس خاص", status: "available", statusText: "متوفرة" }
    ];

    this.units = list;

    const filtered = list.filter((u) => {
      if (this.filter === "all") return true;
      const bStr = String(u.bedrooms || "");
      return bStr.includes(this.filter);
    });

    this.innerHTML = `
      <section class="project-detail-section component-units-table" id="tab-units">
        <div class="units-section-header">
          <div>
            <span class="section-gold-eyebrow">الشقق والوحدات المتاحة</span>
            <h2 class="section-heading-lg">اختر الشقة المناسبة واستعرض كافة تفاصيلها</h2>
            <p style="color:var(--text-secondary); font-size:0.9rem; margin-top:4px;">انقر على أي شقة للاطلاع على صور الغرف الداخلية، المخطط الهندسي، والمواصفات الكاملة.</p>
          </div>
          <div class="unit-filter-pills" id="compUnitFilterPills">
            <button type="button" class="filter-pill ${this.filter === 'all' ? 'active' : ''}" data-filter="all">جميع النماذج</button>
            <button type="button" class="filter-pill ${this.filter === '3' ? 'active' : ''}" data-filter="3">3 غرف نوم</button>
            <button type="button" class="filter-pill ${this.filter === '4' ? 'active' : ''}" data-filter="4">4 غرف نوم</button>
          </div>
        </div>

        <div class="units-table-card">
          <div class="table-responsive">
            <table class="luxury-units-table">
              <thead>
                <tr>
                  <th>كود الشقة</th>
                  <th>النوع والموقع</th>
                  <th>المساحة</th>
                  <th>غرف النوم</th>
                  <th>الحمامات</th>
                  <th>الطابق</th>
                  <th style="color:var(--accent-gold);">السعر الإجمالي</th>
                  <th>الحالة</th>
                  <th style="text-align:center;">تفاصيل الشقة</th>
                </tr>
              </thead>
              <tbody>
                ${filtered
                  .map(
                    (u) => `
                  <tr>
                    <td><strong style="font-family:'Manrope',sans-serif; color:var(--text-primary); font-size:1.05rem;">${u.code || u.unitNo || "شقة"}</strong></td>
                    <td>
                      <div style="font-weight:600;">${u.type || u.title || "شقة فاخرة"}</div>
                    </td>
                    <td><span dir="ltr">${u.area || "-"}</span></td>
                    <td>${u.bedrooms || "3 غرف"}</td>
                    <td>${u.bathrooms || "3 حمامات"}</td>
                    <td>${u.floor || "مميز"}</td>
                    <td>
                      <div style="font-size:1.08rem; font-weight:800; color:var(--accent-gold); font-family:'Manrope','IBM Plex Sans Arabic',sans-serif;">
                        ${u.price || "عند الطلب"}
                      </div>
                      ${u.priceNote ? `<div style="font-size:0.72rem; color:var(--text-muted);">${u.priceNote}</div>` : ""}
                    </td>
                    <td>
                      <span class="unit-status-indicator status-${u.status || 'available'}">
                        ${u.statusText || 'متوفرة'}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                        <a href="/apartment.html?id=${u.id || u.code}&project=${u.buildingId || this.projectId}" class="btn btn-primary btn-xs" style="white-space:nowrap; text-decoration:none; padding:6px 12px; font-weight:700;">
                          عرض الشقة ←
                        </a>
                        <button type="button" class="btn btn-secondary btn-xs comp-book-unit-btn" data-unit-no="${u.code || u.unitNo}" title="حجز موعد معاينة سريع">
                          📅 حجز
                        </button>
                      </div>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    this.setupEvents();
  }

  setupEvents() {
    this.querySelectorAll(".filter-pill").forEach((btn) => {
      btn.onclick = () => {
        this.filter = btn.dataset.filter;
        this.render();
      };
    });

    this.querySelectorAll(".comp-book-unit-btn").forEach((btn) => {
      btn.onclick = () => {
        const uNo = btn.dataset.unitNo;
        const modal = document.querySelector("booking-modal");
        if (modal && typeof modal.openModal === "function") {
          modal.openModal({ unit: uNo });
        } else {
          const form = document.getElementById("bookingSection");
          if (form) form.scrollIntoView({ behavior: "smooth" });
        }
      };
    });
  }
}

if (!customElements.get("available-units-table")) {
  customElements.define("available-units-table", AvailableUnitsTable);
}
