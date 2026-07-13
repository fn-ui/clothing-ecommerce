// ======================================
// STUDIO_FIT DASHBOARD
// ======================================

let dashboardChart = null;

async function loadDashboard() {

    const isAdmin = await requireAdmin();

    if (!isAdmin) return;

    await loadStats();

    await loadRecentProducts();

    await loadPublicActivity();

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

    const publicCustomerLeads = await countTableRows("store_customer_leads");

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

    const newsletter = await countTableRows("store_newsletter");

    const checkoutIntents = await countTableRows("store_checkout_intents");

    document.getElementById("productCount").textContent = products || 0;
    document.getElementById("categoryCount").textContent = categories || 0;
    document.getElementById("imageCount").textContent = images || 0;
    document.getElementById("customerCount").textContent = (customers || 0) + publicCustomerLeads;
    setDashboardText("newsletterCount", newsletter);
    setDashboardText("checkoutIntentCount", checkoutIntents);

    document.getElementById("activeProducts").textContent = active || 0;
    document.getElementById("featuredProducts").textContent = featured || 0;
    document.getElementById("outOfStock").textContent = stock || 0;

    document.getElementById("productGrowth").textContent =
        `${products || 0} products available`;

}

async function countTableRows(tableName) {

    const { count, error } = await window.supabaseClient
        .from(tableName)
        .select("*", { count: "exact", head: true });

    if (error) {

        console.warn(`${tableName} count unavailable:`, error.message);

        return 0;

    }

    return count || 0;

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
// PUBLIC ACTIVITY
// ======================================

async function loadPublicActivity() {

    const feed = document.getElementById("activityFeed");

    if (!feed) return;

    const activity = [];

    const { data: customers } = await window.supabaseClient
        .from("store_profiles")
        .select("email,full_name,created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false })
        .limit(4);

    (customers || []).forEach(customer => {

        activity.push({
            type: "customer",
            title: customer.full_name || customer.email,
            detail: "Customer captured from public account flow.",
            created_at: customer.created_at
        });

    });

    const { data: customerLeads, error: customerLeadError } = await window.supabaseClient
        .from("store_customer_leads")
        .select("customer_email,customer_name,created_at")
        .order("created_at", { ascending: false })
        .limit(4);

    if (!customerLeadError) {

        (customerLeads || []).forEach(customer => {

            activity.push({
                type: "customer",
                title: customer.customer_name || customer.customer_email,
                detail: "Customer lead captured from public account flow.",
                created_at: customer.created_at
            });

        });

    }

    const { data: subscribers } = await window.supabaseClient
        .from("store_newsletter")
        .select("email,created_at")
        .order("created_at", { ascending: false })
        .limit(4);

    (subscribers || []).forEach(subscriber => {

        activity.push({
            type: "newsletter",
            title: subscriber.email,
            detail: "Newsletter signup from public storefront.",
            created_at: subscriber.created_at
        });

    });

    const { data: checkoutIntents, error: checkoutError } = await window.supabaseClient
        .from("store_checkout_intents")
        .select("customer_email,customer_name,total,payment_method,payment_status,created_at")
        .order("created_at", { ascending: false })
        .limit(4);

    if (!checkoutError) {

        (checkoutIntents || []).forEach(intent => {

            activity.push({
                type: "checkout",
                title: intent.customer_name || intent.customer_email || "Checkout lead",
                detail: `${formatDashboardCurrency(intent.total || 0)} via ${intent.payment_method || "payment method"}.`,
                created_at: intent.created_at
            });

        });

    }

    activity.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (!activity.length) {

        feed.innerHTML = `
            <div class="activity-item">
                <div class="activity-dot"></div>
                <div>
                    <strong>No public activity yet</strong>
                    <small>Customer registrations, newsletter signups, and checkout leads will appear here.</small>
                </div>
            </div>
        `;

        return;

    }

    feed.innerHTML = activity.slice(0, 8).map(item => `
        <div class="activity-item">
            <div class="activity-dot ${item.type}"></div>
            <div>
                <strong>${escapeDashboardText(item.title)}</strong>
                <small>${escapeDashboardText(item.detail)}</small>
            </div>
        </div>
    `).join("");

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
                "Customers",
                "Checkout",
                "Newsletter"

            ],

            datasets: [

                {

                    label: "Store",

                    data: [

                        Number(document.getElementById("productCount").textContent),

                        Number(document.getElementById("categoryCount").textContent),

                        Number(document.getElementById("imageCount").textContent),

                        Number(document.getElementById("customerCount").textContent),

                        Number(document.getElementById("checkoutIntentCount")?.textContent || 0),

                        Number(document.getElementById("newsletterCount")?.textContent || 0)

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

function setDashboardText(id, value) {

    const element = document.getElementById(id);

    if (element) element.textContent = value || 0;

}

function formatDashboardCurrency(value) {

    if (window.Utils?.currency) return Utils.currency(value);

    return `$${Number(value || 0).toFixed(2)}`;

}

function escapeDashboardText(value) {

    return String(value || "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));

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

    document.getElementById("quickCustomers")?.addEventListener("click", () => {

        loadPage("customers");

    });

    document.getElementById("quickPayments")?.addEventListener("click", () => {

        loadPage("payments");

    });

}
