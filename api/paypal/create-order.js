const { loadLocalEnv } = require("../_load-env");

module.exports = async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const checkoutId = String(body.checkoutId || "");
    const amount = Number(body.amount || 0);
    const currency = process.env.PAYPAL_CURRENCY || body.currency || "USD";
    const origin = req.headers.origin || `https://${req.headers.host}`;

    if (!checkoutId) return res.status(400).json({ error: "Checkout id is required." });
    if (!amount || amount <= 0) return res.status(400).json({ error: "Payment amount is invalid." });

    const accessToken = await getPayPalAccessToken();
    const paypalResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: checkoutId,
            custom_id: checkoutId,
            description: "STUDIO_FIT checkout",
            amount: {
              currency_code: currency,
              value: amount.toFixed(2)
            }
          }
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "STUDIO_FIT",
              landing_page: "LOGIN",
              user_action: "PAY_NOW",
              return_url: `${origin}/payment-callback.html?checkout_id=${encodeURIComponent(checkoutId)}`,
              cancel_url: `${origin}/checkout.html`
            }
          }
        }
      })
    });

    const payload = await paypalResponse.json();

    if (!paypalResponse.ok) {
      return res.status(400).json({
        error: getPayPalErrorMessage(payload) || "PayPal order creation failed."
      });
    }

    const approvalUrl = payload.links?.find(link => link.rel === "payer-action" || link.rel === "approve")?.href;

    if (!approvalUrl) {
      return res.status(400).json({ error: "PayPal did not return an approval URL." });
    }

    await updateCheckoutIntent(checkoutId, {
      payment_reference: payload.id,
      payment_provider: "paypal",
      payment_status: "created",
      currency
    });

    return res.status(200).json({
      approval_url: approvalUrl,
      order_id: payload.id
    });
  } catch (error) {
    if (error.message === "fetch failed") {
      return res.status(502).json({
        error: "Could not reach PayPal to start checkout. Restart the local project server with network access and try again."
      });
    }

    return res.status(500).json({ error: error.message || "PayPal order creation failed." });
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

async function updateCheckoutIntent(id, patch) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !id) return;

  await fetch(`${supabaseUrl}/rest/v1/store_checkout_intents?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(patch)
  });
}
