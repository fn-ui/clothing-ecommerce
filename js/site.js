document.addEventListener("DOMContentLoaded", async () => {
  await hydrateStorefrontProductsFromSupabase();
  renderCatalogGrids();
  document.dispatchEvent(new CustomEvent("studio:products-rendered"));
  hydrateExistingProductCards();
  hydrateProductDetailPage();
  initSearchShortcuts();
  initInlineAddToBagButtons();
  initNewsletterForms();
  initCustomerSignInButtons();
});

async function hydrateStorefrontProductsFromSupabase() {
  if (!window.publicSupabaseClient) return;

  let { data, error } = await window.publicSupabaseClient
    .from("store_products")
    .select(`
      id,
      name,
      slug,
      description,
      price,
      stock,
      featured,
      active,
      audience,
      is_new_arrival,
      store_categories (
        name,
        slug
      ),
      store_product_images (
        image_url,
        is_primary
      ),
      store_product_variants (
        id,
        color,
        color_hex,
        size,
        stock,
        sku,
        image_url
      )
    `)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error && String(error.message || "").includes("store_product_variants")) {
    const fallback = await window.publicSupabaseClient
      .from("store_products")
      .select(`
        id,
        name,
        slug,
        description,
        price,
        stock,
        featured,
        active,
        audience,
        is_new_arrival,
        store_categories (
          name,
          slug
        ),
        store_product_images (
          image_url,
          is_primary
        )
      `)
      .eq("active", true)
      .order("created_at", { ascending: false });

    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data?.length) {
    if (error) console.warn("Storefront product sync unavailable:", error.message);
    return;
  }

  const products = data.map(normalizeStorefrontProduct);

  window.STUDIO_PRODUCTS = products;
  window.studioFindProduct = id =>
    products.find(product => String(product.id) === String(id) || product.slug === String(id)) || products[0];
}

function normalizeStorefrontProduct(product) {
  const images = product.store_product_images || [];
  const primaryImage = images.find(image => image.is_primary) || images[0];
  const secondaryImage = images.find(image => !image.is_primary) || images[1] || primaryImage;
  const category = product.store_categories?.slug || product.store_categories?.name?.toLowerCase() || "uncategorized";
  const variants = Array.isArray(product.store_product_variants) ? product.store_product_variants : [];

  return {
    id: product.id,
    slug: product.slug,
    title: product.name,
    price: Number(product.price || 0),
    category,
    audience: Array.isArray(product.audience) ? product.audience : [],
    tag: product.is_new_arrival ? "New Drop" : product.featured ? "Featured" : "",
    kicker: product.is_new_arrival ? "New Arrival" : product.featured ? "Featured Product" : product.store_categories?.name || "STUDIO_FIT",
    description: product.description || "A curated STUDIO_FIT piece selected for everyday wear.",
    care: "Follow the care label inside the garment. Wash gently and dry flat where possible.",
    sustainability: "Selected for long-term wear and responsible wardrobe building.",
    imageUrl: primaryImage?.image_url || "",
    secondaryImageUrl: secondaryImage?.image_url || primaryImage?.image_url || "",
    variants: variants.map(variant => ({
      id: variant.id,
      color: variant.color,
      colorHex: variant.color_hex || "",
      size: variant.size,
      stock: Number(variant.stock || 0),
      sku: variant.sku || "",
      imageUrl: variant.image_url || ""
    })),
    color: "#6c706c",
    accent: "#d8c6ad"
  };
}

function renderCatalogGrids() {
  document.querySelectorAll("[data-catalog-grid]").forEach(grid => {
    const audience = grid.dataset.catalogGrid;
    const limit = Number(grid.dataset.limit || 0);
    let products = window.STUDIO_PRODUCTS || [];

    if (audience === "new") {
      products = products.filter(product => product.tag === "New Drop");
    } else if (audience === "featured") {
      products = products.filter(product => product.tag === "Featured" || product.tag === "New Drop");
    } else if (audience && audience !== "all") {
      products = products.filter(product => product.audience?.includes(audience));
    }

    if (limit > 0) {
      products = products.slice(0, limit);
    }

    grid.innerHTML = products.map(product => productCardTemplate(product)).join("");
    updateInventoryCount(grid);
  });
}

