const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 3000;

const bestellungenOrdner = path.join(__dirname, "bestellungen");
if (!fs.existsSync(bestellungenOrdner)) fs.mkdirSync(bestellungenOrdner);

app.use(express.static("public"));
app.use(express.json());

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/live.html", (req, res) => res.sendFile(path.join(__dirname, "public/live.html")));

let letzteStunde = null;
let bestellNr = 1;

app.post("/bestellung", (req, res) => {
  const daten = req.body;
  const jetzt = new Date();
  const datum = jetzt.toISOString().split("T")[0];
  const stunde = jetzt.getHours();

  if (letzteStunde !== stunde) {
    bestellNr = 1;
    letzteStunde = stunde;
  }

  const dateiname = `bestellung_${datum}_${String(bestellNr).padStart(3, "0")}.txt`;
  const pfad = path.join(bestellungenOrdner, dateiname);
  const text = [
    `Bestellnummer: ${bestellNr}`,
    `Datum: ${datum}`,
    `Uhrzeit: ${jetzt.toLocaleTimeString()}`,
    `Tisch: ${daten.table}`,
    `Name: ${daten.name}`,
    `Bemerkung: ${daten.comment}`,
    "",
    ...daten.items.map(item =>
      `- ${item.quantity} × ${item.name} (${item.hersteller}) = ${(item.quantity * item.price).toFixed(2)} €`
    ),
    "",
    `Gesamtpreis: ${daten.total.toFixed(2)} €`
  ].join("\n");

  fs.writeFileSync(pfad, text, "utf8");
  io.emit("neue_bestellung", daten);
  bestellNr++;

  res.json({ success: true, dateiname });
});

io.on("connection", socket => {
  console.log("📡 Neue Live-Ansicht verbunden");
});

http.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});