/**
 * @fileoverview Random logo selector for Quarzite desktop.
 * Picks one of the available logo GIFs at random on page load.
 */
(function () {
  /** @const {string[]} Available logo images */
  const LOGOS = ["assets/quarzitelogo3.gif", "assets/quarzitelogo4.gif"];

  document.addEventListener("DOMContentLoaded", () => {
    const img = document.getElementById("logo-img");
    if (!img) return;

    const index = Math.floor(Math.random() * LOGOS.length);
    img.src = LOGOS[index];
  });
})();
