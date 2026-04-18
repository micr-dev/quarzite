/**
 * @fileoverview Shared gallery utilities for Quarzite desktop and mobile views.
 * Provides HTML sanitization, URL validation, date formatting, gallery loading,
 * image item creation, and viewer metadata/description rendering.
 * @exports window.GalleryShared
 */
(function () {
  const ALLOWED_RICH_TEXT_TAGS = new Set([
    "a",
    "b",
    "br",
    "em",
    "i",
    "li",
    "ol",
    "p",
    "s",
    "strong",
    "ul",
  ]);

  /**
   * Safely convert any value to a string.
   * @param {*} value - The value to convert.
   * @returns {string} The string representation, or empty string for null/undefined.
   */
  function toText(value) {
    if (value == null) return "";
    return typeof value === "string" ? value : String(value);
  }

  /**
   * Validate and sanitize a URL, allowing only http, https, and mailto protocols.
   * @param {*} value - The URL to sanitize.
   * @returns {string} The validated URL string, or empty string if invalid.
   */
  function sanitizeUrl(value) {
    const href = toText(value).trim();
    if (!href) return "";

    try {
      const parsed = new URL(href, window.location.href);
      if (
        parsed.protocol === "http:" ||
        parsed.protocol === "https:" ||
        parsed.protocol === "mailto:"
      ) {
        return parsed.href;
      }
    } catch (_) {
      if (href.startsWith("/") || href.startsWith("#")) {
        return href;
      }
    }

    return "";
  }

  /**
   * Recursively sanitize a DOM node, removing disallowed tags and dangerous attributes.
   * @param {Node} node - The DOM node to sanitize.
   * @param {Document} doc - The document context.
   */
  function sanitizeNode(node, doc) {
    if (node.nodeType === Node.TEXT_NODE) {
      return doc.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return doc.createDocumentFragment();
    }

    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) {
      const fragment = doc.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => {
        fragment.appendChild(sanitizeNode(child, doc));
      });
      return fragment;
    }

    const clean = doc.createElement(tag);
    if (tag === "a") {
      const href = sanitizeUrl(node.getAttribute("href"));
      if (!href) {
        const fragment = doc.createDocumentFragment();
        Array.from(node.childNodes).forEach((child) => {
          fragment.appendChild(sanitizeNode(child, doc));
        });
        return fragment;
      }

      clean.href = href;
      if (node.getAttribute("target") === "_blank") {
        clean.target = "_blank";
      }
      clean.rel = "noopener noreferrer";
    }

    Array.from(node.childNodes).forEach((child) => {
      clean.appendChild(sanitizeNode(child, doc));
    });

    return clean;
  }

  /**
   * Render sanitized rich HTML into a target element.
   * Strips all tags except a whitelist of safe inline/block elements.
   * @param {HTMLElement} target - The container element.
   * @param {string} html - The raw HTML string to sanitize and render.
   */
  function renderRichText(target, html) {
    const doc = target.ownerDocument;
    const parser = new DOMParser();
    const parsed = parser.parseFromString(toText(html), "text/html");
    const fragment = doc.createDocumentFragment();

    Array.from(parsed.body.childNodes).forEach((child) => {
      fragment.appendChild(sanitizeNode(child, doc));
    });

    target.replaceChildren(fragment);
  }

  /**
   * Format a date value into a localized human-readable string.
   * @param {string|Date} value - The date to format.
   * @returns {string} Formatted date string (e.g. "Jan 15, 2025"), or empty string.
   */
  function formatDate(value) {
    if (!value) return null;

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    return value;
  }

  /**
   * Resolve an image asset path, prepending a prefix if the src is relative.
   * @param {string} src - The image source path.
   * @param {string} prefix - The prefix to prepend for relative paths.
   * @returns {string} The resolved absolute or prefixed path.
   */
  function resolveAssetPath(src, prefix) {
    const value = toText(src).trim();
    if (!value) return "";
    if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("/")) {
      return value;
    }
    return `${prefix || ""}${value}`;
  }

  /**
   * Normalize a gallery item object, resolving asset paths and extracting metadata.
   * @param {Object} item - Raw gallery item from JSON.
   * @param {Object} options - Options including srcPrefix.
   * @returns {Object} Normalized item with resolved src, artist, date, and desc.
   */
  function normalizeItem(item, options) {
    const config = options || {};
    const source =
      typeof item === "string"
        ? { src: item }
        : item && typeof item === "object"
          ? item
          : {};
    const artist =
      source.artist && typeof source.artist === "object" ? source.artist : {};

    return {
      ...source,
      src: resolveAssetPath(source.src, config.srcPrefix),
      title: toText(source.title).trim(),
      date: toText(source.date).trim(),
      desc: toText(source.desc),
      artist: {
        name: toText(artist.name).trim(),
        url: toText(artist.url).trim(),
      },
    };
  }

  /**
   * Sort gallery items by date in descending order (newest first).
   * @param {Object[]} items - Array of gallery items with date fields.
   * @returns {Object[]} The sorted array.
   */
  function sortImagesByDate(items) {
    return items.slice().sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
  }

  /**
   * Fetch and parse a gallery JSON file, normalizing and sorting items.
   * @async
   * @param {string} url - URL to the gallery JSON file.
   * @param {Object} [options] - Options passed to normalizeItem (e.g. srcPrefix).
   * @returns {Promise<Object[]>} Array of normalized gallery items, newest first.
   */
  async function loadGallery(url, options) {
    let response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch (_) {
      throw new Error("Unable to reach the gallery data.");
    }

    if (!response.ok) {
      throw new Error(`Unable to load the gallery (${response.status}).`);
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error("Gallery data is not valid JSON.");
    }

    if (!data || !Array.isArray(data.images)) {
      throw new Error("Gallery data is missing an images array.");
    }

    return sortImagesByDate(
      data.images.map((item) => normalizeItem(item, options))
    );
  }

  /**
   * Create a DOM element for a gallery image item.
   * @param {Object} item - Normalized gallery item.
   * @param {number} index - Index in the gallery array.
   * @param {Object} options - Config: className, alt, ariaLabel, draggable.
   * @returns {HTMLElement} The gallery item element with data-index attribute.
   */
  function createGalleryItem(item, index, options) {
    const config = options || {};
    const wrapper = document.createElement("div");
    wrapper.className = config.className || "gallery-item";
    wrapper.dataset.index = String(index);

    if (typeof config.ariaLabel === "function") {
      const label = config.ariaLabel(item, index);
      if (label) {
        wrapper.setAttribute("aria-label", label);
      }
    }

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = item.src;
    img.alt =
      typeof config.alt === "function"
        ? config.alt(item, index)
        : item.title || `Image ${index + 1}`;
    img.draggable = config.draggable === false ? false : true;
    wrapper.appendChild(img);

    return wrapper;
  }

  /**
   * Render an error message into a target element when gallery loading fails.
   * @param {HTMLElement} target - The container to show the error in.
   * @param {string} message - The error message to display.
   */
  function renderLoadError(target, message) {
    const notice = document.createElement("div");
    notice.className = "gallery-error";
    notice.style.padding = "16px";
    notice.style.textAlign = "center";
    notice.textContent = message || "Unable to load gallery.";
    target.replaceChildren(notice);
  }

  /**
   * Determine whether to display the artist name.
   * @param {string} name - The artist name.
   * @param {boolean} hideUnknownArtist - Whether to hide unknown/empty artists.
   * @returns {boolean} True if the artist name should be shown.
   */
  function shouldShowArtist(name, hideUnknownArtist) {
    const value = toText(name).trim();
    if (!value) return false;
    if (hideUnknownArtist && /^(unknown|-|unknown artist)$/i.test(value)) {
      return false;
    }
    return true;
  }

  /**
   * Render viewer metadata (artist, date, separator) into a target element.
   * @param {HTMLElement} target - The metadata container.
   * @param {Object} options - Config: artistFirst, artistName, artistPrefix, artistUrl, dateText, separator, hideUnknownArtist.
   */
  function renderViewerMeta(target, options) {
    const config = options || {};
    const dateText = toText(config.dateText).trim();
    const artistName = toText(config.artistName).trim();
    const artistUrl = sanitizeUrl(config.artistUrl);
    const separator = toText(config.separator || " ");
    const artistPrefix = toText(config.artistPrefix);
    const artistFirst = Boolean(config.artistFirst);
    const hideUnknownArtist = Boolean(config.hideUnknownArtist);
    const parts = [];

    function makeArtistPart() {
      if (!shouldShowArtist(artistName, hideUnknownArtist)) return null;

      const fragment = document.createDocumentFragment();
      if (artistPrefix) {
        fragment.appendChild(document.createTextNode(artistPrefix));
      }

      if (artistUrl) {
        const link = document.createElement("a");
        link.href = artistUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = artistName;
        fragment.appendChild(link);
      } else {
        fragment.appendChild(document.createTextNode(artistName));
      }

      return fragment;
    }

    const artistPart = makeArtistPart();
    if (artistFirst && artistPart) {
      parts.push(artistPart);
    }
    if (dateText) {
      parts.push(document.createTextNode(dateText));
    }
    if (!artistFirst && artistPart) {
      parts.push(artistPart);
    }

    target.replaceChildren();
    parts.forEach((part, index) => {
      if (index > 0) {
        target.appendChild(document.createTextNode(separator));
      }
      target.appendChild(part);
    });
    target.hidden = parts.length === 0;
  }

  /**
   * Render sanitized rich text description into a viewer description element.
   * @param {HTMLElement} target - The description container.
   * @param {string} html - Raw HTML description to sanitize and render.
   */
  function renderViewerDescription(target, html) {
    const content = toText(html).trim();
    if (!content) {
      target.replaceChildren();
      target.hidden = true;
      return;
    }

    renderRichText(target, content);
    target.hidden = false;
  }

  window.GalleryShared = {
    createGalleryItem,
    formatDate,
    loadGallery,
    normalizeItem,
    renderLoadError,
    renderViewerDescription,
    renderViewerMeta,
  };
})();
