/**
 * <available-units-table> Web Component
 * Filterable luxury units table with room count filters and direct booking triggers
 */
class AvailableUnitsTable extends HTMLElement {
  connectedCallback() {
    this.filter = "all";
    this.render();
  }

  setUnits(units) {
    this.units = units;
    this.render();
  }

  render() {
    const list = this.units || [
      { unitNo: "101", type: "شقة أرضية", area: "120 م²", bedrooms: "3", bathrooms: "3", floor: "الأرضي", status: "available", statusText: "متوفرة" },
      { unitNo: "202", type: "شقة", area: "135 م²", bedrooms: "3", bathrooms: "3", floor: "2", status: "available", statusText: "متوفرة" },
      { unitNo: "303", type: "شقة", area: "150 م²", bedrooms: "4", bathrooms: "4", floor: "3", status: "available", statusText: "متوفرة" },
      { unitNo: "404", type: "شقة", area: "160 م²", bedrooms: "4", bathrooms: "4", floor: "4", status: "available", statusText: "متوفرة" }
    ];

    this.units = list;

    const filtered = list.filter((u) => {
      if (this.filter === "all") return true;
      return String(u.bedrooms) === this.filter;
    });

    this.innerHTML = `
      <section class="project-detail-section component-units-table" id="tab-units">
        <div class="units-section-header">
          <div>
            <span class="section-gold-eyebrow">الشقق المتاحة</span>
            <h2 class="section-heading-lg">اختر الشقة المناسبة لك</h2>
          </div>
          <div class="unit-filter-pills" id="compUnitFilterPills">
            <button type="button" class="filter-pill ${this.filter === 'all' ? 'active' : ''}" data-filter="all">جميع الشقق</button>
            <button type="button" class="filter-pill ${this.filter === '3' ? 'active' : ''}" data-filter="3">شقق 3 غرف</button>
            <button type="button" class="filter-pill ${this.filter === '4' ? 'active' : ''}" data-filter="4">شقق 4 غرف</button>
          </div>
        </div>

        <div class="units-table-card">
          <div class="table-responsive">
            <table class="luxury-units-table">
              <thead>
                <tr>
                  <th>رقم الشقة</th>
                  <th>النوع</th>
                  <th>المساحة</th>
                  <th>غرف النوم</th>
                  <th>الحمامات</th>
                  <th>الطابق</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                ${filtered
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
                      <span class="unit-status-indicator status-${u.status || 'available'}">
                        ${u.statusText || 'متوفرة'}
                      </span>
                    </td>
                    <td>
                      <button type="button" class="btn btn-secondary btn-xs comp-book-unit-btn" data-unit-no="${u.unitNo}">
                        احجز مشاهدة ←
                      </button>
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
