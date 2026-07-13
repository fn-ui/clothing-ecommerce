const { loadLocalEnv } = require("../_load-env");

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
    const email = String(body.email || "").trim().toLowerCase();
    const amount = Number(body.amount || 0);
    const currency = process.env.PAYSTACK_CURRENCY || body.currency || "KES";
    const checkoutId = String(body.checkoutId || "");
    const origin = req.headers.origin || `https://${req.headers.host}`;

    if (!email) return res.status(400).json({ error: "Customer email is required." });
    if (!amount || amount <= 0) return res.status(400).json({ error: "Payment amount is invalid." });
    if (!checkoutId) return res.status(400).json({ error: "Checkout id is required." });

    const reference = `sf_${checkoutId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}_${Date.now()}`;

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        currency,
        reference,
        callback_url: `${origin}/payment-callback.html`,
        metadata: {
          checkout_id: checkoutId,
          customer_name: body.customerName || "",
          source: "studio_fit_checkout"
        }
      })
    });

    const payload = await paystackResponse.json();

    if (!paystackResponse.ok || !payload.status) {
      return res.status(400).json({
        error: payload.message || "Paystack initialization failed."
      });
    }

    await updateCheckoutIntent(checkoutId, {
      payment_reference: reference,
      payment_provider: "paystack",
      payment_status: "initialized"
    });

    return res.status(200).json({
      authorization_url: payload.data.authorization_url,
      reference: payload.data.reference
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Payment initialization failed." });
  }
};

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
