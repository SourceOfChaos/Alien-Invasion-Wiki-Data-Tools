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
let dragging = null; // { type, corner }

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

/* ---------------- Fangradius (unangetastet) ---------------- */

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

  rois.push(r);
  activeROI = r;
  redraw();
  refreshROIList();
};

/* ---------------- Interaction ---------------- */

function startDrag(info) {
  dragging = info;
  svg.style.touchAction = "none";
}

function stopDrag() {
  dragging = null;
  svg.style.touchAction = "pan-x pan-y pinch-zoom";
}

svg.addEventListener("pointerdown", e => {
  if (!activeROI) return;

  const pt = svgPoint(e);

  if (activeROI.type === "circle") {
    const d = Math.hypot(pt.x - activeROI.cx, pt.y - activeROI.cy);
    if (Math.abs(d - activeROI.r) < 22) startDrag({ type: "circle-radius" });
    else if (d < 22) startDrag({ type: "circle-center" });
    return;
  }

  if (activeROI.type === "rect") {
    const corners = getRectCorners(activeROI);
    for (const c of corners) {
      if (Math.hypot(pt.x - c.x, pt.y - c.y) < 22) {
        startDrag({ type: "rect", corner: c.id });
        return;
      }
    }
  }
});

svg.addEventListener("pointermove", e => {
  if (!dragging || !activeROI) return;
  const pt = svgPoint(e);

  if (dragging.type === "circle-center") {
    activeROI.cx = pt.x;
    activeROI.cy = pt.y;
  }

  if (dragging.type === "circle-radius") {
    activeROI.r = Math.max(
      10,
      Math.hypot(pt.x - activeROI.cx, pt.y - activeROI.cy)
    );
  }

  if (dragging.type === "rect") {
    resizeRectFromCorner(activeROI, dragging.corner, pt);
  }

  redraw();
});

svg.addEventListener("pointerup", stopDrag);
svg.addEventListener("pointercancel", stopDrag);
svg.addEventListener("pointerleave", stopDrag);

/* ---------------- Rect math ---------------- */

function getRectCorners(r) {
  return [
    { id: "nw", x: r.x, y: r.y },
    { id: "ne", x: r.x + r.w, y: r.y },
    { id: "se", x: r.x + r.w, y: r.y + r.h },
    { id: "sw", x: r.x, y: r.y + r.h }
  ];
}

function resizeRectFromCorner(r, corner, pt) {
  const x2 = r.x + r.w;
  const y2 = r.y + r.h;

  if (corner === "nw") {
    r.w = x2 - pt.x;
    r.h = y2 - pt.y;
    r.x = pt.x;
    r.y = pt.y;
  }
  if (corner === "ne") {
    r.w = pt.x - r.x;
    r.h = y2 - pt.y;
    r.y = pt.y;
  }
  if (corner === "se") {
    r.w = pt.x - r.x;
    r.h = pt.y - r.y;
  }
  if (corner === "sw") {
    r.w = x2 - pt.x;
    r.h = pt.y - r.y;
    r.x = pt.x;
  }

  r.w = Math.max(10, r.w);
  r.h = Math.max(10, r.h);
}

/* ---------------- Drawing ---------------- */

function drawROI(r) {
  const active = r === activeROI;

  if (r.type === "circle") drawCircle(r, active);
  if (r.type === "rect") drawRect(r, active);
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
    getRectCorners(r).forEach(c => drawHandle(c.x, c.y));
  }
}

function drawHandle(x, y) {
  // große unsichtbare Hitbox
  const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  hit.setAttribute("cx", x);
  hit.setAttribute("cy", y);
  hit.setAttribute("r", 22);
  hit.setAttribute("fill", "transparent");
  svg.appendChild(hit);

  // sichtbarer Punkt
  const vis = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  vis.setAttribute("cx", x);
  vis.setAttribute("cy", y);
  vis.setAttribute("r", 6);
  vis.setAttribute("fill", "#fff");
  svg.appendChild(vis);
}
