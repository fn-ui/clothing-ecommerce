let customerRows = [];
let filteredCustomerRows = [];

async function loadCustomers() {
    await fetchCustomers();
    initializeCustomerEvents();
}

async function fetchCustomers() {
    const profileRows = await fetchCustomerProfiles();
    const leadRows = await fetchCustomerLeads();
    const checkoutRows = await fetchCheckoutCustomers();

    const seen = new Set();
    customerRows = [...profileRows, ...leadRows, ...checkoutRows].filter(customer => {
        const key = customer.email || `${customer.name}-${customer.created_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    filteredCustomerRows = [...customerRows];
    updateCustomerStats(profileRows.length, leadRows.length + checkoutRows.length);
    renderCustomers();
}

async function fetchCustomerProfiles() {
    const { data, error } = await window.supabaseClient
        .from("store_profiles")
        .select("email,full_name,created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

    if (error) {
        console.warn("Customer profiles unavailable:", error.message);
        return [];
    }

    return (data || []).map(profile => ({
        name: profile.full_name || "-",
        email: profile.email || "-",
        phone: "-",
        source: "Profile",
        created_at: profile.created_at,
        address: null
    }));
}

async function fetchCustomerLeads() {
    const { data, error } = await window.supabaseClient
        .from("store_customer_leads")
        .select("customer_email,customer_name,phone,source,created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.warn("Customer leads unavailable:", error.message);
        return [];
    }

    return (data || []).map(lead => ({
        name: lead.customer_name || "-",
        email: lead.customer_email || "-",
        phone: lead.phone || "-",
        source: lead.source || "Lead",
        created_at: lead.created_at
    }));
}

async function fetchCheckoutCustomers() {
    const { data, error } = await window.supabaseClient
        .from("store_checkout_intents")
        .select("customer_email,customer_name,created_at")
        .not("customer_email", "is", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.warn("Checkout customers unavailable:", error.message);
        return [];
    }

    return (data || []).map(order => ({
        name: order.customer_name || "-",
        email: order.customer_email || "-",
        phone: "-",
        source: "Checkout",
        created_at: order.created_at
    }));
}

function updateCustomerStats(profileCount, leadCount) {
    setCustomerText("totalCustomers", customerRows.length);
    setCustomerText("profileCustomers", profileCount);
    setCustomerText("leadCustomers", leadCount);
}

function renderCustomers() {
    const tbody = document.getElementById("customersTable");
    if (!tbody) return;

    if (!filteredCustomerRows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">No customers captured yet.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredCustomerRows.map(customer => `
        <tr>
            <td>${escapeAdminText(customer.name)}</td>
            <td>${escapeAdminText(customer.email)}</td>
            <td>${escapeAdminText(customer.phone)}</td>
            <td><span class="badge gray">${escapeAdminText(customer.source)}</span></td>
            <td>${formatAdminDate(customer.created_at)}</td>
        </tr>
    `).join("");
}

function initializeCustomerEvents() {
    document.getElementById("customerSearch")?.addEventListener("input", filterCustomers);
    document.getElementById("exportCustomersBtn")?.addEventListener("click", exportCustomers);
}

function filterCustomers() {
    const keyword = document.getElementById("customerSearch").value.trim().toLowerCase();

    filteredCustomerRows = customerRows.filter(customer =>
        `${customer.name} ${customer.email} ${customer.phone} ${customer.source}`
            .toLowerCase()
            .includes(keyword)
    );

    renderCustomers();
}

function exportCustomers() {
    exportAdminCsv("customers.csv", [
        ["Name", "Email", "Phone", "Source", "Captured"],
        ...customerRows.map(customer => [
            customer.name,
            customer.email,
            customer.phone,
            customer.source,
            formatAdminDate(customer.created_at)
        ])
    ]);
}

function setCustomerText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}
