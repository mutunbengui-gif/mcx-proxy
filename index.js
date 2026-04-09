import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("MCX Proxy no Render 🚀");
});

app.post("/token", (req, res) => {
  res.json({
    ok: true,
    route: "/token funcionando",
    body: req.body
  });
});

app.post("/charge", (req, res) => {
  res.json({
    ok: true,
    route: "/charge funcionando",
    body: req.body,
    auth: req.headers.authorization
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
