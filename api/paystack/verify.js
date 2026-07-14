const { loadLocalEnv } = require("../_load-env");
const { decrementStockForCheckout, fetchCheckoutIntent } = require("../_stock");

module.exports = async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: "PAYSTACK_SECRET_KEY is not configured." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const reference = String(body.reference || "").trim();

    if (!reference) return res.status(400).json({ error: "Payment reference is required." });

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`
        }
      }
    );

    const payload = await paystackResponse.json();

    if (!paystackResponse.ok || !payload.status) {
      return res.status(400).json({ error: payload.message || "Payment verification failed." });
    }

    const paid = payload.data.status === "success";
    const checkoutId = payload.data.metadata?.checkout_id;

    const updateResult = await updateCheckoutIntentByReference(reference, {
      status: paid ? "paid" : "pending",
      payment_status: payload.data.status,
      payment_provider: "paystack",
      payment_reference: reference,
      paid_at: paid ? payload.data.paid_at || new Date().toISOString() : null,
      gateway_response: payload.data.gateway_response || null
    }, checkoutId);

    if (!updateResult.ok) {
      return res.status(500).json({
        error: updateResult.error || "Payment verified, but the order status could not be updated in Supabase."
      });
    }

    return res.status(200).json({
      paid,
      status: payload.data.status,
      message: payload.data.gateway_response || payload.message
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Payment verification failed." });
  }
};

async function updateCheckoutIntentByReference(reference, patch, checkoutId) {
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
