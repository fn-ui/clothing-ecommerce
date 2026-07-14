const { loadLocalEnv } = require("../_load-env");
const { decrementStockForCheckout, fetchCheckoutIntent } = require("../_stock");

module.exports = async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const checkoutRequestId = String(body.checkoutRequestId || "").trim();

    if (!checkoutRequestId) return res.status(400).json({ error: "M-Pesa checkout request id is required." });

    const shortCode = getEnvValue("MPESA_SHORTCODE");
    const passkey = getEnvValue("MPESA_PASSKEY");

    if (!shortCode || !passkey) {
      return res.status(500).json({ error: "MPESA_SHORTCODE or MPESA_PASSKEY is not configured." });
    }

    const timestamp = getDarajaTimestamp();
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
    const accessToken = await getDarajaAccessToken();

    const mpesaResponse = await fetch(`${getDarajaBaseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      })
    });

    const payload = await mpesaResponse.json();

    if (!mpesaResponse.ok) {
      return res.status(400).json({
        error: payload.errorMessage || payload.ResponseDescription || "M-Pesa status query failed."
      });
    }

    const resultCode = payload.ResultCode == null ? null : Number(payload.ResultCode);
    const paid = resultCode === 0;
    const pending = resultCode == null;

    if (!pending) {
      const updateResult = await updateCheckoutIntentByReference(checkoutRequestId, {
        status: paid ? "paid" : "pending",
        payment_provider: "mpesa",
        payment_reference: checkoutRequestId,
        payment_status: paid ? "paid" : `failed_${resultCode}`,
        paid_at: paid ? new Date().toISOString() : null,
        gateway_response: payload.ResultDesc || payload.ResponseDescription || null
      });

      if (!updateResult.ok) {
        return res.status(500).json({
          error: updateResult.error || "M-Pesa status received, but the order status could not be updated."
        });
      }
    }

    return res.status(200).json({
      paid,
      pending,
      status: paid ? "paid" : pending ? "pending" : "failed",
      result_code: resultCode,
      message: payload.ResultDesc || payload.ResponseDescription || "M-Pesa payment is still processing."
    });
  } catch (error) {
    if (error.message === "fetch failed") {
      return res.status(502).json({
        error: `Could not reach Safaricom Daraja from the server.${getNetworkCause(error)}`
      });
    }

    return res.status(500).json({ error: error.message || "M-Pesa status query failed." });
  }
};

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
    throw new Error(payload.errorMessage || payload.error_description || payload.error || "Daraja authentication failed.");
  }

  return payload.access_token;
}

function getDarajaBaseUrl() {
  return getEnvValue("MPESA_ENV") === "live"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
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

function getEnvValue(name) {
  return String(process.env[name] || "").trim();
}

function getNetworkCause(error) {
  const cause = error.cause;
  const details = [cause?.code, cause?.hostname, cause?.message].filter(Boolean).join(" - ");

  return details ? ` Network detail: ${details}` : "";
}

async function updateCheckoutIntentByReference(reference, patch) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return { ok: false, error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured." };

  const filter = `payment_reference=eq.${encodeURIComponent(reference)}`;
  const existingCheckout = await fetchCheckoutIntent(filter, supabaseUrl, serviceRoleKey);

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

  if (patch.status === "paid") {
    const stockResult = await decrementStockForCheckout(existingCheckout, supabaseUrl, serviceRoleKey);
    if (!stockResult.ok) return stockResult;
  }

  return { ok: true };
}
