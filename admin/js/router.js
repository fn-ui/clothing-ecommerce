// =========================================
// STUDIO_FIT ADMIN ROUTER
// =========================================

let pageContent;

const routes = {
    dashboard: {
        file: "pages/dashboard.html",
        init: () => loadDashboard()
    },
    products: {
    file: "pages/products.html",
    init: () => loadProducts()
    },

    "add-product": {
        file: "pages/add-product.html",
        init: () => loadAddProduct()
    },
    "edit-product": {
    file: "pages/add-product.html",
    init: () => loadEditProduct()
    },
    categories: {
        file: "pages/categories.html",
        init: () => loadCategories()
    },
    newsletter: {
        file: "pages/newsletter.html",
        init: () => loadNewsletter()
    },
    customers: {
        file: "pages/customers.html",
        init: () => loadCustomers()
    },
    payments: {
        file: "pages/payments.html",
        init: () => loadPayments()
    },
    settings: {
        file: "pages/settings.html",
        init: () => loadSettings()
    }
};

async function loadPage(page) {

    const route = routes[page];

    if (!route) return;

    try {

        const response = await fetch(route.file);

        if (!response.ok) {

            pageContent.innerHTML = `
                <div class="table-container">
                    <h2>Page not found.</h2>
                </div>
            `;

            return;

        }

        pageContent.innerHTML = await response.text();

        document.title =
            `${page.charAt(0).toUpperCase() + page.slice(1)} | STUDIO_FIT Admin`;

        document
            .querySelectorAll(".sidebar-menu a")
            .forEach(link => link.classList.remove("active"));

        document
            .querySelector(`[data-page="${page}"]`)
            ?.classList.add("active");

        if (route.init) {

            await route.init();

        }

    } catch (err) {

        console.error(err);

        pageContent.innerHTML = `
            <div class="table-container">
                <h2>Something went wrong.</h2>
            </div>
        `;

    }

}

document.addEventListener("click", e => {

    const link = e.target.closest("[data-page]");

    if (!link) return;

    e.preventDefault();

    loadPage(link.dataset.page);

});

window.addEventListener("DOMContentLoaded", () => {

    pageContent = document.getElementById("pageContent");

    if (!pageContent) {
        console.error("pageContent container missing");
        return;
    }

    loadPage("dashboard");

});
