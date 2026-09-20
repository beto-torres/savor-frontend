# Frontend — Sabor Sync

Aplicação Next.js do sistema de cardápio escolar Sabor Sync. O projeto completo utiliza também a API e o PostgreSQL disponíveis na pasta `../backend`.

> Ao transferir o projeto para outro computador, copie ou versione a pasta principal `cardapio` inteira. Somente a pasta `frontend` não contém a API, as migrações nem a configuração Docker.

O guia completo de apresentação, instalação, PostgreSQL local e Docker está em [`../README.md`](../README.md).

## Execução rápida

Com a API disponível em `http://localhost:3333`:

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Para utilizar outro endereço de API, copie `.env.example` para `.env.local` e altere:

```env
API_URL=http://localhost:3333
```

## Credencial didática inicial

- CPF: `111.111.111-11`;
- senha: `123456`;
- perfil: administrador.

## Comandos

```bash
npm run dev       # desenvolvimento
npm run lint      # análise do código
npm run build     # compilação de produção
npm run start     # executa a compilação
```

Não execute `npm run dev` e `npm run build` simultaneamente nesta pasta, pois ambos utilizam `.next`.

## Tecnologias

- Next.js 16;
- React 19;
- TypeScript;
- Tailwind CSS 4;
- Lucide React;
- QR Code React.
