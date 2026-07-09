// Dynamic product page renderer for product.html
// Supports: product.html?id=1..8

(() => {
  const PRODUCT_MAP = {
    "1": {
      title: "Oversized Knit Vest",
      price: 88.0,
      currency: "$",
      kicker: "New Drop / Limited Run",
      description:
        "Crafted from a premium heavy-blend ethical wool composite, this oversized knit vest features dropped shoulder frames, deep ribbed trim detailing, and a clean, relaxed silhouette tailored to layer effortlessly over structural shirts or heavy fleeces.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Carbon Grey", color: "#5A5D64" },
      galleryAlt1: "Oversized Wool Vest Front View",
      galleryAlt2: "Oversized Wool Vest Styling Angle",
      compositionCare:
        "70% Responsible Sourced Wool, 30% Organic Cotton. Dry clean only or gentle hand wash cold with luxury wool detergent. Reshape while damp and dry flat away from direct sunlight.",
      sustainability:
        "Produced using completely ethical manufacturing processes certified by the Global Organic Textile Standard (GOTS). Fabricated in low-waste, renewable energy-powered facilities with safe, fair labor practices."
    },
    "2": {
      title: "Straight-Leg Trouser",
      price: 110.0,
      currency: "$",
      kicker: "New Drop / Limited Run",
      description:
        "Tailored for everyday structure: a straight-leg profile with a clean drape and breathable comfort. Designed to elevate minimal outfits with effortless movement.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Midnight Black", color: "#1A1C1E" },
      galleryAlt1: "Tailored Trouser Front View",
      galleryAlt2: "Tailored Trouser Styling Angle",
      compositionCare:
        "A balanced blend engineered for comfort and shape retention. Machine wash cold on gentle cycle; hang dry; steam to refresh.",
      sustainability:
        "Built with low-impact processes and responsible inputs. Produced with an emphasis on reduced waste and ethical manufacturing standards."
    },
    "3": {
      title: "Classic Heavy Hoodie",
      price: 95.0,
      currency: "$",
      kicker: "New Drop / Limited Run",
      description:
        "A heavyweight hoodie with a refined silhouette and cozy handfeel. Soft inside, structured outside—made for layering through every season.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Jet Black", color: "#000000" },
      galleryAlt1: "Classic Heavy Hoodie Front View",
      galleryAlt2: "Classic Heavy Hoodie Styling Angle",
      compositionCare:
        "Wash cold with similar colors. Avoid harsh detergents; tumble low or hang to dry. Steam to restore the original shape.",
      sustainability:
        "Designed with responsible sourcing and mindful production practices to keep materials and labor aligned with our standards."
    },
    "4": {
      title: "Relaxed Linen Trench",
      price: 145.0,
      currency: "$",
      kicker: "Limited Run",
      description:
        "A relaxed linen trench with breathable movement and a clean, modern line. Lightweight enough for layering yet structured for a polished finish.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Oatmeal Cream", color: "#E3DEC3" },
      galleryAlt1: "Relaxed Linen Trench Front View",
      galleryAlt2: "Relaxed Linen Trench Styling Angle",
      compositionCare:
        "Dry clean recommended. For freshening, steam and spot clean as needed; air dry away from direct sunlight.",
      sustainability:
        "Produced with ethical manufacturing practices and reduced-waste principles. Linen chosen for breathability and longevity."
    },
    "5": {
      title: "Tailored Wool Blazer",
      price: 210.0,
      currency: "$",
      kicker: "Signature Tailoring",
      description:
        "A tailored wool blazer with an elevated fit and clean construction. Built for formal ease and minimalist styling.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Midnight Black", color: "#1A1C1E" },
      galleryAlt1: "Tailored Wool Blazer Front View",
      galleryAlt2: "Tailored Wool Blazer Styling Angle",
      compositionCare:
        "Dry clean only. Store on a hanger and steam gently between wears.",
      sustainability:
        "Manufactured with responsible inputs and careful quality control to minimize waste and support fair labor practices."
    },
    "6": {
      title: "Relaxed Silk Shirt",
      price: 125.0,
      currency: "$",
      kicker: "New Drop",
      description:
        "A relaxed silk shirt with a soft drape and smooth finish. Lightweight, breathable, and styled for modern uniform dressing.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Carbon Grey", color: "#5A5D64" },
      galleryAlt1: "Relaxed Silk Shirt Front View",
      galleryAlt2: "Relaxed Silk Shirt Styling Angle",
      compositionCare:
        "Hand wash cold or dry clean. Lay flat to dry and steam on low.",
      sustainability:
        "Chosen for quality and longevity with ethical manufacturing considerations and reduced-impact production steps."
    },
    "7": {
      title: "Premium Mockneck Knit",
      price: 115.0,
      currency: "$",
      kicker: "New Drop",
      description:
        "A premium mockneck knit engineered for warmth without bulk. Minimal lines, elevated texture, and easy layering.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Oatmeal Cream", color: "#E3DEC3" },
      galleryAlt1: "Premium Mockneck Knit Front View",
      galleryAlt2: "Premium Mockneck Knit Styling Angle",
      compositionCare:
        "Hand wash cold with wool detergent. Dry flat; reshape while damp; avoid direct sunlight.",
      sustainability:
        "Crafted with responsible materials and ethical production processes aligned with our sustainability goals."
    },
    "8": {
      title: "Straight Raw Denim",
      price: 130.0,
      currency: "$",
      kicker: "New Arrivals",
      description:
        "Straight raw denim with a clean structure and comfortable rise. Designed to break in beautifully and style effortlessly.",
      img1: "https://unsplash.com",
      img2: "https://unsplash.com",
      defaultColor: { label: "Midnight Black", color: "#1A1C1E" },
      galleryAlt1: "Straight Raw Denim Front View",
      galleryAlt2: "Straight Raw Denim Styling Angle",
      compositionCare:
        "Machine wash cold inside out. Hang dry; minimal heat to preserve fabric integrity.",
      sustainability:
        "Produced using responsible manufacturing practices with an emphasis on reduced waste and consistent quality."
    }
  };

  function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '1';
  }

  function fmtPrice(price) {
    const rounded = Number(price) || 0;
    return `$${rounded.toFixed(2)}`;
  }

  function safeSetText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function safeSetAttr(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function safeSetStyle(selector, prop, value) {
    const el = document.querySelector(selector);
    if (el) el.style[prop] = value;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const productId = getProductId();
    const product = PRODUCT_MAP[productId] || PRODUCT_MAP['1'];

    // Map header + hero text
    safeSetText('.meta-kicker', product.kicker);
    safeSetText('.detail-title', product.title);
    safeSetText('.detail-price', fmtPrice(product.price).replace('$', '$'));
    safeSetText('.detail-description', product.description);

    // Map gallery images
    // product.html currently has two .gallery-image-frame img elements
    const galleryImgs = document.querySelectorAll('.product-gallery img');
    if (galleryImgs[0]) {
      galleryImgs[0].src = product.img1;
      galleryImgs[0].alt = product.galleryAlt1;
    }
    if (galleryImgs[1]) {
      galleryImgs[1].src = product.img2;
      galleryImgs[1].alt = product.galleryAlt2;
    }

    // Update accordion content if present
    const accordionItems = document.querySelectorAll('.accordion-item .accordion-content p');
    if (accordionItems[0]) accordionItems[0].textContent = product.compositionCare;
    if (accordionItems[1]) accordionItems[1].textContent = product.sustainability;

    // Update swatch active color + selected label
    const selectedValue = document.querySelector('.selector-label .selected-value');
    if (selectedValue) selectedValue.textContent = product.defaultColor.label;

    const swatches = document.querySelectorAll('.color-swatch-group .swatch-btn');
    swatches.forEach(btn => {
      btn.classList.remove('active');
    });
    // Prefer matching by title
    swatches.forEach(btn => {
      const t = btn.getAttribute('title') || '';
      if (t.toLowerCase().includes(product.defaultColor.label.toLowerCase().split(' ')[0].toLowerCase())) {
        btn.classList.add('active');
      }
    });

    // Ensure Add-to-bag button uses correct product data
    // Replace the click handler by setting dataset + using a small delegation
    const addBtn = document.getElementById('addToBagBtn');
    if (addBtn) {
      addBtn.dataset.productId = productId;
      addBtn.dataset.productTitle = product.title;
      addBtn.dataset.productPrice = String(product.price);
      addBtn.dataset.productImg = product.img1;
    }

    // Note: product.html's Add-to-Bag click handler now reads dataset.productId/productTitle/productPrice/productImg,
    // so this dynamic renderer sets those datasets (done above).
  });
})();


