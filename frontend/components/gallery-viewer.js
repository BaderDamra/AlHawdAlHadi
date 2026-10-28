/**
 * <gallery-viewer> Web Component
 * Luxury property media gallery with counter pill, thumbnails strip, and theme awareness
 */
class GalleryViewer extends HTMLElement {
  connectedCallback() {
    this.activeIdx = 0;
    this.render();
    window.addEventListener("alhawd:themechange", () => this.updateSlide());
  }

  setGallery(items) {
    this.items = items || [];
    this.activeIdx = 0;
    this.render();
  }

  render() {
    const list = this.items || [
      { id: "g1", title: "واجهة المشروع الرئيسية", imageLight: "/images/projects/01_main_building_gallery.webp", imageDark: "/images/projects/01_main_building_gallery.webp" },
      { id: "g2", title: "المدخل الخارجي", imageLight: "/images/projects/02_gallery_thumbnail_exterior_1.webp", imageDark: "/images/projects/02_gallery_thumbnail_exterior_1.webp" },
      { id: "g3", title: "الحدائق والمحيط", imageLight: "/images/projects/03_gallery_thumbnail_exterior_2.webp", imageDark: "/images/projects/03_gallery_thumbnail_exterior_2.webp" },
      { id: "g4", title: "الواجهة الجانبية", imageLight: "/images/projects/04_gallery_thumbnail_exterior_3.webp", imageDark: "/images/projects/04_gallery_thumbnail_exterior_3.webp" },
      { id: "g5", title: "الصالة الرئيسية", imageLight: "/images/projects/05_gallery_thumbnail_interior_1.webp", imageDark: "/images/projects/05_gallery_thumbnail_interior_1.webp" },
      { id: "g6", title: "منطقة تناول الطعام", imageLight: "/images/projects/06_gallery_thumbnail_interior_2.webp", imageDark: "/images/projects/06_gallery_thumbnail_interior_2.webp" },
      { id: "g7", title: "غرفة الجلوس العائلية", imageLight: "/images/projects/07_gallery_thumbnail_interior_3.webp", imageDark: "/images/projects/07_gallery_thumbnail_interior_3.webp" },
      { id: "g8", title: "جولة فيديو للمشروع", imageLight: "/images/projects/08_gallery_thumbnail_video_preview.webp", imageDark: "/images/projects/08_gallery_thumbnail_video_preview.webp", isVideo: true }
    ];

    this.items = list;

    this.innerHTML = `
      <div class="project-gallery-wrapper component-gallery-viewer">
        <div class="gallery-main-slide">
          <span class="gallery-counter-pill" id="compGalleryCounter">1 / ${list.length}</span>
          <img src="" alt="معرض المشروع" id="compGalleryMainImg" class="gallery-main-img" />
          <button type="button" class="gallery-nav-btn prev" id="compGalleryPrevBtn" aria-label="الصورة السابقة">‹</button>
          <button type="button" class="gallery-nav-btn next" id="compGalleryNextBtn" aria-label="الصورة التالية">›</button>
        </div>
        <div class="gallery-thumbnails-strip" id="compGalleryThumbs">
          ${list
            .map(
              (item, idx) => `
            <div class="gallery-thumb-item ${idx === 0 ? 'active' : ''}" data-thumb-idx="${idx}">
              <img src="${item.imageLight}" alt="${item.title}" loading="lazy" />
              ${item.isVideo ? '<span class="video-play-indicator">▶</span>' : ''}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    this.setupEvents();
    this.updateSlide();
  }

  setupEvents() {
    const prevBtn = this.querySelector("#compGalleryPrevBtn");
    const nextBtn = this.querySelector("#compGalleryNextBtn");

    if (prevBtn) {
      prevBtn.onclick = () => {
        this.activeIdx = (this.activeIdx - 1 + this.items.length) % this.items.length;
        this.updateSlide();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        this.activeIdx = (this.activeIdx + 1) % this.items.length;
        this.updateSlide();
      };
    }

    this.querySelectorAll(".gallery-thumb-item").forEach((thumb) => {
      thumb.onclick = () => {
        this.activeIdx = parseInt(thumb.dataset.thumbIdx, 10);
        this.updateSlide();
      };
    });
  }

  updateSlide() {
    if (!this.items || !this.items.length) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const current = this.items[this.activeIdx];
    const mainImg = this.querySelector("#compGalleryMainImg");
    const counter = this.querySelector("#compGalleryCounter");

    if (mainImg && current) {
      mainImg.src = isDark ? current.imageDark || current.imageLight : current.imageLight;
      mainImg.alt = current.title;
    }

    if (counter) {
      counter.textContent = `${this.activeIdx + 1} / ${this.items.length}`;
    }

    this.querySelectorAll(".gallery-thumb-item").forEach((thumb, idx) => {
      thumb.classList.toggle("active", idx === this.activeIdx);
    });
  }
}

if (!customElements.get("gallery-viewer")) {
  customElements.define("gallery-viewer", GalleryViewer);
}
