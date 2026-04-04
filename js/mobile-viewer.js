// 98.css viewer modal with meta + desc + W98 sounds and author title
(function () {
  const GalleryShared = window.GalleryShared;

  if (!GalleryShared) {
    console.error("GalleryShared is required before js/mobile-viewer.js");
    return;
  }

  function sfx() {
    try {
      if (window.W98 && typeof window.W98.play === "function") {
        window.W98.play("click");
      }
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    const backdrop = document.getElementById("viewer-backdrop");
    const modal = document.getElementById("viewer-modal");
    const closeBtn = document.getElementById("viewer-close");
    const viewerImg = document.getElementById("viewer-img");
    const viewerMeta = document.getElementById("viewer-meta");
    const viewerDesc = document.getElementById("viewer-desc");
    const viewerTitle = document.getElementById("viewer-title");

    function openViewer(payload) {
      if (!payload) return;

      const artist = (payload.artist?.name || "").trim();
      const artistUrl = (payload.artist?.url || "").trim();

      viewerImg.src = payload.src || "";
      viewerImg.alt = artist ? `Artwork by ${artist}` : "Artwork";
      viewerTitle.textContent = artist || "Image Viewer";

      GalleryShared.renderViewerMeta(viewerMeta, {
        artistFirst: true,
        artistName: artist,
        artistPrefix: "By ",
        artistUrl,
        dateText: GalleryShared.formatDate(payload.date),
        separator: " • ",
        hideUnknownArtist: true,
      });
      GalleryShared.renderViewerDescription(viewerDesc, payload.desc);

      backdrop.hidden = false;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeViewer() {
      backdrop.hidden = true;
      modal.hidden = true;
      document.body.style.overflow = "";
      sfx();
    }

    window.MobileGalleryViewer = { open: openViewer };

    closeBtn.addEventListener("click", closeViewer);
    backdrop.addEventListener("click", closeViewer);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeViewer();
    });
  });
})();
