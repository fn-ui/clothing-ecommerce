const STUDIO_PRODUCTS = [
  {
    id: "1",
    title: "Oversized Knit Vest",
    price: 88,
    category: "tops",
    audience: ["women", "men"],
    tag: "New Drop",
    color: "#6c706c",
    accent: "#d8c6ad",
    kicker: "New Drop / Limited Run",
    description: "A soft oversized knit vest with dropped shoulders, deep rib trim, and a relaxed shape designed for easy layering.",
    care: "70% responsible wool, 30% organic cotton. Hand wash cold or dry clean, then dry flat.",
    sustainability: "Made in small batches with responsible yarns and low-waste cutting practices."
  },
  {
    id: "2",
    title: "Straight-Leg Trouser",
    price: 110,
    category: "bottoms",
    audience: ["men", "women"],
    color: "#202225",
    accent: "#b7b0a4",
    kicker: "Core Wardrobe",
    description: "A clean straight-leg trouser with a structured drape, comfortable rise, and polished everyday finish.",
    care: "Machine wash cold, hang dry, and steam to refresh.",
    sustainability: "Cut from durable fabric selected for longevity and reduced replacement waste."
  },
  {
    id: "3",
    title: "Classic Heavy Hoodie",
    price: 95,
    category: "tops",
    audience: ["men", "kids"],
    color: "#34302d",
    accent: "#c2d0c5",
    kicker: "Everyday Essential",
    description: "A heavyweight hoodie with a smooth outer face, brushed interior, and minimal profile for year-round layering.",
    care: "Wash cold with similar colors. Tumble low or hang dry.",
    sustainability: "Produced in responsible cotton fleece with reinforced seams for longer wear."
  },
  {
    id: "4",
    title: "Relaxed Linen Trench",
    price: 145,
    category: "outerwear",
    audience: ["women"],
    tag: "Sale",
    color: "#c9b79f",
    accent: "#f0e7db",
    kicker: "Limited Run",
    description: "A breathable linen trench with a long relaxed line, roomy sleeves, and light structure for transitional weather.",
    care: "Dry clean recommended. Steam between wears.",
    sustainability: "Linen was chosen for durability, breathability, and lower water demand."
  },
  {
    id: "5",
    title: "Tailored Wool Blazer",
    price: 210,
    category: "outerwear",
    audience: ["men", "women"],
    color: "#2f3034",
    accent: "#d7d0c7",
    kicker: "Signature Tailoring",
    description: "A quiet wool blazer with precise shoulders, soft internal structure, and a refined fit over shirts or knits.",
    care: "Dry clean only. Store on a shaped hanger.",
    sustainability: "Made in limited runs to reduce excess inventory and preserve material quality."
  },
  {
    id: "6",
    title: "Relaxed Silk Shirt",
    price: 125,
    category: "tops",
    audience: ["women"],
    color: "#ede5d8",
    accent: "#6f7470",
    kicker: "New Drop",
    description: "A relaxed silk shirt with an easy drape, clean placket, and breathable finish for day-to-evening styling.",
    care: "Hand wash cold or dry clean. Steam on low.",
    sustainability: "Designed as a seasonless piece with careful construction and minimal trims."
  },
  {
    id: "7",
    title: "Premium Mockneck Knit",
    price: 115,
    category: "tops",
    audience: ["men", "women"],
    color: "#dad0bd",
    accent: "#4a4d48",
    kicker: "Soft Structure",
    description: "A warm mockneck knit with compact texture, comfortable stretch, and a clean silhouette under outerwear.",
    care: "Hand wash cold with wool detergent. Dry flat.",
    sustainability: "Knitted to shape where possible to reduce yarn waste."
  },
  {
    id: "8",
    title: "Straight Raw Denim",
    price: 130,
    category: "bottoms",
    audience: ["men", "women"],
    color: "#263144",
    accent: "#b4c0c9",
    kicker: "New Arrivals",
    description: "Straight raw denim with a clean rise and sturdy handfeel, designed to break in naturally over time.",
    care: "Wash cold inside out. Hang dry.",
    sustainability: "Durable construction extends wear and reduces replacement cycles."
  },
  {
    id: "9",
    title: "Kids Cloud Sweatshirt",
    price: 54,
    category: "tops",
    audience: ["kids"],
    tag: "Kids",
    color: "#9fb7bd",
    accent: "#f3d7b6",
    kicker: "Kids Essential",
    description: "A soft sweatshirt with easy movement, ribbed cuffs, and a durable finish for everyday play.",
    care: "Machine wash cold. Tumble low.",
    sustainability: "Made with soft cotton blends selected for comfort and repeat washing."
  }
];

function studioFormatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

function studioProductImage(product, variant = 0) {
  const bg = variant ? product.accent : product.color;
  const garment = variant ? product.color : product.accent;
  const label = product.title.replace(/&/g, "and");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1125" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${bg}"/>
          <stop offset="1" stop-color="#f5f0e8"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="26" stdDeviation="28" flood-color="#1c1713" flood-opacity=".18"/>
        </filter>
      </defs>
      <rect width="900" height="1125" fill="url(#bg)"/>
      <circle cx="720" cy="190" r="120" fill="#ffffff" opacity=".20"/>
      <circle cx="160" cy="930" r="170" fill="#ffffff" opacity=".15"/>
      <g filter="url(#shadow)">
        <path d="M320 285c35-36 73-54 115-54h30c42 0 80 18 115 54l93 88-72 92-62-55v396H361V410l-62 55-72-92 93-88z" fill="${garment}"/>
        <path d="M383 255h134c-9 44-31 67-67 67s-58-23-67-67z" fill="#fff" opacity=".28"/>
        <path d="M361 806h178" stroke="#000" stroke-opacity=".12" stroke-width="12"/>
        <path d="M356 410h188" stroke="#fff" stroke-opacity=".22" stroke-width="10"/>
      </g>
      <text x="64" y="1010" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#2b2118">${label}</text>
      <text x="64" y="1060" font-family="Inter, Arial, sans-serif" font-size="26" fill="#6d6259">${studioFormatPrice(product.price)}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function studioFindProduct(id) {
  return STUDIO_PRODUCTS.find(product => product.id === String(id)) || STUDIO_PRODUCTS[0];
}

window.STUDIO_PRODUCTS = STUDIO_PRODUCTS;
window.studioFormatPrice = studioFormatPrice;
window.studioProductImage = studioProductImage;
window.studioFindProduct = studioFindProduct;
