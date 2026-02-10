const svg = document.getElementById("svg");
const imageInput = document.getElementById("imageInput");
const rectBtn = document.getElementById("rectBtn");
const polyBtn = document.getElementById("polyBtn");
const exportBtn = document.getElementById("exportBtn");

/* Radius button */
let radiusBtn = document.getElementById("radiusBtn");
if (!radiusBtn) {
  radiusBtn = document.createElement("button");
  radiusBtn.id = "radiusBtn";
  radiusBtn.textContent = "Fangradius setzen";
  document.querySelector("header").prepend(radiusBtn);
}

/* Active ROI selector */
let activeBtn = document.createElement("button");
activeBtn.textContent = "Aktive ROI wechseln";
document.querySelector("header").appendChild(activeBtn);

/* ---------------- State ---------------- */

let imgEl = null;
let bitmap = null;
let rois = [];
let activeROI = null;

let mode = null;
let startPt = null;
let dragHandle = null;

/* Radius */
let radiusState = "NONE"; // NONE | EDIT
let unitPerPx = null;

/* ---------------- Helpers ---------------- */

function svgPoint(evt) {
  evt.preventDefault();
  const e = evt.touches ? evt.touches[0] : evt;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function clearSVG() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function redraw() {
  clearSVG();
  if (imgEl) svg.appendChild(imgEl);
  rois.forEach(drawROI);
}

/* ---------------- Image Load ---------------- */

imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    bitmap = new Image();
    bitmap.onload = () => {
      imgEl = document.createElementNS("http://www.w3.org/2000/svg", "image");
      imgEl.setAttribute("href", reader.result);
      imgEl.setAttribute("x", 0);
      imgEl.setAttribute("y", 0);
      imgEl.setAttribute("width", bitmap.width);
      imgEl.setAttribute("height", bitmap.height);

      svg.setAttribute("viewBox", `0 0 ${bitmap.width} ${bitmap.height}`);
      redraw();
    };
    bitmap.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* ---------------- Radius ---------------- */

radiusBtn.onclick = () => {
  if (!imgEl) return;

  if (radiusState === "NONE") {
    alert("Tippe Mittelpunkt des Fangradius");
    radiusState = "EDIT";
    activeROI = {
      type: "circle",
      name: "Fangradius",
      cx: bitmap.width / 2,
      cy: bitmap.height / 2,
      r: 80
    };
    rois = [activeROI];
    redraw();
    return;
  }

  const g = Number(prompt("Fangradius im Spiel (Einheiten)?"));
  if (!g || g <= 0) return;

  unitPerPx = g / activeROI.r;
  radiusBtn.textContent = "Fangradius gesetzt";
  radiusState = "CONFIRMED";
};

/* ---------------- ROI Buttons ---------------- */

rectBtn.onclick = () => {
  if (!unitPerPx) {
    alert("Zuerst Fangradius setzen!");
    return;
  }
  mode = "rect";
};

activeBtn.onclick = () => {
  const idx = rois.indexOf(activeROI);
  activeROI = rois[(idx + 1) % rois.length];
  redraw();
};

/* ---------------- Interaction ---------------- */

svg.addEventListener("pointerdown", e => {
  if (!imgEl) return;
  svg.setPointerCapture(e.pointerId);
  const pt = svgPoint(e);

  if (activeROI?.type === "circle") {
    const d = Math.hypot(pt.x - activeROI.cx, pt.y - activeROI.cy);
    if (Math.abs(d - activeROI.r) < 20) dragHandle = "radius";
    else if (d < 20) dragHandle = "center";
    return;
  }

  if (activeROI?.type === "rect") {
    for (const h of activeROI.handles) {
      if (Math.hypot(pt.x - h.x, pt.y - h.y) < 20) {
        dragHandle = h;
        return;
      }
    }
  }

  if (mode === "rect") startPt = pt;
});

svg.addEventListener("pointermove", e => {
  if (!dragHandle) return;
  const pt = svgPoint(e);

  if (activeROI.type === "circle") {
    if (dragHandle === "center") {
      activeROI.cx = pt.x;
      activeROI.cy = pt.y;
    }
    if (dragHandle === "radius") {
      activeROI.r = Math.max(
        10,
        Math.hypot(pt.x - activeROI.cx, pt.y - activeROI.cy)
      );
    }
  }

  if (activeROI.type === "rect") {
    dragHandle.x = pt.x;
    dragHandle.y = pt.y;
    updateRectFromHandles(activeROI);
  }

  redraw();
});

svg.addEventListener("pointerup", e => {
  dragHandle = null;

  if (mode === "rect" && startPt) {
    const end = svgPoint(e);
    const r = {
      type: "rect",
      name: prompt("ROI Name?") || "ROI",
      x: Math.min(startPt.x, end.x),
      y: Math.min(startPt.y, end.y),
      w: Math.abs(end.x - startPt.x),
      h: Math.abs(end.y - startPt.y)
    };
    initRectHandles(r);
    rois.push(r);
    activeROI = r;
    startPt = null;
    redraw();
  }
});

/* ---------------- Rect helpers ---------------- */

function initRectHandles(r) {
  r.handles = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h }
  ];
}

function updateRectFromHandles(r) {
  const xs = r.handles.map(h => h.x);
  const ys = r.handles.map(h => h.y);
  r.x = Math.min(...xs);
  r.y = Math.min(...ys);
  r.w = Math.max(...xs) - r.x;
  r.h = Math.max(...ys) - r.y;
}

/* ---------------- Drawing ---------------- */

function drawROI(r) {
  if (r.type === "circle") {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", r.cx);
    c.setAttribute("cy", r.cy);
    c.setAttribute("r", r.r);
    c.setAttribute("fill", "rgba(255,255,0,0.2)");
    c.setAttribute("stroke", r === activeROI ? "#f00" : "#ff0");
    c.setAttribute("stroke-width", 4);
    svg.appendChild(c);

    drawHandle(r.cx, r.cy);
    drawHandle(r.cx + r.r, r.cy);
  }

  if (r.type === "rect") {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", r.x);
    el.setAttribute("y", r.y);
    el.setAttribute("width", r.w);
    el.setAttribute("height", r.h);
    el.setAttribute("fill", "rgba(0,200,255,0.25)");
    el.setAttribute("stroke", r === activeROI ? "#f00" : "#0cf");
    el.setAttribute("stroke-width", 2);
    svg.appendChild(el);

    r.handles.forEach(h => drawHandle(h.x, h.y));
  }
}

function drawHandle(x, y) {
  const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  h.setAttribute("cx", x);
  h.setAttribute("cy", y);
  h.setAttribute("r", 8);
  h.setAttribute("fill", "#fff");
  svg.appendChild(h);
}
