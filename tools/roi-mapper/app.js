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
let startPt = null;

/* Radius state */
let radiusState = "NONE"; // NONE | CENTER_SET | EDITING | CONFIRMED
let radiusROI = null;
let dragging = null;
let radiusPx = null;
let radiusGame = null;
let unitPerPx = null;

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
      r: 60
    };
    rois = [radiusROI];
    radiusState = "EDITING";
    radiusBtn.textContent = "Fangradius bestätigen";
    redraw();
    return;
  }

  if (radiusState === "EDITING") {
    const d = Math.hypot(pt.x - radiusROI.cx, pt.y - radiusROI.cy);

    // größere Hitboxen + Priorität: Rand zuerst
    if (Math.abs(d - radiusROI.r) < 25) {
      dragging = "edge";
      return;
    }
    if (d < 30) {
      dragging = "center";
      return;
    }
  }

  if (mode === "rect" && radiusState === "CONFIRMED") {
    startPt = pt;
  }
});

svg.addEventListener("pointermove", e => {
  const pt = svgPoint(e);

  if (dragging && radiusState === "EDITING") {
    if (dragging === "center") {
      radiusROI.cx = pt.x;
      radiusROI.cy = pt.y;
    }
    if (dragging === "edge") {
      radiusROI.r = Math.max(
        10,
        Math.hypot(pt.x - radiusROI.cx, pt.y - radiusROI.cy)
      );
    }
    redraw();
    return;
  }

  if (mode === "rect" && startPt) {
    const w = pt.x - startPt.x;
    const h = pt.y - startPt.y;
    const preview = {
      type: "rect",
      name: "_preview",
      x: Math.min(startPt.x, pt.x),
      y: Math.min(startPt.y, pt.y),
      w: Math.abs(w),
      h: Math.abs(h)
    };
    redraw();
    drawROI(preview);
  }
});

svg.addEventListener("pointerup", e => {
  if (dragging) {
    dragging = null;
    return;
  }

  if (mode === "rect" && startPt) {
    const end = svgPoint(e);
    const name = prompt("ROI Name?");
    if (name) {
      rois.push({
        type: "rect",
        name,
        x: Math.min(startPt.x, end.x),
        y: Math.min(startPt.y, end.y),
        w: Math.abs(end.x - startPt.x),
        h: Math.abs(end.y - startPt.y)
      });
    }
    startPt = null;
    redraw();
  }
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
  alert("Polygon folgt als nächster Schritt.");
};

exportBtn.onclick = () => {
  if (radiusState !== "CONFIRMED") return;

  const out = rois.map(r => {
    if (r.type === "circle") {
      return {
        name: r.name,
        type: "circle",
        cx: r.cx * unitPerPx,
        cy: r.cy * unitPerPx,
        r: r.r * unitPerPx
      };
    }
    if (r.type === "rect") {
      return {
        name: r.name,
        type: "rectangle",
        x: r.x * unitPerPx,
        y: r.y * unitPerPx,
        w: r.w * unitPerPx,
        h: r.h * unitPerPx
      };
    }
  });

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
  if (r.type === "circle") {
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
    center.setAttribute("r", 8);
    center.setAttribute("fill", "#ff0");
    svg.appendChild(center);
  }

  if (r.type === "rect") {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", r.x);
    el.setAttribute("y", r.y);
    el.setAttribute("width", r.w);
    el.setAttribute("height", r.h);
    el.setAttribute("fill", "rgba(0,200,255,0.25)");
    el.setAttribute("stroke", "#0cf");
    el.setAttribute("stroke-width", 2);
    svg.appendChild(el);
  }
}
