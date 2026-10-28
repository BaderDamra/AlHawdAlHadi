/**
 * <booking-modal> Web Component
 * Interactive luxury appointment booking modal matching the exact architectural popup design
 */
class BookingModal extends HTMLElement {
  connectedCallback() {
    this.cmsProjects = [];
    this.cmsApartments = [];
    this.pendingUnitPrefill = null;
    this.render();
    this.setupEvents();
    this.loadProjectsFromCms();
    if (new URLSearchParams(window.location.search).get("book") === "1") {
      setTimeout(() => this.openModal(), 150);
    }
  }

  formatUnitOption(u) {
    const rawCode = String(u.code || u.unitNo || u.id || "101")
      .replace(/^شقة\s*[-–]?\s*/i, "")
      .trim();
    const rawFloor = String(u.floor || "").trim();
    const floorLabel = rawFloor
      ? rawFloor.startsWith("الطابق") || rawFloor.startsWith("طابق")
        ? rawFloor
        : `الطابق ${rawFloor}`
      : "";

    const baseText = floorLabel
      ? `شقة - ${rawCode} (${floorLabel})`
      : u.title
        ? `شقة - ${rawCode} (${u.title})`
        : `شقة - ${rawCode}`;

    const status = String(u.status || "available").toLowerCase();
    const statusTag =
      status === "sold"
        ? " — (مباعة)"
        : status === "reserved"
          ? " — (محجوزة)"
          : u.area
            ? ` • ${u.area}`
            : "";

    return {
      value: baseText,
      label: `${baseText}${statusTag}`,
      code: rawCode,
      id: String(u.id || ""),
      status
    };
  }

  populateUnitsForSelectedProject(preferredUnit = null) {
    const projectSelect = this.querySelector("#modalProjectSelect");
    const unitSelect = this.querySelector("#modalUnitInput");
    if (!projectSelect || !unitSelect) return;

    const selectedOpt = projectSelect.options[projectSelect.selectedIndex];
    const selectedProjId = selectedOpt?.dataset?.projectId || "";
    const selectedProjTitle = projectSelect.value;

    const proj =
      this.cmsProjects.find((p) => selectedProjId && p.id === selectedProjId) ||
      this.cmsProjects.find(
        (p) =>
          p.title === selectedProjTitle ||
          selectedProjTitle.includes(p.title)
      ) ||
      this.cmsProjects[0];

    let units = [];
    if (proj && this.cmsApartments.length > 0) {
      units = this.cmsApartments.filter((a) => a.buildingId === proj.id);
    }
    if (units.length === 0 && proj && Array.isArray(proj.availableUnits)) {
      units = proj.availableUnits;
    }

    // Fallback default units if CMS hasn't loaded yet
    if (units.length === 0) {
      units = [
        { code: "101", floor: "الأرضي", area: "155 م²", status: "available" },
        { code: "102", floor: "الأول", area: "165 م²", status: "available" },
        { code: "201", floor: "الثاني", area: "175 م²", status: "available" },
        { code: "301", floor: "الثالث", area: "190 م²", status: "available" },
        { code: "401", floor: "4", area: "210 م²", status: "available" }
      ];
    }

    // Sort so available units come first, then reserved, then sold
    const orderMap = { available: 0, reserved: 1, sold: 2 };
    const sortedUnits = [...units].sort((a, b) => {
      const sA = orderMap[String(a.status || "available").toLowerCase()] ?? 0;
      const sB = orderMap[String(b.status || "available").toLowerCase()] ?? 0;
      return sA - sB;
    });

    const formatted = sortedUnits.map((u) => this.formatUnitOption(u));

    unitSelect.innerHTML =
      formatted
        .map(
          (item) =>
            `<option value="${item.value}" data-unit-code="${item.code}" data-unit-id="${item.id}" ${
              item.status === "sold" ? "disabled" : ""
            }>${item.label}</option>`
        )
        .join("") +
      `<option value="معاينة عامة للمشروع (بدون شقة محددة)">معاينة عامة للمشروع (بدون شقة محددة)</option>`;

    const targetUnit = preferredUnit || this.pendingUnitPrefill;
    if (targetUnit) {
      const cleanTarget = String(targetUnit).trim();
      const match = Array.from(unitSelect.options).find(
        (o) =>
          o.value === cleanTarget ||
          o.textContent.includes(cleanTarget) ||
          (o.dataset.unitCode && cleanTarget.includes(o.dataset.unitCode)) ||
          (o.dataset.unitId && cleanTarget === o.dataset.unitId)
      );
      if (match && !match.disabled) {
        unitSelect.value = match.value;
      }
      this.pendingUnitPrefill = null;
    } else {
      const firstEnabled = Array.from(unitSelect.options).find((o) => !o.disabled);
      if (firstEnabled) unitSelect.value = firstEnabled.value;
    }
  }

