// consultas.js
// Controla a exibição, busca, filtragem e agendamento fictício de consultas médicas.

let TODAS_TX = [
  { id: 1,  nome: "Clínico Geral · Dra. Cláudia Santos", valor: "2026-06-08T14:00", tipo: "sus",        cat: "UBS Central - Centro",         status: "Confirmado" },
  { id: 2,  nome: "Cardiologia · Dr. Marco Aurélio",     valor: "2026-06-12T10:30", tipo: "particular", cat: "Hospital Universitário",       status: "Confirmado" },
  { id: 3,  nome: "Odontologia · Dra. Amanda Reis",      valor: "2026-06-15T09:00", tipo: "sus",        cat: "UBS Zona Sul - Nova Brasília", status: "Pendente" },
];

let filtroAtual = "all";
let buscaAtual  = "";

function renderTx() {
  const tbody = document.getElementById("tx-table-body");
  if (!tbody) return;

  const lista = TODAS_TX.filter((tx) => {
    if (filtroAtual !== "all" && tx.tipo !== filtroAtual) return false;
    if (
      buscaAtual &&
      !tx.nome.toLowerCase().includes(buscaAtual) &&
      !tx.cat.toLowerCase().includes(buscaAtual)
    )
      return false;
    return true;
  });

  // Atualiza badge lateral
  const badge = document.getElementById("sidebar-badge-consultas");
  if (badge) {
    badge.textContent = TODAS_TX.length;
  }

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">Nenhuma consulta encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  lista.forEach((tx) => {
    const dataObj = new Date(tx.valor);
    const dataStr = dataObj.toLocaleDateString("pt-BR") + " às " + dataObj.toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
    
    const statusClass = tx.status === "Confirmado" ? "status-pill ok" : "status-pill pending";
    const statusText = tx.status === "Confirmado" ? "Confirmado" : "Pendente";

    const tr = document.createElement("tr");
    tr.style.cssText = "border-bottom: 1px solid var(--border);";

    // Especialidade / Médico
    const tdNome = document.createElement("td");
    tdNome.style.padding = "12px 1.5rem";
    tdNome.style.fontWeight = "600";
    tdNome.textContent = tx.nome;

    // Data e Hora
    const tdData = document.createElement("td");
    tdData.style.padding = "12px 1rem";
    tdData.style.color = "var(--muted)";
    tdData.textContent = dataStr;

    // Local
    const tdLocal = document.createElement("td");
    tdLocal.style.padding = "12px 1rem";
    tdLocal.textContent = tx.cat;

    // Tipo (SUS/Particular)
    const tdTipo = document.createElement("td");
    tdTipo.style.padding = "12px 1rem";
    const spanTipo = document.createElement("span");
    spanTipo.className = "tag";
    spanTipo.style.cssText = tx.tipo === "sus" ? "background:var(--green-pale); border-color:var(--green-light); color:var(--green)" : "background:var(--blue-pale); border-color:var(--sun-light); color:var(--sun)";
    spanTipo.textContent = tx.tipo === "sus" ? "SUS" : "Convênio";
    tdTipo.appendChild(spanTipo);

    // Status
    const tdStatus = document.createElement("td");
    tdStatus.style.padding = "12px 1.5rem";
    tdStatus.style.textAlign = "right";
    const spanStatus = document.createElement("span");
    spanStatus.className = statusClass;
    spanStatus.textContent = statusText;
    tdStatus.appendChild(spanStatus);

    tr.appendChild(tdNome);
    tr.appendChild(tdData);
    tr.appendChild(tdLocal);
    tr.appendChild(tdTipo);
    tr.appendChild(tdStatus);
    
    tbody.appendChild(tr);
  });
}

function abrirModal() {
  document.getElementById("nova-tx-overlay").classList.add("open");
}
function fecharModal() {
  document.getElementById("nova-tx-overlay").classList.remove("open");
}

document.getElementById("nova-tx-overlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) fecharModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

function salvarNovaTransacao() {
  const nomeEl  = document.getElementById("ntx-nome");
  const valorEl = document.getElementById("ntx-valor");
  const nome    = nomeEl.value.trim();
  const valor   = valorEl.value; // string formato datetime-local
  const tipo    = document.getElementById("ntx-tipo").value;
  const cat     = document.getElementById("ntx-cat").value;

  if (!nome || !valor) {
    toast("Preencha todos os campos corretamente.", "⚠️");
    return;
  }

  TODAS_TX.unshift({ id: Date.now(), nome, valor, tipo, cat, status: "Pendente" });
  fecharModal();
  renderTx();
  toast(`Consulta para "${nome}" agendada!`, "✅");

  nomeEl.value  = "";
  valorEl.value = "";
}

// Filtros e busca
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filtroAtual = btn.dataset.filter;
    renderTx();
  });
});

const searchInput = document.getElementById("tx-search");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    buscaAtual = e.target.value.toLowerCase();
    renderTx();
  });
}

renderTx();

document.addEventListener("DOMContentLoaded", () => {
    const btnAbrir = document.getElementById("btn-abrir-modal");
    if(btnAbrir) btnAbrir.addEventListener("click", abrirModal);
    
    const btnFechar = document.getElementById("btn-fechar-modal");
    if(btnFechar) btnFechar.addEventListener("click", fecharModal);
    
    const btnCancelar = document.getElementById("btn-cancelar-modal");
    if(btnCancelar) btnCancelar.addEventListener("click", fecharModal);

    const btnSalvar = document.getElementById("btn-salvar-transacao");
    if(btnSalvar) btnSalvar.addEventListener("click", salvarNovaTransacao);
});
