// Boneyard-style skeleton loading for vanilla JS
// Inspired by https://github.com/0xGF/boneyard
// Renders animated bone placeholders in gallery slots until images finish loading.
(function () {
  let bonesConfig = null;

  async function loadBones(url) {
    try {
      var response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      bonesConfig = await response.json();
      return bonesConfig;
    } catch (_) {
      return null;
    }
  }

  function createSkeletonSlot(index, options) {
    var config = options || {};
    var wrapper = document.createElement("div");
    wrapper.className = "bone-slot";
    wrapper.setAttribute("aria-hidden", "true");

    var animate = (bonesConfig && bonesConfig.animate) || "shimmer";
    wrapper.setAttribute("data-bone-animate", animate);

    if (bonesConfig && bonesConfig.stagger) {
      wrapper.style.setProperty(
        "--bone-stagger-delay",
        (index * bonesConfig.stagger) + "ms"
      );
    }

    // The gallery creates one skeleton wrapper per image slot. The source
    // config describes a whole grid, so its grid coordinates must not be
    // applied inside an individual slot.
    var boneEl = document.createElement("div");
    boneEl.className = "bone";
    boneEl.style.position = "absolute";
    boneEl.style.inset = "0";
    boneEl.style.borderRadius = "4px";
    wrapper.appendChild(boneEl);

    return wrapper;
  }

  function attachToGalleryItem(slotEl, imgEl, skeletonEl) {
    if (!skeletonEl || !imgEl) return;

    function removeSkeleton() {
      if (!skeletonEl.parentNode) return;
      skeletonEl.classList.add("bone-fade-out");
      skeletonEl.addEventListener(
        "transitionend",
        function () {
          if (skeletonEl.parentNode) {
            skeletonEl.parentNode.removeChild(skeletonEl);
          }
        },
        { once: true }
      );
      // Safety timeout in case transitionend doesn't fire
      window.setTimeout(function () {
        if (skeletonEl.parentNode) {
          skeletonEl.parentNode.removeChild(skeletonEl);
        }
      }, 500);
    }

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      // Image already loaded; remove skeleton after a tiny delay
      window.requestAnimationFrame(removeSkeleton);
    } else {
      imgEl.addEventListener("load", removeSkeleton, { once: true });
      imgEl.addEventListener("error", removeSkeleton, { once: true });
    }
  }


  window.Boneyard = {
    loadBones: loadBones,
    createSkeletonSlot: createSkeletonSlot,
    attachToGalleryItem: attachToGalleryItem,
    getConfig: function () {
      return bonesConfig;
    },
  };
})();
