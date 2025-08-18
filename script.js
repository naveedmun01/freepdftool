<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Editor</title>
  <link rel="stylesheet" href="style.css">
  <style>
    #pdf-canvas {
      border: 1px solid #ddd;
      width: 100%;
      min-height: 500px;
      background: #fff;
    }
    .toolbar button {
      margin: 5px;
      padding: 6px 12px;
      border-radius: 5px;
      border: none;
      cursor: pointer;
      background: #4f46e5;
      color: white;
    }
    .toolbar input {
      padding: 5px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <nav>
    <ul>
      <li><a href="index.html">Home</a></li>
      <li><a href="merge.html">Merge PDF</a></li>
      <li><a href="split.html">Split PDF</a></li>
      <li><a href="compress.html">Compress PDF</a></li>
      <li><a href="jpeg-to-pdf.html">JPEG to PDF</a></li>
      <li><a href="editor.html">PDF Editor</a></li>
    </ul>
  </nav>

  <div class="container">
    <h2>Edit PDF</h2>
    <input type="file" id="pdf-upload" />
    <div class="toolbar">
      <button id="prev-page">Prev</button>
      <button id="next-page">Next</button>
      <button id="add-text">Text</button>
      <button id="add-rect">Rectangle</button>
      <button id="add-highlight">Highlight</button>
      <button id="undo">Undo</button>
      <button id="save-pdf">Save Edited PDF</button>
      <input type="text" id="text-input" placeholder="Enter text here">
    </div>
    <canvas id="pdf-canvas"></canvas>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="script-editor.js"></script>
</body>
</html>
// --- Utility function ---
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== JPG to PDF ==========
document.getElementById("btnJpg")?.addEventListener("click", async () => {
  const files = document.getElementById("jpgFiles").files;
  if (!files.length) return alert("Select JPG files first!");

  const pdfDoc = await PDFLib.PDFDocument.create();
  for (let f of files) {
    const bytes = await f.arrayBuffer();
    const img = await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const pdfBytes = await pdfDoc.save();
  downloadBlob(new Blob([pdfBytes]), "converted.pdf");
});

// ========== Merge PDFs ==========
document.getElementById("btnMerge")?.addEventListener("click", async () => {
  const files = document.getElementById("mergeFiles").files;
  if (files.length < 2) return alert("Select at least 2 PDFs!");

  const merged = await PDFLib.PDFDocument.create();
  for (let f of files) {
    const bytes = await f.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const copiedPages = await merged.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(p => merged.addPage(p));
  }
  const pdfBytes = await merged.save();
  downloadBlob(new Blob([pdfBytes]), "merged.pdf");
});

// ========== Split / Extract ==========
document.getElementById("btnSplit")?.addEventListener("click", async () => {
  const file = document.getElementById("splitFile").files[0];
  if (!file) return alert("Select a PDF!");
  const ranges = document.getElementById("splitRanges").value;
  if (!ranges) return alert("Enter page ranges!");

  const src = await PDFLib.PDFDocument.load(await file.arrayBuffer());
  const newPdf = await PDFLib.PDFDocument.create();

  const pagesToExtract = [];
  ranges.split(",").forEach(r => {
    if (r.includes("-")) {
      let [s, e] = r.split("-").map(n => parseInt(n.trim()) - 1);
      for (let i = s; i <= e; i++) pagesToExtract.push(i);
    } else {
      pagesToExtract.push(parseInt(r.trim()) - 1);
    }
  });

  const copied = await newPdf.copyPages(src, pagesToExtract);
  copied.forEach(p => newPdf.addPage(p));

  const pdfBytes = await newPdf.save();
  downloadBlob(new Blob([pdfBytes]), "extracted.pdf");
});

// ========== Compress PDF ==========
document.getElementById("btnCompress")?.addEventListener("click", async () => {
  const file = document.getElementById("compFile").files[0];
  if (!file) return alert("Select a PDF!");

  const mode = document.querySelector("input[name=cmode]:checked").value;
  const srcBytes = await file.arrayBuffer();

  if (mode === "fast") {
    // just resave
    const pdfDoc = await PDFLib.PDFDocument.load(srcBytes);
    const pdfBytes = await pdfDoc.save();
    downloadBlob(new Blob([pdfBytes]), "compressed.pdf");
  } else {
    // strong mode = render pages to images then rebuild
    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    const src = await pdfjsLib.getDocument({ data: srcBytes }).promise;
    const outPdf = await PDFLib.PDFDocument.create();

    for (let i = 1; i <= src.numPages; i++) {
      const page = await src.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;

      const imgBytes = await new Promise(r => canvas.toBlob(b => {
        const fr = new FileReader();
        fr.onload = () => r(new Uint8Array(fr.result));
        fr.readAsArrayBuffer(b);
      }, "image/jpeg", document.getElementById("quality").value/100 ));

      const img = await outPdf.embedJpg(imgBytes);
      const newPage = outPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    }

    const pdfBytes = await outPdf.save();
    downloadBlob(new Blob([pdfBytes]), "compressed_strong.pdf");
  }
});

