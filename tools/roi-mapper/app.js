const svg = document.getElementById("svg");
const imageInput = document.getElementById("imageInput");
const rectBtn = document.getElementById("rectBtn");
const polyBtn = document.getElementById("polyBtn");
const exportBtn = document.getElementById("exportBtn");

let imgEl = null;
let bitmap = null;

let rois = [];
let mode = null;
let startPt = null;
let drawingPoly = null;

/* Radius reference */
let radiusPx = null;
let radiusGame = null;
let unitPerPx = null;

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

/* ---------------- Image Load (FIXED) ---------------- */

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

/* ---------------- Interaction ---------------- */

svg.addEventListener("pointerdown", e => {
  if (!imgEl) return;
  startPt = svgPoint(e);

  if (mode === "poly" && drawingPoly) {
    drawingPoly.points.push(startPt);
    redraw();
    startPt = null;
  }
});

svg.addEventListener("pointerup", e => {
  if (!startPt || !imgEl) return;
  const end = svgPoint(e);

  /* ----- Radius first ----- */
  if (!radiusPx) {
    const r = Math.hypot(end.x - startPt.x, end.y - startPt.y);
    if (r < 10) {
      startPt = null;
      return;
    }

    const gameR = Number(prompt("Fangradius im Spiel (Einheiten)?"));
    if (!gameR || gameR <= 0) {
      startPt = null;
      return;
    }

    radiusPx = r;
    radiusGame = gameR;
    unitPerPx = radiusGame / radiusPx;

    rois.push({
      type: "circle",
      name: "Radius",
      cx: startPt.x,
      cy: startPt.y,
      r
    });

    startPt = null;
    redraw();
    return;
  }

  /* ----- Rectangle ----- */
  if (mode === "rect") {
    const name = prompt("ROI Name?");
    if (!name) {
      startPt = null;
      return;
    }

    rois.push({
      type: "rect",
      name,
      x: Math.min(startPt.x, end.x),
      y: Math.min(startPt.y, end.y),
      w: Math.abs(end.x - startPt.x),
      h: Math.abs(end.y - startPt.y)
    });

    startPt = null;
    redraw();
  }
});

/* Finish polygon with double click */
svg.addEventListener("dblclick", () => {
  if (drawingPoly && drawingPoly.points.length >= 3) {
    drawingPoly = null;
    redraw();
  }
});

/* ---------------- Buttons ---------------- */

rectBtn.onclick = () => {
  if (!unitPerPx) {
    alert("Zuerst Fangradius setzen!");
    return;
  }
  mode = "rect";
};

polyBtn.onclick = () => {
  if (!unitPerPx) {
    alert("Zuerst Fangradius setzen!");
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
  if (!unitPerPx) return;

  const out = rois.map(r => {
    if (r.type === "circle") {
      return {
        name: r.name,
        type: "circle",
        bounds: {
          x: r.cx * unitPerPx,
          y: r.cy * unitPerPx,
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
      const xs = r.points.map(p => p.x);
      const ys = r.points.map(p => p.y);

      return {
        name: r.name,
        type: "polygon",
        bounds: {
          x: Math.min(...xs) * unitPerPx,
          y: Math.min(...ys) * unitPerPx,
          w: (Math.max(...xs) - Math.min(...xs)) * unitPerPx,
          h: (Math.max(...ys) - Math.min(...ys)) * unitPerPx
        },
        points: r.points.map(p => ({
          x: p.x * unitPerPx,
          y: p.y * unitPerPx
        }))
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
    c.setAttribute("fill", "rgba(180,180,180,0.2)");
    c.setAttribute("stroke", "#aaa");
    c.setAttribute("stroke-width", 2);
    svg.appendChild(c);
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

    r.points.forEach(pt => {
      const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      h.setAttribute("cx", pt.x);
      h.setAttribute("cy", pt.y);
      h.setAttribute("r", 6);
      h.setAttribute("fill", "#fff");
      h.setAttribute("stroke", "#000");

      h.onpointerdown = e => {
        e.stopPropagation();
        const move = ev => {
          const np = svgPoint(ev);
          pt.x = np.x;
          pt.y = np.y;
          redraw();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener(
          "pointerup",
          () => window.removeEventListener("pointermove", move),
          { once: true }
        );
      };

      svg.appendChild(h);
    });
  }
}
