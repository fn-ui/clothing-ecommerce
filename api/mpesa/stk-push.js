const { loadLocalEnv } = require("../_load-env");

module.exports = async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const checkoutId = String(body.checkoutId || "").trim();
    const phone = normalizeMpesaPhone(body.phone);
    const amount = Number(body.amount || 0);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    if (!checkoutId) return res.status(400).json({ error: "Checkout id is required." });
    if (!phone) return res.status(400).json({ error: "A valid Safaricom phone number is required." });
    if (!amount || amount <= 0) return res.status(400).json({ error: "Payment amount is invalid." });

    const shortCode = getEnvValue("MPESA_SHORTCODE");
    const passkey = getEnvValue("MPESA_PASSKEY");
    const callbackUrl = getEnvValue("MPESA_CALLBACK_URL") || `${origin}/api/mpesa/callback`;

    if (!shortCode || !passkey) {
      return res.status(500).json({ error: "MPESA_SHORTCODE or MPESA_PASSKEY is not configured." });
    }

    const timestamp = getDarajaTimestamp();
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
    const accessToken = await getDarajaAccessToken();

    const mpesaResponse = await fetch(`${getDarajaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: getEnvValue("MPESA_TRANSACTION_TYPE") || "CustomerPayBillOnline",
        Amount: Math.ceil(amount),
        PartyA: phone,
        PartyB: getEnvValue("MPESA_PARTY_B") || shortCode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: checkoutId.slice(0, 12),
        TransactionDesc: "STUDIO_FIT order"
      })
    });

    const payload = await mpesaResponse.json();

    if (!mpesaResponse.ok || payload.ResponseCode !== "0") {
      return res.status(400).json({
        error: payload.errorMessage || payload.ResponseDescription || "M-Pesa STK Push failed."
      });
    }

    await updateCheckoutIntent(checkoutId, {
      payment_provider: "mpesa",
      payment_reference: payload.CheckoutRequestID,
      payment_status: "stk_push_sent",
      gateway_response: payload.ResponseDescription || null
    });

    return res.status(200).json({
      merchant_request_id: payload.MerchantRequestID,
      checkout_request_id: payload.CheckoutRequestID,
      message: payload.CustomerMessage || payload.ResponseDescription || "M-Pesa prompt sent."
    });
  } catch (error) {
    if (error.message === "fetch failed") {
      return res.status(502).json({
        error: `Could not reach Safaricom Daraja from the server. Check MPESA_ENV, redeploy environment variables, and confirm outbound HTTPS is available.${getNetworkCause(error)}`
      });
    }

    return res.status(500).json({ error: error.message || "M-Pesa STK Push failed." });
  }
};

function getNetworkCause(error) {
  const cause = error.cause;
  const details = [cause?.code, cause?.hostname, cause?.message].filter(Boolean).join(" - ");

  return details ? ` Network detail: ${details}` : "";
}

async function getDarajaAccessToken() {
  const consumerKey = getEnvValue("MPESA_CONSUMER_KEY");
  const consumerSecret = getEnvValue("MPESA_CONSUMER_SECRET");

  if (!consumerKey || !consumerSecret) {
    throw new Error("MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not configured.");
  }

  const response = await fetch(`${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`
    }
  });

  const payload = await response.json();

  if (!response.ok || !payload.access_token) {
    throw new Error(getDarajaAuthError(payload));
  }

  return payload.access_token;
}

function getDarajaBaseUrl() {
  return getEnvValue("MPESA_ENV") === "live"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function getEnvValue(name) {
  return String(process.env[name] || "").trim();
}

function getDarajaAuthError(payload) {
  const message = payload.errorMessage || payload.error_description || payload.error || "Daraja authentication failed.";

  if (/wrong credentials/i.test(message)) {
    return "Daraja rejected MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET. Confirm they come from the same Safaricom app as MPESA_ENV.";
  }

  return message;
}

function getDarajaTimestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

function normalizeMpesaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (/^2547\d{8}$/.test(digits) || /^2541\d{8}$/.test(digits)) return digits;
  if (/^07\d{8}$/.test(digits) || /^01\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits) || /^1\d{8}$/.test(digits)) return `254${digits}`;

  return "";
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
