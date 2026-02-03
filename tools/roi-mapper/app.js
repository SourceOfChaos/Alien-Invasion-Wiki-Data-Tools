const svg = document.getElementById("svg");
const radiusInput = document.getElementById("radiusInput");
let mode = "rect";
let rois = [];
let currentPoints = [];
let startPt = null;

// Bild-Upload
document.getElementById("imageInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    svg.innerHTML = '';
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttributeNS(null, 'href', evt.target.result);
    img.setAttributeNS(null, 'x', 0);
    img.setAttributeNS(null, 'y', 0);
    img.setAttributeNS(null, 'width', svg.clientWidth);
    img.setAttributeNS(null, 'height', svg.clientHeight);
    svg.appendChild(img);
    redraw();
  }
  reader.readAsDataURL(file);
});

// Modus-Buttons
document.getElementById("rectBtn").onclick = () => mode = "rect";
document.getElementById("polyBtn").onclick = () => mode = "poly";

// Mouse Events
svg.addEventListener("mousedown", e => {
  if (mode !== "rect") return;
  startPt = getMouse(e);
});

svg.addEventListener("mouseup", e => {
  if (mode !== "rect" || !startPt) return;
  const endPt = getMouse(e);
  const name = prompt("ROI Name?");
  if (!name) { startPt = null; return; }

  const r = Number(radiusInput.value);

  rois.push({
    name,
    type: "rectangle",
    bounds: {
      x: Math.min(startPt.x, endPt.x) / r,
      y: Math.min(startPt.y, endPt.y) / r,
      w: Math.abs(endPt.x - startPt.x) / r,
      h: Math.abs(endPt.y - startPt.y) / r
    }
  });

  startPt = null;
  redraw();
});

svg.addEventListener("click", e => {
  if (mode !== "poly") return;
  const pt = getMouse(e);
  currentPoints.push(pt);
  drawTempPolygon();
});

svg.addEventListener("dblclick", () => {
  if (currentPoints.length < 3) return;
  const name = prompt("ROI name?");
  if (!name) { currentPoints = []; redraw(); return; }
  savePolygon(name, currentPoints);
  currentPoints = [];
  redraw();
});

function getMouse(e) {
  const rect = svg.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function drawTempPolygon() {
  redraw();
  if(currentPoints.length === 0) return;
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", currentPoints.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", "lime");
  svg.appendChild(poly);
}

function savePolygon(name, pts) {
  const r = Number(radiusInput.value);
  const units = pts.map(p => ({
    x: p.x / r,
    y: p.y / r
  }));

  const xs = units.map(p => p.x);
  const ys = units.map(p => p.y);

  rois.push({
    name,
    type: "polygon",
    bounds: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys)
    },
    points: units
  });
}

function redraw() {
  // Behalte Bild
  const imgs = svg.querySelectorAll('image');
  svg.innerHTML = '';
  imgs.forEach(img => svg.appendChild(img));

  // Zeichne gespeicherte Rechtecke
  rois.forEach(r => {
    if(r.type === "rectangle"){
      const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
      rect.setAttribute("x", r.bounds.x * Number(radiusInput.value));
      rect.setAttribute("y", r.bounds.y * Number(radiusInput.value));
      rect.setAttribute("width", r.bounds.w * Number(radiusInput.value));
      rect.setAttribute("height", r.bounds.h * Number(radiusInput.value));
      rect.setAttribute("fill", "rgba(0,255,0,0.3)");
      rect.setAttribute("stroke", "lime");
      svg.appendChild(rect);
    } else if(r.type === "polygon"){
      const poly = document.createElementNS("http://www.w3.org/2000/svg","polygon");
      poly.setAttribute("points", r.points.map(p => `${p.x*Number(radiusInput.value)},${p.y*Number(radiusInput.value)}`).join(" "));
      poly.setAttribute("fill", "rgba(0,255,0,0.3)");
      poly.setAttribute("stroke","lime");
      svg.appendChild(poly);
    }
  });
}

// Export JSON
document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(rois, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "roi.json";
  a.click();
};
