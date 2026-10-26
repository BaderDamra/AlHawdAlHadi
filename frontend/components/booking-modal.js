/**
 * <booking-modal> Web Component
 * Interactive luxury appointment booking modal with live API submission
 */
class BookingModal extends HTMLElement {
  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  openModal(prefill = {}) {
    const modal = this.querySelector("#bookingModalBackdrop");
    if (!modal) return;

    if (prefill.unit) {
      const uInput = this.querySelector("#modalUnitInput");
      if (uInput) uInput.value = prefill.unit;
    }
    if (prefill.project) {
      const pInput = this.querySelector("#modalProjectSelect");
      if (pInput) pInput.value = prefill.project;
    }

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
          <div class="booking-modal-header">
            <div>
              <span class="section-gold-eyebrow">حجز موعد معاينة</span>
              <h3 class="booking-modal-title" id="modalTitle">احجز موعداً خاصاً لزيارة المشروع</h3>
            </div>
            <button type="button" class="booking-modal-close" id="modalCloseBtn" aria-label="إغلاق">✕</button>
          </div>

          <form class="booking-modal-form" id="bookingModalForm">
            <div class="modal-form-grid">
              <div class="field">
                <label>الاسم الكامل <span class="req">*</span></label>
                <input type="text" class="input-luxury" id="mName" required placeholder="مثال: أحمد عبد الله" />
              </div>
              <div class="field">
                <label>رقم الهاتف <span class="req">*</span></label>
                <input type="tel" class="input-luxury" id="mPhone" required dir="ltr" placeholder="+962 7 9000 0000" />
              </div>
              <div class="field">
                <label>المشروع المراد معاينته</label>
                <select class="input-luxury select-luxury" id="modalProjectSelect">
                  <option value="مشروع الهدوء 2">مشروع الهدوء 2 (دير غبار)</option>
                  <option value="مشروع الهدوء 1">مشروع الهدوء 1 (الشميساني)</option>
                  <option value="مشروع الهدوء 3">مشروع الهدوء 3 (عبدون)</option>
                </select>
              </div>
              <div class="field">
                <label>رقم الشقة (اختياري)</label>
                <input type="text" class="input-luxury" id="modalUnitInput" placeholder="مثال: 101" />
              </div>
              <div class="field">
                <label>تاريخ الزيارة المفضل</label>
                <input type="date" class="input-luxury" id="mDate" />
              </div>
              <div class="field">
                <label>الوقت المفضل</label>
                <select class="input-luxury select-luxury" id="mTime">
                  <option value="morning">صباحاً (10:00 ص - 1:00 م)</option>
                  <option value="afternoon">ظهراً (1:00 م - 4:00 م)</option>
                  <option value="evening" selected>مساءً (4:00 م - 7:00 م)</option>
                </select>
              </div>
            </div>

            <div class="field" style="margin-top: 10px;">
              <label>ملاحظات إضافية</label>
              <textarea class="input-luxury" id="mNotes" rows="2" placeholder="هل لديك أي استفسار محدد أو تفضيل معين؟"></textarea>
            </div>

            <div class="modal-submit-row">
              <button type="submit" class="btn btn-primary btn-gold-solid btn-lg" id="modalSubmitBtn">
                تأكيد حجز المعاينة الميدانية
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

    if (closeBtn) closeBtn.onclick = () => this.closeModal();
    if (backdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) this.closeModal();
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const msg = this.querySelector("#modalBookingMsg");
        const submitBtn = this.querySelector("#modalSubmitBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "جاري الحفظ...";

        const payload = {
          name: this.querySelector("#mName").value.trim(),
          phone: this.querySelector("#mPhone").value.trim(),
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
            msg.innerHTML = `✅ تم استلام طلبك بنجاح! رقم الحجز: #${data.id || '2026'}. سيتواصل معك فريق المبيعات لتأكيد الموعد.`;
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
          submitBtn.textContent = "تأكيد حجز المعاينة الميدانية";
        }
      };
    }
  }
}

if (!customElements.get("booking-modal")) {
  customElements.define("booking-modal", BookingModal);
}
