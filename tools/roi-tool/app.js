const svg = document.getElementById("svg");
const imageInput = document.getElementById("imageInput");
const rectBtn = document.getElementById("rectBtn");
const exportBtn = document.getElementById("exportBtn");
const radiusBtn = document.getElementById("radiusBtn");
const roiListEl = document.getElementById("roiList");

/* ---------------- State ---------------- */

let imgEl = null;
let bitmap = null;

let rois = [];
let activeROI = null;

let unitPerPx = null;

/* Radius */
let radiusState = "NONE"; // NONE | EDIT | CONFIRMED
let dragging = null;

/* ---------------- Helpers ---------------- */

function svgPoint(evt) {
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

function refreshROIList() {
  roiListEl.innerHTML = "";
  rois.forEach(r => {
    const el = document.createElement("div");
    el.className = "roi-item" + (r === activeROI ? " active" : "");
    el.textContent = r.name;
    el.onclick = () => {
      activeROI = r;
      redraw();
      refreshROIList();
    };
    roiListEl.appendChild(el);
  });
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

/* ---------------- Fangradius ---------------- */

radiusBtn.onclick = () => {
  if (!imgEl) return;

  if (radiusState === "NONE") {
    alert("Tippe den Mittelpunkt des Fangradius");
    activeROI = {
      type: "circle",
      name: "Fangradius",
      cx: bitmap.width / 2,
      cy: bitmap.height / 2,
      r: 80
    };
    rois = [activeROI];
    radiusState = "EDIT";
    redraw();
    refreshROIList();
    return;
  }

  if (radiusState === "EDIT") {
    const g = Number(prompt("Fangradius im Spiel (Einheiten)?"));
    if (!g || g <= 0) return;

    unitPerPx = g / activeROI.r;
    radiusState = "CONFIRMED";
    radiusBtn.textContent = "Fangradius gesetzt";
  }
};

/* ---------------- Rectangle ROI ---------------- */

rectBtn.onclick = () => {
  if (!unitPerPx) {
    alert("Zuerst Fangradius setzen!");
    return;
  }

  const name = prompt("ROI Name?");
  if (!name) return;

  const size = 100;
  const r = {
    type: "rect",
    name,
    x: bitmap.width / 2 - size / 2,
    y: bitmap.height / 2 - size / 2,
    w: size,
    h: size
  };

  initRectHandles(r);
  rois.push(r);
  activeROI = r;

  redraw();
  refreshROIList();
};

/* ---------------- Interaction ---------------- */

svg.addEventListener("pointerdown", e => {
  if (!activeROI) return;

  const pt = svgPoint(e);

  if (activeROI.type === "circle") {
    const d = Math.hypot(pt.x - activeROI.cx, pt.y - activeROI.cy);
    if (Math.abs(d - activeROI.r) < 20) dragging = "radius";
    else if (d < 20) dragging = "center";
    if (dragging) svg.style.touchAction = "none";
    return;
  }

  if (activeROI.type === "rect") {
    for (const h of activeROI.handles) {
      if (Math.hypot(pt.x - h.x, pt.y - h.y) < 20) {
        dragging = h;
        svg.style.touchAction = "none";
        return;
      }
    }
  }
});

svg.addEventListener("pointermove", e => {
  if (!dragging || !activeROI) return;
  const pt = svgPoint(e);

  if (activeROI.type === "circle") {
    if (dragging === "center") {
      activeROI.cx = pt.x;
      activeROI.cy = pt.y;
    }
    if (dragging === "radius") {
      activeROI.r = Math.max(
        10,
        Math.hypot(pt.x - activeROI.cx, pt.y - activeROI.cy)
      );
    }
  }

  if (activeROI.type === "rect") {
    dragging.x = pt.x;
    dragging.y = pt.y;
    updateRectFromHandles(activeROI);
  }

  redraw();
});

svg.addEventListener("pointerup", () => {
  dragging = null;
  svg.style.touchAction = "pan-x pan-y pinch-zoom";
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
  const active = r === activeROI;

  if (r.type === "circle") {
    drawCircle(r, active);
  }

  if (r.type === "rect") {
    drawRect(r, active);
  }
}

function drawCircle(r, active) {
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", r.cx);
  c.setAttribute("cy", r.cy);
  c.setAttribute("r", r.r);
  c.setAttribute("fill", "rgba(255,255,0,0.05)");
  c.setAttribute("stroke", active ? "#f00" : "#ff0");
  c.setAttribute("stroke-width", active ? 4 : 2);
  svg.appendChild(c);

  if (active) {
    drawHandle(r.cx, r.cy);
    drawHandle(r.cx + r.r, r.cy);
  }
}

function drawRect(r, active) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  el.setAttribute("x", r.x);
  el.setAttribute("y", r.y);
  el.setAttribute("width", r.w);
  el.setAttribute("height", r.h);
  el.setAttribute("fill", "rgba(0,200,255,0.05)");
  el.setAttribute("stroke", active ? "#f00" : "#0cf");
  el.setAttribute("stroke-width", active ? 3 : 1);
  svg.appendChild(el);

  if (active) {
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
