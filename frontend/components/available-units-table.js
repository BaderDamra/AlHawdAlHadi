/**
 * <available-units-table> Web Component
 * Displays all apartments inside a project as luxury visual cards with photos,
 * specs, prices, status badges (Available / Reserved / Sold), and direct links to apartment.html
 */
class AvailableUnitsTable extends HTMLElement {
  connectedCallback() {
    this.filter = "all";
    this.projectId = this.getAttribute("project-id") || "proj-1";
    this.render();
    window.addEventListener("alhawd:themechange", () => this.render());
  }

  setUnits(units, projectId, projectTitle) {
    this.units = units;
    if (projectId) this.projectId = projectId;
    if (projectTitle) this.projectTitle = projectTitle;
    this.render();
  }

  getStatusMeta(u) {
    const st = (u.status || "available").toLowerCase();
    if (st === "sold") {
      return {
        key: "sold",
        label: "مباعة",
        bg: "rgba(220, 38, 38, 0.92)",
        border: "#ef4444",
        text: "#ffffff",
        pillBg: "rgba(220, 38, 38, 0.14)",
        pillColor: "#ef4444"
      };
    }
    if (st === "reserved") {
      return {
        key: "reserved",
        label: u.statusText && u.statusText !== "متاحة للبيع" ? u.statusText : "محجوزة",
        bg: "rgba(217, 119, 6, 0.92)",
        border: "#f59e0b",
        text: "#ffffff",
        pillBg: "rgba(245, 158, 11, 0.15)",
        pillColor: "#f59e0b"
      };
    }
    return {
      key: "available",
      label: u.statusText && u.statusText !== "مباعة" && u.statusText !== "محجوزة" ? u.statusText : "متاحة للبيع",
      bg: "rgba(22, 163, 74, 0.92)",
      border: "#22c55e",
      text: "#ffffff",
      pillBg: "rgba(34, 197, 94, 0.14)",
      pillColor: "#22c55e"
    };
  }

