const svg = document.getElementById("svg");
const imageInput = document.getElementById("imageInput");
const rectBtn = document.getElementById("rectBtn");
const polyBtn = document.getElementById("polyBtn");
const exportBtn = document.getElementById("exportBtn");

let mode = null;
let rois = [];
let activeRoiId = null;

let img = null;
let startPt = null;
let drawingPoly = null;

let radiusGameUnits = null;
let radiusPx = null;
let unitPerPx = null;

/* ---------- Helpers ---------- */

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
  if (img) svg.appendChild(img);
  rois.forEach(drawROI);
}

/* ---------- Image Load ---------- */

imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", reader.result);
    img.onload = () => {
      svg.setAttribute("viewBox", `0 0 ${img.width.baseVal.value} ${img.height.baseVal.value}`);
      redraw();
    };
  };
  reader.readAsDataURL(file);
});

/* ---------- Radius ROI ---------- */

svg.addEventListener("pointerdown", e => {
  if (!img) return;

  if (!radiusPx) {
    startPt = svgPoint(e);
  } else if (mode === "rect") {
    startPt = svgPoint(e);
  } else if (mode === "poly") {
    const p = svgPoint(e);
    drawingPoly.points.push(p);
    redraw();
  }
});

svg.addEventListener("pointerup", e => {
  if (!startPt || !img) return;
  const end = svgPoint(e);

  /* ---- Radius circle ---- */
  if (!radiusPx) {
    const r = Math.hypot(end.x - startPt.x, end.y - startPt.y);
    const gameRadius = Number(prompt("Fangradius im Spiel (Einheiten)?"));
    if (!gameRadius || r < 5) {
      startPt = null;
      return;
    }

    radiusPx = r;
    radiusGameUnits = gameRadius;
    unitPerPx = radiusGameUnits / radiusPx;

    rois.push({
      id: crypto.randomUUID(),
      name: "Radius",
      type: "circle",
      cx: startPt.x,
      cy: startPt.y,
      r
    });

    startPt = null;
    redraw();
    return;
  }

  /* ---- Rectangle ---- */
  if (mode === "rect") {
    const name = prompt("ROI Name?");
    if (!name) return;

    rois.push({
      id: crypto.randomUUID(),
      name,
      type: "rect",
      x: Math.min(startPt.x, end.x),
      y: Math.min(startPt.y, end.y),
      w: Math.abs(end.x - startPt.x),
      h: Math.abs(end.y - startPt.y)
    });

    startPt = null;
    redraw();
  }
});

/* ---------- Polygon Finish ---------- */

polyBtn.addEventListener("dblclick", () => {
  if (!drawingPoly || drawingPoly.points.length < 3) return;
  drawingPoly = null;
  redraw();
});

/* ---------- Buttons ---------- */

rectBtn.onclick = () => {
  if (!unitPerPx) return alert("Zuerst Radius setzen!");
  mode = "rect";
};

polyBtn.onclick = () => {
  if (!unitPerPx) return alert("Zuerst Radius setzen!");
  mode = "poly";
  const name = prompt("ROI Name?");
  if (!name) return;
  drawingPoly = {
    id: crypto.randomUUID(),
    name,
    type: "poly",
    points: []
  };
  rois.push(drawingPoly);
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
        bounds: {
          x: r.x * unitPerPx,
          y: r.y * unitPerPx,
          w: r.w * unitPerPx,
          h: r.h * unitPerPx
        }
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

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "roi-export.json";
  a.click();
};

/* ---------- Drawing ---------- */

function drawROI(r) {
  if (r.type === "circle") {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", r.cx);
    c.setAttribute("cy", r.cy);
    c.setAttribute("r", r.r);
    c.setAttribute("fill", "rgba(150,150,150,0.15)");
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
    el.setAttribute("fill", "rgba(0,200,255,0.2)");
    el.setAttribute("stroke", "#0cf");
    el.setAttribute("stroke-width", 2);
    svg.appendChild(el);
  }

  if (r.type === "poly") {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    el.setAttribute(
      "points",
      r.points.map(p => `${p.x},${p.y}`).join(" ")
    );
    el.setAttribute("fill", "rgba(255,200,0,0.2)");
    el.setAttribute("stroke", "#fc0");
    el.setAttribute("stroke-width", 2);
    svg.appendChild(el);

    r.points.forEach(p => {
      const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      h.setAttribute("cx", p.x);
      h.setAttribute("cy", p.y);
      h.setAttribute("r", 6);
      h.setAttribute("fill", "#fff");
      h.setAttribute("stroke", "#000");
      h.onpointerdown = e => {
        e.stopPropagation();
        const move = ev => {
          const np = svgPoint(ev);
          p.x = np.x;
          p.y = np.y;
          redraw();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", () => {
          window.removeEventListener("pointermove", move);
        }, { once: true });
      };
      svg.appendChild(h);
    });
  }
}