function hydrateExistingProductCards() {
  document.querySelectorAll(".product-card-link").forEach((card, index) => {
    const idFromHref = new URL(card.getAttribute("href") || "product.html?id=1", window.location.href).searchParams.get("id");
    const idFromButton = card.querySelector("[data-product-id]")?.dataset.productId;
    const product = window.studioFindProduct(idFromHref || idFromButton || String(index + 1));
    applyProductToCard(card, product);
  });

  document.querySelectorAll("img").forEach((image, index) => {
    if (image.getAttribute("src") === "https://unsplash.com" || image.getAttribute("src") === "") {
      const product = window.STUDIO_PRODUCTS[index % window.STUDIO_PRODUCTS.length];
      image.src = window.studioProductImage(product, index % 2);
    }
  });
}

function productCardTemplate(product) {
  const tag = product.tag ? `<span class="product-tag${product.tag === "Sale" ? " sale-tag" : ""}">${product.tag}</span>` : "";
  return `
    <a href="product.html?id=${product.id}" class="product-card-link" data-product-id="${product.id}" data-category="${product.category}" data-price="${product.price}">
      <div class="product-card">
        <div class="product-image-wrapper">
          <img src="${window.studioProductImage(product)}" alt="${product.title}" loading="lazy">
          ${tag}
          <button class="quick-view-trigger-btn add-cart-btn" type="button" data-product-id="${product.id}">Add To Bag</button>
        </div>
        <div class="product-details">
          <h3 class="product-title">${product.title}</h3>
          <span class="product-price">${window.studioFormatPrice(product.price)}</span>
        </div>
      </div>
    </a>`;
}

function applyProductToCard(card, product) {
  card.href = `product.html?id=${product.id}`;
  card.dataset.productId = product.id;
  card.dataset.category = product.category;
  card.dataset.price = product.price;

  const image = card.querySelector("img");
  if (image) {
    image.src = window.studioProductImage(product);
    image.alt = product.title;
    image.loading = "lazy";
  }

  const title = card.querySelector(".product-title");
  if (title) title.textContent = product.title;

  const price = card.querySelector(".product-price");
  if (price) price.textContent = window.studioFormatPrice(product.price);

  const button = card.querySelector(".add-cart-btn, .quick-view-trigger-btn");
  if (button) {
    button.dataset.productId = product.id;
    button.dataset.id = product.id;
    button.dataset.title = product.title;
    button.dataset.price = product.price;
    button.dataset.img = window.studioProductImage(product);
  }
}

function hydrateProductDetailPage() {
  const detailTitle = document.querySelector(".detail-title");
  if (!detailTitle) return;

  const id = new URLSearchParams(window.location.search).get("id") || "1";
  const product = window.studioFindProduct(id);

  document.title = `${product.title} - STUDIO_FIT`;
  setText(".meta-kicker", product.kicker);
  setText(".detail-title", product.title);
  setText(".detail-price", window.studioFormatPrice(product.price));
  setText(".detail-description", product.description);

  const galleryImages = document.querySelectorAll(".product-gallery img");
  if (galleryImages[0]) {
    galleryImages[0].crossOrigin = "anonymous";
    galleryImages[0].src = getCanvasReadableImageUrl(window.studioProductImage(product));
    galleryImages[0].alt = `${product.title} front view`;
  }
  if (galleryImages[1]) {
    galleryImages[1].crossOrigin = "anonymous";
    galleryImages[1].src = getCanvasReadableImageUrl(window.studioProductImage(product, 1));
    galleryImages[1].alt = `${product.title} detail view`;
  }

  const accordionCopy = document.querySelectorAll(".accordion-content p");
  if (accordionCopy[0]) accordionCopy[0].textContent = product.care;
  if (accordionCopy[1]) accordionCopy[1].textContent = product.sustainability;

  hydrateProductVariantSelectors(product);

  const addButton = document.getElementById("addToBagBtn");
  if (addButton) {
    addButton.dataset.productId = product.id;
    addButton.dataset.productTitle = product.title;
    addButton.dataset.productPrice = product.price;
    addButton.dataset.productImg = window.studioProductImage(product);
  }
}

