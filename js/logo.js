(function () {
  const LOGOS = ["assets/quarzitelogo3.gif", "assets/quarzitelogo4.gif"];

  document.addEventListener("DOMContentLoaded", () => {
    const img = document.getElementById("logo-img");
    if (!img) return;

    const index = Math.floor(Math.random() * LOGOS.length);
    img.src = LOGOS[index];
  });
})();
