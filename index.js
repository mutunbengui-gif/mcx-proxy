import express from "express";
import axios from "axios";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const MERCHANT_ID = "1275";
const BASE_URL =
  "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v1";

// ==========================
// TOKEN (simples placeholder)
// ==========================
async function getToken() {
  return process.env.MCX_TOKEN;
}

// ==========================
// 1. CREATE CHARGE (V1 MCX)
// ==========================
app.post("/mcx/charge", async (req, res) => {
  try {
    const token = await getToken();

    const response = await axios.post(
      `${BASE_URL}/merchants/${MERCHANT_ID}/charges`,
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

    const deeplink = buildDeeplink(qrref, callbackUrl);

    res.json({
      qrref,
      deeplink
    });

  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

// ==========================
// 2. DEEPLINK BUILDER
// ==========================
function buildDeeplink(qrref, callbackUrl) {
  return `mcxwallet://purchase?qrref=${encodeURIComponent(
    qrref
  )}&callback_url=${encodeURIComponent(callbackUrl)}`;
}

// ==========================
// 3. CALLBACK MCX
// ==========================
app.post("/mcx/callback", (req, res) => {
  console.log("MCX CALLBACK RECEIVED:", req.body);

  // aqui ligas ao return.html
  res.redirect("/return.html");
});

// ==========================
// HOME
// ==========================
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("MCX Proxy running on port", PORT);
});
