/**
 * @fileoverview Console branding for Quarzite.
 * Displays the Quarzite logo as a CSS background image in the browser console.
 */
const gifAssetUrl = new URL("assets/quarzitelogo4.gif", window.location.href).href;

const styles = [
  `background-image: url(${gifAssetUrl})`,
  "background-size: contain",
  "background-repeat: no-repeat",
  "padding: 248px",
  "font-size: 0",
].join(";");

console.log("%c ", styles);
