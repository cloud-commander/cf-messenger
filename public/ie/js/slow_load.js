// Legacy JS for Netsurf compatibility
function startSimulation() {
  var delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds

  // Create a loading overlay if possible, or just hide body
  // Note: Netsurf JS support is very limited. This might be ignored.
  var body = document.body;
  if (body) {
    body.style.display = "none";
    setTimeout(function () {
      body.style.display = "block";
    }, delay);
  }
}

// Old school event binding
window.onload = startSimulation;
