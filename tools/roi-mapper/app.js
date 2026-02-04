const svg = document.getElementById("svg");
const imageInput = document.getElementById("imageInput");
const radiusInput = document.getElementById("radiusInput");

let svgImage = null;

const state = {
  mode: "idle", // idle | set-radius | radius-confirmed
  radiusUnit: null,
  radiusPx: null,
  pxPerUnit: null,
  center: null,
  circle: null,
  handle: null,
  dragging: false
};

/* ---------------- IMAGE LOAD ---------------- */

imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => loadImage(ev.target.result);
  reader.readAsDataURL(file);
});

function loadImage(src) {
  svg.innerHTML = "";

  svgImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
  svgImage.setAttributeNS(null, "href", src);
  svgImage.setAttribute("x", 0);
  svgImage.setAttribute("y", 0);

  svgImage.onload = () => {
    const w = svgImage.width.baseVal.value;
    const h = svgImage.height.baseVal.value;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  };

  svg.appendChild(svgImage);
}

/* ---------------- RADIUS SETUP ---------------- */

document.getElementById("rectBtn").disabled = true;
document.getElementById("polyBtn").disabled = true;

document.getElementById("exportBtn").disabled = true;

const confirmBtn = document.createElement("button");
confirmBtn.textContent = "Radius bestätigen";
confirmBtn.disabled = true;
confirmBtn.style.marginLeft = "10px";
document.querySelector("header").appendChild(confirmBtn);

confirmBtn.onclick = confirmRadius;

svg.addEventListener("pointerdown", onPointerDown);
svg.addEventListener("pointermove", onPointerMove);
svg.addEventListener("pointerup", () => state.dragging = false);

/* ---------------- POINTER LOGIC ---------------- */

function onPointerDown(e) {
  if (!svgImage) return;

  if (state.mode === "idle") {
    state.mode = "set-radius";
    state.radiusUnit = Number(radiusInput.value);
    if (!state.radiusUnit || state.radiusUnit <= 0) {
      alert("Bitte zuerst Fangradius (Zahl) eingeben.");
      state.mode = "idle";
      return;
    }
    createRadius(e);
    confirmBtn.disabled = false;
    return;
  }

  if (state.mode === "set-radius" && e.target === state.handle) {
    state.dragging = true;
  }
}

function onPointerMove(e) {
  if (!state.dragging) return;
  updateRadius(e);
}

/* ---------------- RADIUS SVG ---------------- */

function createRadius(e) {
  const p = getSVGPoint(e);
  state.center = p;

  state.circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  state.circle.setAttribute("cx", p.x);
  state.circle.setAttribute("cy", p.y);
  state.circle.setAttribute("r", 10);
  state.circle.setAttribute("fill", "rgba(150,150,150,0.25)");
  state.circle.setAttribute("stroke", "#999");
  state.circle.setAttribute("stroke-width", 2);

  state.handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  state.handle.setAttribute("r", 8);
  state.handle.setAttribute("fill", "#000");

  svg.appendChild(state.circle);
  svg.appendChild(state.handle);

  updateRadius(e);
}

function updateRadius(e) {
  const p = getSVGPoint(e);
  const dx = p.x - state.center.x;
  const dy = p.y - state.center.y;
  const r = Math.hypot(dx, dy);

  state.radiusPx = r;

  state.circle.setAttribute("r", r);
  state.handle.setAttribute("cx", state.center.x + r);
  state.handle.setAttribute("cy", state.center.y);
}

/* ---------------- CONFIRM ---------------- */

function confirmRadius() {
  if (!state.radiusPx || !state.radiusUnit) return;

  state.mode = "radius-confirmed";
  state.pxPerUnit = state.radiusPx / state.radiusUnit;

  state.circle.setAttribute("stroke", "#00c853");
  state.circle.setAttribute("fill", "rgba(0,200,83,0.2)");

  document.getElementById("rectBtn").disabled = false;
  document.getElementById("polyBtn").disabled = false;
  document.getElementById("exportBtn").disabled = false;

  confirmBtn.disabled = true;

  console.log("Radius bestätigt:");
  console.log("Pixel:", state.radiusPx);
  console.log("Einheiten:", state.radiusUnit);
  console.log("px / Einheit:", state.pxPerUnit);
}

/* ---------------- HELPERS ---------------- */

function getSVGPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
