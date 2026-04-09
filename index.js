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
 * CHARGE (QR CODE)
 * =========================
 */
app.post("/charge", async (req, res) => {
  try {
    const token = req.headers.authorization;

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
      notify: {
        callbackUrl: {
          value:
            req.body.callbackUrl ||
            "https://webhook.site/8e462f9d-51e3-41a7-a3af-fe40723ba947",
          active: true
        },
        mobile: {
          value: req.body.mobile || 924061515,
          active: true
        },
        email: {
          value: req.body.email || "mutu.n.bengui@gmail.com",
          active: false
        }
      }
    };

    console.log("CHARGE TOKEN:", token);
    console.log("CHARGE PAYLOAD:", JSON.stringify(payload, null, 2));

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
 * PAYMENT - MOBILE
 * =========================
 */
app.post("/payments/mobile", async (req, res) => {
  try {
    const token = req.headers.authorization;

    const payload = {
      amount: req.body.amount,
      orderOrigin: "MOBILE",
      merchantReferenceNumber: req.body.reference,
      currency: "AOA",
      paymentInfo: {
        mobile: {
          phoneNumber: req.body.phoneNumber
        }
      }
    };

    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v1/points-of-sale/1405/payments",
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

    console.log("PAYMENT MOBILE STATUS:", response.status);
    console.log("PAYMENT MOBILE RESPONSE:", text);

    return res.status(response.status).send(text);

  } catch (err) {
    console.error("PAYMENT MOBILE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * PAYMENT - AUTHORIZATION
 * =========================
 */
app.post("/payments/authorization", async (req, res) => {
  try {
    const token = req.headers.authorization;

    const payload = {
      amount: req.body.amount,
      orderOrigin: "MOBILE",
      merchantReferenceNumber: req.body.reference,
      paymentInfo: {
        mobile: {
          phoneNumber: req.body.phoneNumber
        }
      }
    };

    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v1/points-of-sale/1405/authorizations",
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

    console.log("AUTH STATUS:", response.status);
    console.log("AUTH RESPONSE:", text);

    return res.status(response.status).send(text);

  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * =========================
 * DEEPLINK BUILDER
 * =========================
 */
function buildMCXDeepLink(qrref, callbackUrl) {
  const base = "mcxwallet://purchase";

  const params = new URLSearchParams();
  params.append("qrref", qrref);

  if (callbackUrl) {
    params.append("callback_url", callbackUrl);
  }

  return `${base}?${params.toString()}`;
}

/**
 * =========================
 * DEEPLINK FROM CHARGES
 * =========================
 */
app.post("/deeplink", async (req, res) => {
  try {
    const token = req.headers.authorization;

    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v2/merchants/1275/charges",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
          "Accept": "text/plain"
        },
        body: JSON.stringify(req.body)
      }
    );

    const qrref = await response.text();

    console.log("QRREF:", qrref);

    const deeplink = buildMCXDeepLink(
      qrref,
      req.body.callbackUrl
    );

    console.log("DEEPLINK:", deeplink);

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
