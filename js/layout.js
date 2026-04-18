/**
 * @fileoverview Desktop scaling and layout system for Quarzite.
 * Scales the 1920x1080 design viewport to fit the browser window.
 * @exports window.AppLayout
 */
(function () {
  /** @const {number} Design viewport width in pixels */
  const DESIGN_WIDTH = 1920;
  /** @const {number} Design viewport height in pixels */
  const DESIGN_HEIGHT = 1080;
  /** @type {number} Current scale factor */
  let currentScale = 1;

  /**
   * Compute the optimal scale factor to fit the design viewport.
   * @returns {number} Scale factor (0 to 1), clamped to max 1.
   */
  function computeScale() {
    return Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT,
      1
    );
  }

  /**
   * Synchronize the desktop layout by updating CSS custom properties.
   * Sets --desktop-scale and --desktop-offset-top, and toggles compact-layout class.
   */
  function syncLayout() {
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
    document.body.classList.toggle("compact-layout", currentScale < 0.8);
  }

  /**
   * Convert screen pixels to design-space pixels using the current scale.
   * @param {number} screenPx - Pixel value in screen space.
   * @returns {number} Equivalent pixel value in design space.
   */
  function toDesignPx(screenPx) {
    return screenPx / currentScale;
  }

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
