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
