(function () {
  let lazyImageObserver;

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

  function loadDeferredImage(img) {
    if (!img.dataset.src) return;
    img.src = img.dataset.src;
    delete img.dataset.src;
  }

  function observeDeferredImage(img) {
    if (!("IntersectionObserver" in window)) {
      loadDeferredImage(img);
      return;
    }

    if (!lazyImageObserver) {
      lazyImageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            lazyImageObserver.unobserve(entry.target);
            loadDeferredImage(entry.target);
          });
        },
        { rootMargin: "240px 0px" }
      );
    }

    lazyImageObserver.observe(img);
  }

  function isVideoItem(item) {
    return item && (item.type === "video" || /\.mp4(?:$|[?#])/i.test(item.src));
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
    const eagerCount = Number.isFinite(config.eagerCount) ? config.eagerCount : 0;
    const wrapper = document.createElement("div");
    wrapper.className = config.className || "gallery-item";
    wrapper.dataset.index = String(index);

    if (typeof config.ariaLabel === "function") {
      const label = config.ariaLabel(item, index);
      if (label) {
        wrapper.setAttribute("aria-label", label);
      }
    }

    const eager = index < eagerCount;

    // Boneyard skeleton: render a shimmer-animated bone placeholder
    // that fades out when the image finishes loading.
    let skeleton = null;
    if (
      window.Boneyard &&
      typeof window.Boneyard.createSkeletonSlot === "function"
    ) {
      skeleton = window.Boneyard.createSkeletonSlot(index);
      wrapper.appendChild(skeleton);
    }

    if (isVideoItem(item)) {
      const video = document.createElement("video");
      video.className = "gallery-img-full gallery-video-preview";
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.width = config.width || 200;
      video.height = config.height || 200;
      video.setAttribute(
        "aria-label",
        typeof config.alt === "function"
          ? config.alt(item, index)
          : item.title || `Video ${index + 1}`
      );
      video.src = item.src;
      if (skeleton) skeleton.remove();
      wrapper.appendChild(video);
      return wrapper;
    }

    let lqip = null;

    // Keep LQIP for deferred images, but skip it for above-fold eager images.
    // The eager images load quickly enough that the pixelated preview reads as
    // a loading artifact instead of a useful placeholder.
    if (!eager) {
      lqip = document.createElement("div");
      lqip.className = "lqip-placeholder";
      lqip.setAttribute("aria-hidden", "true");

      const srcMatch = item.src && item.src.match(/([^/]+)\.\w+$/);
      if (srcMatch) {
        const basePath = item.src.substring(0, item.src.lastIndexOf("/") + 1);
        lqip.style.backgroundImage = `url(${basePath}lqip/${srcMatch[1]}-lqip.png)`;
      }
      lqip.style.backgroundSize = "cover";
      lqip.style.backgroundPosition = "center";
      lqip.style.imageRendering = "pixelated";
      wrapper.appendChild(lqip);
    }

    const img = document.createElement("img");
    img.loading = eager ? "eager" : "lazy";
    img.decoding = "async";
    img.fetchPriority = eager ? "high" : "low";
    img.width = config.width || 200;
    img.height = config.height || 200;
    img.className = "gallery-img-full";
    img.alt =
      typeof config.alt === "function"
        ? config.alt(item, index)
        : item.title || `Image ${index + 1}`;
    img.draggable = config.draggable === false ? false : true;

    // Keep the low quality preview until the final image is actually available.
    const fadeLqip = () => {
      if (!lqip) return;
      lqip.style.opacity = "0";
      window.setTimeout(() => {
        if (lqip.parentNode) lqip.hidden = true;
      }, 350);
    };
    const markError = () => {
      wrapper.classList.add("is-image-error");
    };

    // Wire up skeleton + LQIP removal on image load/error.
    if (img.complete && img.naturalWidth) {
      fadeLqip();
      if (skeleton) {
        window.requestAnimationFrame(() =>
          window.Boneyard.attachToGalleryItem(wrapper, img, skeleton)
        );
      }
    } else {
      img.addEventListener("load", fadeLqip, { once: true });
      img.addEventListener("error", markError, { once: true });
      if (skeleton) {
        window.Boneyard.attachToGalleryItem(wrapper, img, skeleton);
      }
    }

    wrapper.appendChild(img);

    if (eager) {
      img.src = item.src;
    } else {
      img.dataset.src = item.src;
      observeDeferredImage(img);
    }

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
    isVideoItem,
    loadGallery,
    normalizeItem,
    renderLoadError,
    renderViewerDescription,
    renderViewerMeta,
  };
})();
