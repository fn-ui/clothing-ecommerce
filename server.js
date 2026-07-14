const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);

const apiRoutes = {
  "/api/paypal-create-order": "./api/paypal-create-order",
  "/api/paypal-capture-order": "./api/paypal-capture-order",
  "/api/paypal/create-order": "./api/paypal/create-order",
  "/api/paypal/capture-order": "./api/paypal/capture-order",
  "/api/mpesa-stk-push": "./api/mpesa-stk-push",
  "/api/mpesa-callback": "./api/mpesa-callback",
  "/api/mpesa/stk-push": "./api/mpesa/stk-push",
  "/api/mpesa/callback": "./api/mpesa/callback",
  "/api/paystack/initialize": "./api/paystack/initialize",
  "/api/paystack/verify": "./api/paystack/verify"
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (apiRoutes[url.pathname]) {
      await handleApiRequest(apiRoutes[url.pathname], request, response);
      return;
    }

    serveStaticFile(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

server.listen(port, () => {
  console.log(`STUDIO_FIT running at http://localhost:${port}`);
});

async function handleApiRequest(handlerPath, request, response) {
  const handler = require(handlerPath);
  const bodyText = await readRequestBody(request);
  const apiRequest = {
    method: request.method,
    headers: request.headers,
    body: parseJsonBody(bodyText)
  };

  const apiResponse = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      sendJson(response, this.statusCode, payload, this.headers);
      return this;
    }
  };

  await handler(apiRequest, apiResponse);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function parseJsonBody(bodyText) {
  if (!bodyText) return {};

  try {
    return JSON.parse(bodyText);
  } catch (error) {
    return bodyText;
  }
}

function serveStaticFile(pathname, response) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(response, 404, "Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    response.end(content);
  });
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end(message);
}
