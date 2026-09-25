# 📋 CONTEXTO DO PROJETO - GRADEMED

> **Aviso para Modelos de IA / Assistentes:**  
> Este documento contém todas as informações arquiteturais, de negócios, infraestrutura, versionamento e regras de desenvolvimento do **GradeMed**. Sempre leia este arquivo antes de sugerir ou implementar qualquer alteração no sistema.

---

## 1. 🩺 Sobre o Sistema (O que é o GradeMed?)

O **GradeMed** é uma aplicação web médica e ambulatorial destinada ao cálculo e geração automatizada de **grades de horários de atendimento**.

### Principais Funcionalidades:
1. **Modo por Quantidade de Atendimentos (`intervalo`):**  
   O usuário informa o Horário Inicial, Horário Final e o número de atendimentos desejados. O sistema calcula a duração ideal de cada atendimento em minutos inteiros. Se a divisão gerar frações/segundos, o sistema exibe um modal inteligente perguntando se o usuário prefere antecipar ou postergar o horário de término em X minutos para manter intervalos inteiros.
2. **Modo por Duração do Intervalo (`quantidade`):**  
   O usuário informa o Horário Inicial, Horário Final e a duração fixa de cada consulta (ex: 20 minutos). O sistema calcula quantos atendimentos cabem e ajusta/pergunta sobre sobras de tempo.
3. **Resumo Visual:**  
   Cards de destaque com duração do intervalo em minutos, total de atendimentos, horário inicial, horário final e tempo total em minutos.
4. **Tabela de Escala de Horários:**  
   Lista detalhada com o número do atendimento (`#1`, `#2`, ...), horário de início, horário de fim e duração.
5. **Impressão / PDF:**  
   Botão de impressão com estilos dedicados (`@media print`) e integração com `html2pdf.js`.
6. **Layout Viewport Contained (Sem Rolagem na Janela):**  
   Em telas desktop, a aplicação se ajusta em tela cheia (`100vh`). Se a escala contiver muitos atendimentos, a rolagem ocorre exclusivamente dentro do card da tabela de horários (com cabeçalho sticky), mantendo o rodapé com a versão e o cabeçalho sempre fixos e visíveis.

---

## 2. 🛠️ Stack Tecnológica

