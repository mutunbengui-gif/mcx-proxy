import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/**
 * ======================
 * CONFIG SEGURA (BACKEND)
 * ======================
 */
const EMIS_TOKEN = process.env.EMIS_TOKEN;

/**
 * MEMÓRIA SIMPLES
 */
const transactions = {};
const callbacks = [];

/**
 * ======================
 * DEEPLINK MCX
 * ======================
 */
app.post("/deeplink", async (req, res) => {
  try {
    if (!EMIS_TOKEN) {
      return res.status(500).json({ error: "Token EMIS não configurado" });
    }

    const { amount, reference } = req.body;

    const payload = {
      amount,
      config: {
        viewType: "QR_CODE",
        reference,
        size: "LARGE",
        description: "Pagamento MCX",
        type: "DYNAMIC"
      },
      posId: "2096",
      notify: {
        callbackUrl: {
          value: "https://mcx-proxy.onrender.com/webhook/emis",
          active: true
        }
      }
    };

    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v1/merchants/1275/charges",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": EMIS_TOKEN,
          "Accept": "text/plain"
        },
        body: JSON.stringify(payload)
      }
    );

    const qrref = await response.text();

    transactions[reference] = {
      status: "PENDING",
      qrref,
      amount,
      createdAt: new Date()
    };

    const deeplink =
      `mcxwallet://purchase?qrref=${qrref}` +
      `&callback_url=https://mcx-proxy.onrender.com/return.html?ref=${reference}`;

    return res.json({ qrref, deeplink });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * ======================
 * WEBHOOK EMIS
 * ======================
 */
app.post("/webhook/emis", (req, res) => {
  try {
    const data = req.body;

    console.log("🔥 CALLBACK RECEBIDO:", data);

    callbacks.push({
      time: new Date(),
      data
    });

    const reference =
      data?.config?.reference ||
      data?.merchantReferenceNumber;

    const status = data?.status;

    if (reference) {
      if (!transactions[reference]) {
        transactions[reference] = {};
      }

      transactions[reference].status = status;
      transactions[reference].updatedAt = new Date();
    }

    return res.sendStatus(200);

  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

/**
 * ======================
 * STATUS PAYMENT
 * ======================
 */
app.get("/status/:reference", (req, res) => {
  const tx = transactions[req.params.reference];

  if (!tx) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json(tx);
});

/**
 * ======================
 * CALLBACKS LIST
 * ======================
 */
app.get("/callbacks", (req, res) => {
  return res.json(callbacks);
});

/**
 * ======================
 * START SERVER
 * ======================
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("MCX Proxy running on port", PORT);
});
