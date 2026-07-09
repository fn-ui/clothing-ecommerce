// ======================================
// STUDIO_FIT DASHBOARD
// ======================================

let dashboardChart = null;

async function loadDashboard() {

    const isAdmin = await requireAdmin();

    if (!isAdmin) return;

    await loadStats();

    await loadRecentProducts();

    initChart();

    bindDashboardButtons();

}

// ======================================
// LOAD STATS
// ======================================

async function loadStats() {

    // Products
    const { count: products } = await window.supabaseClient
        .from("store_products")
        .select("*", { count: "exact", head: true });

    // Categories
    const { count: categories } = await window.supabaseClient
        .from("store_categories")
        .select("*", { count: "exact", head: true });

    // Images
    const { count: images } = await window.supabaseClient
        .from("store_product_images")
        .select("*", { count: "exact", head: true });

    // Customers
    const { count: customers } = await window.supabaseClient
        .from("store_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "customer");

    // Featured
    const { count: featured } = await window.supabaseClient
        .from("store_products")
        .select("*", { count: "exact", head: true })
        .eq("featured", true);

    // Active
    const { count: active } = await window.supabaseClient
        .from("store_products")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

    // Out of Stock
    const { count: stock } = await window.supabaseClient
        .from("store_products")
        .select("*", { count: "exact", head: true })
        .eq("stock", 0);

    document.getElementById("productCount").textContent = products || 0;
    document.getElementById("categoryCount").textContent = categories || 0;
    document.getElementById("imageCount").textContent = images || 0;
    document.getElementById("customerCount").textContent = customers || 0;

    document.getElementById("activeProducts").textContent = active || 0;
    document.getElementById("featuredProducts").textContent = featured || 0;
    document.getElementById("outOfStock").textContent = stock || 0;

    document.getElementById("productGrowth").textContent =
        `${products || 0} products available`;

}

// ======================================
// RECENT PRODUCTS
// ======================================

async function loadRecentProducts() {

    const tbody = document.getElementById("recentProducts");

    if (!tbody) return;

    tbody.innerHTML = "";

    const { data, error } = await window.supabaseClient
        .from("store_products")
        .select(`
            *,
            store_categories(name)
        `)
        .order("created_at", { ascending: false })
        .limit(6);

    if (error) {

        console.error(error);

        return;

    }

    if (!data.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty">
                    No products found.
                </td>
            </tr>
        `;

        return;

    }

    data.forEach(product => {

        tbody.innerHTML += `

        <tr>

            <td>

                ${product.name}

            </td>

            <td>

                ${product.store_categories?.name ?? "-"}

            </td>

            <td>

                $${Number(product.price).toFixed(2)}

            </td>

            <td>

                <span class="${
                    product.active
                        ? "badge success"
                        : "badge danger"
                }">

                    ${
                        product.active
                            ? "Active"
                            : "Hidden"
                    }

                </span>

            </td>

        </tr>

        `;

    });

}

// ======================================
// CHART
// ======================================

function initChart() {

    const canvas = document.getElementById("dashboardChart");

    if (!canvas) return;

    if (dashboardChart) {

        dashboardChart.destroy();

    }

    dashboardChart = new Chart(canvas, {

        type: "bar",

        data: {

            labels: [

                "Products",
                "Categories",
                "Images",
                "Customers"

            ],

            datasets: [

                {

                    label: "Store",

                    data: [

                        Number(document.getElementById("productCount").textContent),

                        Number(document.getElementById("categoryCount").textContent),

                        Number(document.getElementById("imageCount").textContent),

                        Number(document.getElementById("customerCount").textContent)

                    ]

                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    display: false

                }

            },

            scales: {

                y: {

                    beginAtZero: true

                }

            }

        }

    });

}

// ======================================
// BUTTONS
// ======================================

function bindDashboardButtons() {

    document.getElementById("newProductBtn")?.addEventListener("click", () => {

        loadPage("add-product");

    });

    document.getElementById("quickAddProduct")?.addEventListener("click", () => {

        loadPage("add-product");

    });

    document.getElementById("quickProducts")?.addEventListener("click", () => {

        loadPage("products");

    });

    document.getElementById("quickCategory")?.addEventListener("click", () => {

        loadPage("categories");

    });

    document.getElementById("quickSettings")?.addEventListener("click", () => {

        loadPage("settings");

    });

}