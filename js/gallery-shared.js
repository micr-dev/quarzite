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

  function toText(value) {
    if (value == null) return "";
    return typeof value === "string" ? value : String(value);
  }

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

  function resolveAssetPath(src, prefix) {
    const value = toText(src).trim();
    if (!value) return "";
    if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("/")) {
      return value;
    }
    return `${prefix || ""}${value}`;
  }

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

  function sortImagesByDate(items) {
    return items.slice().sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
  }

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

  function renderLoadError(target, message) {
    const notice = document.createElement("div");
    notice.className = "gallery-error";
    notice.style.padding = "16px";
    notice.style.textAlign = "center";
    notice.textContent = message || "Unable to load gallery.";
    target.replaceChildren(notice);
  }

  function shouldShowArtist(name, hideUnknownArtist) {
    const value = toText(name).trim();
    if (!value) return false;
    if (hideUnknownArtist && /^(unknown|-|unknown artist)$/i.test(value)) {
      return false;
    }
    return true;
  }

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
