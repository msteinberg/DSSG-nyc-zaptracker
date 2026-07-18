import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

async function main() {
  const url = "https://s-media.nyc.gov/agencies/dcp/assets/files/pdf/about/commission/public-meetings//2026-07-15cal.pdf";
  console.log("Fetching PDF from:", url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch PDF: ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("PDF downloaded successfully. Size:", buffer.length);

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    console.log("PDF loaded successfully. Number of pages:", pdf.numPages);

    let allText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textObj = await page.getTextContent();
      const pageText = textObj.items.map(item => item.str).join(" ");
      allText += `--- PAGE ${i} ---\n` + pageText + "\n";
    }

    console.log("All text extracted successfully. Total characters:", allText.length);
    
    // Find occurrences of "scheduling"
    const searchStr = "Scheduling projects for the public meeting of";
    const index = allText.toLowerCase().indexOf(searchStr.toLowerCase());
    if (index !== -1) {
      console.log("Found header match!");
      console.log("Context:\n", allText.substring(index, index + 1500));
    } else {
      console.log("Header NOT found directly. Let us search for individual words or parts.");
      const words = ["scheduling", "public meeting", "cpc", "hearing"];
      words.forEach(w => {
        const count = (allText.toLowerCase().match(new RegExp(w, "g")) || []).length;
        console.log(`Word "${w}" occurs ${count} times`);
      });
      // Print first 1000 characters
      console.log("Start snippet:\n", allText.substring(0, 1500));
    }
  } catch (err) {
    console.error("Error running test PDF parse:", err);
  }
}

main();
