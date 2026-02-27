import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { parseFcaWindowSticker } from './pdfParser.js'
// @ts-expect-error - Provided by wrangler
import manifest from '__STATIC_CONTENT_MANIFEST'

const app = new Hono()

app.use('*', cors())

app.get('/api/vin/:vin', async (c) => {
  const vin = c.req.param('vin').toUpperCase();

  if (vin.length !== 17) {
    return c.json({ error: "Invalid VIN length" }, 400);
  }

  try {
    const fcaUrl = `https://www.chrysler.com/hostd/windowsticker/getWindowStickerPdf.do?vin=${vin}`
    
    // First, let's just proxy the FCA URL to our free PDF to text parsing API (PDF.co or similar). 
    // Since we don't have an API key, we will use a public parsing service or fallback to prompting the user
    // We will use the free pdftotext.com API or similar if available, otherwise we will need to rethink this approach.

    // A reliable approach without third-party API keys is to use the unpkg CDN to load pdf.js in the worker directly
    // but Cloudflare limits execution time.
    
    // Let's proxy the file first to ensure we can get it
    const response = await fetch(fcaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    if (!response.ok) {
       return c.json({ error: "Failed to fetch from FCA servers." }, response.status);
    }
    
    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength < 5000) {
        return c.json({ error: "Window sticker not found for this VIN. This service currently supports modern Alfa Romeo vehicles (Giulia, Stelvio, Tonale) sold in the USA." }, 404);
    }

    // Since pdf-parse is purely for Node and pdf.js is too heavy for Cloudflare Workers (often hitting limits),
    // and we cannot use Node.js polyfills easily here, the best approach for Cloudflare Pages is to 
    // proxy the PDF to the client and parse it ON THE CLIENT SIDE using pdf.js.

    // Return the raw PDF bytes with CORS headers so the frontend can download and parse it
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (err) {
    console.error(`SERVER ERROR for VIN ${vin}:`, err.message);
    return c.json({ error: "Service temporarily unavailable. Please try again later.", details: err.message }, 500);
  }
})

// Serve static assets from the KV namespace created by Wrangler [site]
app.get('/*', serveStatic({ root: './', manifest }))
app.get('/', serveStatic({ path: 'index.html', manifest }))

export default app
