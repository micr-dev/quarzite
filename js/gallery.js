// Gallery: load images and open viewer window with metadata
(function () {
  const GalleryShared = window.GalleryShared;
  let images = [];
  let strip;
  let viewer;
  let viewerImg;
  let viewerVideo;
  let viewerMeta;
  let viewerDesc;

  if (!GalleryShared) {
    console.error("GalleryShared is required before js/gallery.js");
    return;
  }

  const px = (v) => Math.max(0, parseFloat(v || 0));

  function buildSlot(imgObj, index) {
    return GalleryShared.createGalleryItem(imgObj, index, {
      className: "slot",
      eagerCount: 12,
      width: 200,
      height: 200,
      alt: (item, i) => item.title || `Image ${i + 1}`,
    });
  }

  function nextPaintFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function waitForDecodeOrTimeout(img) {
    if (!(img.naturalWidth > 0 && typeof img.decode === "function")) {
      return Promise.resolve();
    }

    return Promise.race([
      img.decode().catch(() => {}),
      new Promise((resolve) => {
        window.setTimeout(resolve, 800);
      }),
    ]);
  }

  async function waitForImage(img) {
    if (!(img.complete && img.naturalWidth > 0)) {
      await new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }

    // The load event can fire before the browser has decoded and painted the
    // image. Waiting through decode plus two frames prevents a partial grid
    // flash during cold page startup.
    await waitForDecodeOrTimeout(img);

    await nextPaintFrame();
  }

  function waitForMinimumStartupDelay() {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });
  }

  function waitForFallbackReveal() {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 1500);
    });
  }

  function revealWhenVisibleImagesAreReady() {
    const visibleImages = Array.from(strip.querySelectorAll(".slot img")).slice(
      0,
      12
    );

    Promise.race([
      Promise.all([
        Promise.all(visibleImages.map(waitForImage)),
        waitForMinimumStartupDelay(),
      ]),
      waitForFallbackReveal(),
    ]).then(() => {
      strip.classList.add("is-ready");
    });
  }

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
          <video id="viewer-video" controls playsinline hidden></video>
        </figure>
        <div class="viewer-meta" id="viewer-meta"></div>
        <div class="viewer-desc" id="viewer-desc" hidden></div>
      </div>
    `;
      document.getElementById("desktop").appendChild(viewer);
    }

    ensureTitleStructure(viewer);

    viewerImg = viewer.querySelector("#viewer-img");
    viewerVideo = viewer.querySelector("#viewer-video");
    viewerMeta = viewer.querySelector("#viewer-meta");
    viewerDesc = viewer.querySelector("#viewer-desc");

    if (!viewer.dataset.galleryInit) {
      const controls = viewer.querySelector(".title-bar-controls");
      const minBtn = controls.querySelector('button[aria-label="Minimize"]');
      const closeBtn = controls.querySelector('button[aria-label="Close"]');
      const maxBtn = controls.querySelector('button[aria-label="Maximize"]');
      const close = () => {
        viewer.hidden = true;
        viewerVideo.pause();
        viewerVideo.removeAttribute("src");
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
        if (
          !viewer.hidden &&
          (viewerImg?.naturalWidth || viewerVideo?.videoWidth)
        ) {
          adjustToImageWidth();
        }
      });

      viewer.dataset.galleryInit = "1";
    }

    return viewer;
  }

  function adjustToImageWidth() {
    const isVideo = viewerVideo && !viewerVideo.hidden;
    const media = isVideo ? viewerVideo : viewerImg;
    const mediaWidth = isVideo ? viewerVideo.videoWidth : viewerImg?.naturalWidth;
    const mediaHeight = isVideo ? viewerVideo.videoHeight : viewerImg?.naturalHeight;
    if (!viewer || !media || !mediaWidth) return;

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
    const imgW = mediaWidth;
    const imgH = Math.max(1, mediaHeight);
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
    const isVideo = GalleryShared.isVideoItem(imgObj);
    viewerImg.hidden = isVideo;
    viewerVideo.hidden = !isVideo;
    viewerVideo.pause();
    viewerVideo.removeAttribute("src");
    viewerImg.onload = runAdjust;
    viewerImg.onerror = runAdjust;

    if (isVideo) {
      viewerVideo.onloadedmetadata = runAdjust;
      viewerVideo.src = imgObj.src || "";
      viewerVideo.load();
      viewerVideo.play().catch(() => {});
    } else {
      viewerImg.src = imgObj.src || "";
      if (viewerImg.complete && viewerImg.naturalWidth) runAdjust();
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
      // Pre-load boneyard skeleton data before rendering gallery items
      if (window.Boneyard) {
        await window.Boneyard.loadBones("data/gallery.bones.json");
      }

      images = await GalleryShared.loadGallery("data/gallery.json");
      strip.classList.remove("is-ready");
      strip.replaceChildren();
      images.forEach((imgObj, index) => {
        strip.appendChild(buildSlot(imgObj, index));
      });
      revealWhenVisibleImagesAreReady();

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
