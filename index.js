import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * =========================
 * "BASE DE DADOS" (MEMÓRIA)
 * =========================
 */
const transactions = {};
const callbacks = [];

/**
 * =========================
 * TOKEN
 * =========================
 */
app.post("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    const text = await response.text();

    console.log("TOKEN:", text);

    return res.status(response.status).send(text);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * DEEPLINK (CORE)
 * =========================
 */
app.post("/deeplink", async (req, res) => {
  try {
    const tokenRaw = req.headers.authorization;

    if (!tokenRaw) {
      return res.status(401).json({ error: "Missing Authorization" });
    }

    const token = tokenRaw.startsWith("Bearer ")
      ? tokenRaw
      : `Bearer ${tokenRaw}`;

    const reference = req.body.reference;

    const payload = {
      amount: req.body.amount,
      config: {
        viewType: "QR_CODE",
        reference: reference,
        size: "LARGE",
        description: req.body.description || "Pagamento MCX",
        type: "DYNAMIC"
      },
      posId: req.body.posId || "2096",
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
          "Authorization": token,
          "Accept": "text/plain"
        },
        body: JSON.stringify(payload)
      }
    );

    const qrref = await response.text();

    // guardar transação
    transactions[reference] = {
      status: "PENDING",
      amount: req.body.amount,
      qrref,
      createdAt: new Date()
    };

    const callback =
      req.body.callbackUrl ||
      `https://mcx-proxy.onrender.com/return.html?ref=${reference}`;

    const deeplink =
      `mcxwallet://purchase?qrref=${qrref}` +
      `&callback_url=${encodeURIComponent(callback)}`;

    return res.json({ qrref, deeplink });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * WEBHOOK EMIS
 * =========================
 */
app.post("/webhook/emis", (req, res) => {
  try {
    const data = req.body;

    console.log("🔥 CALLBACK:", JSON.stringify(data, null, 2));

    callbacks.push({
      receivedAt: new Date(),
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
    return res.sendStatus(500);
  }
});

/**
 * =========================
 * CONSULTAR ESTADO
 * =========================
 */
app.get("/status/:reference", (req, res) => {
  const tx = transactions[req.params.reference];

  if (!tx) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json(tx);
});

/**
 * =========================
 * LISTAR CALLBACKS
 * =========================
 */
app.get("/callbacks", (req, res) => {
  return res.json(callbacks);
});

/**
 * =========================
 * STATIC FILES (FRONTEND)
 * =========================
 */
app.use(express.static("public"));

/**
 * =========================
 * START
 * =========================
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
