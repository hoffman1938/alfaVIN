import express from "express";
import cors from "cors";
import axios from "axios";
import { parseFcaWindowSticker } from "./pdfParser.js";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory cache for VIN reports (VIN -> { data: {}, timestamp: Date })
const vinCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Serve Static Files
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/vin/:vin", async (req, res) => {
  const vin = req.params.vin.toUpperCase();

  if (vin.length !== 17) {
    return res.status(400).json({ error: "Invalid VIN length" });
  }

  // Check Cache
  const cachedEntry = vinCache.get(vin);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
    return res.json({
        ...cachedEntry.data,
        source: "cache"
    });
  }

  try {
    const response = await axios.get(
      `https://www.chrysler.com/hostd/windowsticker/getWindowStickerPdf.do?vin=${vin}`,
      {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
          "Connection": "keep-alive"
        },
        timeout: 10000
      }
    );

    if (response.data.byteLength < 5000) {
        return res.status(404).json({ error: "Window sticker not found for this VIN. This service currently supports modern Alfa Romeo vehicles (Giulia, Stelvio, Tonale) sold in the USA." });
    }

    if (response.headers['content-type'] && !response.headers['content-type'].includes('pdf')) {
        return res.status(404).json({ error: "Vehicle data not available in the official database." });
    }

    const buffer = Buffer.from(response.data);

    // Parse PDF
    let parsedPdf;
    try {
        parsedPdf = await pdf(buffer);
    } catch (parseErr) {
        return res.status(422).json({ error: "The vehicle sticker was found but is unreadable. This can happen with very old or specialty VINs." });
    }

    // Parse Text to Structured Object
    const structured = parseFcaWindowSticker(parsedPdf.text);

    const result = {
      vin,
      source: "live",
      ...structured,
    };

    // Save to Cache
    vinCache.set(vin, {
        data: result,
        timestamp: Date.now()
    });

    res.json(result);
  } catch (err) {
    console.error(`SERVER ERROR for VIN ${vin}:`, err.message);
    res.status(500).json({ error: "Service temporarily unavailable. Please try again later." });
  }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