function hydrateProductVariantSelectors(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return;

  const colorGroup = document.querySelector(".color-swatch-group");
  const sizeGrid = document.querySelector(".size-buttons-grid");
  const selectedColorText = document.querySelector(".selector-label .selected-value");
  if (!colorGroup || !sizeGrid) return;

  const colorOptions = getProductColorOptions(variants);
  const sizes = [...new Set(variants.map(variant => variant.size).filter(Boolean))];
  const firstAvailable = variants.find(variant => variant.stock > 0) || variants[0];

  colorGroup.innerHTML = colorOptions.map(option => `
    <button
      class="swatch-btn ${option.color === firstAvailable.color ? "active" : ""}"
      style="background-color: ${option.hex};"
      title="${escapeSiteText(option.color)}"
      data-color-hex="${escapeSiteText(option.hex)}"
      type="button"
    ></button>
  `).join("");

  sizeGrid.innerHTML = sizes.map(size => {
    const matchingVariant = variants.find(variant => variant.color === firstAvailable.color && variant.size === size);
    const disabled = !matchingVariant || matchingVariant.stock <= 0;
    return `<button class="size-box-btn ${size === firstAvailable.size ? "active" : ""} ${disabled ? "disabled" : ""}" type="button">${escapeSiteText(size)}</button>`;
  }).join("");

  if (selectedColorText) selectedColorText.textContent = firstAvailable.color || "";
  applySelectedColorTint(product);
  updateSelectedVariantData(product);
  bindVariantSelectorEvents(product);
}

function getProductColorOptions(variants) {
  const options = new Map();

  variants.forEach(variant => {
    if (!variant.color || options.has(variant.color)) return;
    options.set(variant.color, {
      color: variant.color,
      hex: normalizeHexColor(variant.colorHex) || getVariantSwatchColor(variant.color)
    });
  });

  return [...options.values()];
}

function bindVariantSelectorEvents(product) {
  document.querySelectorAll(".color-swatch-group .swatch-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch-group .swatch-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      const selectedColorText = document.querySelector(".selector-label .selected-value");
      if (selectedColorText) selectedColorText.textContent = button.getAttribute("title") || "";

      updateSizeAvailabilityForColor(product);
      applySelectedColorTint(product);
      updateSelectedVariantData(product);
    });
  });

  document.querySelectorAll(".size-buttons-grid .size-box-btn").forEach(button => {
    if (button.classList.contains("disabled")) return;
    button.addEventListener("click", () => {
      document.querySelectorAll(".size-buttons-grid .size-box-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      updateSelectedVariantData(product);
    });
  });
}

function updateSizeAvailabilityForColor(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const selectedColor = document.querySelector(".color-swatch-group .swatch-btn.active")?.getAttribute("title") || "";
  let activeSizeStillAvailable = false;

  document.querySelectorAll(".size-buttons-grid .size-box-btn").forEach(button => {
    const size = button.textContent.trim();
    const variant = variants.find(item => item.color === selectedColor && item.size === size);
    const disabled = !variant || variant.stock <= 0;
    button.classList.toggle("disabled", disabled);
    if (button.classList.contains("active") && !disabled) activeSizeStillAvailable = true;
  });

  if (!activeSizeStillAvailable) {
    const firstAvailableButton = [...document.querySelectorAll(".size-buttons-grid .size-box-btn")]
      .find(button => !button.classList.contains("disabled"));
    document.querySelectorAll(".size-buttons-grid .size-box-btn").forEach(btn => btn.classList.remove("active"));
    firstAvailableButton?.classList.add("active");
  }
}

function updateSelectedVariantData(product) {
  const addButton = document.getElementById("addToBagBtn");
  if (!addButton) return;

  const selectedColor = document.querySelector(".color-swatch-group .swatch-btn.active")?.getAttribute("title") || "";
  const selectedSize = document.querySelector(".size-buttons-grid .size-box-btn.active")?.textContent.trim() || "";
  const variant = product.variants?.find(item => item.color === selectedColor && item.size === selectedSize);

  addButton.dataset.variantId = variant?.id || "";
  addButton.dataset.variantStock = String(variant?.stock ?? "");
  addButton.dataset.productImg = getTintedProductImage(product);
  addButton.disabled = Boolean(variant && variant.stock <= 0);
  addButton.textContent = variant && variant.stock <= 0 ? "Sold Out" : "Add To Shopping Bag";
}

function applySelectedColorTint(product) {
  const selectedButton = document.querySelector(".color-swatch-group .swatch-btn.active");
  const colorHex = normalizeHexColor(selectedButton?.dataset.colorHex) || getVariantSwatchColor(selectedButton?.getAttribute("title"));
  const frames = document.querySelectorAll(".product-gallery .gallery-image-frame");
  const shouldTint = shouldTintProductImage(product, colorHex);

  frames.forEach(frame => {
    const image = frame.querySelector("img");
    let tintCanvas = frame.querySelector(".product-color-tint");
    if (!tintCanvas) {
      tintCanvas = document.createElement("canvas");
      tintCanvas.className = "product-color-tint";
      frame.appendChild(tintCanvas);
    }

    if (!image || !shouldTint) {
      tintCanvas.style.opacity = "0";
      return;
    }

    recolorGarmentPixels(image, tintCanvas, colorHex);
  });
}

