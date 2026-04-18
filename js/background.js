/**
 * @fileoverview Background theme utilities for Quarzite.
 * Provides color conversion (hex/RGB/HSL), palette generation, and theme application.
 * @exports window.BackgroundTheme
 */
(function () {
  const BackgroundTheme = {
    /**
     * Convert a hex color string to RGB components.
     * @param {string} hex - Hex color string (3 or 6 digits, with or without #).
     * @returns {{r: number, g: number, b: number}} RGB values (0-255).
     */
    hexToRgb(hex) {
      let value = hex.replace("#", "");
      if (value.length === 3) {
        value = value
          .split("")
          .map((char) => char + char)
          .join("");
      }
      const number = parseInt(value, 16);
      return {
        r: (number >> 16) & 255,
        g: (number >> 8) & 255,
        b: number & 255,
      };
    },

    /**
     * Convert RGB values to HSL color space.
     * @param {number} r - Red (0-255).
     * @param {number} g - Green (0-255).
     * @param {number} b - Blue (0-255).
     * @returns {{h: number, s: number, l: number}} HSL values (h: 0-360, s/l: 0-1).
     */
    rgbToHsl(r, g, b) {
      const red = r / 255;
      const green = g / 255;
      const blue = b / 255;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      let h = 0;
      let s = 0;
      let l = (max + min) / 2;

      if (max !== min) {
        const delta = max - min;
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        switch (max) {
          case red:
            h = (green - blue) / delta + (green < blue ? 6 : 0);
            break;
          case green:
            h = (blue - red) / delta + 2;
            break;
          default:
            h = (red - green) / delta + 4;
            break;
        }
        h /= 6;
      }

      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
      };
    },

    hslToRgb(h, s, l) {
      const hue = h / 360;
      const sat = s / 100;
      const light = l / 100;

      if (sat === 0) {
        const channel = Math.round(light * 255);
        return { r: channel, g: channel, b: channel };
      }

      const q =
        light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
      const p = 2 * light - q;
      const hue2rgb = (innerP, innerQ, t) => {
        let value = t;
        if (value < 0) value += 1;
        if (value > 1) value -= 1;
        if (value < 1 / 6) return innerP + (innerQ - innerP) * 6 * value;
        if (value < 1 / 2) return innerQ;
        if (value < 2 / 3) {
          return innerP + (innerQ - innerP) * (2 / 3 - value) * 6;
        }
        return innerP;
      };

      return {
        r: Math.round(hue2rgb(p, q, hue + 1 / 3) * 255),
        g: Math.round(hue2rgb(p, q, hue) * 255),
        b: Math.round(hue2rgb(p, q, hue - 1 / 3) * 255),
      };
    },

    rgbToHex(r, g, b) {
      return (
        "#" +
        [r, g, b]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")
      );
    },

    adjustLight(hex, delta) {
      const { r, g, b } = BackgroundTheme.hexToRgb(hex);
      const { h, s, l } = BackgroundTheme.rgbToHsl(r, g, b);
      const nextLightness = Math.max(0, Math.min(100, l + delta));
      const color = BackgroundTheme.hslToRgb(h, s, nextLightness);
      return BackgroundTheme.rgbToHex(color.r, color.g, color.b);
    },

    buildSvg(baseHex, sizePx) {
      const size = Math.max(6, Math.round(sizePx));
      const center = size / 2;
      const gridDark = BackgroundTheme.adjustLight(baseHex, -44);
      const edgeDark = BackgroundTheme.adjustLight(baseHex, -18);
      const cTL = BackgroundTheme.adjustLight(baseHex, 36);
      const cTR = BackgroundTheme.adjustLight(baseHex, 14);
      const cBR = BackgroundTheme.adjustLight(baseHex, -10);
      const cBL = BackgroundTheme.adjustLight(baseHex, 6);
      const shadowDepth = Math.max(0.2, size * 0.03);
      const dx = shadowDepth.toFixed(3);
      const dy = shadowDepth.toFixed(3);
      const std = shadowDepth.toFixed(3);

      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'
 viewBox='0 0 ${size} ${size}'>
  <defs>
    <linearGradient id='gTL' x1='${center}' y1='${center}' x2='1' y2='1'>
      <stop offset='0%' stop-color='${cTL}'/>
      <stop offset='100%' stop-color='${edgeDark}'/>
    </linearGradient>
    <linearGradient id='gTR' x1='${center}' y1='${center}' x2='${size - 1}' y2='1'>
      <stop offset='0%' stop-color='${cTR}'/>
      <stop offset='100%' stop-color='${edgeDark}'/>
    </linearGradient>
    <linearGradient id='gBR' x1='${center}' y1='${center}' x2='${size - 1}' y2='${size - 1}'>
      <stop offset='0%' stop-color='${cBR}'/>
      <stop offset='100%' stop-color='${edgeDark}'/>
    </linearGradient>
    <linearGradient id='gBL' x1='${center}' y1='${center}' x2='1' y2='${size - 1}'>
      <stop offset='0%' stop-color='${cBL}'/>
      <stop offset='100%' stop-color='${edgeDark}'/>
    </linearGradient>
    <filter id='f' x='-50%' y='-50%' width='200%' height='200%'>
      <feDropShadow dx='${dx}' dy='${dy}' stdDeviation='${std}'
        flood-color='#000' flood-opacity='0.45'/>
      <feDropShadow dx='-${dx}' dy='-${dy}' stdDeviation='${std}'
        flood-color='#fff' flood-opacity='0.06'/>
    </filter>
  </defs>
  <rect width='${size}' height='${size}' fill='${gridDark}'/>
  <g filter='url(#f)'>
    <polygon points='1,1 ${size - 1},1 ${center},${center}' fill='url(#gTL)'/>
    <polygon points='${size - 1},1 ${size - 1},${size - 1} ${center},${center}' fill='url(#gTR)'/>
    <polygon points='${size - 1},${size - 1} 1,${size - 1} ${center},${center}' fill='url(#gBR)'/>
    <polygon points='1,${size - 1} 1,1 ${center},${center}' fill='url(#gBL)'/>
  </g>
</svg>`;
      return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    },

    applyPattern(hex, size) {
      const dataUrl = BackgroundTheme.buildSvg(hex, size);
      document.documentElement.style.setProperty(
        "--pattern",
        `url("${dataUrl}")`
      );
      document.documentElement.style.setProperty("--tile-size", `${size}px`);
      document.documentElement.style.setProperty(
        "--bg-color",
        BackgroundTheme.adjustLight(hex, -44)
      );
    },
  };

  const THEME = "#8621E7";
  const TILE = 10;

  BackgroundTheme.applyPattern(THEME, TILE);
  window.BackgroundTheme = BackgroundTheme;
})();
