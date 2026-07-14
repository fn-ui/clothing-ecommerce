module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const imageUrl = getImageUrl(req);

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required." });
  }

  try {
    const parsedUrl = new URL(imageUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: "Only HTTP image URLs are supported." });
    }

    const upstream = await fetch(parsedUrl);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Image could not be loaded." });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return res.status(400).json({ error: "URL is not an image." });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(buffer.length));

    res.status(200);
    return sendBinary(res, buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Image proxy failed." });
  }
};

function getImageUrl(req) {
  if (req.query?.url) {
    return Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  }

  try {
    const host = req.headers.host || "localhost";
    const requestUrl = new URL(req.url || "", `http://${host}`);
    return requestUrl.searchParams.get("url");
  } catch (error) {
    return "";
  }
}

function sendBinary(res, buffer) {
  if (typeof res.send === "function") {
    return res.send(buffer);
  }

  return res.end(buffer);
}