  render() {
    const list = this.units || [];
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    const availCount = list.filter((u) => (u.status || "available") === "available").length;
    const soldCount = list.filter((u) => u.status === "sold").length;

    const filtered = list.filter((u) => {
      if (this.filter === "all") return true;
      if (this.filter === "available") return (u.status || "available") === "available";
      if (this.filter === "sold") return u.status === "sold";
      const bStr = String(u.bedrooms || "");
      return bStr.includes(this.filter);
    });

    this.innerHTML = `
      <section class="project-detail-section component-units-table" id="tab-units" style="padding-top:20px;">
        <div class="units-section-header" style="margin-bottom:28px;">
          <div>
            <span class="section-gold-eyebrow">شقق ووحدات المشروع</span>
            <h2 class="section-heading-lg">جميع الشقق في ${this.projectTitle || "هذا المشروع"} (${list.length} شقق)</h2>
            <p style="color:var(--text-secondary); font-size:0.98rem; margin-top:6px;">
              اضغط على أي شقة لفتح صفحتها الخاصة ومشاهدة كافة صورها الداخلية، مواصفاتها الكاملة، المخطط الهندسي، وحجز موعد معاينة.
            </p>
          </div>
          <div class="unit-filter-pills" id="compUnitFilterPills" style="display:flex; flex-wrap:wrap; gap:8px;">
            <button type="button" class="filter-pill ${this.filter === 'all' ? 'active' : ''}" data-filter="all">جميع الشقق (${list.length})</button>
            <button type="button" class="filter-pill ${this.filter === 'available' ? 'active' : ''}" data-filter="available">متاحة للبيع (${availCount})</button>
            ${soldCount > 0 ? `<button type="button" class="filter-pill ${this.filter === 'sold' ? 'active' : ''}" data-filter="sold">مباعة (${soldCount})</button>` : ""}
            <button type="button" class="filter-pill ${this.filter === '3' ? 'active' : ''}" data-filter="3">3 غرف نوم</button>
            <button type="button" class="filter-pill ${this.filter === '4' ? 'active' : ''}" data-filter="4">4 غرف نوم</button>
          </div>
        </div>

        ${
          filtered.length === 0
            ? `<div style="padding:48px 24px; text-align:center; background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:16px; color:var(--text-secondary);">
                لا توجد شقق مطابقة لخيار التصفية المحدد حالياً.
              </div>`
            : `<div class="project-apartments-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(330px, 1fr)); gap:24px;">
                ${filtered
                  .map((u) => {
                    const aptId = u.id || u.code || "apt-101";
                    const bId = u.buildingId || this.projectId || "proj-1";
                    const aptUrl = `/apartment?id=${encodeURIComponent(aptId)}&project=${encodeURIComponent(bId)}`;
                    const thumb =
                      u.mainImage ||
                      (isDark
                        ? u.gallery?.[0]?.imageDark || u.gallery?.[0]?.imageLight
                        : u.gallery?.[0]?.imageLight) ||
                      "/images/light/scene-2.webp";
                    const feats = Array.isArray(u.features) ? u.features : [];
                    const st = this.getStatusMeta(u);

                    return `
                      <article class="clickable-apt-card" data-apt-url="${aptUrl}" style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:18px; overflow:hidden; cursor:pointer; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.25s ease, box-shadow 0.25s ease; box-shadow:0 8px 24px rgba(0,0,0,0.06);">
                        <div>
                          <!-- Apartment Image Header -->
                          <div style="position:relative; height:225px; overflow:hidden; background:#111;">
                            <img src="${thumb}" alt="${u.title || u.code}" loading="lazy" style="width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; ${st.key === 'sold' ? 'filter:grayscale(35%) brightness(0.82);' : ''}" />
                            
                            <!-- Code Pill (Top Right) -->
                            <span style="position:absolute; top:14px; right:14px; background:rgba(17,24,39,0.85); backdrop-filter:blur(6px); color:var(--accent-gold); border:1px solid rgba(226,192,136,0.45); padding:5px 12px; border-radius:8px; font-family:'Manrope',sans-serif; font-weight:800; font-size:0.86rem;">
                              ${u.code || u.unitNo || "شقة"}
                            </span>

                            <!-- Status Pill (Top Left) -->
                            <span style="position:absolute; top:14px; left:14px; background:${st.bg}; color:${st.text}; border:1px solid ${st.border}; padding:5px 14px; border-radius:99px; font-weight:700; font-size:0.84rem; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                              ${st.key === "sold" ? "🔴 مباعة" : st.key === "reserved" ? "🟡 محجوزة" : "🟢 " + st.label}
                            </span>

                            ${
                              st.key === "sold"
                                ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; background:rgba(0,0,0,0.28);">
                                    <span style="background:rgba(220,38,38,0.92); color:#fff; font-weight:800; font-size:1.2rem; padding:8px 28px; border-radius:10px; border:2px solid #fff; transform:rotate(-8deg); box-shadow:0 6px 20px rgba(0,0,0,0.45);">
                                      تم البيع (مباع)
                                    </span>
                                  </div>`
                                : ""
                            }
                          </div>

                          <!-- Apartment Body -->
                          <div style="padding:20px;">
                            <h3 style="margin:0 0 6px; font-size:1.22rem; color:var(--text-primary); font-weight:700;">
                              ${u.title || u.type || `شقة ${u.code}`}
                            </h3>
                            <p style="margin:0 0 14px; font-size:0.86rem; color:var(--text-secondary);">
                              ${u.type || "شقة سكنية بتشطيبات فاخرة"} ${u.direction ? `• ${u.direction}` : ""}
                            </p>

                            <!-- Price Box -->
                            <div style="background:rgba(201,165,106,0.1); border:1px solid rgba(201,165,106,0.35); border-radius:12px; padding:10px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                              <div>
                                <span style="font-size:0.75rem; color:var(--text-secondary); display:block;">السعر الإجمالي</span>
                                <strong style="font-size:1.28rem; font-weight:800; color:var(--accent-gold); font-family:'Manrope','IBM Plex Sans Arabic',sans-serif;">
                                  ${u.price || "عند الطلب"}
                                </strong>
                              </div>
                              ${
                                u.priceNote
                                  ? `<span style="font-size:0.75rem; color:var(--text-secondary); background:var(--bg-elevated, rgba(128,128,128,0.08)); padding:3px 9px; border-radius:99px;">${u.priceNote}</span>`
                                  : ""
                              }
                            </div>

                            <!-- 4 Key Specs Grid -->
                            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; margin-bottom:14px;">
                              <div style="background:var(--bg-elevated, rgba(128,128,128,0.06)); border:1px solid var(--border-subtle); border-radius:10px; padding:8px 10px; display:flex; align-items:center; gap:8px;">
                                <span>📐</span>
                                <div>
                                  <div style="font-size:0.72rem; color:var(--text-secondary);">المساحة</div>
                                  <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">${u.area || "-"}</div>
                                </div>
                              </div>
                              <div style="background:var(--bg-elevated, rgba(128,128,128,0.06)); border:1px solid var(--border-subtle); border-radius:10px; padding:8px 10px; display:flex; align-items:center; gap:8px;">
                                <span>🏢</span>
                                <div>
                                  <div style="font-size:0.72rem; color:var(--text-secondary);">الطابق</div>
                                  <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">${u.floor || "-"}</div>
                                </div>
                              </div>
                              <div style="background:var(--bg-elevated, rgba(128,128,128,0.06)); border:1px solid var(--border-subtle); border-radius:10px; padding:8px 10px; display:flex; align-items:center; gap:8px;">
                                <span>🛏️</span>
                                <div>
                                  <div style="font-size:0.72rem; color:var(--text-secondary);">غرف النوم</div>
                                  <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">${u.bedrooms || "-"}</div>
                                </div>
                              </div>
                              <div style="background:var(--bg-elevated, rgba(128,128,128,0.06)); border:1px solid var(--border-subtle); border-radius:10px; padding:8px 10px; display:flex; align-items:center; gap:8px;">
                                <span>🚿</span>
                                <div>
                                  <div style="font-size:0.72rem; color:var(--text-secondary);">الحمامات</div>
                                  <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">${u.bathrooms || "-"}</div>
                                </div>
                              </div>
                            </div>

                            <!-- Features Pills -->
                            ${
                              feats.length
                                ? `<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
                                    ${feats
                                      .slice(0, 3)
                                      .map(
                                        (f) =>
                                          `<span style="font-size:0.75rem; padding:3px 9px; border-radius:99px; background:var(--bg-elevated, rgba(128,128,128,0.08)); border:1px solid var(--border-subtle); color:var(--text-secondary);">✓ ${
                                            (isDark ? f.labelDark || f.labelLight : f.labelLight) || ""
                                          }</span>`
                                      )
                                      .join("")}
                                  </div>`
                                : ""
                            }
                          </div>
                        </div>

                        <!-- Card Footer CTA -->
                        <div style="padding:0 20px 20px;">
                          <a href="${aptUrl}" class="btn btn-primary btn-gold-solid" style="width:100%; justify-content:center; text-align:center; padding:12px 16px; border-radius:10px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                            <span>عرض تفاصيل وصور الشقة بالكامل</span>
                            <span>←</span>
                          </a>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>`
        }
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

    this.querySelectorAll(".clickable-apt-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        const targetUrl = card.getAttribute("data-apt-url");
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      });
    });
  }
}

if (!customElements.get("available-units-table")) {
  customElements.define("available-units-table", AvailableUnitsTable);
}
