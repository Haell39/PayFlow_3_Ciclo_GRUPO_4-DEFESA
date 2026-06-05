// shared.js — carrega dados do usuário na sidebar e topbar
// FIX: busca o token CSRF do servidor e o injeta em todas as requisições POST

let _csrfToken = "";

async function inicializar() {
  try {
    const res = await fetch("/api/csrf-token");
    if (res.ok) {
      const data = await res.json();
      _csrfToken = data.csrf_token || "";
    }
  } catch (e) {
    console.error("Erro ao buscar CSRF token:", e);
  }
  await carregarUsuario();
}

/** Wrapper seguro para fetch POST — injeta CSRF automaticamente */
async function postJSON(url, body = {}) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": _csrfToken,
    },
    body: JSON.stringify({ ...body, _csrf: _csrfToken }),
  });
}

async function carregarUsuario() {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) {
      window.location.href = "/";
      return;
    }
    const { nome, email } = await res.json();
    const initials = nome
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    document
      .querySelectorAll("#sb-initials, #top-initials, #profile-initials")
      .forEach((el) => el && (el.textContent = initials));

    const sbNome           = document.getElementById("sb-nome");
    const sbEmail          = document.getElementById("sb-email");
    const profileName      = document.getElementById("profile-name");
    const profileEmail     = document.getElementById("profile-email");
    const profileInputName  = document.getElementById("profile-input-name");
    const profileInputEmail = document.getElementById("profile-input-email");

    if (sbNome)           sbNome.textContent           = nome;
    if (sbEmail)          sbEmail.textContent          = email;
    if (profileName)      profileName.textContent      = nome;
    if (profileEmail)     profileEmail.textContent     = email;
    if (profileInputName)  profileInputName.value      = nome;
    if (profileInputEmail) profileInputEmail.value     = email;
  } catch (e) {
    console.error(e);
  }
}

async function fazerLogout() {
  await postJSON("/api/logout");
  window.location.href = "/";
}

function toast(msg, icon = "ℹ️") {
  const wrap = document.getElementById("toast-wrap");
  if (!wrap) return;
  const t = document.createElement("div");
  t.className = "toast";
  // FIX XSS: usar textContent em vez de innerHTML para conteúdo dinâmico
  const iconSpan = document.createElement("span");
  iconSpan.textContent = icon;
  const textSpan = document.createElement("span");
  textSpan.textContent = msg;
  t.appendChild(iconSpan);
  t.appendChild(textSpan);
  wrap.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

inicializar();


document.addEventListener("DOMContentLoaded", () => {
    const btnLogoutList = document.querySelectorAll("#btn-logout");
    btnLogoutList.forEach(btn => btn.addEventListener("click", () => { if(typeof fazerLogout === 'function') fazerLogout(); }));
});
