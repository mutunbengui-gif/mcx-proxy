const express = require("express");
const axios = require("axios");
const qs = require("qs");
require("dotenv").config();

const app = express();
app.use(express.json());

// ===============================
// CACHE TOKEN (evita chamadas repetidas)
// ===============================
let cachedToken = null;
let tokenExpiresAt = null;

// ===============================
// GERAR TOKEN EMIS
// ===============================
async function getToken() {
  const now = Date.now();

  // usa cache se ainda válido
  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken;
  }

  const data = qs.stringify({
    grant_type: "password",
    client_id: process.env.EMIS_CLIENT_ID,
    client_secret: process.env.EMIS_CLIENT_SECRET,
    password: process.env.EMIS_PASSWORD,
    user_email: process.env.EMIS_EMAIL
  });

  try {
    const response = await axios.post(
      process.env.EMIS_AUTH_URL,
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    cachedToken = response.data.access_token;

    // fallback 50 min
    tokenExpiresAt = now + 50 * 60 * 1000;

    return cachedToken;

  } catch (err) {
    console.error("Erro token EMIS:", err.response?.data || err.message);
    throw new Error("Falha ao obter token EMIS");
  }
}

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.json({ status: "MCX Proxy running" });
});

// ===============================
// ENDPOINT PAGAMENTO MCX EXPRESS
// ===============================
app.post("/mcx/pay", async (req, res) => {
  try {
    const token = await getToken();

    const paymentPayload = req.body;

    const response = await axios.post(
      "https://COLOCAR_ENDPOINT_PAGAMENTO_MCX_AQUI",
      paymentPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error("Erro pagamento:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MCX Proxy running on port ${PORT}`);
});
