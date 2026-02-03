const svg = document.getElementById("svg");
const radiusInput = document.getElementById("radiusInput");
let mode = "rect";
let rois = [];
let currentPoints = [];

document.getElementById("rectBtn").onclick = () => mode = "rect";
document.getElementById("polyBtn").onclick = () => mode = "poly";

svg.addEventListener("click", e => {
  if (mode !== "poly") return;
  const pt = getMouse(e);
  currentPoints.push(pt);
  drawTempPolygon();
});

svg.addEventListener("dblclick", () => {
  if (currentPoints.length < 3) return;
  const name = prompt("ROI name?");
  savePolygon(name, currentPoints);
  currentPoints = [];
  svg.innerHTML = "";
  redraw();
});

function getMouse(e) {
  const rect = svg.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
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

function drawTempPolygon() {
  redraw();
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", currentPoints.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", "lime");
  svg.appendChild(poly);
}

function redraw() {
  svg.innerHTML = "";
}

document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(rois, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "roi.json";
  a.click();
};
