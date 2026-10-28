/**
 * <available-units-table> Web Component
 * Filterable luxury units showcase inside a building with apartment photos, features, prices, and direct links to dedicated apartment pages
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
      {
        id: "apt-101",
        buildingId: this.projectId,
        code: "A-101",
        title: "شقة A-101 الفاخرة مع حديقة",
        type: "شقة أرضية مع حديقة وتراس",
        area: "165 م²",
        bedrooms: "3 غرف",
        bathrooms: "3 حمامات",
        floor: "الطابق الأرضي",
        price: "145,000 د.أ",
        priceNote: "شامل رسوم التسجيل وموقف سيارة",
        status: "available",
        statusText: "متاحة للبيع",
        mainImage: "/images/light/scene-2.webp",
        features: [
          { labelLight: "صالون استقبال رحب" },
          { labelLight: "مطبخ عصري راكب" },
          { labelLight: "3 حمامات ماستر" },
          { labelLight: "حديقة وتراس خاص" }
        ]
      }
    ];

    this.units = list;

    const filtered = list.filter((u) => {
      if (this.filter === "all") return true;
      const bStr = String(u.bedrooms || "");
      return bStr.includes(this.filter);
    });

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    this.innerHTML = `
      <section class="project-detail-section component-units-table" id="tab-units">
        <div class="units-section-header">
          <div>
            <span class="section-gold-eyebrow">شقق ووحدات العمارة</span>
            <h2 class="section-heading-lg">اختر الشقة المناسبة واستعرض كافة تفاصيلها وصورها</h2>
            <p style="color:var(--text-secondary); font-size:0.95rem; margin-top:4px;">اضغط على أي شقة للانتقال مباشرة إلى صفحتها الخاصة ومشاهدة صور الغرف الداخلية، المخطط الهندسي، والمواصفات الكاملة.</p>
          </div>
          <div class="unit-filter-pills" id="compUnitFilterPills">
            <button type="button" class="filter-pill ${this.filter === 'all' ? 'active' : ''}" data-filter="all">جميع الشقق (${list.length})</button>
            <button type="button" class="filter-pill ${this.filter === '3' ? 'active' : ''}" data-filter="3">3 غرف نوم</button>
            <button type="button" class="filter-pill ${this.filter === '4' ? 'active' : ''}" data-filter="4">4 غرف نوم</button>
          </div>
        </div>

        <div class="units-table-card">
          <div class="table-responsive">
            <table class="luxury-units-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="width:36%;">الشقة ومميزاتها</th>
                  <th>المساحة والطابق</th>
                  <th>الغرف والحمامات</th>
                  <th style="color:var(--accent-gold);">السعر الإجمالي</th>
                  <th>الحالة</th>
                  <th style="text-align:center;">استعراض الشقة</th>
                </tr>
              </thead>
              <tbody>
                ${filtered
                  .map((u) => {
                    const aptId = u.id || u.code || "apt-101";
                    const bId = u.buildingId || this.projectId || "proj-1";
                    const aptUrl = `/apartment?id=${encodeURIComponent(aptId)}&project=${encodeURIComponent(bId)}`;
                    const thumb =
                      (isDark
                        ? u.gallery?.[0]?.imageDark || u.gallery?.[0]?.imageLight
                        : u.gallery?.[0]?.imageLight) ||
                      u.mainImage ||
                      "/images/light/scene-2.webp";
                    const feats = Array.isArray(u.features) ? u.features : [];

                    return `
                  <tr class="clickable-apt-row" data-apt-url="${aptUrl}" style="cursor:pointer; transition:background 0.2s ease;">
                    <td>
                      <div style="display:flex; align-items:center; gap:14px;">
                        <img src="${thumb}" alt="${u.title || u.code}" loading="lazy" style="width:82px; height:62px; object-fit:cover; border-radius:10px; border:1px solid var(--border-subtle); flex-shrink:0;" />
                        <div>
                          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-family:'Manrope',sans-serif; font-weight:800; font-size:0.85rem; padding:2px 8px; border-radius:6px; background:rgba(201,165,106,0.16); color:var(--accent-gold);">${u.code || u.unitNo || "شقة"}</span>
                            <strong style="font-size:1.02rem; color:var(--text-primary);">${u.title || u.type || "شقة سكنية فاخرة"}</strong>
                          </div>
                          <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">${u.type || ""}</div>
                          ${
                            feats.length
                              ? `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:6px;">
                                  ${feats
                                    .slice(0, 4)
                                    .map(
                                      (f) =>
                                        `<span style="font-size:0.73rem; padding:2px 8px; border-radius:99px; background:var(--bg-elevated, rgba(128,128,128,0.08)); border:1px solid var(--border-subtle); color:var(--text-secondary);">✓ ${
                                          (isDark ? f.labelDark || f.labelLight : f.labelLight) || ""
                                        }</span>`
                                    )
                                    .join("")}
                                </div>`
                              : ""
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:700; color:var(--text-primary);" dir="ltr">${u.area || "-"}</div>
                      <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">${u.floor || "طابق مميز"}</div>
                    </td>
                    <td>
                      <div style="font-weight:600; color:var(--text-primary);">${u.bedrooms || "3 غرف"}</div>
                      <div style="font-size:0.82rem; color:var(--text-secondary); margin-top:2px;">${u.bathrooms || "3 حمامات"}</div>
                    </td>
                    <td>
                      <div style="font-size:1.12rem; font-weight:800; color:var(--accent-gold); font-family:'Manrope','IBM Plex Sans Arabic',sans-serif;">
                        ${u.price || "عند الطلب"}
                      </div>
                      ${u.priceNote ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${u.priceNote}</div>` : ""}
                    </td>
                    <td>
                      <span class="unit-status-indicator status-${u.status || 'available'}">
                        ${u.statusText || 'متاحة للبيع'}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                        <a href="${aptUrl}" class="btn btn-primary btn-xs" style="white-space:nowrap; text-decoration:none; padding:8px 14px; font-weight:700; border-radius:8px;">
                          عرض الشقة ←
                        </a>
                        <button type="button" class="btn btn-secondary btn-xs comp-book-unit-btn" data-unit-no="${u.code || u.unitNo}" title="حجز موعد معاينة سريع" style="padding:8px 10px; border-radius:8px;">
                          حجز
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
                  })
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

    this.querySelectorAll(".clickable-apt-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".comp-book-unit-btn") || e.target.closest("a")) {
          return;
        }
        const targetUrl = row.getAttribute("data-apt-url");
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      });
    });

    this.querySelectorAll(".comp-book-unit-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
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