  async loadProjectsFromCms() {
    try {
      const res = await fetch("/api/cms");
      if (!res.ok) return;
      const cms = await res.json();
      const projects = cms?.projectsSection?.projects || [];
      const apartments = cms?.explorerSection?.apartments || [];
      this.cmsProjects = projects;
      this.cmsApartments = apartments;

      const selectEl = this.querySelector("#modalProjectSelect");
      if (selectEl && projects.length > 0) {
        const currentVal = selectEl.value;
        const urlParams = new URLSearchParams(window.location.search);
        const pageProjId = urlParams.get("project") || urlParams.get("building") || urlParams.get("id");

        selectEl.innerHTML = projects
          .map((p) => {
            const loc = (p.locationLight || "").replace(/^عمان\s*-\s*/, "").trim();
            const label = loc ? `${p.title} (${loc})` : p.title;
            return `<option value="${p.title}" data-project-id="${p.id || ""}">${label}</option>`;
          })
          .join("");

        const byPageId = pageProjId
          ? Array.from(selectEl.options).find((o) => o.dataset.projectId === pageProjId)
          : null;
        if (byPageId) {
          selectEl.value = byPageId.value;
        } else if (currentVal) {
          const match = Array.from(selectEl.options).find(
            (o) => o.value === currentVal || o.textContent.includes(currentVal)
          );
          if (match) selectEl.value = match.value;
        }
      }

      this.populateUnitsForSelectedProject();
    } catch (_) {
      this.populateUnitsForSelectedProject();
    }
  }

