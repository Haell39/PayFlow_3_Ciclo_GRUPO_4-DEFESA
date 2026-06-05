# PayFlow — Documentação de Segurança & Instruções

Este projeto foi desenvolvido como parte da disciplina de **Segurança em Sistemas da Informação** (3º Ciclo Avaliativo - Grupo de Defesa). O objetivo do sistema é implementar um portal de transferências financeiras simulado com foco em demonstrar as melhores práticas de criptografia, autenticação e defesa cibernética.

---

## 🏗️ Decisões Técnicas e Arquiteturais

As escolhas abaixo foram feitas **intencionalmente** com base no escopo acadêmico do projeto:

| Decisão | Justificativa |
|---|---|
| **JSON em vez de SQL** | Elimina dependências externas. As senhas continuam inacessíveis mesmo que o arquivo vaze, graças ao Bcrypt. |
| **OTP em memória** | Suficiente para instância única. Validade de 5 min + limite de 3 tentativas tornam o vetor inviável. |
| **Sem CAPTCHA** | Evita dependência de APIs externas (Google, Cloudflare). O Rate Limiting cobre o endpoint de cadastro. |
| **Servidor embutido Flask** | Suficiente para demonstração local. Em produção, o indicado é Gunicorn + Nginx. |

## ⚠️ Gerenciamento de Segredos e Versionamento

> [!IMPORTANT]
> **Alerta de Segurança:** Arquivos contendo chaves privadas, segredos ou tokens de sessão (como o nosso `.env`) **nunca** devem ser commitados no controle de versão (Git).
> 
> * **Correção Aplicada:** Qualquer dependência de chaves geradas em disco (como o antigo `.flask_secret`) foi removida da aplicação. O aplicativo agora recusa a inicialização se a variável de ambiente `FLASK_SECRET_KEY` não for fornecida.
> * Os arquivos `.env` e pastas temporárias foram todos isolados pelo `.gitignore`.

---

## 💡 Decisões de Arquitetura (Por que JSON e não SQL?)

> [!NOTE]
> **Simplicidade de Execução (Portabilidade Acadêmica)**
> Em vez de usarmos **PostgreSQL** para o banco de dados e **Redis** para os códigos OTP, decidimos intencionalmente utilizar o arquivo `users.json` e armazenar os códigos OTP na memória RAM da aplicação.
> 
> **Qual o motivo?** Isso garante que **qualquer avaliador consiga rodar o projeto** instantaneamente apenas com o comando `python app.py`, sem precisar instalar servidores complexos na própria máquina. As limitações de persistência (como perder o OTP num reinício do servidor) são mitigadas pelo forte uso de **Criptografia Bcrypt**, garantindo que, mesmo se o arquivo JSON vazar, nenhuma senha seja comprometida.

---

## 🔒 Mecanismos de Segurança Implementados

### 1. Hash bcrypt + Salt (O que o usuário **sabe**)
* As senhas nunca são salvas ou trafegadas em texto plano no banco de dados (`users.json`).
* É utilizado o algoritmo de derivação de chaves `bcrypt` com `rounds=12`, gerando um salt único criptográfico para cada usuário. Isso inviabiliza ataques de tabelas pré-computadas (Rainbow Tables) e dificulta ataques de força bruta offline.

### 2. Autenticação Multifator - OTP (O que o usuário **possui**)
* Após a senha correta, é exigido um código OTP temporário de 6 dígitos gerado via gerador de números randômicos seguro (`secrets.randbelow()`).
* Expira em 5 minutos e é invalidado após 3 tentativas incorretas.
* **Envio por E-mail (SMTP)**: Opcionalmente configurável por variáveis de ambiente. Se configurado, o OTP é enviado ao e-mail real do usuário em tempo real. Se não configurado, cai no fallback seguro imprimindo no console do servidor.
* A validação do OTP utiliza comparação em tempo constante (`secrets.compare_digest`), mitigando timing attacks.

### 3. Proteção contra Rate Limiting & Força Bruta
* Rate limit por IP em memória: se um IP falhar o login, cadastro ou validação de OTP mais de 5 vezes consecutivas, ele é bloqueado temporariamente por 5 minutos.

