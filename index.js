import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

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

    console.log("TOKEN STATUS:", response.status);
    console.log("TOKEN RESPONSE:", text);

    return res.status(response.status).send(text);

  } catch (err) {
    console.error("TOKEN ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * CHARGE (QR JSON)
 * =========================
 */
app.post("/charge", async (req, res) => {
  try {
    const tokenRaw = req.headers.authorization;

    if (!tokenRaw) {
      return res.status(401).json({ error: "Missing Authorization" });
    }

    const token = tokenRaw.startsWith("Bearer ")
      ? tokenRaw
      : `Bearer ${tokenRaw}`;

    const payload = {
      amount: req.body.amount,
      config: {
        viewType: "QR_CODE",
        reference: req.body.reference,
        size: "LARGE",
        description: req.body.description || "MCX Payment",
        type: "DYNAMIC"
      },
      posId: req.body.posId || "2096",
      notify: req.body.notify || {
        callbackUrl: {
          value: "https://webhook.site/8e462f9d-51e3-41a7-a3af-fe40723ba947",
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
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const text = await response.text();

    console.log("CHARGE STATUS:", response.status);
    console.log("CHARGE RESPONSE:", text);

    return res.status(response.status).send(text);

  } catch (err) {
    console.error("CHARGE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * DEEPLINK (QRREF + CALLBACK APP)
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

    const payload = {
      amount: req.body.amount,
      config: {
        viewType: "QR_CODE",
        reference: req.body.reference,
        size: "LARGE",
        description: req.body.description || "MCX Deeplink Payment",
        type: "DYNAMIC"
      },
      posId: req.body.posId || "2096",
      notify: req.body.notify // 👈 webhook EMIS (opcional mas importante)
    };

    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v1/merchants/1275/charges",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
          "Accept": "text/plain" // 🔥 devolve QRREF
        },
        body: JSON.stringify(payload)
      }
    );

    const qrref = await response.text();

    console.log("DEEPLINK STATUS:", response.status);
    console.log("QRREF:", qrref);

    // 🔗 CALLBACK DA APP (deeplink)
    const callback =
      req.body.callbackUrl || "myapp://callback";

    const deeplink =
      `mcxwallet://purchase?qrref=${qrref}` +
      `&callback_url=${encodeURIComponent(callback)}`;

    return res.json({
      qrref,
      deeplink
    });

  } catch (err) {
    console.error("DEEPLINK ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.send("MCX Proxy no Render 🚀");
});

/**
 * =========================
 * START SERVER
 * =========================
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
