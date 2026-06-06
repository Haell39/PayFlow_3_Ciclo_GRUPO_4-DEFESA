// seguranca.js
// Trilha de auditoria e painel demonstrador interativo de criptografia.

const MOCK_LOG = [
  { status: "✅", local: "Recife, BR",       dispositivo: "Chrome · Windows",  data: "05/06/2026 23:22" },
  { status: "✅", local: "Recife, BR",       dispositivo: "Firefox · Android", data: "05/06/2026 14:05" },
  { status: "❌", local: "São Paulo, BR",    dispositivo: "Chrome · Windows",  data: "04/06/2026 23:47" },
  { status: "✅", local: "Recife, BR",       dispositivo: "Safari · macOS",    data: "03/06/2026 18:30" },
  { status: "❌", local: "IP desconhecido", dispositivo: "Bot / automatizado", data: "02/06/2026 03:12" },
];

function renderLog() {
  const list = document.getElementById("login-log");
  if (!list) return;

  list.innerHTML = "";
  MOCK_LOG.forEach((e) => {
    const item = document.createElement("div");
    item.className = "tx-item";

    const iconDiv = document.createElement("div");
    iconDiv.className = "tx-icon";
    iconDiv.textContent = e.status;

    const body = document.createElement("div");
    body.className = "tx-body";

    const name = document.createElement("div");
    name.className = "tx-name";
    name.textContent = e.dispositivo;

    const meta = document.createElement("div");
    meta.className = "tx-meta";
    meta.textContent = `${e.local} · ${e.data}`;

    const result = document.createElement("div");
    result.className = "tx-amount";
    result.style.color = e.status === "✅" ? "var(--green)" : "var(--red)";
    result.textContent = e.status === "✅" ? "Sucesso" : "Falhou";

    body.appendChild(name);
    body.appendChild(meta);
    item.appendChild(iconDiv);
    item.appendChild(body);
    item.appendChild(result);
    list.appendChild(item);
  });
}

// Lógica de criptografia interativa
async function executarCripto(cifra, decodificar = false) {
  let texto = "";
  let chave = "";
  let resultEl = null;

  if (cifra === "cesar") {
    texto = document.getElementById("cesar-texto").value;
    chave = document.getElementById("cesar-chave").value;
    resultEl = document.getElementById("cesar-resultado");
  } else if (cifra === "vigenere") {
    texto = document.getElementById("vigenere-texto").value;
    chave = document.getElementById("vigenere-chave").value;
    resultEl = document.getElementById("vigenere-resultado");
  } else if (cifra === "bcrypt") {
    texto = document.getElementById("bcrypt-texto").value;
    resultEl = document.getElementById("bcrypt-resultado");
  }

  if (!texto) {
    if (resultEl) resultEl.textContent = "---";
    return;
  }

  if (resultEl) resultEl.textContent = "Processando...";

  try {
    // Usando postJSON global definido no shared.js
    const res = await postJSON("/api/cripto-demo", {
      texto: texto,
      cifra: cifra,
      chave: chave,
      decodificar: decodificar
    });
    const data = await res.json();

    if (res.ok) {
      if (resultEl) resultEl.textContent = data.resultado;
    } else {
      if (resultEl) resultEl.textContent = "Erro: " + (data.erro || "Falha");
    }
  } catch (err) {
    if (resultEl) resultEl.textContent = "Erro de rede.";
  }
}

renderLog();

document.addEventListener("DOMContentLoaded", () => {
  // César
  document.getElementById("btn-cesar-cifrar")?.addEventListener("click", () => executarCripto("cesar", false));
  document.getElementById("btn-cesar-decifrar")?.addEventListener("click", () => executarCripto("cesar", true));
  
  // Vigenère
  document.getElementById("btn-vigenere-cifrar")?.addEventListener("click", () => executarCripto("vigenere", false));
  document.getElementById("btn-vigenere-decifrar")?.addEventListener("click", () => executarCripto("vigenere", true));

  // Bcrypt
  document.getElementById("btn-bcrypt-hash")?.addEventListener("click", () => executarCripto("bcrypt", false));
});
