const STUDIO_CUSTOMER_KEY = "studioFitCustomer";
const STUDIO_CUSTOMER_DIRECTORY_KEY = "studioFitCustomers";

function readCustomerDirectory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDIO_CUSTOMER_DIRECTORY_KEY)) || {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    localStorage.removeItem(STUDIO_CUSTOMER_DIRECTORY_KEY);
    return {};
  }
}

function saveCustomerDirectory(directory) {
  localStorage.setItem(STUDIO_CUSTOMER_DIRECTORY_KEY, JSON.stringify(directory));
}

function getCurrentCustomer() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDIO_CUSTOMER_KEY));
    return parsed && parsed.email ? parsed : null;
  } catch (error) {
    localStorage.removeItem(STUDIO_CUSTOMER_KEY);
    return null;
  }
}

function setCurrentCustomer(customer) {
  const cleanCustomer = normalizeCustomer(customer);
  localStorage.setItem(STUDIO_CUSTOMER_KEY, JSON.stringify(cleanCustomer));

  const directory = readCustomerDirectory();
  directory[cleanCustomer.email] = cleanCustomer;
  saveCustomerDirectory(directory);

  if (typeof syncCartUI === "function") syncCartUI();

  return cleanCustomer;
}

function clearCurrentCustomer() {
  localStorage.removeItem(STUDIO_CUSTOMER_KEY);
  if (typeof syncCartUI === "function") syncCartUI();
}

function normalizeCustomer(customer) {
  const email = String(customer.email || "").trim().toLowerCase();
  const fallbackName = email.split("@")[0] || "Customer";
  const firstName = String(customer.firstName || customer.first_name || fallbackName)
    .trim()
    .replace(/[-._]+/g, " ");
  const lastName = String(customer.lastName || customer.last_name || "").trim();
  const fullName = String(customer.fullName || customer.full_name || `${firstName} ${lastName}`.trim())
    .trim();

  return {
    id: isUuid(customer.id) ? customer.id : createCustomerId(),
    firstName,
    lastName,
    fullName: fullName || firstName,
    email,
    phone: customer.phone || "",
    memberSince: customer.memberSince || new Date().getFullYear(),
    address: customer.address || null
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function createCustomerId() {
  if (crypto?.randomUUID) return crypto.randomUUID();

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, char =>
    (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16)
  );
}

function findCustomerByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return readCustomerDirectory()[normalizedEmail] || null;
}

function customerInitials(customer) {
  const name = customer?.fullName || customer?.email || "Customer";
  const parts = name
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean);

  return (parts[0]?.[0] || "C").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

function showCustomerMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("form-message-error", isError);
  element.classList.toggle("form-message-success", !isError);
}

async function syncCustomerToAdmin(customer) {
  if (!window.publicSupabaseClient || !customer?.email) return;

  const profilePayload = {
    id: customer.id,
    email: customer.email,
    full_name: customer.fullName,
    role: "customer",
    phone: customer.phone || null,
    address: customer.address || null
  };

  const { error } = await window.publicSupabaseClient
    .from("store_profiles")
    .upsert(profilePayload, { onConflict: "email" });

  if (!error) return;

  const minimalPayload = {
    id: customer.id,
    email: customer.email,
    full_name: customer.fullName,
    role: "customer"
  };

  const { error: minimalError } = await window.publicSupabaseClient
    .from("store_profiles")
    .upsert(minimalPayload, { onConflict: "email" });

  if (!minimalError) return;

  await window.publicSupabaseClient
    .from("store_customer_leads")
    .insert({
      customer_email: customer.email,
      customer_name: customer.fullName,
      phone: customer.phone || null,
      source: "account",
      profile_data: {
        id: customer.id,
        address: customer.address || null
      }
    });
}

function initCustomerLogin() {
  const form = document.getElementById("customerLoginForm");
  if (!form) return;

  const message = document.getElementById("customerAuthMessage");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email = form.querySelector("#loginEmail")?.value;
    const existingCustomer = findCustomerByEmail(email);
    const customer = setCurrentCustomer(existingCustomer || { email });

    await syncCustomerToAdmin(customer);
    showCustomerMessage(message, `Signed in as ${customer.fullName}.`);
    window.location.href = getAuthRedirectDestination();
  });
}

function initCustomerRegister() {
  const form = document.getElementById("customerRegisterForm");
  if (!form) return;

  const message = document.getElementById("customerAuthMessage");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const customer = setCurrentCustomer({
      firstName: form.querySelector("#registerFirstName")?.value,
      lastName: form.querySelector("#registerLastName")?.value,
      email: form.querySelector("#registerEmail")?.value
    });

    await syncCustomerToAdmin(customer);
    showCustomerMessage(message, `Account created for ${customer.fullName}.`);
    window.location.href = getAuthRedirectDestination();
  });
}