function shouldTintProductImage(product, colorHex) {
  const baseImage = window.studioProductImage(product);
  if (!baseImage || baseImage.includes("hero-studio.svg")) return false;
  return Boolean(colorHex);
}

function getTintedProductImage(product) {
  return window.studioProductImage(product);
}

function getCanvasReadableImageUrl(imageUrl) {
  if (!imageUrl || imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) return imageUrl;

  try {
    const parsedUrl = new URL(imageUrl, window.location.href);
    if (parsedUrl.origin === window.location.origin) return parsedUrl.href;
    return `/api/image-proxy?url=${encodeURIComponent(parsedUrl.href)}`;
  } catch (error) {
    return imageUrl;
  }
}

function normalizeHexColor(value) {
  const color = String(value || "").trim();
  return /^#(?:[0-9a-f]{3}){1,2}$/i.test(color) ? color : "";
}

function recolorGarmentPixels(image, canvas, colorHex) {
  if (!image.complete || !image.naturalWidth) {
    image.addEventListener("load", () => recolorGarmentPixels(image, canvas, colorHex), { once: true });
    return;
  }

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const source = document.createElement("canvas");
  const sourceContext = source.getContext("2d", { willReadFrequently: true });

  source.width = width;
  source.height = height;
  canvas.width = width;
  canvas.height = height;

  try {
    sourceContext.drawImage(image, 0, 0, width, height);
    const imageData = sourceContext.getImageData(0, 0, width, height);
    const data = imageData.data;
    const target = hexToHsl(colorHex);
    const fabricMask = buildGarmentPixelMask(data, width, height);

    if (!target) {
      canvas.style.opacity = "0";
      return;
    }

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];
      const pixelIndex = index / 4;

      if (!fabricMask[pixelIndex]) {
        data[index + 3] = 0;
        continue;
      }

      const original = rgbToHsl(red, green, blue);
      const recolored = hslToRgb(
        target.h,
        Math.max(target.s, 18),
        clamp(original.l * 0.9 + target.l * 0.1, 8, 92)
      );

      data[index] = recolored.r;
      data[index + 1] = recolored.g;
      data[index + 2] = recolored.b;
      data[index + 3] = Math.min(alpha, 172);
    }

    canvas.getContext("2d").putImageData(imageData, 0, 0);
    image.style.filter = "";
    canvas.style.opacity = "1";
  } catch (error) {
    console.warn("Product color recolor unavailable:", error.message);
    image.style.filter = getProductFallbackFilter(colorHex);
    canvas.style.opacity = "0";
  }
}

function buildGarmentPixelMask(data, width, height) {
  const roughMask = new Uint8Array(width * height);
  const cleanMask = new Uint8Array(width * height);

  for (let index = 0; index < data.length; index += 4) {
    const pixelIndex = index / 4;
    roughMask[pixelIndex] = isLikelyGarmentPixel(
      data[index],
      data[index + 1],
      data[index + 2],
      data[index + 3]
    ) ? 1 : 0;
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      if (!roughMask[pixelIndex]) continue;

      let neighbors = 0;

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          neighbors += roughMask[(y + offsetY) * width + x + offsetX];
        }
      }

      cleanMask[pixelIndex] = neighbors >= 4 ? 1 : 0;
    }
  }

  return cleanMask;
}

function getProductFallbackFilter(colorHex) {
  const target = hexToHsl(colorHex);
  if (!target) return "";

  const baseGarmentHue = 205;
  const hueRotate = target.h - baseGarmentHue;
  const saturation = target.s < 12 ? 0.45 : 1.6 + (target.s / 55);
  const brightness = 0.94 + ((target.l - 50) / 320);

  return `saturate(${saturation.toFixed(2)}) hue-rotate(${hueRotate.toFixed(0)}deg) brightness(${brightness.toFixed(2)}) contrast(1.03)`;
}

