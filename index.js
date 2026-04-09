import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// TOKEN
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
    console.log("TOKEN RESPONSE:", text);

    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHARGE
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
          value: req.body.callbackUrl || "https://webhook.site/8e462f9d-51e3-41a7-a3af-fe40723ba947",
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

    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v1/merchants/1275/charges",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
          "Accept": "application/json",
          "Accept": "image/png"
        },
        body: JSON.stringify(payload)
      }
    );

    const text = await response.text();
    console.log("CHARGE RESPONSE:", text);

    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("MCX Proxy no Render 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
