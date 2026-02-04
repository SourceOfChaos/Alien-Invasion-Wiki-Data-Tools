// ================================
// app.js – Fangradius als Referenz
// ================================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const setRadiusBtn = document.getElementById("setRadiusBtn");
const confirmRadiusBtn = document.getElementById("confirmRadiusBtn");

// --------------------
// Globaler App-State
// --------------------
const state = {
  image: null,

  mode: "idle", // idle | set-radius | radius-confirmed

  radius: {
    center: null,   // {x, y}
    px: null,       // Radius in Pixel
    units: null,    // Spieleinheiten (User-Eingabe)
    confirmed: false
  },

  draggingHandle: false,
  pxPerUnit: null
};

// --------------------
// Initiale UI-Sperren
// --------------------
confirmRadiusBtn.disabled = true;

// =======================================================
// Bild setzen (muss extern aufgerufen werden)
// =======================================================
function setImage(img) {
  state.image = img;
  canvas.width = img.width;
  canvas.height = img.height;
  redraw();
}

// =======================================================
// UI: Fangradius setzen starten
// =======================================================
setRadiusBtn.addEventListener("click", () => {
  resetRadius();
  state.mode = "set-radius";
  confirmRadiusBtn.disabled = true;
  redraw();
});

// =======================================================
// UI: Radius bestätigen
// =======================================================
confirmRadiusBtn.addEventListener("click", () => {
  if (!state.radius.center || !state.radius.px || !state.radius.units) return;

  state.radius.confirmed = true;
  state.mode = "radius-confirmed";
  state.pxPerUnit = state.radius.px / state.radius.units;

  console.log("Radius bestätigt:");
  console.log("px:", state.radius.px);
  console.log("Einheiten:", state.radius.units);
  console.log("px / Einheit:", state.pxPerUnit);

  redraw();
});

// =======================================================
// Canvas Events (Touch + Mouse unified)
// =======================================================
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointerleave", onPointerUp);

function onPointerDown(e) {
  if (state.mode !== "set-radius") return;

  const pos = getCanvasPos(e);

  // Mittelpunkt noch nicht gesetzt
  if (!state.radius.center) {
    state.radius.center = pos;
    state.radius.px = 10; // minimaler Startwert
    redraw();
    return;
  }

  // Prüfen ob Handle getroffen
  if (isOnRadiusHandle(pos)) {
    state.draggingHandle = true;
  }
}

function onPointerMove(e) {
  if (!state.draggingHandle) return;
  if (!state.radius.center) return;

  const pos = getCanvasPos(e);
  state.radius.px = distance(state.radius.center, pos);
  redraw();
}

function onPointerUp() {
  state.draggingHandle = false;
}

// =======================================================
// Zeichenlogik
// =======================================================
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.image) {
    ctx.drawImage(state.image, 0, 0);
  }

  if (state.radius.center) {
    drawRadius();
  }
}

function drawRadius() {
  const { center, px, confirmed } = state.radius;

  // Kreis
  ctx.beginPath();
  ctx.arc(center.x, center.y, px, 0, Math.PI * 2);
  ctx.strokeStyle = confirmed ? "#00c853" : "#ff9800";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Füllung
  ctx.fillStyle = confirmed
    ? "rgba(0,200,83,0.15)"
    : "rgba(255,152,0,0.15)";
  ctx.fill();

  // Mittelpunkt
  ctx.beginPath();
  ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Handle
  const handlePos = {
    x: center.x + px,
    y: center.y
  };
  ctx.beginPath();
  ctx.arc(handlePos.x, handlePos.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
  ctx.fill();

  // Beschriftung
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px system-ui";
  ctx.fillText(
    `Radius: ${Math.round(px)} px`,
    center.x + 10,
    center.y - px - 10
  );
}

// =======================================================
// Hilfsfunktionen
// =======================================================
function resetRadius() {
  state.radius = {
    center: null,
    px: null,
    units: prompt("Fangradius in Spieleinheiten eingeben:", "67"),
    confirmed: false
  };

  if (state.radius.units !== null) {
    state.radius.units = Number(state.radius.units);
  }
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isOnRadiusHandle(pos) {
  const handle = {
    x: state.radius.center.x + state.radius.px,
    y: state.radius.center.y
  };
  return distance(pos, handle) < 15;
}
