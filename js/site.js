document.addEventListener("DOMContentLoaded", () => {
  renderCatalogGrids();
  hydrateExistingProductCards();
  hydrateProductDetailPage();
  initSearchShortcuts();
  initInlineAddToBagButtons();
  initNewsletterForms();
  initCustomerSignInButtons();
});

function renderCatalogGrids() {
  document.querySelectorAll("[data-catalog-grid]").forEach(grid => {
    const audience = grid.dataset.catalogGrid;
    const limit = Number(grid.dataset.limit || 0);
    let products = window.STUDIO_PRODUCTS || [];

    if (audience && audience !== "all") {
      products = products.filter(product => product.audience.includes(audience));
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
    galleryImages[0].src = window.studioProductImage(product);
    galleryImages[0].alt = `${product.title} front view`;
  }
  if (galleryImages[1]) {
    galleryImages[1].src = window.studioProductImage(product, 1);
    galleryImages[1].alt = `${product.title} detail view`;
  }

  const accordionCopy = document.querySelectorAll(".accordion-content p");
  if (accordionCopy[0]) accordionCopy[0].textContent = product.care;
  if (accordionCopy[1]) accordionCopy[1].textContent = product.sustainability;

  const addButton = document.getElementById("addToBagBtn");
  if (addButton) {
    addButton.dataset.productId = product.id;
    addButton.dataset.productTitle = product.title;
    addButton.dataset.productPrice = product.price;
    addButton.dataset.productImg = window.studioProductImage(product);
  }
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
      addItemToCart(product.id, product.title, product.price, window.studioProductImage(product));
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
    button.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  });
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
