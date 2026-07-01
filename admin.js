
function goHome() {
  window.location.href = "index.html";
}

function openEmployees() {
  document.getElementById("adminContent").innerHTML =
    "<h2>👥 Gestione Dipendenti</h2>";
}

function openStats() {
  document.getElementById("adminContent").innerHTML =
    "<h2>📊 Statistiche reperibilità</h2>";
}

function exportPDF() {
  document.getElementById("adminContent").innerHTML =
    "<h2>📄 Export PDF</h2>";
}

function openSettings() {
  document.getElementById("adminContent").innerHTML =
    "<h2>⚙️ Impostazioni</h2>";
}
