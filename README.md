# 🍀 Alfa Romeo VIN Decoder

A high-performance, premium web application designed to decode modern Alfa Romeo Vehicle Identification Numbers (VIN). It provides detailed equipment reports, factory options, and original MSRP summaries by parsing official window sticker data.

![License](https://img.shields.io/badge/license-MIT-red.svg)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-green.svg)

## 🚀 Features

- **Deep VIN Decoding**: Fetches and parses official FCA window stickers.
- **Detailed Specs**: Extracts Engine, Transmission, Exterior/Interior Colors, and Assembly Point.
- **Equipment List**: Categorized standard and optional features (Safety, Interior, Exterior, etc.).
- **Smart Caching**: In-memory caching system to handle high traffic and reduce API dependency.
- **Modern UI**: Dark-mode glassmorphism design with responsive support for mobile and desktop.
- **Monetization Ready**: Integrated ad slots (Top, Bottom, and Sticky Sidebars).
- **SEO Optimized**: Pre-configured meta tags, `robots.txt`, and dynamic `sitemap.xml`.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Axios
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), JavaScript (ES6+)
- **Parsing**: `pdf-parse` for official PDF data extraction
- **Layout**: CSS Grid & Flexbox with separate hardware-accelerated responsive logic

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/alfaVIN.git
   cd alfaVIN
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:3000`.

## 📂 Project Structure

```text
├── public/              # Frontend static files
│   ├── favicon.svg      # Branded SVG logo
│   ├── index.html       # Single-page application template
│   ├── styles.css       # Core design system
│   └── responsive.css   # Mobile-specific overrides
├── server.js            # Express server & Caching logic
├── pdfParser.js         # PDF data extraction logic
└── package.json         # Project metadata & dependencies
```

## ⚖️ Legal Disclaimer

This project is an independent 3rd-party utility and is **not affiliated with, authorized, or endorsed by Stellantis N.V. or Alfa Romeo**. Brand names and trademarks are the property of their respective owners. Data is provided "as is" for informational purposes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.