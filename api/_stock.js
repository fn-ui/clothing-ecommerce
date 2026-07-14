async function decrementStockForCheckout(checkout, supabaseUrl, serviceRoleKey) {
  if (!checkout || checkout.status === "paid") return { ok: true };

  const items = Array.isArray(checkout.items) ? checkout.items : [];
  const quantitiesByProduct = new Map();
  const quantitiesByVariant = new Map();

  items.forEach(item => {
    const productId = String(item.id || "").trim();
    const variantId = String(item.variant_id || item.variantId || "").trim();
    const quantity = Math.max(1, Number(item.quantity || 1));

    if (isUuid(variantId)) {
      quantitiesByVariant.set(variantId, (quantitiesByVariant.get(variantId) || 0) + quantity);
    }

    if (isUuid(productId)) {
      quantitiesByProduct.set(productId, (quantitiesByProduct.get(productId) || 0) + quantity);
    }
  });

  for (const [variantId, quantity] of quantitiesByVariant.entries()) {
    const variantResult = await decrementVariantStock(variantId, quantity, supabaseUrl, serviceRoleKey);
    if (!variantResult.ok) return variantResult;
  }

  for (const [productId, quantity] of quantitiesByProduct.entries()) {
    const productResult = await decrementProductStock(productId, quantity, supabaseUrl, serviceRoleKey);
    if (!productResult.ok) return productResult;
  }

  return { ok: true };
}

async function decrementVariantStock(variantId, quantity, supabaseUrl, serviceRoleKey) {
  const variantResponse = await fetch(
    `${supabaseUrl}/rest/v1/store_product_variants?id=eq.${encodeURIComponent(variantId)}&select=id,stock`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!variantResponse.ok) {
    const message = await variantResponse.text();
    return {
      ok: false,
      error: message || `Variant stock lookup failed for variant ${variantId}.`
    };
  }

  const [variant] = await variantResponse.json();
  if (!variant) return { ok: true };

  const currentStock = Math.max(0, Number(variant.stock || 0));
  const nextStock = Math.max(0, currentStock - quantity);

  const updateResponse = await fetch(
    `${supabaseUrl}/rest/v1/store_product_variants?id=eq.${encodeURIComponent(variantId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ stock: nextStock })
    }
  );

  if (!updateResponse.ok) {
    const message = await updateResponse.text();
    return {
      ok: false,
      error: message || `Variant stock update failed for variant ${variantId}.`
    };
  }

  return { ok: true };
}

async function decrementProductStock(productId, quantity, supabaseUrl, serviceRoleKey) {
  const productResponse = await fetch(
    `${supabaseUrl}/rest/v1/store_products?id=eq.${encodeURIComponent(productId)}&select=id,stock`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!productResponse.ok) {
    const message = await productResponse.text();
    return {
      ok: false,
      error: message || `Stock lookup failed for product ${productId}.`
    };
  }

  const [product] = await productResponse.json();
  if (!product) return { ok: true };

  const currentStock = Math.max(0, Number(product.stock || 0));
  const nextStock = Math.max(0, currentStock - quantity);

  const updateResponse = await fetch(
    `${supabaseUrl}/rest/v1/store_products?id=eq.${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ stock: nextStock })
    }
  );

  if (!updateResponse.ok) {
    const message = await updateResponse.text();
    return {
      ok: false,
      error: message || `Stock update failed for product ${productId}.`
    };
  }

  return { ok: true };
}

async function fetchCheckoutIntent(filter, supabaseUrl, serviceRoleKey) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/store_checkout_intents?${filter}&select=id,status,items`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!response.ok) return null;

  const [checkout] = await response.json();
  return checkout || null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

module.exports = {
  decrementStockForCheckout,
  fetchCheckoutIntent
};
