Este repositório contém a aplicação **PayFlow**, um portal bancário simulado para realização de transferências financeiras.

> [!NOTE]
> **Quer entender mais sobre o projeto e a sua arquitetura de segurança?**
> Todo o detalhamento técnico das defesas implementadas, a análise de riscos e o roteiro para a apresentação acadêmica estão consolidados no arquivo:
> 👉 **[Documentação de Segurança (Projeto.md)](Projeto.md)**

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

Certifique-se de ter o Python 3 instalado em seu computador.

1. **Instalar as dependências**:
   Recomenda-se criar um ambiente virtual antes de instalar.

   ```bash
   # Criar ambiente virtual
   python -m venv venv

   # Ativar ambiente virtual (Windows PowerShell)
   .\venv\Scripts\Activate.ps1

   # Ativar ambiente virtual (Windows CMD)
   .\venv\Scripts\activate.bat

   # Ativar ambiente virtual (Linux/macOS)
   source venv/bin/activate

   # Instalar dependências
   pip install -r requirements.txt
   ```

2. **Criar o arquivo `.env`**:

   > [!IMPORTANT]
   > Este passo é **obrigatório**. Sem o arquivo `.env`, a aplicação não inicializa.

   Copie o arquivo de exemplo para criar o seu `.env`:
   ```bash
   # Windows
   copy .env.example .env

   # Linux/macOS
   cp .env.example .env
   ```

3. **Executar a aplicação**:

   ```bash
   python app.py
   ```

   A aplicação estará disponível em: **`http://localhost:5000`**

---

## 📲 Modos de OTP

O sistema possui dois modos de funcionamento para o código de verificação (OTP):

### 🟡 Modo Mockado (Padrão)
Após copiar o `.env.example` para `.env` (passo 2 acima), **não é necessário preencher nada além disso**. Os campos `SMTP_USER` e `SMTP_PASSWORD` já vêm em branco no exemplo. Com eles em branco, o sistema exibe o código OTP em uma **etiqueta amarela diretamente na tela do navegador** após o login.

### 📧 Modo Real (Opcional — requer Gmail)
Se quiser receber o OTP de verdade no e-mail, preencha as variáveis SMTP no seu `.env`:

```ini
SMTP_USER=seu-email-remetente@gmail.com
SMTP_PASSWORD=sua-senha-de-app-de-16-letras
```

_(Para o Gmail, gere uma **Senha de App** de 16 dígitos em myaccount.google.com → Segurança → "Senhas de app")._
