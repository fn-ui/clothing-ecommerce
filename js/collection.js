// 1. Filter Slider Trigger Drawer Panel Controls
const filterToggleBtn = document.getElementById('filterToggleBtn');
const filterDrawer = document.getElementById('filterDrawer');
if (filterToggleBtn && filterDrawer) {
  filterToggleBtn.addEventListener('click', () => {
    filterDrawer.classList.toggle('is-open');
    filterToggleBtn.classList.toggle('active');
  });
}

// 2. Real-Time Product Grid Filtering & Text Search Logic
const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
const productCards = document.querySelectorAll('.product-grid .product-card-link');
const inventoryCountText = document.querySelector('.product-inventory-count');
const searchInput = document.getElementById('searchInput');

function applyFiltersAndSearch() {
  const activeFilters = Array.from(categoryCheckboxes).filter(i => i.checked).map(i => i.value);
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  let visibleCount = 0;

  productCards.forEach(card => {
    const cardCategory = card.getAttribute('data-category');
    const productTitleText = card.querySelector('.product-title').textContent.toLowerCase();
    const matchesCategory = activeFilters.length === 0 || activeFilters.includes(cardCategory);
    const matchesSearch = productTitleText.includes(searchTerm);

    if (matchesCategory && matchesSearch) {
      card.style.display = 'block';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
  if (inventoryCountText) {
    inventoryCountText.textContent = visibleCount + " Items";
  }
}

if (categoryCheckboxes) {
  categoryCheckboxes.forEach(checkbox => checkbox.addEventListener('change', applyFiltersAndSearch));
}
if (searchInput) {
  searchInput.addEventListener('input', applyFiltersAndSearch);
}

// 3. Real-Time Product Grid Sorting System Logic
const sortSelect = document.getElementById('sortSelect');
const productGrid = document.getElementById('productGrid');
if (sortSelect && productGrid) {
  sortSelect.addEventListener('change', () => {
    const selectedValue = sortSelect.value;
    const cardsArray = Array.from(productCards);
    cardsArray.sort((cardA, cardB) => {
      const priceA = parseFloat(cardA.getAttribute('data-price'));
      const priceB = parseFloat(cardB.getAttribute('data-price'));
      if (selectedValue === 'price-low') return priceA - priceB;
      if (selectedValue === 'price-high') return priceB - priceA;
      return 0;
    });
    productGrid.innerHTML = '';
    cardsArray.forEach(card => productGrid.appendChild(card));
  });
}

// 4. Pop-up Quick View Modal Database Mapping Logic
const productMockDatabase = {
  "1": { title: "Oversized Knit Vest", price: "$88.00", img: "https://unsplash.com" },
  "2": { title: "Straight-Leg Trouser", price: "$110.00", img: "https://unsplash.com" },
  "3": { title: "Classic Heavy Hoodie", price: "$95.00", img: "https://unsplash.com" },
  "4": { title: "Relaxed Linen Trench", price: "$145.00", img: "https://unsplash.com" },
  "5": { title: "Tailored Wool Blazer", price: "$210.00", img: "https://unsplash.com" },
  "6": { title: "Relaxed Silk Shirt", price: "$125.00", img: "https://unsplash.com" },
  "7": { title: "Premium Mockneck Knit", price: "$115.00", img: "https://unsplash.com" },
  "8": { title: "Straight Raw Denim", price: "$130.00", img: "https://unsplash.com" }
};

const quickViewButtons = document.querySelectorAll('.quick-view-trigger-btn');
const quickviewModalOverlay = document.getElementById('quickviewModalOverlay');
const closeQuickviewBtn = document.getElementById('closeQuickviewBtn');
const modalImage = document.getElementById('modalProductImage');
const modalTitle = document.getElementById('modalProductTitle');
const modalPrice = document.getElementById('modalProductPrice');
const modalAddToBagBtn = document.getElementById('modalAddToBagBtn');
const modalViewDetailsLink = document.getElementById('modalViewDetailsLink');

let currentActiveModalProductId = "1"; 

if (quickViewButtons && quickviewModalOverlay) {
  quickViewButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const productId = button.getAttribute('data-product-id');
      currentActiveModalProductId = productId; 
      const productData = productMockDatabase[productId];
      if (productData) {
        if (modalImage) { modalImage.src = productData.img; modalImage.alt = productData.title; }
        if (modalTitle) modalTitle.textContent = productData.title;
        if (modalPrice) modalPrice.textContent = productData.price;
        if (modalViewDetailsLink) modalViewDetailsLink.href = "product.html?id=" + productId;
        quickviewModalOverlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
      }
    });
  });
}

if (closeQuickviewBtn && quickviewModalOverlay) {
  const closeQuickviewModal = () => { quickviewModalOverlay.classList.remove('is-active'); document.body.style.overflow = ''; };
  closeQuickviewBtn.addEventListener('click', closeQuickviewModal);
  quickviewModalOverlay.addEventListener('click', (e) => { if (e.target === quickviewModalOverlay) closeQuickviewModal(); });
}

if (modalAddToBagBtn) {
  modalAddToBagBtn.addEventListener('click', () => {
    if (typeof addItemToCart === 'function') {
      const dbData = productMockDatabase[currentActiveModalProductId];
      addItemToCart(currentActiveModalProductId, dbData.title, dbData.price, dbData.img);
      modalAddToBagBtn.textContent = 'Added ✓';
      setTimeout(() => { modalAddToBagBtn.textContent = 'Add To Shopping Bag'; }, 1200);
    }
  });
}

// 5. Auth Account Registration / Sign In Pop-Up Controls
const accountToggleBtn = document.getElementById('accountToggleBtn');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authModalOverlay = document.getElementById('authModalOverlay');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginPanel = document.getElementById('loginPanel');
const registerPanel = document.getElementById('registerPanel');

if (accountToggleBtn && authModalOverlay) {
  accountToggleBtn.addEventListener('click', () => {
    authModalOverlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  });
}

if (closeAuthBtn && authModalOverlay) {
  const closeAuthPortal = () => { authModalOverlay.classList.remove('is-active'); document.body.style.overflow = ''; };
  closeAuthBtn.addEventListener('click', closeAuthPortal);
  authModalOverlay.addEventListener('click', (e) => { if (e.target === authModalOverlay) closeAuthPortal(); });
}

if (tabLoginBtn && tabRegisterBtn) {
  tabLoginBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.remove('active'); tabLoginBtn.classList.add('active');
    registerPanel.classList.add('is-hidden'); loginPanel.classList.remove('is-hidden');
  });
  tabRegisterBtn.addEventListener('click', () => {
    tabLoginBtn.classList.remove('active'); tabRegisterBtn.classList.add('active');
    loginPanel.classList.add('is-hidden'); registerPanel.classList.remove('is-hidden');
  });
}
