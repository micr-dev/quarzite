const gifAssetUrl = new URL("assets/quarzite-logo.gif", window.location.href).href;

const styles = [
  `background-image: url(${gifAssetUrl})`,
  "background-size: contain",
  "background-repeat: no-repeat",
  "padding: 248px",
  "font-size: 0",
].join(";");

console.log("%c ", styles);
