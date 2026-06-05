// seguranca.js

const MOCK_LOG = [
  { status: "✅", local: "Recife, BR",       dispositivo: "Chrome · Windows",  data: "03/06/2025 14:22" },
  { status: "✅", local: "Recife, BR",       dispositivo: "Firefox · Android", data: "02/06/2025 09:05" },
  { status: "❌", local: "São Paulo, BR",    dispositivo: "Chrome · Windows",  data: "01/06/2025 23:47" },
  { status: "✅", local: "Recife, BR",       dispositivo: "Safari · macOS",    data: "31/05/2025 18:30" },
  { status: "❌", local: "IP desconhecido", dispositivo: "Bot / automatizado", data: "30/05/2025 03:12" },
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

renderLog();
