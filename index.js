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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHARGE
app.post("/charge", async (req, res) => {
  try {
    const token = req.headers.authorization;

    const response = await fetch(
      "https://cerpagamentonline.emis.co.ao/online-payment-gateway/api/v1/merchants/1275/charges",
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

    const data = await response.text();
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("MCX Proxy no Render 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