### 4. Proteção contra Timing Attack de Enumeração de Usuários
* A rota de login foi corrigida para rodar um cálculo de hash dummy caso o e-mail não seja encontrado na base de dados. Dessa forma, o tempo de resposta da API de login é uniforme (~200ms a ~300ms) quer o e-mail exista ou não, impedindo que um atacante enumere e-mails válidos através da medição da latência.

### 5. Proteção CSRF (Cross-Site Request Forgery)
* Um token CSRF seguro e exclusivo por sessão é gerado. Todos os endpoints mutáveis do tipo `POST` (`/api/login`, `/api/cadastrar`, `/api/verificar-otp`, `/api/logout`) validam o token recebido no header `X-CSRF-Token` ou no corpo da requisição usando `secrets.compare_digest`.

### 6. Cookies e Sessão Seguros
* O cookie de sessão possui as diretivas:
  * `SESSION_COOKIE_HTTPONLY = True` (bloqueia acesso ao cookie via scripts front-end, mitigando sequestro de sessão via XSS).
  * `SESSION_COOKIE_SAMESITE = "Strict"` (garante que o cookie não seja compartilhado em requisições de outros domínios).
  * `SESSION_COOKIE_SECURE = True` (aplicado em produção para garantir tráfego exclusivo sobre HTTPS).
  * `PERMANENT_SESSION_LIFETIME = 2 horas` (tempo limite de inatividade da sessão).

### 7. Headers HTTP de Segurança
A aplicação injeta em todas as respostas HTTP os seguintes cabeçalhos de defesa:
* `X-Content-Type-Options: nosniff` (impede MIME-type sniffing).
* `X-Frame-Options: DENY` (previne ataques de Clickjacking em iframes).
* `X-XSS-Protection: 1; mode=block` (filtro XSS nativo para navegadores legados).
* `Referrer-Policy: strict-origin-when-cross-origin` (limita o vazamento de caminhos da URL no cabeçalho Referer).
* `Strict-Transport-Security (HSTS)` (força o tráfego via HTTPS; ativado apenas se `FLASK_ENV=production`).
* `Content-Security-Policy (CSP)`: Usa uma política estrita, sem `'unsafe-inline'` para scripts. Conta com a injeção de um **Nonce Criptográfico** (`nonce="{{ nonce }}"`) gerado a cada requisição (`before_request`) para autorizar a execução exclusiva de scripts conhecidos e anular injeções de XSS.

### 8. Pinning de Sessão (IP & User-Agent) — Contra Session Hijacking
* No login bem-sucedido, o servidor grava na sessão criptografada o IP e o User-Agent do navegador. Em todas as páginas protegidas pelo decorator `@requer_login`, o servidor valida se o IP/User-Agent atual coincide. Se o atacante roubar o cookie de sessão, ele continuará impedido de acessar de outra máquina ou navegador.

### 9. Validação de Complexidade de Senhas & Confirmação
* O endpoint `/api/cadastrar` possui expressão regular robusta para validação de senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial).
* O formulário de cadastro possui dupla validação com um campo de **"Confirmar Senha"** no frontend para evitar erros de digitação do usuário antes de realizar a requisição.

### 10. Persistência de Alterações de Perfil e Senha (API Real)
* As rotas `/api/atualizar-perfil` e `/api/atualizar-senha` gravam as alterações de forma permanente no `users.json` e atualizam a sessão ativa do usuário. Ambas rotas possuem verificação de CSRF token e controle de acesso `@requer_login`.

### 11. Proteção contra Session Fixation
* Logo após a validação bem sucedida do OTP (e antes de gravar os dados de usuário logado na sessão), o sistema executa `session.clear()` mas preserva o token CSRF. Dessa forma, uma nova e limpa sessão é criada, impedindo ataques de Fixação de Sessão.

### 12. Auditoria e Logs Automatizados (Audit Log)
* A aplicação conta com um sistema de `RotatingFileHandler` que grava trilhas de auditoria (audit.log) em formato JSON.
* Ações sensíveis como: Sucesso e Falha de Login, Contas Inexistentes, Expiração/Uso de OTP, Erros de Sessão por Hijacking, Bloqueios de IP e Conta, Alterações de Senha, entre outros, são ativamente logados contendo Timestamp UTC, IP do usuário e E-mail.

---


