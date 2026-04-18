/**
 * @fileoverview Desktop gallery viewer for Quarzite.
 * Loads images from gallery.json, builds gallery strip with slots,
 * and opens a full viewer window with metadata overlay.
 */
(function () {
  const GalleryShared = window.GalleryShared;
  /** @type {Object[]} Loaded gallery images */
  let images = [];
  let strip;
  let viewer;
  let viewerImg;
  let viewerMeta;
  let viewerDesc;

  if (!GalleryShared) {
    console.error("GalleryShared is required before js/gallery.js");
    return;
  }

  const px = (v) => Math.max(0, parseFloat(v || 0));

  /**
   * Build a gallery slot element for an image.
   * @param {Object} imgObj - Normalized gallery item.
   * @param {number} index - Index in the gallery array.
   * @returns {HTMLElement} The gallery slot element.
   */
  function buildSlot(imgObj, index) {
    return GalleryShared.createGalleryItem(imgObj, index, {
      className: "slot",
      alt: (item, i) => item.title || `Image ${i + 1}`,
    });
  }

  /**
   * Bring a window element to the front by setting the highest z-index.
   * @param {HTMLElement} win - The window element to promote.
   */
  function bringToFront(win) {
    const wins = Array.from(document.querySelectorAll(".app-window"));
    const top = wins.reduce((max, current) => {
      const z = parseInt(getComputedStyle(current).zIndex || "0", 10);
      return Math.max(max, Number.isNaN(z) ? 0 : z);
    }, 0);
    win.style.zIndex = String(top + 1);
  }

  function ensureTitleStructure(win) {
    const titleBarText = win.querySelector(".title-bar-text");
    if (!titleBarText) return;

    if (!titleBarText.querySelector(".title-icon")) {
      const icon = document.createElement("img");
      icon.className = "title-icon";
      icon.alt = "";
      icon.src = "assets/icons/favicon-96x96.png";
      titleBarText.prepend(icon);
    }

    if (!titleBarText.querySelector(".title-label")) {
      const label = document.createElement("span");
      label.className = "title-label";

      const nodes = Array.from(titleBarText.childNodes).filter((node) => {
        return !(
          node.nodeType === 1 &&
          node.classList &&
          node.classList.contains("title-icon")
        );
      });
      nodes.forEach((node) => label.appendChild(node));
      titleBarText.appendChild(label);
    }
  }

  function ensureViewer() {
    if (viewer) return viewer;

    viewer = document.getElementById("win-viewer");
    if (!viewer) {
      viewer = document.createElement("div");
      viewer.className = "window app-window";
      viewer.id = "win-viewer";
      viewer.setAttribute("data-title", "Viewer");
      viewer.innerHTML = `
      <div class="title-bar">
        <div class="title-bar-text">
          <img src="assets/icons/favicon-96x96.png" class="title-icon" alt="" />
          <span class="title-label">Image Viewer</span>
        </div>
        <div class="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div class="window-body viewer-body">
        <figure class="viewer-figure">
          <img id="viewer-img" alt="" />
        </figure>
        <div class="viewer-meta" id="viewer-meta"></div>
        <div class="viewer-desc" id="viewer-desc" hidden></div>
      </div>
    `;
      document.getElementById("desktop").appendChild(viewer);
    }

    ensureTitleStructure(viewer);

    viewerImg = viewer.querySelector("#viewer-img");
    viewerMeta = viewer.querySelector("#viewer-meta");
    viewerDesc = viewer.querySelector("#viewer-desc");

    if (!viewer.dataset.galleryInit) {
      const controls = viewer.querySelector(".title-bar-controls");
      const minBtn = controls.querySelector('button[aria-label="Minimize"]');
      const closeBtn = controls.querySelector('button[aria-label="Close"]');
      const maxBtn = controls.querySelector('button[aria-label="Maximize"]');
      const close = () => {
        viewer.hidden = true;
      };

      minBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      });
      closeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      });
      maxBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      viewer.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close();
      });

      AppDrag.makeDraggable(
        viewer,
        viewer.querySelector(".title-bar"),
        document.getElementById("desktop")
      );

      viewer.addEventListener("mousedown", () => bringToFront(viewer));
      viewer.addEventListener("touchstart", () => bringToFront(viewer));
      window.addEventListener("resize", () => {
        if (!viewer.hidden && viewerImg?.naturalWidth) {
          adjustToImageWidth();
        }
      });

      viewer.dataset.galleryInit = "1";
    }

    return viewer;
  }

  function adjustToImageWidth() {
    if (!viewer || !viewerImg || !viewerImg.naturalWidth) return;

    const toDesignPx =
      window.AppLayout && typeof window.AppLayout.toDesignPx === "function"
        ? window.AppLayout.toDesignPx
        : (value) => value;
    const windowBody = viewer.querySelector(".window-body");
    const figure = viewer.querySelector(".viewer-figure");
    const winBorderLR = viewer.offsetWidth - viewer.clientWidth;
    const bodyStyle = getComputedStyle(windowBody);
    const bodyLR = px(bodyStyle.paddingLeft) + px(bodyStyle.paddingRight);
    const figureStyle = getComputedStyle(figure);
    const figureLR =
      px(figureStyle.paddingLeft) +
      px(figureStyle.paddingRight) +
      px(figureStyle.borderLeftWidth) +
      px(figureStyle.borderRightWidth);
    const extras = winBorderLR + bodyLR + figureLR;
    const imgW = viewerImg.naturalWidth;
    const imgH = Math.max(1, viewerImg.naturalHeight);
    const maxViewerW = Math.floor(toDesignPx(window.innerWidth * 0.9));
    const maxImgWByVW = Math.max(120, maxViewerW - extras);
    const maxImgWByVH = Math.floor(
      toDesignPx(window.innerHeight * 0.7) * (imgW / imgH)
    );
    const targetImgW = Math.max(120, Math.min(imgW, maxImgWByVW, maxImgWByVH));
    const targetViewerW = Math.round(targetImgW + extras);

    viewer.style.width = targetViewerW + "px";
    viewer.style.height = "auto";
  }

  function openViewer(imgObj) {
    ensureViewer();

    const artistName = imgObj.artist?.name || "Unknown Artist";
    const titleLabel = viewer.querySelector(".title-label");
    if (titleLabel) {
      titleLabel.textContent = artistName;
    } else {
      viewer.querySelector(".title-bar-text").textContent = artistName;
    }

    GalleryShared.renderViewerMeta(viewerMeta, {
      dateText: GalleryShared.formatDate(imgObj.date),
      artistName,
      artistUrl: imgObj.artist?.url,
      artistPrefix: "by ",
      separator: " - ",
    });
    GalleryShared.renderViewerDescription(viewerDesc, imgObj.desc);

    viewer.style.left = "1017px";
    viewer.style.top = "107px";

    const runAdjust = () => requestAnimationFrame(adjustToImageWidth);
    viewerImg.onload = runAdjust;
    viewerImg.onerror = runAdjust;
    viewerImg.src = imgObj.src || "";

    if (viewerImg.complete && viewerImg.naturalWidth) {
      runAdjust();
    }

    viewer.hidden = false;
    bringToFront(viewer);
    viewer.tabIndex = -1;
    viewer.focus();
  }

  async function load() {
    strip = document.getElementById("gallery-strip");
    if (!strip) return;

    try {
      images = await GalleryShared.loadGallery("data/gallery.json");
      strip.replaceChildren();
      images.forEach((imgObj, index) => {
        strip.appendChild(buildSlot(imgObj, index));
      });

      if (!strip.dataset.galleryBound) {
        strip.addEventListener("click", (event) => {
          const slot = event.target.closest(".slot");
          if (!slot) return;

          const index = Number(slot.dataset.index || "-1");
          if (index >= 0 && index < images.length) {
            openViewer(images[index]);
          }
        });
        strip.dataset.galleryBound = "1";
      }
    } catch (error) {
      console.error("Failed to load gallery.json", error);
      GalleryShared.renderLoadError(strip, error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", load);
  window.GalleryViewer = { open: openViewer };
})();
