import express from "express";
import axios from "axios";

const app = express();

app.use(express.json());
app.use(express.static("public"));

/**
 * =========================
 * CONFIG
 * =========================
 */
const MERCHANT_ID = "1275";

const BASE_URL =
  "https://cerpagamentonline.emis.co.ao/online-payment-gateway";

const TOKEN_URL = `${BASE_URL}/api/v2/token`;

/**
 * =========================
 * MEMORY STORE (DEV)
 * =========================
 */
const payments = {};
const callbacks = [];

/**
 * =========================
 * TOKEN CACHE
 * =========================
 */
let cachedToken = null;
let expiresAt = null;

/**
 * =========================
 * GET TOKEN (ROBUSTO)
 * =========================
 */
async function getToken() {
  const now = Date.now();

  if (cachedToken && expiresAt && now < expiresAt) {
    return cachedToken;
  }

  try {
    const response = await axios.post(TOKEN_URL, {
      grant_type: "password",
      client_id: process.env.MCX_CLIENT_ID,
      client_secret: process.env.MCX_CLIENT_SECRET,
      password: process.env.MCX_PASSWORD,
      user_email: process.env.MCX_USER_EMAIL
    });

    cachedToken = response.data.access_token;

    // cache seguro 50 min
    expiresAt = now + 50 * 60 * 1000;

    return cachedToken;
  } catch (err) {
    console.error("TOKEN ERROR:", err.response?.data || err.message);
    throw new Error("Falha ao obter token MCX");
  }
}

/**
 * =========================
 * DEEPLINK BUILDER
 * =========================
 */
function buildDeeplink(qrref, callbackUrl) {
  return `mcxwallet://purchase?qrref=${encodeURIComponent(
    qrref
  )}&callback_url=${encodeURIComponent(callbackUrl)}`;
}

/**
 * =========================
 * 1. CHARGE (FIXED + DEBUG)
 * =========================
 */
app.post("/mcx/charge", async (req, res) => {
  try {
    const token = await getToken();

    console.log("➡️ REQUEST BODY:", req.body);

    const response = await axios.post(
      `${BASE_URL}/api/v1/merchants/${MERCHANT_ID}/charges`,
      req.body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "text/plain"
        }
      }
    );

    console.log("➡️ MCX RESPONSE:", response.data);

    const qrref = response.data;

    const callbackUrl =
      req.body?.notify?.callbackUrl?.value ||
      "https://mcx-proxy.onrender.com/mcx/callback";

    payments[qrref] = {
      status: "PENDING",
      createdAt: new Date().toISOString()
    };

    const deeplink = buildDeeplink(qrref, callbackUrl);

    return res.json({
      success: true,
      qrref,
      deeplink
    });

  } catch (err) {
    console.error("❌ CHARGE ERROR:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });

    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
});

/**
 * =========================
 * 2. CALLBACK MCX
 * =========================
 */
app.post("/mcx/callback", (req, res) => {
  const data = req.body;

  console.log("📡 CALLBACK RECEIVED:", data);

  const ref = data.reference || data.qrref;

  callbacks.push({
    ...data,
    receivedAt: new Date().toISOString()
  });

  if (payments[ref]) {
    payments[ref].status = data.status;
  }

  res.json({ received: true });
});

/**
 * =========================
 * 3. STATUS
 * =========================
 */
app.get("/status/:ref", (req, res) => {
  const ref = req.params.ref;

  const payment = payments[ref];

  if (!payment) {
    return res.json({ status: "NOT_FOUND" });
  }

  res.json({ status: payment.status });
});

/**
 * =========================
 * 4. CALLBACK LIST (DEBUG UI)
 * =========================
 */
app.get("/callbacks", (req, res) => {
  res.json(callbacks);
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.send("MCX Proxy OK 🚀");
});

/**
 * =========================
 * START SERVER
 * =========================
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("MCX Proxy running on port", PORT);
});
