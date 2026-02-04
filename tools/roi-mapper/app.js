const svg = document.getElementById("svg");
const imageInput = document.getElementById("imageInput");
const rectBtn = document.getElementById("rectBtn");
const polyBtn = document.getElementById("polyBtn");
const exportBtn = document.getElementById("exportBtn");

/* --- NEW radius button --- */
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
let drawingPoly = null;

/* Radius reference */
let radiusROI = null;
let radiusPx = null;
let radiusGame = null;
let unitPerPx = null;
let radiusMode = false;
let radiusConfirmed = false;
let draggingRadius = null;

/* ---------------- Helpers ---------------- */

function svgPoint(evt) {
  const rect = svg.getBoundingClientRect();
  const e = evt.touches ? evt.touches[0] : evt;
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
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

  if (!radiusConfirmed) {
    radiusMode = true;
    mode = null;
    alert("Tippe zuerst den Mittelpunkt, dann ziehe am Randpunkt den Radius.");
  } else {
    const gameR = Number(prompt("Fangradius im Spiel (Einheiten)?", radiusGame));
    if (!gameR || gameR <= 0) return;

    radiusGame = gameR;
    unitPerPx = radiusGame / radiusPx;
    radiusConfirmed = true;
    radiusMode = false;

    radiusBtn.textContent = "Fangradius gesetzt";
    redraw();
  }
};

/* ---------------- Interaction ---------------- */

svg.addEventListener("pointerdown", e => {
  if (!imgEl) return;
  const pt = svgPoint(e);

  if (radiusMode && !radiusROI) {
    radiusROI = {
      type: "circle",
      name: "Radius",
      cx: pt.x,
      cy: pt.y,
      r: 40
    };
    rois.unshift(radiusROI);
    redraw();
    return;
  }

  if (radiusROI && !radiusConfirmed) {
    const distCenter = Math.hypot(pt.x - radiusROI.cx, pt.y - radiusROI.cy);
    if (Math.abs(distCenter - radiusROI.r) < 15) {
      draggingRadius = "edge";
      return;
    }
    if (distCenter < 15) {
      draggingRadius = "center";
      return;
    }
  }

  startPt = pt;
});

svg.addEventListener("pointermove", e => {
  if (!draggingRadius || !radiusROI) return;
  const pt = svgPoint(e);

  if (draggingRadius === "edge") {
    radiusROI.r = Math.max(5, Math.hypot(pt.x - radiusROI.cx, pt.y - radiusROI.cy));
  }

  if (draggingRadius === "center") {
    radiusROI.cx = pt.x;
    radiusROI.cy = pt.y;
  }

  radiusPx = radiusROI.r;
  redraw();
});

svg.addEventListener("pointerup", () => {
  draggingRadius = null;
});

/* ---------------- Buttons (locked until radius confirmed) ---------------- */

rectBtn.onclick = () => {
  if (!radiusConfirmed) {
    alert("Zuerst Fangradius bestätigen!");
    return;
  }
  mode = "rect";
};

polyBtn.onclick = () => {
  if (!radiusConfirmed) {
    alert("Zuerst Fangradius bestätigen!");
    return;
  }
  const name = prompt("ROI Name?");
  if (!name) return;

  drawingPoly = {
    type: "poly",
    name,
    points: []
  };
  rois.push(drawingPoly);
  mode = "poly";
};

exportBtn.onclick = () => {
  if (!radiusConfirmed) return;

  const out = rois.map(r => {
    if (r.type === "circle") {
      return {
        name: r.name,
        type: "circle",
        bounds: {
          cx: r.cx * unitPerPx,
          cy: r.cy * unitPerPx,
          r: r.r * unitPerPx
        }
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

    if (r.type === "poly") {
      return {
        name: r.name,
        type: "polygon",
        points: r.points.map(p => ({
          x: p.x * unitPerPx,
          y: p.y * unitPerPx
        }))
      };
    }
  });

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
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
    c.setAttribute("fill", "rgba(120,120,120,0.25)");
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

  if (r.type === "poly") {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    p.setAttribute(
      "points",
      r.points.map(pt => `${pt.x},${pt.y}`).join(" ")
    );
    p.setAttribute("fill", "rgba(255,200,0,0.25)");
    p.setAttribute("stroke", "#fc0");
    p.setAttribute("stroke-width", 2);
    svg.appendChild(p);
  }
}
