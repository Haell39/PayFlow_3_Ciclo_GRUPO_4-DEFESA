// transacoes.js
// FIX: modal controlado via classe CSS .open (correto) em vez de display inline

let TODAS_TX = [
  { id: 1,  nome: "Salário",               valor: 3500.00, tipo: "credit", cat: "Renda",         data: "2025-06-02" },
  { id: 2,  nome: "Aluguel",               valor: 1200.00, tipo: "debit",  cat: "Moradia",       data: "2025-06-01" },
  { id: 3,  nome: "Supermercado",          valor:  320.50, tipo: "debit",  cat: "Alimentação",   data: "2025-06-01" },
  { id: 4,  nome: "Netflix",               valor:   45.90, tipo: "debit",  cat: "Lazer",         data: "2025-05-31" },
  { id: 5,  nome: "Freelance Design",      valor:  820.00, tipo: "credit", cat: "Renda",         data: "2025-05-30" },
  { id: 6,  nome: "Conta de Luz",          valor:  198.40, tipo: "debit",  cat: "Moradia",       data: "2025-05-29" },
  { id: 7,  nome: "Uber",                  valor:   37.90, tipo: "debit",  cat: "Transporte",    data: "2025-05-28" },
  { id: 8,  nome: "Farmácia",              valor:   85.60, tipo: "debit",  cat: "Saúde",         data: "2025-05-27" },
  { id: 9,  nome: "Curso Online",          valor:  199.00, tipo: "debit",  cat: "Educação",      data: "2025-05-26" },
  { id: 10, nome: "iFood",                 valor:   62.30, tipo: "debit",  cat: "Alimentação",   data: "2025-05-25" },
  { id: 11, nome: "Spotify",               valor:   21.90, tipo: "debit",  cat: "Lazer",         data: "2025-05-24" },
  { id: 12, nome: "Transferência recebida",valor:  500.00, tipo: "credit", cat: "Transferência", data: "2025-05-23" },
];

const CAT_ICONS = {
  Renda: "💼", Alimentação: "🛒", Lazer: "🎬", Moradia: "🏠", Transporte: "🚗",
  Saúde: "🏥", Educação: "📚", Serviços: "🔧", Transferência: "↔️", Outros: "📦",
};

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

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">Nenhuma transação encontrada.</td></tr>`;
    return;
  }

  // FIX XSS: usa createElement em vez de innerHTML com dados do usuário
  tbody.innerHTML = "";
  lista.forEach((tx) => {
    const sinal = tx.tipo === "credit" ? "+" : "-";
    const cor   = tx.tipo === "credit" ? "var(--green)" : "var(--red)";
    const icon  = CAT_ICONS[tx.cat] || "📦";
    const data  = new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR");

    const tr = document.createElement("tr");
    const td = document.createElement("td");

    const item = document.createElement("div");
    item.className = "tx-item";
    item.style.cssText = "border:none;padding:0.75rem 0";

    const iconDiv = document.createElement("div");
    iconDiv.className = "tx-icon";
    iconDiv.textContent = icon;

    const body = document.createElement("div");
    body.className = "tx-body";

    const name = document.createElement("div");
    name.className = "tx-name";
    name.textContent = tx.nome;   // textContent evita XSS

    const meta = document.createElement("div");
    meta.className = "tx-meta";
    meta.textContent = `${tx.cat} · ${data}`;

    const amount = document.createElement("div");
    amount.className = "tx-amount";
    amount.style.cssText = `color:${cor};font-weight:600`;
    amount.textContent = `${sinal} R$ ${tx.valor.toFixed(2).replace(".", ",")}`;

    body.appendChild(name);
    body.appendChild(meta);
    item.appendChild(iconDiv);
    item.appendChild(body);
    item.appendChild(amount);
    td.appendChild(item);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

// FIX 11: usa classe .open em vez de display inline — compatível com a animação CSS
function abrirModal() {
  document.getElementById("nova-tx-overlay").classList.add("open");
}
function fecharModal() {
  document.getElementById("nova-tx-overlay").classList.remove("open");
}

// Fecha ao clicar no fundo do overlay
document.getElementById("nova-tx-overlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) fecharModal();
});

// Fecha com Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

function salvarNovaTransacao() {
  const nomeEl  = document.getElementById("ntx-nome");
  const valorEl = document.getElementById("ntx-valor");
  const nome    = nomeEl.value.trim();
  const valor   = parseFloat(valorEl.value);
  const tipo    = document.getElementById("ntx-tipo").value;
  const cat     = document.getElementById("ntx-cat").value;

  if (!nome || isNaN(valor) || valor <= 0) {
    toast("Preencha todos os campos corretamente.", "⚠️");
    return;
  }

  const hoje = new Date().toISOString().slice(0, 10);
  TODAS_TX.unshift({ id: Date.now(), nome, valor, tipo, cat, data: hoje });
  fecharModal();
  renderTx();
  toast(`Transação "${nome}" registrada!`, "✅");

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