- **Framework Web:** [Next.js](https://nextjs.org/) 15.4+ (App Router, configurado com `output: 'export'` para geração estática SPA).
- **Linguagem:** TypeScript 5.9+, React 19.
- **Design & UI:** 
  - Bootstrap 5.3.3 + Bootstrap Icons 1.11.3 (instalados localmente via npm, garantindo funcionamento 100% offline e em rede local/hotspot).
  - Tailwind CSS 4 (`@tailwindcss/postcss`).
  - **Paleta de Cores do Sistema de Design:**
    - **Primário / Marca:** `#2E52A5` (botões principais, foco de inputs, badges de atendimento, logo).
    - **Sucesso:** `#36961E` (indicadores de sucesso, card de quantidade de atendimentos, horário de término).
    - **Informações:** `#0190A3` (card de intervalo de minutos, resumo completo, badge minutos inteiros).
    - **Aviso:** `#A05601` (ícone de modal de alerta de ajuste de horário, destaques de atenção).
    - **Perigo:** `#961816` (mensagens de erro e alertas de validação).
    - **Superfícies Dark Theme:** Fundo `#0c101c`, Cards `#12182a`, Cabeçalhos de card `#161e34`, Bordas `#222d4a`.
    - **Cantos:** Padrão reto moderno (`border-radius: 4px`).
- **Animações e Ícones:** Lucide React e Motion.
- **Servidor Web de Produção:** Nginx Alpine (servindo os arquivos estáticos gerados em `/app/out`).
- **Orquestração de Containers:** Docker e Docker Compose integrado à rede externa `npm_default` (Nginx Proxy Manager).

---

## 3. 📂 Estrutura do Projeto

```text
grademed/
├── app/
│   ├── globals.css          # Estilos globais e regras para impressão (@media print)
│   ├── layout.tsx           # Layout raiz, meta tags, CDNs do Bootstrap e html2pdf
│   └── page.tsx             # Componente principal: formulário, modal, tabela e footer
├── lib/
│   └── version.ts           # Fonte única da verdade para a versão exibida na interface
├── public/                  # Arquivos estáticos (favicon, ícones)
├── scripts/
│   └── bump-version.js      # Script automatizado para incremento de versão
├── .env.example             # Exemplo de variáveis de ambiente
├── .gitignore               # Ignora node_modules, .next, out, etc.
├── docker-compose.yml       # Orquestração do container de produção
├── Dockerfile               # Build multi-stage: Node.js constrói -> Nginx serve
├── next.config.ts           # Configurações do Next.js (output: 'export')
├── nginx.conf               # Configurações do Nginx para SPA (roteamento fallback)
├── package.json             # Dependências, scripts e versão do projeto
├── tsconfig.json            # Configuração TypeScript
└── CONTEXTO.md              # Este arquivo de contexto
```

---

## 4. 🏷️ Sistema de Versionamento

O sistema segue o padrão de versionamento semântico (**SemVer** - `MAJOR.MINOR.PATCH`).

### Onde a versão é controlada:
1. `package.json` -> campo `"version"` (ex: `"1.0.0"`).
2. `lib/version.ts` -> exporta `APP_VERSION` e `RELEASE_DATE`.
3. `app/page.tsx` -> exibe visualmente no **Cabeçalho** (ao lado do logo) e no **Rodapé** da página.

### Como atualizar a versão:
Sempre que novas alterações forem finalizadas para subir ao GitHub, execute um dos comandos abaixo:
- **Patch (correções / pequenas melhorias):**
  ```bash
  npm run bump:patch
  ```
- **Minor (novas funcionalidades sem quebrar compatibilidade):**
  ```bash
  npm run bump:minor
  ```
- **Major (grandes alterações ou reformulações estruturais):**
  ```bash
  npm run bump:major
  ```
- **Versão específica:**
  ```bash
  node scripts/bump-version.js 1.2.0
  ```

---

## 5. ⚠️ REGRA DE OURO DO GIT (MUITO IMPORTANTE)

> [!CAUTION]
> **NUNCA FAÇA COMMIT OU PUSH AUTOMATICAMENTE!**  
> Todo e qualquer commit ou envio para o repositório remoto **DEVE** ser feito **APENAS** quando o usuário solicitar explicitamente ("faça o commit", "suba a versão", "faça o push", etc.).

---

## 6. 🌐 Repositório Git e Clonagem em Novo Computador

- **Repositório:** `https://github.com/eduardoazm/grademed.git`
- **Branch Principal:** `main`

### Para clonar e configurar em um novo computador:
```bash
# Com Personal Access Token:
git clone https://<SEU_TOKEN_GITHUB>@github.com/eduardoazm/grademed.git

cd grademed
npm install
npm run dev
```

---

## 7. 🚀 Deploy em Produção (Docker + Nginx Proxy Manager)

A aplicação está configurada para deploy via Docker:

### Arquitetura de Produção:
1. **Dockerfile:** Usa multi-stage build:
   - Estágio 1 (`builder`): Node.js 20 Alpine instala dependências e roda `npm run build`, gerando os arquivos estáticos na pasta `/app/out`.
   - Estágio 2 (`runner`): Nginx Alpine copia os arquivos de `/app/out` para `/usr/share/nginx/html` e aplica `nginx.conf`.
2. **docker-compose.yml:**
   - Serviço: `grademed`
   - Expõe a porta `80` internamente.
   - Conecta-se à rede Docker externa `npm_default` para ser gerenciado pelo Nginx Proxy Manager.

### Procedimento para Deploy / Atualização no Servidor:
```bash
# 1. Puxar as novidades do repositório
git pull origin main

# 2. Reconstruir e subir o container atualizado
docker compose down
docker compose up -d --build
```

---

## 8. 💻 Comandos Úteis de Desenvolvimento

| Ação | Comando |
| :--- | :--- |
| **Instalar Dependências** | `npm install` |
| **Ambiente de Desenvolvimento** | `npm run dev` (disponível em `http://localhost:3000`) |
| **Build de Produção** | `npm run build` (gera pasta `out/`) |
| **Incrementar Versão (Patch)** | `npm run bump:patch` |
| **Incrementar Versão (Minor)** | `npm run bump:minor` |
| **Incrementar Versão (Major)** | `npm run bump:major` |
| **Limpar Cache** | `npm run clean` |
