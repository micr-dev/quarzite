/**
 * @fileoverview Window dragging system for Quarzite desktop.
 * Supports mouse and touch events with viewport clamping.
 * @exports window.AppDrag
 */
(function () {
  function px(n) {
    return Number.parseFloat(n || "0");
  }

  /**
   * Make an element draggable by a handle, clamped within a container.
   * Supports both mouse and touch input. Respects the current desktop scale.
   * @param {HTMLElement} el - The element to make draggable.
   * @param {HTMLElement} handle - The drag handle (typically the title bar).
   * @param {HTMLElement} container - The bounding container for clamping.
   */
  function makeDraggable(el, handle, container) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    function start(e) {
      if (e.type === "mousedown" && e.button !== 0) return;
      if (e.target.closest(".title-bar-controls")) return;

      dragging = true;

      const style = getComputedStyle(el);
      startLeft = px(style.left);
      startTop = px(style.top);

      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX;
      startY = p.clientY;

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", end);
      document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("touchend", end);
      e.preventDefault();
    }

    function move(e) {
      if (!dragging) return;

      const p = e.touches ? e.touches[0] : e;
      const scale =
        window.AppLayout && typeof window.AppLayout.getScale === "function"
          ? window.AppLayout.getScale()
          : 1;
      const dx = (p.clientX - startX) / scale;
      const dy = (p.clientY - startY) / scale;

      let left = startLeft + dx;
      let top = startTop + dy;

      const maxLeft = container.clientWidth - el.offsetWidth;
      const maxTop = container.clientHeight - el.offsetHeight;

      left = Math.min(Math.max(left, 0), Math.max(0, maxLeft));
      top = Math.min(Math.max(top, 0), Math.max(0, maxTop));

      el.style.left = left + "px";
      el.style.top = top + "px";

      if (e.cancelable) e.preventDefault();
    }

    function end() {
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", end);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
    }

    handle.addEventListener("mousedown", start);
    handle.addEventListener("touchstart", start, { passive: false });
    handle.addEventListener("dblclick", (e) => e.preventDefault());
  }

  window.AppDrag = { makeDraggable };
})();
