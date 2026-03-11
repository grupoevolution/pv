# Grupinho VIP — Página de Vendas + Painel

## O que é este projeto

- **`/`** — Página de vendas mobile-first com rastreio automático
- **`/admin`** — Painel de controle com métricas e editor do site

---

## Deploy no EasyPanel (passo a passo)

### 1. Suba para o GitHub

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/grupinho-vip.git
git push -u origin main
```

### 2. Crie o serviço no EasyPanel

1. Acesse seu EasyPanel
2. Clique em **"Create Service"** → **"App"**
3. Escolha **"GitHub"** e selecione o repositório
4. Em **Build**, selecione **"Dockerfile"**
5. Porta: **3000**

### 3. Configure as variáveis de ambiente

No EasyPanel, vá em **Environment** e adicione:

| Variável | Valor |
|---|---|
| `PORT` | `3000` |
| `JWT_SECRET` | qualquer texto longo e aleatório |
| `ADMIN_USER` | o usuário que quiser (ex: `admin`) |
| `ADMIN_PASS` | sua senha segura |

### 4. Configure o volume persistente

No EasyPanel, vá em **Volumes** e crie:

- **Container path:** `/app/data`  → para o banco SQLite
- **Container path:** `/app/public/uploads` → para as imagens enviadas

> Sem isso, os dados são perdidos a cada deploy.

### 5. Configure o domínio

Em **Domains**, adicione seu domínio e ative HTTPS.

---

## Acessos

| Endereço | O quê |
|---|---|
| `seudominio.com` | Página de vendas |
| `seudominio.com/admin` | Painel de controle |

---

## O que fazer após o deploy

1. Acesse `/admin` com o usuário e senha configurados
2. Vá em **Links dos planos** e cole os links do PerfectPay
3. Em **Mulheres próximas**, faça upload das fotos das modelos
4. Em **Simulação do grupo**, adicione fotos reais para as mensagens
5. Em **Info do grupo**, ajuste nome e foto de perfil se quiser
6. Acesse a página principal e teste

---

## Rodar localmente (opcional)

```bash
npm install
node server.js
# Acesse: http://localhost:3000
# Painel:  http://localhost:3000/admin
```

---

## Estrutura de arquivos

```
grupinho-vip/
├── server.js           ← backend Express + SQLite
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .gitignore
├── public/
│   ├── index.html      ← página de vendas
│   └── uploads/        ← imagens enviadas pelo painel (ignorado no git)
├── admin/
│   └── index.html      ← painel admin
└── data/               ← banco SQLite (ignorado no git)
```