function getAuthRedirectDestination() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || redirect.includes("://") || redirect.startsWith("//")) {
    return "account.html";
  }

  return redirect;
}

function initCustomerAccount() {
  if (!document.querySelector(".account-portal-container")) return;

  const customer = getCurrentCustomer();
  if (!customer) {
    window.location.href = "login.html";
    return;
  }

  hydrateAccountHeader(customer);
  hydrateProfileForm(customer);
  hydrateAddressSection(customer);
  hydrateOrderSection(customer);
  initAccountTabs();
  initProfileUpdates(customer);
  initAddressUpdates(customer);
  initCustomerSignOut();
}

function hydrateAccountHeader(customer) {
  setText("#customerAvatar", customerInitials(customer));
  setText("#customerName", customer.fullName);
  setText("#customerMemberSince", `Member since ${customer.memberSince}`);
}

function hydrateProfileForm(customer) {
  setValue("#profileFirstName", customer.firstName);
  setValue("#profileLastName", customer.lastName);
  setValue("#profileEmail", customer.email);
  setValue("#profilePhone", customer.phone || "");
}

function hydrateAddressSection(customer) {
  const list = document.getElementById("addressList");
  if (!list) return;

  setValue("#addressLabel", customer.address?.label || "");
  setValue("#addressCountry", customer.address?.country || "");
  setValue("#addressLine1", customer.address?.line1 || "");
  setValue("#addressCity", customer.address?.city || "");
  setValue("#addressPostalCode", customer.address?.postalCode || "");

  if (!customer.address) {
    list.innerHTML = `
      <div class="account-empty-state">
        <h3>No saved address yet</h3>
        <p>Add a shipping address to make checkout faster next time.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="address-record-card is-default-billing">
      <div class="address-card-header-row">
        <h5>${escapeCustomerText(customer.address.label || "Primary Address")}</h5>
        <span class="default-pill-tag">Default</span>
      </div>
      <p class="address-body-text">
        ${escapeCustomerText(customer.fullName)}<br>
        ${escapeCustomerText(customer.address.line1)}<br>
        ${escapeCustomerText(customer.address.city)}${customer.address.postalCode ? `, ${escapeCustomerText(customer.address.postalCode)}` : ""}<br>
        ${escapeCustomerText(customer.address.country)}
      </p>
    </div>
  `;
}

async function hydrateOrderSection(customer) {
  const list = document.getElementById("ordersList");
  if (!list) return;

  const cartItems = typeof getCartItems === "function" ? getCartItems() : [];
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const customerOrders = await fetchCustomerOrders(customer);

  setText("#accountBagCount", cartItems.reduce((total, item) => total + item.quantity, 0));
  setText("#accountBagTotal", `$${cartTotal.toFixed(2)}`);

  if (cartItems.length === 0 && customerOrders.length === 0) {
    list.innerHTML = `
      <div class="account-empty-state">
        <h3>No orders yet</h3>
        <p>Your completed STUDIO_FIT orders will appear here after checkout.</p>
        <button class="btn-outline-action" type="button" onclick="window.location.href='collection.html'">Start Shopping</button>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    ${customerOrders.map(order => customerOrderCardTemplate(order)).join("")}
    ${cartItems.length ? currentBagCardTemplate(cartItems, cartTotal) : ""}
  `;
}

async function fetchCustomerOrders(customer) {
  if (!window.publicSupabaseClient || !customer?.email) return [];

  const { data, error } = await window.publicSupabaseClient
    .from("store_checkout_intents")
    .select("id,customer_email,customer_name,status,payment_status,payment_method,total,currency,items,created_at,paid_at,payment_reference")
    .eq("customer_email", customer.email)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Customer orders unavailable:", error.message);
    return [];
  }

  return data || [];
}

function customerOrderCardTemplate(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const paid = order.status === "paid";

  return `
    <div class="order-history-row-card">
      <div class="order-card-meta-top">
        <div class="meta-data-group">
          <span class="meta-label">Order Reference</span>
          <span class="meta-value">${escapeCustomerText(order.payment_reference || order.id)}</span>
        </div>
        <div class="meta-data-group">
          <span class="meta-label">Date Placed</span>
          <span class="meta-value">${formatCustomerDate(order.created_at)}</span>
        </div>
        <div class="meta-data-group">
          <span class="meta-label">Total Paid</span>
          <span class="meta-value">${formatCustomerCurrency(order.total, order.currency)}</span>
        </div>
        <span class="fulfillment-status-badge ${paid ? "tag-delivered" : "tag-transit"}">
          ${paid ? "Paid" : escapeCustomerText(order.payment_status || "Pending")}
        </span>
      </div>
      ${items.length ? items.map(item => orderItemTemplate(item)).join("") : `
        <div class="order-card-items-preview">
          <div class="preview-item-info-strings">
            <h5>Order captured</h5>
            <span>Payment method: ${escapeCustomerText(order.payment_method || "-")}</span>
          </div>
        </div>
      `}
    </div>
  `;
}

function currentBagCardTemplate(cartItems, cartTotal) {
  return `
    <div class="order-history-row-card">
      <div class="order-card-meta-top">
        <div class="meta-data-group">
          <span class="meta-label">Current Bag</span>
          <span class="meta-value">${cartItems.length} item type${cartItems.length === 1 ? "" : "s"}</span>
        </div>
        <div class="meta-data-group">
          <span class="meta-label">Estimated Total</span>
          <span class="meta-value">$${cartTotal.toFixed(2)}</span>
        </div>
        <span class="fulfillment-status-badge tag-transit">Ready For Checkout</span>
      </div>
      ${cartItems.map(item => orderItemTemplate(item)).join("")}
      <div class="account-card-actions">
        <button class="btn-outline-action" type="button" onclick="window.location.href='checkout.html'">Go To Checkout</button>
      </div>
    </div>
  `;
}

function orderItemTemplate(item) {
  return `
    <div class="order-card-items-preview">
      <div class="preview-item-thumbnail">
        <img src="${escapeCustomerText(item.img)}" alt="${escapeCustomerText(item.title)}">
        <div class="thumbnail-count-bubble">${item.quantity || 1}</div>
      </div>
      <div class="preview-item-info-strings">
        <h5>${escapeCustomerText(item.title || "Product")}</h5>
        <span>Quantity: ${item.quantity || 1} / $${Number(item.price || 0).toFixed(2)} each</span>
      </div>
    </div>
  `;
}

function initAccountTabs() {
  const tabButtons = document.querySelectorAll(".sidebar-tab-btn");
  const viewPanels = document.querySelectorAll(".account-view-panel");

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetSectionId = button.getAttribute("data-target");
      tabButtons.forEach(btn => btn.classList.remove("active"));
      viewPanels.forEach(panel => panel.classList.remove("is-visible"));
      button.classList.add("active");
      document.getElementById(targetSectionId)?.classList.add("is-visible");
    });
  });
}

