export function parseFcaWindowSticker(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const result = {
    model: "",
    year: "",
    vin: "",
    engine: "",
    transmission: "",
    exterior_color: "",
    interior_color: "",
    interior_material: "",
    base_price: "",
    destination_charge: "",
    msrp: "",
    warranty: {
        basic: "",
        powertrain: ""
    },
    assembly_point: "",
    origin: {
        engine: "",
        transmission: ""
    },
    notices: [],
    packages: [],
    options: [],
  };

  let section = null;
  const boilerplateKeywords = [
    "FOR MORE INFO", "SHIP TO:", "SOLDTO:", "VIN:", "S.L.", "L4–VON", "1221", 
    "THIS LABEL IS ADDED", "OR ALTERED PRIOR", "STATE AND/OR LOCAL TAXES", 
    "INSTALLED OPTIONS AND ACCESSORIES", "DISCOUNT, IF ANY", "www.AlfaRomeoUSA.com",
    "FCA US LLC", "Bumper Performance"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // -------- Sections
    if (/STANDARD EQUIPMENT/i.test(line)) {
      section = "standard";
      continue;
    }
    if (/OPTIONAL EQUIPMENT/i.test(line)) {
      section = "options";
      continue;
    }
    
    // Stop parsing equipment if we reach these sections
    if (/WARRANTY COVERAGE|FUEL ECONOMY|EPA|PARTS CONTENT|GOVERNMENT 5–STAR|SAFETY RATINGS/i.test(line)) {
        section = "footer";
        continue;
    }

    if (/TOTAL PRICE/i.test(line)) {
      const msrpMatch = line.match(/\$([\d,]+)/);
      if (msrpMatch) result.msrp = msrpMatch[1];
      continue;
    }

    // -------- Vehicle Info
    if (/(\d{4})\s*MODEL YEAR/i.test(line)) {
        result.year = line.match(/(\d{4})/)[1];
    }
    
    if (/^VIN:/i.test(line) || /^[A-Z0-9]{17}$/.test(line)) {
        const vinMatch = line.match(/[A-Z0-9]{17}/);
        if (vinMatch) result.vin = vinMatch[0];
    }

    if (/Base Price:\s*\$([\d,]+)/i.test(line)) {
        result.base_price = line.match(/\$([\d,]+)/)[1];
    }

    // Improved Model Detection
    if (!result.model && line.includes("ALFA") && (line.includes("GIULIA") || line.includes("STELVIO") || line.includes("TONALE"))) {
        result.model = line.replace(/\s{2,}/g, ' ').trim();
    }

    if (!result.engine && /Engine:\s*(.*)/i.test(line)) {
        const val = line.match(/Engine:\s*(.*)/i)[1].trim();
        if (val.length > 5) result.engine = val;
    }
    if (!result.transmission && /Transmission:\s*(.*)/i.test(line)) {
        const val = line.match(/Transmission:\s*(.*)/i)[1].trim();
        if (val.length > 5) result.transmission = val;
    }

    if (/Exterior Color:\s*(.*)/i.test(line)) {
        result.exterior_color = line.match(/Exterior Color:\s*(.*)/i)[1].trim();
    }
    if (/Interior Color:\s*(.*)/i.test(line)) {
        result.interior_color = line.match(/Interior Color:\s*(.*)/i)[1].trim();
    }
    if (/Interior:\s*(.*)/i.test(line)) {
        result.interior_material = line.match(/Interior:\s*(.*)/i)[1].trim();
    }

    if (/Basic Warranty:\s*(.*)/i.test(line)) {
        result.warranty.basic = line.match(/Basic Warranty:\s*(.*)/i)[1].trim();
    }
    if (/Powertrain Warranty:\s*(.*)/i.test(line)) {
        result.warranty.powertrain = line.match(/Powertrain Warranty:\s*(.*)/i)[1].trim();
    }

    if (/ASSEMBLY POINT/i.test(line)) {
        const parts = line.split(":");
        if (parts[1] && parts[1].trim()) {
            result.assembly_point = parts[1].trim();
        } else if (lines[i + 1] && !lines[i + 1].includes(":")) {
            result.assembly_point = lines[i + 1].trim();
        }
    }

    if (/ENGINE:\s*(.*)/i.test(line) && (section === "footer" || line.length < 20)) {
        result.origin.engine = line.match(/ENGINE:\s*(.*)/i)[1].trim();
    }
    if (/TRANSMISSION:\s*(.*)/i.test(line) && (section === "footer" || line.length < 20)) {
        result.origin.transmission = line.match(/TRANSMISSION:\s*(.*)/i)[1].trim();
    }

    if (/Destination Charge\s*\$([\d,]+)/i.test(line)) {
        result.destination_charge = line.match(/\$([\d,]+)/)[1];
    }

    // -------- Options / Packages
    if (section === "standard" || section === "options") {
      const isHeader = line === line.toUpperCase() && 
                      (line.includes("FEATURES") || line.includes("EQUIPMENT") || 
                       line.includes("INTERIOR") || line.includes("EXTERIOR") || 
                       line.includes("SAFETY"));
      
      const isBoilerplate = boilerplateKeywords.some(key => line.toUpperCase().includes(key.toUpperCase()));

      if (isBoilerplate) {
          result.notices.push(line);
          continue;
      }

      if (isHeader) {
          result.options.push({
              category: line,
              features: []
          });
      } else {
          const priceMatch = line.match(/\$([\d,]+)/);
          if (priceMatch) {
              const name = line.replace(priceMatch[0], "").trim().replace(/^[\s-]*/, "");
              if (name && name.length > 2 && !name.includes("TOTAL PRICE")) {
                  result.packages.push({
                      name: name,
                      price: priceMatch[1]
                  });
              }
          } else if (line.length > 3 && !line.startsWith("$") && !line.includes("Destination Charge")) {
              // Add to the last category or create a default one
              if (result.options.length === 0) {
                  result.options.push({ category: "FEATURES", features: [] });
              }
              result.options[result.options.length - 1].features.push(line.replace(/^[\s-]*/, ""));
          }
      }
    }
  }

  // Fallback for model if not found
  if (!result.model && lines.length > 5) {
      result.model = lines.slice(0, 15).find(l => /GIULIA|STELVIO|TONALE/i.test(l)) || "Alfa Romeo Vehicle";
  }

  return result;
}
