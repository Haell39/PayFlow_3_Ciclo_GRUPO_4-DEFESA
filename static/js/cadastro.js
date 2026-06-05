// cadastro.js
// FIX: CSRF token + classe CSS corrigida

let _csrfToken = "";

async function init() {
  try {
    const res = await fetch("/api/csrf-token");
    if (res.ok) {
      const data = await res.json();
      _csrfToken = data.csrf_token || "";
    }
  } catch (e) {
    console.error("CSRF init error:", e);
  }
}

function avaliarSenha(senha) {
  const bars   = ["s1", "s2", "s3", "s4"].map((id) => document.getElementById(id));
  const label  = document.getElementById("strength-label");
  const colors = ["#e53e3e", "#ed8936", "#ecc94b", "#48bb78"];
  const labels = ["Fraca", "Razoável", "Boa", "Forte"];

  let score = 0;
  if (senha.length >= 8)           score++;
  if (/[A-Z]/.test(senha))         score++;
  if (/[0-9]/.test(senha))         score++;
  if (/[^A-Za-z0-9]/.test(senha))  score++;

  bars.forEach((b, i) => {
    if (b) b.style.background = i < score ? colors[score - 1] : "rgba(255,255,255,0.1)";
  });
  if (label) {
    label.textContent = senha.length ? labels[score - 1] || "" : "";
    label.style.color = colors[score - 1] || "#718096";
  }
}

async function fazerCadastro() {
  const nome     = document.getElementById("cad-nome").value.trim();
  const email    = document.getElementById("cad-email").value.trim();
  const senha    = document.getElementById("cad-senha").value;
  const confirma = document.getElementById("cad-senha-confirma").value;
  const msg      = document.getElementById("cadastro-msg");

  msg.textContent = "";
  msg.className   = "msg";

  if (!nome || !email || !senha || !confirma) {
    msg.textContent = "Preencha todos os campos.";
    msg.className   = "msg error";
    return;
  }

  if (senha !== confirma) {
    msg.textContent = "As senhas não coincidem.";
    msg.className   = "msg error";
    return;
  }

  try {
    const res = await fetch("/api/cadastrar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": _csrfToken,
      },
      body: JSON.stringify({ nome, email, senha, _csrf: _csrfToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.erro;
      msg.className   = "msg error";
      return;
    }

    msg.textContent = data.mensagem + " Redirecionando…";
    msg.className   = "msg success";   // FIX: "success" conforme CSS
    setTimeout(() => (window.location.href = "/"), 1500);
  } catch (e) {
    msg.textContent = "Erro de rede.";
    msg.className   = "msg error";
  }
}

function toast(mensagem, icon = "ℹ️") {
  const wrap = document.getElementById("toast-wrap");
  if (!wrap) return;
  const t = document.createElement("div");
  t.className = "toast";
  const iconSpan = document.createElement("span");
  iconSpan.textContent = icon;
  const textSpan = document.createElement("span");
  textSpan.textContent = mensagem;
  t.appendChild(iconSpan);
  t.appendChild(textSpan);
  wrap.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

init();


document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-fazer-cadastro");
    if(btn) btn.addEventListener("click", fazerCadastro);
});
