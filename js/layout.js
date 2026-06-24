(function () {
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const LOGO_VISIBLE_TOP_PX = 23;
  const LOGO_TARGET_SCREEN_TOP = 14;
  let currentScale = 1;

  function computeScale() {
    return Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT,
      1
    );
  }

  function syncLayout() {
    if (typeof window.__syncQuarziteLayoutVars === "function") {
      currentScale = window.__syncQuarziteLayoutVars();
    } else {
      currentScale = Math.max(0.52, computeScale());

      const topOffset = Math.max(
        0,
        Math.floor((window.innerHeight - DESIGN_HEIGHT * currentScale) / 2)
      );

      document.documentElement.style.setProperty(
        "--desktop-scale",
        currentScale.toFixed(4)
      );
      document.documentElement.style.setProperty(
        "--desktop-offset-top",
        `${topOffset}px`
      );
      document.documentElement.style.setProperty(
        "--logo-top",
        `${Math.round(
          (LOGO_TARGET_SCREEN_TOP - topOffset) / currentScale -
            LOGO_VISIBLE_TOP_PX
        )}px`
      );
    }

    if (document.body) {
      document.body.classList.toggle("compact-layout", currentScale < 0.8);
    }
  }

  function toDesignPx(screenPx) {
    return screenPx / currentScale;
  }

  syncLayout();
  document.addEventListener("DOMContentLoaded", syncLayout);
  window.addEventListener("resize", syncLayout, { passive: true });

  window.AppLayout = {
    DESIGN_WIDTH,
    DESIGN_HEIGHT,
    getScale: () => currentScale,
    toDesignPx,
    syncLayout,
  };
})();
