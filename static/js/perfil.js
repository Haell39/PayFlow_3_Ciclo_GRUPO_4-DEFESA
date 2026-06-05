// perfil.js — carregado após shared.js (que já preenche os campos)

async function atualizarPerfil() {
  const nome = document.getElementById("profile-input-name")?.value.trim();
  if (!nome || nome.length < 2) {
    toast("Nome muito curto.", "⚠️");
    return;
  }
  
  try {
    const res = await postJSON("/api/atualizar-perfil", { nome });
    const data = await res.json();
    if (res.ok) {
      toast(data.mensagem || "Perfil atualizado!", "✅");
      // Recarrega o nome do usuário nas barras lateral e superior
      await carregarUsuario();
    } else {
      toast(data.erro || "Erro ao atualizar perfil.", "❌");
    }
  } catch (e) {
    toast("Erro de rede. Tente novamente.", "❌");
  }
}

async function atualizarSenha() {
  const atual    = document.getElementById("senha-atual")?.value;
  const nova     = document.getElementById("senha-nova")?.value;
  const confirma = document.getElementById("senha-confirma")?.value;

  if (!atual || !nova || !confirma) {
    toast("Preencha todos os campos de senha.", "⚠️");
    return;
  }
  if (nova.length < 8) {
    toast("A nova senha deve ter ao menos 8 caracteres.", "⚠️");
    return;
  }
  if (nova !== confirma) {
    toast("As senhas não coincidem.", "❌");
    return;
  }

  try {
    const res = await postJSON("/api/atualizar-senha", { atual, nova });
    const data = await res.json();
    if (res.ok) {
      toast(data.mensagem || "Senha alterada com sucesso!", "🔑");
      document.getElementById("senha-atual").value = "";
      document.getElementById("senha-nova").value = "";
      document.getElementById("senha-confirma").value = "";
    } else {
      toast(data.erro || "Erro ao alterar senha.", "❌");
    }
  } catch (e) {
    toast("Erro de rede. Tente novamente.", "❌");
  }
}


document.addEventListener("DOMContentLoaded", () => {
    const btnPerfil = document.getElementById("btn-atualizar-perfil");
    if(btnPerfil) btnPerfil.addEventListener("click", atualizarPerfil);

    const btnSenha = document.getElementById("btn-atualizar-senha");
    if(btnSenha) btnSenha.addEventListener("click", atualizarSenha);
});
