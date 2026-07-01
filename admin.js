
// ======================
// 🔙 HOME
// ======================
function goHome() {
  window.location.href = "index.html";
}

// ======================
// 📊 STATISTICHE
// ======================
function openStats() {
  document.getElementById("adminContent").innerHTML =
    "<h2>📊 Statistiche reperibilità</h2>";
}

// ======================
// 📄 EXPORT PDF
// ======================
function exportPDF() {
  document.getElementById("adminContent").innerHTML =
    "<h2>📄 Export PDF</h2>";
}

// ======================
// ⚙️ IMPOSTAZIONI
// ======================
function openSettings() {
  document.getElementById("adminContent").innerHTML =
    "<h2>⚙️ Impostazioni</h2>";
}

// ======================
// 👥 LISTA DIPENDENTI
// ======================
async function openEmployees() {
  const container = document.getElementById("adminContent");

  container.innerHTML = "<h2>👥 Caricamento dipendenti...</h2>";

  const snapshot = await getDocs(collection(db, "employees"));

  let html = `
    <h2>👥 Gestione Dipendenti</h2>

    <button onclick="showAddEmployee()">➕ Aggiungi Dipendente</button>

    <div style="margin-top:20px;">
  `;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    html += `
      <div style="border:1px solid #ccc; padding:10px; margin:10px 0;">
        <strong>${data.nome || "Senza nome"}</strong><br>
        ${data.email}<br>
        Ruolo: <b>${data.ruolo}</b><br>

        <button onclick="toggleRole('${docSnap.id}', '${data.ruolo}')">
          Cambia ruolo
        </button>

        <button onclick="deleteEmployee('${docSnap.id}')">
          🗑 Elimina
        </button>
      </div>
    `;
  });

  html += "</div>";

  container.innerHTML = html;
}

// ======================
// ➕ FORM AGGIUNGI DIPENDENTE
// ======================
function showAddEmployee() {
  const container = document.getElementById("adminContent");

  container.innerHTML = `
    <h2>➕ Nuovo Dipendente</h2>

    <input id="empName" placeholder="Nome"><br><br>
    <input id="empEmail" placeholder="Email"><br><br>

    <select id="empRole">
      <option value="user">Dipendente</option>
      <option value="admin">Admin</option>
    </select><br><br>

    <button onclick="addEmployee()">Salva</button>
    <button onclick="openEmployees()">← Indietro</button>
  `;
}

// ======================
// 💾 AGGIUNGI DIPENDENTE
// ======================
async function addEmployee() {
  const nome = document.getElementById("empName").value;
  const email = document.getElementById("empEmail").value;
  const ruolo = document.getElementById("empRole").value;

  await addDoc(collection(db, "employees"), {
    nome,
    email,
    ruolo
  });

  alert("Dipendente aggiunto!");
  openEmployees();
}

// ======================
// 🔄 CAMBIA RUOLO
// ======================
async function toggleRole(id, currentRole) {
  const newRole = currentRole === "admin" ? "user" : "admin";

  await updateDoc(doc(db, "employees", id), {
    ruolo: newRole
  });

  openEmployees();
}

// ======================
// 🗑 ELIMINA DIPENDENTE
// ======================
async function deleteEmployee(id) {
  if (!confirm("Sei sicuro di eliminare questo dipendente?")) return;

  await deleteDoc(doc(db, "employees", id));

  openEmployees();
}
