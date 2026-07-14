let paymentRows = [];
let filteredPaymentRows = [];

async function loadPayments() {
    await fetchPayments();
    initializePaymentEvents();
}

async function fetchPayments() {
    const { data, error } = await window.supabaseClient
        .from("store_checkout_intents")
        .select("customer_email,customer_name,payment_method,status,payment_status,payment_reference,total,items,created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: false });

    if (error) {
        console.warn("Checkout intents unavailable:", error.message);
        paymentRows = [];
    } else {
        paymentRows = data || [];
    }

    filteredPaymentRows = [...paymentRows];
    updatePaymentStats();
    renderPayments();
}

function updatePaymentStats() {
    const completed = paymentRows.filter(row => (row.status || "") === "paid").length;
    const totalValue = paymentRows.reduce((total, row) => total + Number(row.total || 0), 0);

    setPaymentText("paymentLeadCount", completed);
    setPaymentText("pendingPaymentCount", paymentRows.length);
    setPaymentText("paymentTotalValue", formatAdminCurrency(totalValue));
}

function renderPayments() {
    const tbody = document.getElementById("paymentsTable");
    if (!tbody) return;

    if (!filteredPaymentRows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">No completed payments yet.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredPaymentRows.map(payment => `
        <tr>
            <td>
                <strong>${escapeAdminText(payment.customer_name || "Customer")}</strong><br>
                <small>${escapeAdminText(payment.customer_email || "-")}</small>
            </td>
            <td>${escapeAdminText(formatPaymentMethod(payment.payment_method))}</td>
            <td>
                <span class="badge ${payment.status === "paid" ? "success" : "gray"}">${escapeAdminText(payment.status || "pending")}</span><br>
                <small>${escapeAdminText(payment.payment_status || payment.payment_reference || "")}</small>
            </td>
            <td>${formatAdminCurrency(payment.total || 0)}</td>
            <td>${summarizePaymentItems(payment.items)}</td>
            <td>${formatAdminDate(payment.created_at)}</td>
        </tr>
    `).join("");
}

function initializePaymentEvents() {
    document.getElementById("paymentSearch")?.addEventListener("input", filterPayments);
    document.getElementById("exportPaymentsBtn")?.addEventListener("click", exportPayments);
}

function filterPayments() {
    const keyword = document.getElementById("paymentSearch").value.trim().toLowerCase();

    filteredPaymentRows = paymentRows.filter(payment =>
        `${payment.customer_name} ${payment.customer_email} ${payment.payment_method} ${payment.status}`
            .toLowerCase()
            .includes(keyword)
    );

    renderPayments();
}

function exportPayments() {
    exportAdminCsv("payments.csv", [
        ["Customer", "Email", "Payment Method", "Status", "Total", "Items", "Captured"],
        ...paymentRows.map(payment => [
            payment.customer_name || "Customer",
            payment.customer_email || "",
            formatPaymentMethod(payment.payment_method),
            payment.status || "pending",
            payment.total || 0,
            summarizePaymentItems(payment.items),
            formatAdminDate(payment.created_at)
        ])
    ]);
}

function summarizePaymentItems(items) {
    const parsedItems = Array.isArray(items) ? items : [];

    if (!parsedItems.length) return "-";

    return parsedItems.map(item => {
        const variants = [
            item.color ? `Color: ${escapeAdminText(item.color)}` : "",
            item.size ? `Size: ${escapeAdminText(item.size)}` : ""
        ].filter(Boolean).join(", ");
        const quantity = Number(item.quantity || 1);
        return `${escapeAdminText(item.title || "Product")} x${quantity}${variants ? ` - ${variants}` : ""}`;
    }).join("; ");
}

function formatPaymentMethod(method) {
    const labels = {
        mpesa: "M-Pesa",
        paypal: "PayPal",
        paystack: "Paystack"
    };

    return labels[method] || method || "-";
}

function setPaymentText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}
