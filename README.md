# 🍺 Choperia — Gestão de Festas e Equipamentos

Sistema para uma choperia gerenciar **festas/eventos** e o **estoque de equipamentos**
distribuído em 4 áreas: **chopeira**, **barris**, **cilindro (CO₂)** e **kit de extração**.

Cada festa reúne equipamentos dessas áreas. O sistema controla a disponibilidade de cada
item e **impede reservar o mesmo equipamento em duas festas com datas sobrepostas**.

## Tecnologias

- **SolidStart** (Solid.js + Vite), deploy na Netlify.
- **Supabase** (PostgreSQL + Auth + Row Level Security) como backend.
- Autenticação por e-mail/senha (login simples).

## Configuração

1. Instale as dependências:

   ```
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Supabase:

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publishable-ou-anon
   ```

3. Rode em desenvolvimento:

   ```
   npm run dev
   ```

## Modelo de dados (Supabase)

- `equipamentos` — itens do estoque (`tipo`, `nome`, `descricao`, `status`).
- `festas` — eventos (`nome`, `cliente`, `local`, `data_inicio`, `data_fim`, `status`).
- `festa_equipamentos` — alocação de equipamentos por festa.
- Função `equipamentos_disponiveis(festa_id)` — retorna os itens disponíveis para a festa,
  respeitando o status e o conflito de datas com outras festas.

Todas as tabelas usam Row Level Security, isolando os dados por usuário.

## Estrutura

```
src/
├── lib/            # cliente Supabase, tipos, acesso a dados e sessão
├── components/     # Layout, AuthGuard, cartões e áreas de equipamento
└── routes/
    ├── login.tsx
    ├── index.tsx           # painel
    ├── festas/             # lista, cadastro e detalhe (4 áreas)
    └── equipamentos/       # estoque e cadastro
```

## Testes

- `cypress/e2e/basic.cy.ts` cobre o redirecionamento para o login e a exibição do
  formulário de autenticação.

## Deploy

O projeto usa o adaptador `solid-start-netlify`. Configure as variáveis de ambiente
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel da Netlify e faça o deploy normalmente
(`npm run build`).

> Observação: o `solid-start@0.1.x` roda o servidor de desenvolvimento melhor no Node 18/20.
> No Node 22 o `npm run dev` pode falhar ao ajustar a global `crypto`; o `npm run build` funciona.
