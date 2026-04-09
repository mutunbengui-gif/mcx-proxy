import express from "express";
import axios from "axios";
import qs from "qs";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ==========================
// TOKEN CACHE
// ==========================
let cachedToken = null;
let tokenExpiresAt = null;

// ==========================
// GET EMIS TOKEN
// ==========================
async function getToken() {
  const now = Date.now();

  // usa cache se válido
  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const data = qs.stringify({
      grant_type: "password",
      client_id: process.env.EMIS_CLIENT_ID,
      client_secret: process.env.EMIS_CLIENT_SECRET,
      password: process.env.EMIS_PASSWORD,
      user_email: process.env.EMIS_EMAIL
    });

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

    // fallback segurança (50 min)
    tokenExpiresAt = now + 50 * 60 * 1000;

    return cachedToken;

  } catch (error) {
    console.error("Erro ao gerar token EMIS:", error.response?.data || error.message);
    throw new Error("Falha na autenticação EMIS");
  }
}

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.json({
    status: "MCX Proxy OK",
    time: new Date()
  });
});

// ==========================
// PAYMENT ENDPOINT
// ==========================
app.post("/mcx/pay", async (req, res) => {
  try {
    const token = await getToken();

    const paymentData = req.body;

    const response = await axios.post(
      "https://COLOCAR_ENDPOINT_REAL_MCX_AQUI",
      paymentData,
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

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MCX Proxy running on port ${PORT}`);
});
