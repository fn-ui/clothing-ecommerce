// ===============================
// STUDIO_FIT CART SYSTEM
// ===============================

// Get cart from localStorage
function getCartItems() {
  return JSON.parse(localStorage.getItem('studioFitCart')) || [];
}

// Save cart + refresh UI
function saveCartItems(cartArray) {
  localStorage.setItem('studioFitCart', JSON.stringify(cartArray));
  syncCartUI();
}

// Count total quantity
function getCartQuantity() {
  const items = getCartItems();

  return items.reduce((total, item) => {
    return total + item.quantity;
  }, 0);
}

// ===============================
// ADD TO CART
// ===============================
function addItemToCart(id, title, price, img) {

  const cartItems = getCartItems();

  const numericalPrice =
    typeof price === "string"
      ? parseFloat(price.replace(/[^0-9.]/g, ''))
      : price;

  const existingItem = cartItems.find(item => String(item.id) === String(id));

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({
      id: String(id),
      title,
      price: numericalPrice,
      img,
      quantity: 1
    });
  }

  saveCartItems(cartItems);

 // Modern toast notification
const toast = document.getElementById('toastNotification');

if (toast) {
  toast.textContent = `${title} added to bag ✓`;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}
}
// ===============================
// UPDATE UI
// ===============================
function syncCartUI() {

  const openCartBtn = document.getElementById('openCartBtn');

  const cartCountIndicator =
    document.getElementById('cartCount');

  const drawerItemsList =
    document.querySelector('.drawer-items-list');

  const subtotalAmountIndicator =
    document.querySelector('.subtotal-amount');

  const checkoutButton =
    document.querySelector('.btn-checkout-solid');

  const cartItems = getCartItems();

  const totalQuantity = getCartQuantity();

  // HEADER BAG COUNT
  if (openCartBtn) {
    openCartBtn.textContent = `Bag (${totalQuantity})`;
  }

  // DRAWER COUNT
  if (cartCountIndicator) {
    cartCountIndicator.textContent = totalQuantity;
  }

  // No drawer on some pages
  if (!drawerItemsList) return;

  // EMPTY STATE
  if (cartItems.length === 0) {

    drawerItemsList.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:#767677;">
        <p style="font-size: 1rem; margin-bottom: 8px;">
          Your shopping bag is empty.
        </p>

        <p style="font-size: 0.85rem;">
          Discover our collections to add items.
        </p>
      </div>
    `;

    if (subtotalAmountIndicator) {
      subtotalAmountIndicator.textContent = "$0.00";
    }

    if (checkoutButton) {
      checkoutButton.disabled = true;
    }

    return;
  }

  // ===============================
  // RENDER ITEMS
  // ===============================

  let listHTML = '';
  let runningSubtotal = 0;

  cartItems.forEach(item => {

    const itemLineTotal =
      item.price * item.quantity;

    runningSubtotal += itemLineTotal;

    listHTML += `
      <div class="cart-item-card" data-id="${item.id}">
        
        <div class="cart-item-image">
          <img src="${item.img}" alt="${item.title}">
        </div>

        <div class="cart-item-info">

          <div class="item-title-row">
            <h4>${item.title}</h4>

            <span class="item-remove-btn">
              &times;
            </span>
          </div>

          <span class="item-variant-meta">
            Quantity: ${item.quantity}
          </span>

          <div class="item-qty-price-row">

            <div class="qty-selector">
              <button class="qty-btn dynamic-minus-btn">
                -
              </button>

              <span class="qty-value">
                ${item.quantity}
              </span>

              <button class="qty-btn dynamic-plus-btn">
                +
              </button>
            </div>

            <span class="item-price-tag">
              $${itemLineTotal.toFixed(2)}
            </span>

          </div>

        </div>

      </div>
    `;
  });

  drawerItemsList.innerHTML = listHTML;

  if (subtotalAmountIndicator) {
    subtotalAmountIndicator.textContent =
      `$${runningSubtotal.toFixed(2)}`;
  }

  if (checkoutButton) {
    checkoutButton.disabled = false;
  }
}

// ===============================
// DRAWER INTERACTIONS
// ===============================
function initCartDrawerInteractions() {

  const clearCartBtn =
    document.getElementById('clearCartBtn');

  const cartDrawerOverlay =
    document.getElementById('cartDrawerOverlay');

  const openCartBtn =
    document.getElementById('openCartBtn');

  const closeCartBtn =
    document.getElementById('closeCartBtn');

  // OPEN
  if (openCartBtn && cartDrawerOverlay) {

    openCartBtn.addEventListener('click', () => {

      cartDrawerOverlay.classList.add('is-active');

      document.body.style.overflow = 'hidden';
    });
  }

  // CLOSE
  if (closeCartBtn && cartDrawerOverlay) {

    const closeDrawer = () => {

      cartDrawerOverlay.classList.remove('is-active');

      document.body.style.overflow = '';
    };

    closeCartBtn.addEventListener('click', closeDrawer);

    cartDrawerOverlay.addEventListener('click', (e) => {

      if (e.target === cartDrawerOverlay) {
        closeDrawer();
      }
    });
  }

  // CLEAR CART
  if (clearCartBtn) {

    clearCartBtn.addEventListener('click', () => {

      localStorage.removeItem('studioFitCart');

      syncCartUI();
    });
  }

  // ===============================
  // ITEM BUTTONS
  // ===============================
  document.addEventListener('click', (event) => {

    const itemCard =
      event.target.closest('.cart-item-card');

    if (!itemCard) return;

    const targetId =
      itemCard.getAttribute('data-id');

    let cartItems = getCartItems();

    const targetItem =
      cartItems.find(item => item.id == targetId);

    if (!targetItem) return;

    // MINUS
    if (event.target.classList.contains('dynamic-minus-btn')) {

      if (targetItem.quantity > 1) {
        targetItem.quantity -= 1;
      } else {
        cartItems =
          cartItems.filter(item => item.id != targetId);
      }

      saveCartItems(cartItems);
    }

    // PLUS
    if (event.target.classList.contains('dynamic-plus-btn')) {

      targetItem.quantity += 1;

      saveCartItems(cartItems);
    }

    // REMOVE
    if (event.target.classList.contains('item-remove-btn')) {

      cartItems =
        cartItems.filter(item => item.id != targetId);

      saveCartItems(cartItems);
    }
  });
}

// ===============================
// INITIALIZE
// ===============================
document.addEventListener('DOMContentLoaded', () => {

  syncCartUI();

  initCartDrawerInteractions();
});