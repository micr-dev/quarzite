/**
 * @fileoverview 98.css-style tab system with keyboard navigation.
 * Manages tab selection, ARIA attributes, and panel visibility.
 * @exports window.Tabs
 */
(function () {
  /**
   * Initialize a 98.css tab container with click and keyboard handlers.
   * Prevents default hash navigation and manages aria-selected/hidden states.
   * @param {HTMLElement} container - The tab container element.
   */
  function initTabs98(container) {
    if (!container) return;

    const menu = container.querySelector('menu[role="tablist"]');
    if (!menu) return;

    const tabs = Array.from(menu.querySelectorAll('[role="tab"]'));
    const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));

    function show(id) {
      panels.forEach((p) => (p.hidden = p.id !== id));
      tabs.forEach((li) => {
        const a = li.querySelector("a");
        const active = a && a.getAttribute("href") === `#${id}`;
        li.setAttribute("aria-selected", String(!!active));
      });
    }

    const initial =
      tabs.find((li) => li.getAttribute("aria-selected") === "true") || tabs[0];
    if (initial) {
      const a = initial.querySelector("a");
      if (a) show(a.getAttribute("href").slice(1));
    }

    menu.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#']");
      if (!a) return;
      e.preventDefault();
      show(a.getAttribute("href").slice(1));
    });

    menu.addEventListener("keydown", (e) => {
      const current = document.activeElement.closest('[role="tab"]');
      const idx = tabs.indexOf(current);
      if (e.key === "ArrowRight" && idx > -1) {
        e.preventDefault();
        tabs[(idx + 1) % tabs.length].querySelector("a").focus();
      } else if (e.key === "ArrowLeft" && idx > -1) {
        e.preventDefault();
        tabs[(idx - 1 + tabs.length) % tabs.length].querySelector("a").focus();
      }
    });
  }

  window.Tabs = { initTabs98 };
})();