// Load gallery from ../data/gallery.json (newest -> oldest), 1:1 contain
(function () {
  const GalleryShared = window.GalleryShared;
  let grid;
  let images = [];

  if (!GalleryShared) {
    console.error("GalleryShared is required before js/mobile-gallery.js");
    return;
  }

  function sfx() {
    try {
      if (window.W98 && typeof window.W98.play === "function") {
        window.W98.play("click");
      }
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", async () => {
    grid = document.getElementById("gallery-grid");
    if (!grid) return;

    try {
      // Pre-load boneyard skeleton data before rendering gallery items
      if (window.Boneyard) {
        await window.Boneyard.loadBones("../data/gallery.bones.json");
      }

      images = await GalleryShared.loadGallery("../data/gallery.json", {
        srcPrefix: "../",
      });

      grid.replaceChildren();
      images.forEach((item, index) => {
        grid.appendChild(
          GalleryShared.createGalleryItem(item, index, {
            className: "gallery-item",
            eagerCount: 4,
            width: 200,
            height: 200,
            alt: (entry) => `Artwork by ${entry.artist?.name || "Unknown"}`,
            ariaLabel: (entry) =>
              `Artwork by ${entry.artist?.name || "Unknown"}`,
            draggable: false,
          })
        );
      });

      if (!grid.dataset.galleryBound) {
        grid.addEventListener("click", (event) => {
          const item = event.target.closest(".gallery-item");
          if (!item) return;

          const index = Number(item.dataset.index || "-1");
          if (index < 0 || index >= images.length) return;

          const viewer = window.MobileGalleryViewer;
          if (viewer && typeof viewer.open === "function") {
            viewer.open(images[index]);
            sfx();
          }
        });
        grid.dataset.galleryBound = "1";
      }
    } catch (error) {
      console.error("Failed to load mobile gallery", error);
      GalleryShared.renderLoadError(grid, error.message);
    }
  });
})();
