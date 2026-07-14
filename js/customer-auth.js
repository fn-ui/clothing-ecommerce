const STUDIO_CUSTOMER_KEY = "studioFitCustomer";

function getCurrentCustomer() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDIO_CUSTOMER_KEY));
    return parsed?.email && parsed?.authProvider === "supabase" ? normalizeCustomer(parsed) : null;
  } catch (error) {
    localStorage.removeItem(STUDIO_CUSTOMER_KEY);
    return null;
  }
}

function setCurrentCustomer(customer) {
  const cleanCustomer = normalizeCustomer(customer);
  localStorage.setItem(STUDIO_CUSTOMER_KEY, JSON.stringify(cleanCustomer));

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
    address: customer.address || null,
    authProvider: "supabase"
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

function hasSupabaseAuth() {
  return Boolean(window.publicSupabaseClient?.auth);
}

function customerFromSupabaseUser(user, profile = null, fallback = {}) {
  const metadata = user?.user_metadata || {};
  const email = String(user?.email || profile?.email || fallback.email || "").trim().toLowerCase();
  const firstName = profile?.first_name || metadata.first_name || fallback.firstName || "";
  const lastName = profile?.last_name || metadata.last_name || fallback.lastName || "";
  const fullName = profile?.full_name || metadata.full_name || `${firstName} ${lastName}`.trim() || email.split("@")[0];

  return normalizeCustomer({
    id: user?.id || profile?.id || fallback.id,
    firstName,
    lastName,
    fullName,
    email,
    phone: profile?.phone || metadata.phone || fallback.phone || "",
    address: profile?.address || fallback.address || null,
    memberSince: user?.created_at ? new Date(user.created_at).getFullYear() : fallback.memberSince
  });
}

async function fetchCustomerProfile(user) {
  if (!window.publicSupabaseClient || !user?.id) return null;

  const byId = await window.publicSupabaseClient
    .from("store_profiles")
    .select("id,email,full_name,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!byId.error && byId.data) return byId.data;

  if (!user.email) return null;

  const byEmail = await window.publicSupabaseClient
    .from("store_profiles")
    .select("id,email,full_name,created_at")
    .eq("email", user.email)
    .maybeSingle();

  if (byEmail.error) {
    console.warn("Customer profile unavailable:", byEmail.error.message);
    return null;
  }

  return byEmail.data || null;
}

async function cacheSupabaseCustomer(user, fallback = {}) {
  const profile = await fetchCustomerProfile(user);
  const customer = setCurrentCustomer(customerFromSupabaseUser(user, profile, fallback));
  await syncCustomerToAdmin(customer);
  return customer;
}

async function refreshCustomerSession() {
  if (!hasSupabaseAuth()) {
    clearCurrentCustomer();
    return null;
  }

  const { data, error } = await window.publicSupabaseClient.auth.getSession();

  if (error || !data?.session?.user) {
    clearCurrentCustomer();
    return null;
  }

  return cacheSupabaseCustomer(data.session.user, getCurrentCustomer() || {});
}

const customerSessionReady = refreshCustomerSession();

async function syncCustomerToAdmin(customer) {
  if (!window.publicSupabaseClient || !customer?.email) return;

  const profilePayload = {
    id: customer.id,
    email: customer.email,
    full_name: customer.fullName,
    first_name: customer.firstName,
    last_name: customer.lastName,
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

    if (!hasSupabaseAuth()) {
      showCustomerMessage(message, "Account sign-in is not connected yet. Please check Supabase settings.", true);
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || "Sign In";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Signing In...";
    }

    const email = form.querySelector("#loginEmail")?.value.trim().toLowerCase();
    const password = form.querySelector("#loginPassword")?.value;

    try {
      const { data, error } = await window.publicSupabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const customer = await cacheSupabaseCustomer(data.user);
      showCustomerMessage(message, `Signed in as ${customer.fullName}.`);
      window.location.href = getAuthRedirectDestination();
    } catch (error) {
      clearCurrentCustomer();
      showCustomerMessage(message, error.message || "The email or password is incorrect.", true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

function initCustomerRegister() {
  const form = document.getElementById("customerRegisterForm");
  if (!form) return;

  const message = document.getElementById("customerAuthMessage");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!hasSupabaseAuth()) {
      showCustomerMessage(message, "Account registration is not connected yet. Please check Supabase settings.", true);
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || "Create Account";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creating...";
    }

    const firstName = form.querySelector("#registerFirstName")?.value.trim();
    const lastName = form.querySelector("#registerLastName")?.value.trim();
    const email = form.querySelector("#registerEmail")?.value.trim().toLowerCase();
    const password = form.querySelector("#registerPassword")?.value;

    if (String(password || "").length < 8) {
      showCustomerMessage(message, "Password must be at least 8 characters.", true);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
      return;
    }

    try {
      const fullName = `${firstName || ""} ${lastName || ""}`.trim();
      const { data, error } = await window.publicSupabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      const fallback = { firstName, lastName, fullName, email };

      if (!data.session) {
        clearCurrentCustomer();
        showCustomerMessage(message, "Account created. Please check your email to confirm your account before signing in.");
        return;
      }

      const customer = await cacheSupabaseCustomer(data.user, fallback);
      showCustomerMessage(message, `Account created for ${customer.fullName}.`);
      window.location.href = getAuthRedirectDestination();
    } catch (error) {
      clearCurrentCustomer();
      showCustomerMessage(message, error.message || "Account creation failed.", true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

function getAuthRedirectDestination() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || redirect.includes("://") || redirect.startsWith("//")) {
    return "account.html";
  }

  return redirect;
}

async function initCustomerAccount() {
  if (!document.querySelector(".account-portal-container")) return;

  const customer = await refreshCustomerSession();
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
    const currentCustomer = getCurrentCustomer() || customer;
    const firstName = form.querySelector("#profileFirstName")?.value.trim();
    const lastName = form.querySelector("#profileLastName")?.value.trim();
    const email = form.querySelector("#profileEmail")?.value.trim().toLowerCase();
    const phone = form.querySelector("#profilePhone")?.value.trim();
    const fullName = `${firstName || ""} ${lastName || ""}`.trim();

    if (hasSupabaseAuth()) {
      const updatePayload = {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          phone
        }
      };

      if (email && email !== currentCustomer.email) {
        updatePayload.email = email;
      }

      const { error } = await window.publicSupabaseClient.auth.updateUser(updatePayload);
      if (error) {
        showCustomerToast(error.message || "Profile update failed.");
        return;
      }
    }

    const updatedCustomer = setCurrentCustomer({
      ...currentCustomer,
      firstName,
      lastName,
      fullName,
      email,
      phone
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

  button.addEventListener("click", async () => {
    if (hasSupabaseAuth()) {
      await window.publicSupabaseClient.auth.signOut();
    }

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

document.addEventListener("DOMContentLoaded", async () => {
  await customerSessionReady;
  initCustomerLogin();
  initCustomerRegister();
  await initCustomerAccount();
});

window.STUDIO_CUSTOMER = {
  getCurrentCustomer,
  setCurrentCustomer,
  syncCustomerToAdmin,
  clearCurrentCustomer,
  customerInitials,
  ready: customerSessionReady
};

if (hasSupabaseAuth()) {
  window.publicSupabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      await cacheSupabaseCustomer(session.user, getCurrentCustomer() || {});
      return;
    }

    if (event === "SIGNED_OUT") {
      clearCurrentCustomer();
    }
  });
}