  openModal(prefill = {}) {
    const modal = this.querySelector("#bookingModalBackdrop");
    if (!modal) return;

    if (prefill.project) {
      const pInput = this.querySelector("#modalProjectSelect");
      if (pInput) {
        const match = Array.from(pInput.options).find(
          (o) =>
            o.value === prefill.project ||
            o.textContent.includes(prefill.project) ||
            o.dataset.projectId === prefill.project
        );
        if (match) {
          pInput.value = match.value;
        } else {
          const opt = document.createElement("option");
          opt.value = prefill.project;
          opt.textContent = prefill.project;
          pInput.prepend(opt);
          pInput.value = prefill.project;
        }
      }
    }

    if (prefill.unit) {
      this.pendingUnitPrefill = prefill.unit;
    }
    this.populateUnitsForSelectedProject(prefill.unit || null);

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  closeModal() {
    const modal = this.querySelector("#bookingModalBackdrop");
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    const msg = this.querySelector("#modalBookingMsg");
    if (msg) msg.style.display = "none";
  }

  render() {
    this.innerHTML = `
      <div class="booking-modal-backdrop" id="bookingModalBackdrop" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="booking-modal-card">
          
          <!-- Top Hero Header with Curved Architectural Photo -->
          <div class="booking-modal-hero">
            <!-- Top-Left Circular Close Button -->
            <button type="button" class="booking-modal-close" id="modalCloseBtn" aria-label="إغلاق">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <!-- Top-Right Curved Architectural Image with Gold Arc -->
            <div class="booking-modal-corner-art" aria-hidden="true">
              <div class="bm-corner-gold-arc"></div>
              <div class="bm-corner-img-mask">
                <img src="/images/ui/booking-modal-hero.webp" alt="الحوض الهادي للإسكان" loading="eager" />
              </div>
              <div class="bm-corner-fade"></div>
            </div>

            <!-- Header Text Content -->
            <div class="booking-modal-titles">
              <div class="bm-eyebrow-row">
                <span class="bm-eyebrow-text">حجز موعد معاينة</span>
                <span class="bm-eyebrow-line"></span>
              </div>
              <h3 class="booking-modal-title" id="modalTitle">احجز موعداً خاصاً لزيارة المشروع</h3>
              <p class="booking-modal-subtitle">املأ البيانات التالية وسيقوم فريقنا بالتواصل معك لتأكيد الموعد.</p>
            </div>
          </div>

          <!-- Booking Form -->
          <form class="booking-modal-form" id="bookingModalForm">
            <div class="modal-form-grid">
              
              <!-- 1. Full Name (Right in RTL) -->
              <div class="field">
                <label for="mName">الاسم الكامل <span class="req">*</span></label>
                <div class="bm-input-wrap has-icon-right">
                  <span class="bm-field-icon right" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input type="text" class="bm-input" id="mName" required placeholder="مثال: أحمد عبد الله" />
                </div>
              </div>

              <!-- 2. Phone Number (Left in RTL) -->
              <div class="field">
                <label for="mPhone">رقم الهاتف <span class="req">*</span></label>
                <div class="bm-input-wrap has-icon-left">
                  <span class="bm-field-icon left" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </span>
                  <input type="tel" class="bm-input ltr-input" id="mPhone" required dir="ltr" placeholder="+962 7 9000 0000" />
                </div>
              </div>

              <!-- 3. Project Select (Right in RTL) -->
              <div class="field">
                <label for="modalProjectSelect">المشروع المراد معاينته</label>
                <div class="bm-input-wrap has-icon-right has-chevron-left">
                  <span class="bm-field-icon right" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                      <line x1="9" y1="6" x2="9.01" y2="6"></line>
                      <line x1="15" y1="6" x2="15.01" y2="6"></line>
                      <line x1="9" y1="10" x2="9.01" y2="10"></line>
                      <line x1="15" y1="10" x2="15.01" y2="10"></line>
                      <line x1="9" y1="14" x2="9.01" y2="14"></line>
                      <line x1="15" y1="14" x2="15.01" y2="14"></line>
                      <path d="M9 22v-4h6v4"></path>
                    </svg>
                  </span>
                  <select class="bm-input bm-select" id="modalProjectSelect">
                    <option value="مشروع الهدوء 2" data-project-id="proj-2">مشروع الهدوء 2 (دير غبار)</option>
                    <option value="مشروع الهدوء 1" data-project-id="proj-1">مشروع الهدوء 1 (الشميساني)</option>
                    <option value="مشروع الهدوء 3" data-project-id="proj-3">مشروع الهدوء 3 (عبدون)</option>
                  </select>
                  <span class="bm-field-chevron" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <!-- 4. Apartment Number Dropdown (Left in RTL) -->
              <div class="field">
                <label for="modalUnitInput">رقم الشقة (اختياري)</label>
                <div class="bm-input-wrap has-icon-right has-chevron-left">
                  <span class="bm-field-icon right" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="5" y="2" width="14" height="20" rx="2"></rect>
                      <line x1="9" y1="6" x2="9.01" y2="6"></line>
                      <line x1="15" y1="6" x2="15.01" y2="6"></line>
                      <line x1="9" y1="10" x2="9.01" y2="10"></line>
                      <line x1="15" y1="10" x2="15.01" y2="10"></line>
                      <line x1="9" y1="14" x2="9.01" y2="14"></line>
                      <line x1="15" y1="14" x2="15.01" y2="14"></line>
                    </svg>
                  </span>
                  <select class="bm-input bm-select" id="modalUnitInput">
                    <option value="شقة - 101 (الطابق الأرضي)">شقة - 101 (الطابق الأرضي)</option>
                  </select>
                  <span class="bm-field-chevron" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <!-- 5. Preferred Date (Right in RTL) -->
              <div class="field">
                <label for="mDate">تاريخ الزيارة المفضل</label>
                <div class="bm-input-wrap has-icon-right">
                  <span class="bm-field-icon right" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input type="date" class="bm-input bm-date-input" id="mDate" />
                </div>
              </div>

              <!-- 6. Preferred Time (Left in RTL) -->
              <div class="field">
                <label for="mTime">الوقت المفضل</label>
                <div class="bm-input-wrap has-icon-right has-chevron-left">
                  <span class="bm-field-icon right" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <select class="bm-input bm-select" id="mTime">
                    <option value="صباحاً (10:00 ص - 1:00 م)">صباحاً (10:00 ص - 1:00 م)</option>
                    <option value="ظهراً (1:00 م - 4:00 م)">ظهراً (1:00 م - 4:00 م)</option>
                    <option value="مساءً (4:00 م - 7:00 م)" selected>مساءً (4:00 م - 7:00 م)</option>
                  </select>
                  <span class="bm-field-chevron" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

            </div>

            <!-- 7. Additional Notes (Full Width) -->
            <div class="field bm-notes-field">
              <label for="mNotes">ملاحظات إضافية</label>
              <div class="bm-input-wrap has-icon-left">
                <span class="bm-field-icon left" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </span>
                <input type="text" class="bm-input" id="mNotes" placeholder="هل لديك أي استفسار محدد أو تفضيل معين؟" />
              </div>
            </div>

            <!-- 8. Gold Gradient Submit Button -->
            <div class="modal-submit-row">
              <button type="submit" class="bm-submit-btn" id="modalSubmitBtn">
                <span class="bm-submit-label">تأكيد حجز المعاينة الميدانية</span>
                <span class="bm-submit-arrow-circle" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </span>
              </button>
            </div>

            <div class="booking-result-msg" id="modalBookingMsg"></div>
          </form>
        </div>
      </div>
    `;
  }

  setupEvents() {
    const closeBtn = this.querySelector("#modalCloseBtn");
    const backdrop = this.querySelector("#bookingModalBackdrop");
    const form = this.querySelector("#bookingModalForm");
    const projectSelect = this.querySelector("#modalProjectSelect");

    if (projectSelect) {
      projectSelect.addEventListener("change", () => {
        this.populateUnitsForSelectedProject();
      });
    }

    if (closeBtn) closeBtn.onclick = () => this.closeModal();
    if (backdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) this.closeModal();
      };
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop?.classList.contains("open")) {
        this.closeModal();
      }
    });

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const msg = this.querySelector("#modalBookingMsg");
        const submitBtn = this.querySelector("#modalSubmitBtn");
        const labelEl = this.querySelector(".bm-submit-label");
        submitBtn.disabled = true;
        if (labelEl) labelEl.textContent = "جاري تأكيد الحجز...";

        const payload = {
          name: this.querySelector("#mName").value.trim(),
          phone: this.querySelector("#mPhone").value.trim(),
          email: "",
          project: this.querySelector("#modalProjectSelect").value,
          unit: this.querySelector("#modalUnitInput").value.trim(),
          preferredDate: this.querySelector("#mDate").value,
          preferredTime: this.querySelector("#mTime").value,
          notes: this.querySelector("#mNotes").value.trim()
        };

        try {
          const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const data = await res.json();
            msg.className = "booking-result-msg success";
            msg.style.display = "block";
            msg.innerHTML = `✅ تم استلام طلبك بنجاح! رقم الحجز: #${data.id || "2026"}. سيتواصل معك فريق المبيعات لتأكيد الموعد.`;
            form.reset();
            setTimeout(() => this.closeModal(), 3500);
          } else {
            throw new Error("فشل الحفظ");
          }
        } catch (err) {
          msg.className = "booking-result-msg error";
          msg.style.display = "block";
          msg.textContent = "عذراً، حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.";
        } finally {
          submitBtn.disabled = false;
          if (labelEl) labelEl.textContent = "تأكيد حجز المعاينة الميدانية";
        }
      };
    }
  }
}

if (!customElements.get("booking-modal")) {
  customElements.define("booking-modal", BookingModal);
}
