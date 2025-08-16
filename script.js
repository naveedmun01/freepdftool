/* Main functionality: JPG->PDF, Merge, Split, Compress (fast/strong) */
/* Uses pdf-lib (client-side) and pdf.js (rasterize when needed) */

document.getElementById('year').textContent = new Date().getFullYear();
const { PDFDocument } = PDFLib;

function setMsg(id, txt){ const el = document.getElementById(id); if(el) el.textContent = txt; }
function downloadBytes(bytes, filename){
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* JPG -> PDF */
document.getElementById('btnJpg').addEventListener('click', async ()=>{
  const files = [...document.getElementById('jpgFiles').files];
  const msgId = 'jpgMsg';
  if(!files.length){ setMsg(msgId,'Please select JPG files.'); return; }
  setMsg(msgId,'Processing...');
  try{
    const pdf = await PDFDocument.create();
    for(const f of files){
      const ab = await f.arrayBuffer();
      const img = await pdf.embedJpg(ab);
      const page = pdf.addPage([img.width, img.height]);
      page.drawImage(img, { x:0, y:0, width: img.width, height: img.height });
    }
    const out = await pdf.save({ useObjectStreams: true });
    downloadBytes(out, 'images.pdf');
    setMsg(msgId,'Done ✓');
  }catch(e){ console.error(e); setMsg(msgId,'Failed to convert.'); }
});

/* Merge PDFs */
document.getElementById('btnMerge').addEventListener('click', async ()=>{
  const files = [...document.getElementById('mergeFiles').files];
  const msgId = 'mergeMsg';
  if(files.length < 2){ setMsg(msgId,'Select at least 2 PDFs.'); return; }
  setMsg(msgId,'Merging...');
  try{
    const out = await PDFDocument.create();
    for(const f of files){
      const ab = await f.arrayBuffer();
      const src = await PDFDocument.load(ab);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach(p=> out.addPage(p));
    }
    const bytes = await out.save({ addDefaultPage:false, useObjectStreams: true });
    downloadBytes(bytes, 'merged.pdf');
    setMsg(msgId,'Done ✓');
  }catch(e){ console.error(e); setMsg(msgId,'Merge failed (maybe encrypted).'); }
});

/* Helper: parse ranges like "1-3,5" -> [0,1,2,4] */
function parseRanges(text, total){
  if(!text) return [];
  const parts = text.split(',').map(s=>s.trim()).filter(Boolean);
  const set = new Set();
  for(const p of parts){
    if(p.includes('-')){
      const [a,b] = p.split('-').map(n=>parseInt(n,10));
      if(isNaN(a)||isNaN(b)) continue;
      const start = Math.max(1, Math.min(a,b));
      const end = Math.min(total, Math.max(a,b));
      for(let i=start;i<=end;i++) set.add(i-1);
    } else {
      const n = parseInt(p,10);
      if(!isNaN(n) && n>=1 && n<=total) set.add(n-1);
    }
  }
  return Array.from(set).sort((a,b)=>a-b);
}

/* Split PDFs */
document.getElementById('btnSplit').addEventListener('click', async ()=>{
  const f = document.getElementById('splitFile').files[0];
  const ranges = document.getElementById('splitRanges').value;
  const msgId = 'splitMsg';
  if(!f){ setMsg(msgId,'Select a PDF.'); return; }
  setMsg(msgId,'Reading PDF...');
  try{
    const ab = await f.arrayBuffer();
    const src = await PDFDocument.load(ab);
    const picks = parseRanges(ranges, src.getPageCount());
    if(!picks.length){ setMsg(msgId,'Enter valid ranges e.g. 1-3,5'); return; }
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, picks);
    pages.forEach(p=> out.addPage(p));
    const bytes = await out.save({ useObjectStreams: true });
    downloadBytes(bytes, (f.name||'extracted') + '-extracted.pdf');
    setMsg(msgId, `Done ✓ (${picks.length} page(s))`);
  }catch(e){ console.error(e); setMsg(msgId,'Split failed (maybe encrypted).'); }
});

/* Compress (fast or strong) */
document.getElementById('btnCompress').addEventListener('click', async ()=>{
  const f = document.getElementById('compFile').files[0];
  const msgId = 'compMsg';
  const mode = document.querySelector('input[name="cmode"]:checked').value;
  const quality = document.getElementById('quality').valueAsNumber/100;
  if(!f){ setMsg(msgId,'Select a PDF.'); return; }
  setMsg(msgId, mode==='fast' ? 'Compressing (fast)…' : `Compressing (strong, q=${Math.round(quality*100)}%)…`);
  try{
    const ab = await f.arrayBuffer();
    if(mode === 'fast'){
      const doc = await PDFDocument.load(ab);
      const out = await doc.save({ useObjectStreams: true });
      downloadBytes(out, (f.name||'compressed') + '.pdf');
      setMsg(msgId,'Done (fast).');
      return;
    }
    // strong: rasterize each page with pdf.js then embed JPEGs into new PDF
    const pdfjs = window['pdfjs-dist/build/pdf'];
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';
    const loadingTask = pdfjs.getDocument({ data: ab });
    const pdf = await loadingTask.promise;
    const outDoc = await PDFDocument.create();
    for(let p=1; p<=pdf.numPages; p++){
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpgBytes = await (await fetch(dataUrl)).arrayBuffer();
      const jpg = await outDoc.embedJpg(jpgBytes);
      const newPage = outDoc.addPage([jpg.width, jpg.height]);
      newPage.drawImage(jpg, { x:0, y:0, width: jpg.width, height: jpg.height });
    }
    const outBytes = await outDoc.save({ useObjectStreams: true });
    downloadBytes(outBytes, (f.name||'compressed-strong') + '.pdf');
    setMsg(msgId,'Done (strong). Note: PDF flattened.');
  }catch(e){ console.error(e); setMsg(msgId,'Compression failed (large/encrypted file?).'); }
});
