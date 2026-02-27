async function loadVin() {
    const vinInput = document.getElementById("vinInput");
    const decodeBtn = document.getElementById("decodeBtn");
    const loader = document.getElementById("loader");
    const errorEl = document.getElementById("error");
    const resultEl = document.getElementById("result");

    const vin = vinInput.value.trim().toUpperCase();
    if (vin.length !== 17) {
        showError("Please enter a valid 17-character VIN");
        return;
    }

    // Reset UI
    errorEl.classList.add("hidden");
    resultEl.classList.add("hidden");
    loader.classList.remove("hidden");
    decodeBtn.disabled = true;

    try {
        // Fetch raw PDF from our Hono proxy worker
        const res = await fetch(`/api/vin/${vin}`);
        if (!res.ok) {
            const errorText = await res.text();
            let errMsg = "Failed to fetch vehicle data";
            try { errMsg = JSON.parse(errorText).error; } catch(e){}
            throw new Error(errMsg);
        }
        
        const arrayBuffer = await res.arrayBuffer();
        
        // Load PDF.js
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDocument = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            
            let pageText = '';
            for (let item of textContent.items) {
                pageText += item.str;
                if (item.hasEOL) {
                    pageText += '\n';
                } else if (item.str !== ' ' && item.str !== '' && !pageText.endsWith(' ')) {
                    pageText += ' ';
                }
            }
            fullText += pageText + '\n\n';
        }
        
        console.log("Extracted PDF Text:", fullText);

        // Parse Text to Structured Object using our parser
        const structured = parseFcaWindowSticker(fullText);
        
        const data = {
            vin,
            source: "client-parse",
            ...structured
        };
        
        renderData(data);
    } catch (err) {
        showError(err.message);
    } finally {
        loader.classList.add("hidden");
        decodeBtn.disabled = false;
    }
}

function showError(msg) {
    const errorEl = document.getElementById("error");
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
}

function renderData(data) {
    const resultEl = document.getElementById("result");
    resultEl.classList.remove("hidden");

    resultEl.innerHTML = `
        <div class="header-info">
            <div class="model-title">${data.year || ''} ${data.model || 'Unknown Model'}</div>
            <div class="spec-label">CHASSIS: ${data.vin}</div>
        </div>

        <div class="section-title">VEHICLE SUMMARY</div>
        <div class="specs-grid">
            <div class="spec-item">
                <span class="spec-label">Engine Spec</span>
                <span class="spec-value">${data.engine || 'N/A'}</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Transmission</span>
                <span class="spec-value">${data.transmission || 'N/A'}</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Exterior Appearance</span>
                <span class="spec-value">${data.exterior_color || 'N/A'}</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Interior Trim</span>
                <span class="spec-value">${data.interior_material || 'N/A'}<br><small style="color:var(--text-secondary)">${data.interior_color || ''}</small></span>
            </div>
        </div>

        <div class="section-title">ORIGIN & MANUFACTURING</div>
        <div class="specs-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="spec-item">
                <span class="spec-label">Final Assembly Point</span>
                <span class="spec-value">${data.assembly_point || 'N/A'}</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Engine Origin</span>
                <span class="spec-value">${data.origin.engine || 'N/A'}</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Transmission Origin</span>
                <span class="spec-value">${data.origin.transmission || 'N/A'}</span>
            </div>
        </div>

        ${data.packages && data.packages.length > 0 ? `
            <div class="section-title">PRICING BREAKDOWN</div>
            <div class="packages-container" style="margin-bottom: 32px;">
                <div class="package-item" style="border-left: 3px solid var(--text-secondary);">
                    <span class="package-name">Base Price</span>
                    <span class="package-price">$${data.base_price || '--'}</span>
                </div>
                ${data.packages.map(p => `
                    <div class="package-item">
                        <span class="package-name">${p.name}</span>
                        <span class="package-price">$${p.price}</span>
                    </div>
                `).join('')}
                ${data.destination_charge ? `
                    <div class="package-item" style="opacity: 0.8;">
                        <span class="package-name">Destination Charge</span>
                        <span class="package-price">$${data.destination_charge}</span>
                    </div>
                ` : ''}
            </div>
        ` : ''}

        <div class="section-title">DETAILED FEATURES</div>
        ${data.options && data.options.length > 0 ? `
            <div class="features-container">
                ${data.options.filter(group => group.features && group.features.length > 0).map(group => `
                    <div class="feature-group">
                        <div class="group-header">${group.category}</div>
                        <ul class="feature-list">
                            ${group.features.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="msrp-footer">
            <div class="warranty-info">
                <div class="spec-label" style="margin-bottom: 8px;">Warranty Coverage</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                    Basic: ${data.warranty.basic || 'N/A'}<br>
                    Powertrain: ${data.warranty.powertrain || 'N/A'}
                </div>
            </div>
            <div style="text-align: right;">
                <span class="msrp-label">TOTAL MSRP</span>
                <span class="msrp-value">$${data.msrp || '--'}</span>
            </div>
        </div>

        ${data.notices && data.notices.length > 0 ? `
            <div class="notices-section">
                ${data.notices.map(n => `<div class="notice-item">${n}</div>`).join('')}
            </div>
        ` : ''}
    `;
}
