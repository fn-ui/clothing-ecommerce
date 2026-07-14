const { loadLocalEnv } = require("../_load-env");

module.exports = async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const orderId = String(body.orderId || "").trim();
    const checkoutId = String(body.checkoutId || "").trim();

    if (!orderId) return res.status(400).json({ error: "PayPal order id is required." });

    const accessToken = await getPayPalAccessToken();
    const paypalResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    const payload = await paypalResponse.json();

    if (!paypalResponse.ok) {
      const alreadyCaptured = payload?.details?.some(detail => detail.issue === "ORDER_ALREADY_CAPTURED");

      if (!alreadyCaptured) {
        return res.status(400).json({
          error: getPayPalErrorMessage(payload) || "PayPal capture failed."
        });
      }
    }

    const paid = payload.status === "COMPLETED" || payload?.details?.some(detail => detail.issue === "ORDER_ALREADY_CAPTURED");
    const purchaseUnit = payload.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const resolvedCheckoutId = checkoutId || purchaseUnit?.custom_id || purchaseUnit?.reference_id || "";

    const updateResult = await updateCheckoutIntent(orderId, {
      status: paid ? "paid" : "pending",
      payment_status: payload.status || (paid ? "COMPLETED" : "pending"),
      payment_provider: "paypal",
      payment_reference: orderId,
      paid_at: paid ? capture?.update_time || new Date().toISOString() : null,
      gateway_response: capture?.status || payload.status || null
    }, resolvedCheckoutId);

    if (!updateResult.ok) {
      return res.status(500).json({
        error: updateResult.error || "Payment captured, but the order status could not be updated in Supabase."
      });
    }

    return res.status(200).json({
      paid,
      status: payload.status,
      message: paid ? "PayPal payment completed." : "PayPal payment was not completed."
    });
  } catch (error) {
    if (error.message === "fetch failed") {
      return res.status(502).json({
        error: "Could not reach PayPal to verify the payment. Restart the local project server with network access, then return to this payment page."
      });
    }

    return res.status(500).json({ error: error.message || "PayPal capture failed." });
  }
};

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not configured.");
  }

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const payload = await response.json();

  if (!response.ok || !payload.access_token) {
    throw new Error(getPayPalErrorMessage(payload) || "PayPal authentication failed.");
  }

  return payload.access_token;
}

function getPayPalBaseUrl() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPayPalErrorMessage(payload) {
  return payload?.details?.[0]?.description || payload?.message || payload?.error_description || payload?.name;
}

async function updateCheckoutIntent(reference, patch, checkoutId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured."
    };
  }

  const filter = checkoutId
    ? `id=eq.${encodeURIComponent(checkoutId)}`
    : `payment_reference=eq.${encodeURIComponent(reference)}`;

  const response = await fetch(`${supabaseUrl}/rest/v1/store_checkout_intents?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    const message = await response.text();
    return {
      ok: false,
      error: message || `Supabase update failed with status ${response.status}.`
    };
  }

  return { ok: true };
}
