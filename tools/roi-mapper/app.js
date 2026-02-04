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
  radiusBtn.textContent = "Set Fangradius";
  document.querySelector("header").prepend(radiusBtn);
}

let imgEl = null;
let bitmap = null;
let rois = [];
let mode = null;

/* Radius state */
let radiusState = "NONE"; // NONE | CENTER_SET | EDITING | CONFIRMED
let radiusROI = null;
let dragging = null;
let radiusPx = null;
let radiusGame = null;
let unitPerPx = null;

/* Drag helpers */
let lastDragDist = null;

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
      svg.setAttribute("width", bitmap.width);
      svg.setAttribute("height", bitmap.height);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      redraw();
    };
    bitmap.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* ---------------- Radius Button ---------------- */

radiusBtn.onclick = () => {
  if (!imgEl) return;

  if (radiusState === "NONE") {
    radiusState = "CENTER_SET";
    alert("Tippe auf den Mittelpunkt des Fangradius.");
    return;
  }

  if (radiusState === "EDITING") {
    const g = Number(prompt("Fangradius im Spiel (Einheiten)?"));
    if (!g || g <= 0) return;

    radiusGame = g;
    radiusPx = radiusROI.r;
    unitPerPx = radiusGame / radiusPx;

    radiusState = "CONFIRMED";
    radiusBtn.textContent = "Fangradius gesetzt";
    svg.style.touchAction = "auto";
    redraw();
  }
};

/* ---------------- SVG Interaction ---------------- */

svg.addEventListener("pointerdown", e => {
  if (!imgEl) return;
  const pt = svgPoint(e);

  if (radiusState === "CENTER_SET") {
    radiusROI = {
      type: "circle",
      name: "Radius",
      cx: pt.x,
      cy: pt.y,
      r: 40
    };
    rois = [radiusROI];
    radiusState = "EDITING";
    radiusBtn.textContent = "Fangradius bestätigen";
    svg.style.touchAction = "none";
    redraw();
    return;
  }

  if (radiusState === "EDITING") {
    const dCenter = Math.hypot(pt.x - radiusROI.cx, pt.y - radiusROI.cy);

    if (dCenter < 12) {
      dragging = "center";
    } else if (Math.abs(dCenter - radiusROI.r) < 12) {
      dragging = "edge";
      lastDragDist = dCenter;
    } else {
      return;
    }

    svg.setPointerCapture(e.pointerId);
  }
});

svg.addEventListener("pointermove", e => {
  if (!dragging || radiusState !== "EDITING") return;
  const pt = svgPoint(e);

  if (dragging === "center") {
    radiusROI.cx = pt.x;
    radiusROI.cy = pt.y;
  }

  if (dragging === "edge") {
    const d = Math.hypot(pt.x - radiusROI.cx, pt.y - radiusROI.cy);
    const delta = d - lastDragDist;

    if (Math.abs(delta) > 1) {
      radiusROI.r = Math.max(10, radiusROI.r + delta);
      lastDragDist = d;
    }
  }

  redraw();
});

svg.addEventListener("pointerup", e => {
  if (dragging) {
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {}
  }
  dragging = null;
  lastDragDist = null;
});

/* ---------------- ROI Buttons ---------------- */

rectBtn.onclick = () => {
  if (radiusState !== "CONFIRMED") {
    alert("Zuerst Fangradius bestätigen!");
    return;
  }
  mode = "rect";
};

polyBtn.onclick = () => {
  if (radiusState !== "CONFIRMED") {
    alert("Zuerst Fangradius bestätigen!");
    return;
  }
  alert("Polygon kommt als nächster Schritt – bewusst nicht jetzt.");
};

exportBtn.onclick = () => {
  if (radiusState !== "CONFIRMED") return;

  const out = rois.map(r => ({
    name: r.name,
    type: r.type,
    cx: r.cx * unitPerPx,
    cy: r.cy * unitPerPx,
    r: r.r * unitPerPx
  }));

  const blob = new Blob([JSON.stringify(out, null, 2)], {
    type: "application/json"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "roi-export.json";
  a.click();
};

/* ---------------- Drawing ---------------- */

function drawROI(r) {
  if (r.type !== "circle") return;

  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", r.cx);
  c.setAttribute("cy", r.cy);
  c.setAttribute("r", r.r);
  c.setAttribute("fill", "rgba(255,255,0,0.2)");
  c.setAttribute("stroke", "#ff0");
  c.setAttribute("stroke-width", 4);
  svg.appendChild(c);

  const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  center.setAttribute("cx", r.cx);
  center.setAttribute("cy", r.cy);
  center.setAttribute("r", 6);
  center.setAttribute("fill", "#ff0");
  svg.appendChild(center);
}
