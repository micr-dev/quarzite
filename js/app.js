// Wire up dragging, tabs, warnings, and sounds.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const desktop = document.getElementById("desktop");

    const clippyWin = document.getElementById("win-clippy");
    const notepadWin = document.getElementById("win-notepad");
    const paintWin = document.getElementById("win-paint");
    const paintFrame = paintWin?.querySelector(".paint-frame");
    const galleryWin = document.getElementById("win-viewer");

    // Restore the original scenario randomness while keeping heavyweight Paint
    // lazy-loaded until it is actually selected.
    const clippyCount =
      (window.Clippy && typeof Clippy.count === "number" && Clippy.count) || 22;
    const notepadCount =
      (window.Notepad && typeof Notepad.count === "number" && Notepad.count) ||
      5;
    const scenarios = [];

    for (let i = 0; i < clippyCount; i += 1) {
      scenarios.push({ type: "clippy", index: i });
    }
    for (let i = 0; i < notepadCount; i += 1) {
      scenarios.push({ type: "notepad", index: i });
    }
    for (let i = 0; i < 3; i += 1) {
      scenarios.push({ type: "paint" });
    }

    const pick = scenarios[Math.floor(Math.random() * scenarios.length)] || {
      type: "notepad",
      index: 0,
    };

    if (pick.type === "clippy") {
      clippyWin.hidden = false;
      notepadWin.hidden = true;
      paintWin.hidden = true;
      Clippy.positionClippy();
      Clippy.getQuote(pick.index);
    } else if (pick.type === "notepad") {
      notepadWin.hidden = false;
      clippyWin.hidden = true;
      paintWin.hidden = true;
      Notepad.pickContent(pick.index);
    } else {
      paintWin.hidden = false;
      clippyWin.hidden = true;
      notepadWin.hidden = true;
      if (paintFrame && !paintFrame.src) {
        paintFrame.src = paintFrame.dataset.src;
      }
    }

    // Draggable windows
    const wins = Array.from(document.querySelectorAll(".app-window"));
    let z = 100;
    wins.forEach((w) => {
      AppDrag.makeDraggable(w, w.querySelector(".title-bar"), desktop);

      w.addEventListener("mousedown", () => {
        z += 1;
        w.style.zIndex = String(z);
      });
      w.addEventListener("touchstart", () => {
        z += 1;
        w.style.zIndex = String(z);
      });
    });

    // Tabs (98.css)
    Tabs.initTabs98(document.getElementById("win-info"));

    // Warning on title bar controls
    AppWarning.attachControls(desktop, { exclude: ["win-viewer"] });

    // Play CHORD.mp3 when warning modal appears
    const warning = document.getElementById("warning");
    if (warning) {
      const observer = new MutationObserver(() => {
        if (!warning.hidden) {
          W98?.play("chord");
        }
      });
      observer.observe(warning, { attributes: true, attributeFilter: ["hidden"] });
    }

    // Play RECYCLE.mp3 when changing tileset
    const tileBtn = document.getElementById("tile-toggle");
    if (tileBtn) {
      tileBtn.addEventListener("click", () => {
        W98?.play("recycle");
      });
    }

    // Play hide-bar sound when closing/minimizing gallery popup
    if (galleryWin) {
      const controls = galleryWin.querySelector(".title-bar-controls");
      if (controls) {
        const closeBtn = controls.querySelector('button[aria-label="Close"]');
        const minBtn = controls.querySelector('button[aria-label="Minimize"]');

        if (closeBtn) {
          closeBtn.addEventListener("click", () => W98?.play("hideBar"));
        }
        if (minBtn) {
          minBtn.addEventListener("click", () => W98?.play("hideBar"));
        }
      }
    }

    // Play click sound for any other button/object
    document.body.addEventListener("click", (e) => {
      if (
        e.target.closest("button, .slot, a") &&
        !e.target.closest("#win-viewer .title-bar-controls button")
      ) {
        W98?.play("click");
      }
    });
  });
})();
