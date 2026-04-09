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
 * TOKEN CACHE (IMPORTANTE)
 * =========================
 */
let cachedToken = null;
let tokenExpiresAt = null;

/**
 * =========================
 * GET TOKEN (AUTO)
 * =========================
 */
async function getToken() {
  const now = Date.now();

  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.post(TOKEN_URL, {
    grant_type: "password",
    client_id: process.env.MCX_CLIENT_ID,
    client_secret: process.env.MCX_CLIENT_SECRET,
    password: process.env.MCX_PASSWORD,
    user_email: process.env.MCX_USER_EMAIL
  });

  cachedToken = response.data.access_token;

  // fallback: 50 min cache
  tokenExpiresAt = now + 50 * 60 * 1000;

  return cachedToken;
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
 * 1. CREATE CHARGE (V1 MCX EXPRESS)
 * =========================
 */
app.post("/mcx/charge", async (req, res) => {
  try {
    const token = await getToken();

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

    const qrref = response.data;

    const callbackUrl =
      req.body?.notify?.callbackUrl?.value ||
      "https://mcx-proxy.onrender.com/mcx/callback";

    payments[qrref] = {
      status: "PENDING",
      createdAt: new Date().toISOString()
    };

    const deeplink = buildDeeplink(qrref, callbackUrl);

    res.json({
      success: true,
      qrref,
      deeplink
    });
  } catch (err) {
    console.error("CHARGE ERROR:", err.response?.data || err.message);

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
});

/**
 * =========================
 * 2. MOBILE PAYMENT
 * =========================
 */
app.post("/mcx/payments/mobile", async (req, res) => {
  try {
    const token = await getToken();

    const response = await axios.post(
      `${BASE_URL}/api/v1/points-of-sale/1405/payments`,
      {
        amount: req.body.amount,
        orderOrigin: "MOBILE",
        merchantReferenceNumber: req.body.reference,
        currency: "AOA",
        paymentInfo: {
          mobile: {
            phoneNumber: req.body.phoneNumber
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

/**
 * =========================
 * 3. AUTHORIZATION
 * =========================
 */
app.post("/mcx/payments/authorization", async (req, res) => {
  try {
    const token = await getToken();

    const response = await axios.post(
      `${BASE_URL}/api/v1/points-of-sale/1405/authorizations`,
      {
        amount: req.body.amount,
        orderOrigin: "MOBILE",
        merchantReferenceNumber: req.body.reference,
        paymentInfo: {
          mobile: {
            phoneNumber: req.body.phoneNumber
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

/**
 * =========================
 * 4. CALLBACK MCX
 * =========================
 */
app.post("/mcx/callback", (req, res) => {
  const data = req.body;

  console.log("MCX CALLBACK:", data);

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
 * 5. STATUS CHECK
 * =========================
 */
app.get("/status/:ref", (req, res) => {
  const ref = req.params.ref;

  const payment = payments[ref];

  if (!payment) {
    return res.json({ status: "NOT_FOUND" });
  }

  res.json({
    status: payment.status
  });
});

/**
 * =========================
 * 6. CALLBACKS LIST
 * =========================
 */
app.get("/callbacks", (req, res) => {
  res.json(callbacks);
});

/**
 * =========================
 * HOME
 * =========================
 */
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
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