function initProfileUpdates(customer) {
  const form = document.getElementById("customerProfileForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const updatedCustomer = setCurrentCustomer({
      ...getCurrentCustomer(),
      firstName: form.querySelector("#profileFirstName")?.value,
      lastName: form.querySelector("#profileLastName")?.value,
      email: form.querySelector("#profileEmail")?.value,
      phone: form.querySelector("#profilePhone")?.value
    });
    await syncCustomerToAdmin(updatedCustomer);
    hydrateAccountHeader(updatedCustomer);
    showCustomerToast("Profile updated.");
  });
}

function initAddressUpdates(customer) {
  const form = document.getElementById("customerAddressForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const updatedCustomer = setCurrentCustomer({
      ...getCurrentCustomer(),
      address: {
        label: form.querySelector("#addressLabel")?.value || "Primary Address",
        line1: form.querySelector("#addressLine1")?.value,
        city: form.querySelector("#addressCity")?.value,
        postalCode: form.querySelector("#addressPostalCode")?.value,
        country: form.querySelector("#addressCountry")?.value
      }
    });

    await syncCustomerToAdmin(updatedCustomer);
    hydrateAddressSection(updatedCustomer);
    showCustomerToast("Address saved.");
  });
}

function initCustomerSignOut() {
  const button = document.getElementById("customerSignOutBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    clearCurrentCustomer();
    window.location.href = "index.html";
  });
}

function showCustomerToast(message) {
  const toast = document.getElementById("toastNotification");
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeCustomerText(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatCustomerDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatCustomerCurrency(value, currency = "USD") {
  const prefix = currency === "KES" ? "KSh " : "$";
  return `${prefix}${Number(value || 0).toFixed(2)}`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setValue(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.value = value || "";
}

document.addEventListener("DOMContentLoaded", () => {
  initCustomerLogin();
  initCustomerRegister();
  initCustomerAccount();
});

window.STUDIO_CUSTOMER = {
  getCurrentCustomer,
  setCurrentCustomer,
  syncCustomerToAdmin,
  clearCurrentCustomer,
  customerInitials
};
