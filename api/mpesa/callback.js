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
    const callback = body.Body?.stkCallback || {};
    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = Number(callback.ResultCode);
    const metadataItems = callback.CallbackMetadata?.Item || [];
    const receipt = metadataItems.find(item => item.Name === "MpesaReceiptNumber")?.Value || null;
    const paidAt = metadataItems.find(item => item.Name === "TransactionDate")?.Value || null;

    if (!checkoutRequestId) {
      return res.status(400).json({ error: "CheckoutRequestID is required." });
    }

    const paid = resultCode === 0;
    const updateResult = await updateCheckoutIntentByReference(checkoutRequestId, {
      status: paid ? "paid" : "pending",
      payment_provider: "mpesa",
      payment_reference: checkoutRequestId,
      payment_status: paid ? "paid" : `failed_${resultCode}`,
      paid_at: paid ? formatMpesaDate(paidAt) || new Date().toISOString() : null,
      gateway_response: receipt || callback.ResultDesc || null
    });

    if (!updateResult.ok) {
      return res.status(500).json({
        error: updateResult.error || "M-Pesa callback received, but the order status could not be updated."
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "M-Pesa callback failed." });
  }
};

function formatMpesaDate(value) {
  const text = String(value || "");
  if (!/^\d{14}$/.test(text)) return null;

  const year = text.slice(0, 4);
  const month = text.slice(4, 6);
  const day = text.slice(6, 8);
  const hour = text.slice(8, 10);
  const minute = text.slice(10, 12);
  const second = text.slice(12, 14);

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`).toISOString();
}

async function updateCheckoutIntentByReference(reference, patch) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured."
    };
  }

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