function isLikelyGarmentPixel(red, green, blue, alpha) {
  if (alpha < 24) return false;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const range = max - min;
  const lightness = ((max + min) / 2 / 255) * 100;
  const blueDominance = blue - Math.max(red, green);
  const warmDominance = Math.max(red, green) - blue;

  if (min > 218) return false;
  if (lightness > 91 && range < 44) return false;
  if (lightness > 84 && range < 18) return false;
  if (lightness < 8) return false;
  if (warmDominance > 18 && lightness > 58) return false;

  return blueDominance > -18 || (range > 14 && lightness < 86);
}

function hexToHsl(hexColor) {
  let hex = normalizeHexColor(hexColor).replace("#", "");
  if (!hex) return null;

  if (hex.length === 3) {
    hex = hex.split("").map(char => char + char).join("");
  }

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;

  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100
  };
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;

  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100
  };
}

function hslToRgb(hue, saturation, lightness) {
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getVariantSwatchColor(color) {
  const palette = {
    "carbon grey": "#5A5D64",
    "gray": "#6b7280",
    "grey": "#6b7280",
    "midnight black": "#1A1C1E",
    "black": "#111827",
    "oatmeal cream": "#E3DEC3",
    "cream": "#E3DEC3",
    "white": "#f8fafc",
    "blue": "#2563eb",
    "red": "#dc2626",
    "green": "#16a34a"
  };

  return palette[String(color || "").trim().toLowerCase()] || "#9fb7bd";
}

function escapeSiteText(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function initSearchShortcuts() {
  document.querySelectorAll("#searchInput").forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && input.value.trim()) {
        window.location.href = `collection.html?search=${encodeURIComponent(input.value.trim())}`;
      }
    });
  });
}

function initInlineAddToBagButtons() {
  document.addEventListener("click", event => {
    const button = event.target.closest(".add-cart-btn");
    if (!button || button.closest("#quickviewModalOverlay")) return;

    event.preventDefault();
    event.stopPropagation();

    const product = window.studioFindProduct(button.dataset.productId || button.dataset.id);
    if (typeof addItemToCart === "function") {
      const defaultVariant = product.variants?.find(variant => variant.stock > 0) || product.variants?.[0];
      const added = addItemToCart(product.id, product.title, product.price, window.studioProductImage(product), {
        variantId: defaultVariant?.id || "",
        color: defaultVariant?.color || product.kicker || product.category || "Default",
        size: defaultVariant?.size || "Standard"
      });
      if (!added) return;

      button.textContent = "Added";
      setTimeout(() => {
        button.textContent = "Add To Bag";
      }, 1200);
    }
  });
}

function initNewsletterForms() {
  document.querySelectorAll(".newsletter-form").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      const input = form.querySelector('input[type="email"]');
      const button = form.querySelector("button");
      const email = input?.value.trim().toLowerCase();

      if (!email) return;

      if (button) {
        button.disabled = true;
        button.textContent = "Joining...";
      }

      try {
        if (!window.publicSupabaseClient) {
          throw new Error("Newsletter service is not connected yet.");
        }

        const { error } = await window.publicSupabaseClient
          .from("store_newsletter")
          .insert({ email });

        if (error) throw error;

        input.value = "";
        showSiteToast("Subscribed successfully.");
      } catch (error) {
        showSiteToast(error.message || "Newsletter signup failed.", true);
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "Subscribe";
        }
      }
    });
  });
}

function initCustomerSignInButtons() {
  document.querySelectorAll("#accountToggleBtn").forEach(button => {
    const customer = getStoredCustomerForHeader();
    button.onclick = null;
    button.textContent = customer ? "Account" : "Sign In";
    button.setAttribute(
      "aria-label",
      customer ? `Open account for ${customer.fullName || customer.email}` : "Sign in"
    );

    button.addEventListener("click", () => {
      window.location.href = customer ? "account.html" : "login.html";
    });
  });
}

function getStoredCustomerForHeader() {
  if (window.STUDIO_CUSTOMER?.getCurrentCustomer) {
    return window.STUDIO_CUSTOMER.getCurrentCustomer();
  }

  try {
    const parsed = JSON.parse(localStorage.getItem("studioFitCustomer"));
    return parsed && parsed.email ? parsed : null;
  } catch (error) {
    return null;
  }
}

function showSiteToast(message, isError = false) {
  const toast = document.getElementById("toastNotification");
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.style.background = isError ? "rgba(127, 29, 29, .96)" : "";
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.style.background = "";
  }, 2600);
}

function updateInventoryCount(grid) {
  const counter = document.querySelector(".product-inventory-count");
  if (counter) counter.textContent = `${grid.children.length} Items`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}
