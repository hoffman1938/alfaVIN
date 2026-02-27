const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function testPdfTextExtraction() {
  const data = new Uint8Array(fs.readFileSync('test_sticker.pdf'));
  const loadingTask = pdfjsLib.getDocument({ data: data });
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
          } else if (item.str !== ' ' && item.str !== '') {
              pageText += ' ';
          }
      }
      fullText += pageText + '\n\n';
  }
  
  console.log(fullText.substring(0, 1500));
}

testPdfTextExtraction().catch(console.error);
