// Boneyard-style skeleton loading for vanilla JS
// Inspired by https://github.com/0xGF/boneyard
// Renders animated bone placeholders in gallery slots until images finish loading.
(function () {
  let bonesConfig = null;
  let breakpointData = null;

  function pickBreakpoint(config, viewportWidth) {
    if (!config || !config.breakpoints) return null;
    var keys = Object.keys(config.breakpoints)
      .map(Number)
      .filter(function (k) {
        return !isNaN(k);
      })
      .sort(function (a, b) {
        return a - b;
      });

    var chosen = null;
    for (var i = 0; i < keys.length; i++) {
      if (viewportWidth >= keys[i]) {
        chosen = keys[i];
      } else {
        break;
      }
    }
    if (chosen === null) chosen = keys[0];
    return chosen !== null ? config.breakpoints[chosen] : null;
  }

  async function loadBones(url) {
    try {
      var response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      bonesConfig = await response.json();
      breakpointData = pickBreakpoint(bonesConfig, window.innerWidth);
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

    if (breakpointData && breakpointData.bones && breakpointData.bones[index]) {
      var bone = breakpointData.bones[index];
      var boneEl = document.createElement("div");
      boneEl.className = "bone";
      boneEl.style.left = bone.x + "%";
      boneEl.style.top = bone.y + "%";
      boneEl.style.width = bone.w + "%";
      boneEl.style.height = bone.h + "%";
      if (bone.r) {
        boneEl.style.borderRadius = Math.min(bone.r, 8) + "px";
      }
      wrapper.appendChild(boneEl);
    } else {
      var fallback = document.createElement("div");
      fallback.className = "bone";
      fallback.style.position = "absolute";
      fallback.style.inset = "4px";
      fallback.style.borderRadius = "4px";
      wrapper.appendChild(fallback);
    }

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

  function onResize() {
    if (!bonesConfig) return;
    breakpointData = pickBreakpoint(bonesConfig, window.innerWidth);
  }

  window.addEventListener("resize", onResize, { passive: true });

  window.Boneyard = {
    loadBones: loadBones,
    createSkeletonSlot: createSkeletonSlot,
    attachToGalleryItem: attachToGalleryItem,
    getConfig: function () {
      return bonesConfig;
    },
  };
})();
