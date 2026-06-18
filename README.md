# 📡 Radar de Editais

Monitor automático de editais e chamadas públicas de fomento à inovação no Brasil.

Monitora diariamente as publicações de:
- **FAPESP** — Fundação de Amparo à Pesquisa do Estado de São Paulo
- **Finep** — Financiadora de Estudos e Projetos
- **CNPq** — Conselho Nacional de Desenvolvimento Científico e Tecnológico
- **Embrapii** — Empresa Brasileira de Pesquisa e Inovação Industrial
- **Sebrae** — Serviço Brasileiro de Apoio às Micro e Pequenas Empresas

As notificações são enviadas automaticamente para um **bot do Telegram** às **08:00 (horário de Brasília)**, todos os dias, contendo apenas os editais **novos desde a última execução**.

---

## 🏗 Arquitetura

```
radar-editais/
├── src/
│   ├── index.ts              # Orquestrador principal + agendamento cron
│   ├── types.ts              # Interfaces TypeScript
│   ├── persistence.ts        # Leitura/escrita do estado.json
│   ├── hash.ts               # Geração de ID único por edital
│   ├── telegram.ts           # Formatação e envio das mensagens
│   └── scrapers/
│       ├── fapesp.ts
│       ├── finep.ts
│       ├── cnpq.ts
│       ├── embrapii.ts
│       └── sebrae.ts
├── estado.json               # Persistência (commitado no repo, sem banco de dados)
├── .github/
│   └── workflows/
│       └── radar.yml         # GitHub Actions — execução diária agendada
├── package.json
├── tsconfig.json
└── README.md
```

**Sem banco de dados.** A persistência é feita no arquivo `estado.json`, que fica no próprio repositório e é atualizado automaticamente pelo GitHub Actions a cada execução.

---

## 🚀 Instalação e configuração

### Pré-requisitos

- Node.js 18+
- npm
- Uma conta no Telegram e um bot criado via [@BotFather](https://t.me/botfather)
- Um repositório no GitHub

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/radar-editais.git
cd radar-editais
npm install
```

### 2. Crie o bot no Telegram

1. Abra o Telegram e inicie uma conversa com [@BotFather](https://t.me/botfather)
2. Use o comando `/newbot` e siga as instruções
3. Copie o **token** gerado (ex: `123456789:ABCdefGHI...`)
4. Descubra seu **Chat ID**:
   - Envie uma mensagem para o seu bot
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Copie o valor de `"chat":{"id":...}`

> **Dica:** Para receber as notificações em um **grupo**, adicione o bot ao grupo e use o Chat ID do grupo (começa com `-`).

### 3. Configure as variáveis de ambiente

Para execução local, crie um arquivo `.env` (não commitado):

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_CHAT_ID=987654321
```

E instale o `dotenv` se quiser carregá-las automaticamente:

```bash
npm install dotenv
```

Adicione no topo de `src/index.ts`:

```typescript
import "dotenv/config";
```

### 4. Configure os Secrets no GitHub

1. Acesse **Settings → Secrets and variables → Actions** no seu repositório
2. Crie dois secrets:

| Nome | Valor |
|------|-------|
| `TELEGRAM_BOT_TOKEN` | Token do seu bot |
| `TELEGRAM_CHAT_ID` | Seu Chat ID |

### 5. Habilite o workflow

O arquivo `.github/workflows/radar.yml` já está configurado para rodar às **08:00 BRT (11:00 UTC)** diariamente.

Para ativar:
1. Faça o push do repositório para o GitHub
2. Acesse a aba **Actions** no GitHub
3. O workflow será ativado automaticamente no próximo horário agendado
4. Para testar imediatamente: clique em **Run workflow** → **Run workflow**

---

## 🖥 Execução local

```bash
# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Execução única (envia para o Telegram e atualiza estado.json)
RUN_ONCE=true node dist/index.js --run-once

# Dry run (não envia, apenas mostra o que seria enviado)
npx ts-node src/index.ts --dry-run

# Modo daemon (roda localmente com cron às 08:00)
npm start
```

---

## 📬 Formato das mensagens no Telegram

Cada execução envia:

1. **Cabeçalho** com data e quantidade de editais novos
2. **Uma mensagem por edital**, contendo:
   - 🏛 Instituição
   - 📅 Prazo limite
   - 💰 Valor do fomento
   - 🔗 Link direto para o edital
3. **Rodapé de avisos** (apenas se algum scraper falhar)

Se nenhum edital novo for encontrado, uma mensagem simples confirma a execução.

---

## 🔄 Como funciona a deduplicação

Cada edital recebe um **ID único** gerado via SHA-256 a partir do título + instituição. Esse ID é armazenado em `estado.json`. A cada execução, apenas editais com IDs ainda não registrados são enviados ao Telegram.

O arquivo `estado.json` é atualizado e commitado automaticamente pelo GitHub Actions após cada execução.

---

## ⚙️ Ajuste do horário

Para alterar o horário de execução, edite o cron em `.github/workflows/radar.yml`:

```yaml
- cron: "0 11 * * *"   # 11:00 UTC = 08:00 BRT
```

Conversor rápido: `BRT (UTC-3)` → some 3 horas para obter o UTC correspondente.

---

## 🛠 Adicionando novos scrapers

1. Crie um arquivo em `src/scrapers/nova-fonte.ts`
2. Exporte uma função `async scraperNovaFonte(): Promise<ResultadoScraper>`
3. Importe e adicione ao array `scrapers` em `src/index.ts`

---

## 📝 Licença

MIT
