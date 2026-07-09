// Quick View module for collection.html
// Requires:
// - .quick-view-trigger-btn[data-product-id]
// - #quickviewModalOverlay
// - #modalProductImage, #modalProductTitle, #modalProductPrice
// - #modalAddToBagBtn
// - optional #closeQuickviewBtn

(() => {
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

  function qs(id) {
    return document.getElementById(id);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const quickViewButtons = document.querySelectorAll('.quick-view-trigger-btn');
    const quickviewModalOverlay = qs('quickviewModalOverlay');
    const closeQuickviewBtn = qs('closeQuickviewBtn');
    const modalImage = qs('modalProductImage');
    const modalTitle = qs('modalProductTitle');
    const modalPrice = qs('modalProductPrice');
    const modalAddToBagBtn = qs('modalAddToBagBtn');

    if (!quickviewModalOverlay || quickViewButtons.length === 0) return;

    const closeQuickviewModal = () => {
      quickviewModalOverlay.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    quickViewButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = button.getAttribute('data-product-id');
        const productData = productMockDatabase[productId];
        if (!productData) return;

        if (modalImage) {
          modalImage.src = productData.img;
          modalImage.alt = productData.title;
        }
        if (modalTitle) modalTitle.textContent = productData.title;
        if (modalPrice) modalPrice.textContent = productData.price;

        if (modalAddToBagBtn) {
          modalAddToBagBtn.dataset.productId = productId;
          modalAddToBagBtn.textContent = 'Add To Shopping Bag';
        }

        const modalViewDetailsLink = document.getElementById('modalViewDetailsLink');
        if (modalViewDetailsLink) {
          modalViewDetailsLink.href = 'product.html';
        }


        quickviewModalOverlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
      });
    });

    if (closeQuickviewBtn) closeQuickviewBtn.addEventListener('click', closeQuickviewModal);

    quickviewModalOverlay.addEventListener('click', (e) => {
      if (e.target === quickviewModalOverlay) closeQuickviewModal();
    });

    if (modalAddToBagBtn) {
      modalAddToBagBtn.addEventListener('click', () => {
        const productId = modalAddToBagBtn.dataset.productId || '1';
        const productData = productMockDatabase[productId] || productMockDatabase['1'];
        if (!productData || typeof addItemToCart !== 'function') return;

        addItemToCart(productId, productData.title, productData.price, productData.img);
        if (typeof syncCartUI === 'function') syncCartUI();

        modalAddToBagBtn.textContent = 'Added ✓';
        setTimeout(() => {
          modalAddToBagBtn.textContent = 'Add To Shopping Bag';
        }, 1200);

        // Keep modal closing immediate for better UX
        closeQuickviewModal();
      });
    }
  });
})();

