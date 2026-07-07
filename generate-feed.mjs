// Robottino feed "nuovi arrivi" per le email Brevo di Tessiland.
// Legge i prodotti da Brevo, filtra e scrive nuovi-arrivi.json.
import { writeFileSync } from "node:fs";

const KEY = process.env.BREVO_API_KEY;
if (!KEY) { console.error("Manca il segreto BREVO_API_KEY"); process.exit(1); }

const EXCLUDE_CATEGORIES = ["196", "364"]; // 196 = merchandising (magliette), 364 = chiodini/schiaccini
const JUNK_NAME = /t-?shirt|video tutorial|qr\s?code|qrcode/i;
const MIN_PRICE = 3;   // scarta la minuteria sotto i 3 euro
const N = 6;           // quanti prodotti mostrare

const url = "https://api.brevo.com/v3/products?limit=100&offset=0&sort=desc&sortByField=created_at&isDeleted=false";
const res = await fetch(url, { headers: { "api-key": KEY, accept: "application/json" } });
if (!res.ok) { console.error("Errore API Brevo:", res.status, await res.text()); process.exit(1); }
const data = await res.json();
const products = Array.isArray(data.products) ? data.products : [];

const clean = products.filter((p) => {
  if (!p || p.isDeleted) return false;
  if (typeof p.price !== "number" || p.price < MIN_PRICE) return false;
  if (JUNK_NAME.test(p.name || "")) return false;
  const cats = (p.categories || []).map(String);
  if (cats.some((c) => EXCLUDE_CATEGORIES.includes(c))) return false;
  if (!(p.s3Original || p.imageUrl)) return false;
  return true;
});

const items = clean.slice(0, N).map((p) => ({
  name: p.name,
  url: p.url,
  image: String(p.s3Original || p.imageUrl).replace(/^http:/, "https:"),
  price: p.price.toFixed(2).replace(".", ",") + " €",
}));

const out = { updated: new Date().toISOString(), count: items.length, items };
writeFileSync("nuovi-arrivi.json", JSON.stringify(out, null, 2));
console.log("Scritti " + items.length + " prodotti in nuovi-arrivi.json");
