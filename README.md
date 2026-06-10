# Hubly Tickets

MVP de plataforma de tickets com painel de cliente, painel interno, releases publicadas para todos os clientes e notificacao de novo ticket via Evolution API.

## Stack

- Node.js + TypeScript
- Fastify
- TypeORM
- MySQL externo, sem container de banco
- React + Vite
- Docker Compose

## Configuracao

1. Copie `.env.example` para `.env`.
2. Ajuste os dados do MySQL existente na maquina/VPS:

```env
DB_HOST=host.docker.internal
DB_PORT=3306
MYSQL_DATABASE=hubly_ticket
MYSQL_USER=hubly_ticket
MYSQL_PASSWORD=hubly_ticket
```

3. Se precisar criar banco e usuario, rode o conteudo de `database-setup.sql` no MySQL com um usuario administrador.
4. Configure Evolution API quando quiser ativar notificacoes reais:

```env
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
WHATSAPP_NOTIFY_PHONE=
```

Se a Evolution API nao estiver configurada, o ticket sera salvo e a tentativa de notificacao ficara registrada como falha.

## Producao

Subdominio definido:

```text
https://support.hublyapp.com.br
```

Para producao na VPS, use `.env.production.example` como base para criar `.env.production`.

```bash
cp .env.production.example .env.production
```

O Compose de producao nao cria MySQL. Ele conecta no banco da propria VPS via `host.docker.internal`, entra na rede externa `hubly-network` e usa as imagens publicadas no GHCR pelo workflow do GitHub Actions.

```bash
docker login ghcr.io
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

Variaveis importantes em producao:

```env
VITE_API_URL=https://support.hublyapp.com.br
APP_PUBLIC_URL=https://support.hublyapp.com.br
WEB_ORIGIN=https://support.hublyapp.com.br
EVOLUTION_API_URL=https://evolution.hublyapp.com.br
```

Para a Evolution API:

- `EVOLUTION_API_KEY` deve ser o mesmo valor de `AUTHENTICATION_API_KEY` do container `evolution_api`.
- `EVOLUTION_INSTANCE_NAME` deve ser o nome real da instancia conectada no Evolution.
- `WHATSAPP_NOTIFY_PHONE` deve ser o numero que recebera os avisos de novos tickets.

No proxy/reverse proxy, a rota publica deve encaminhar:

- `support.hublyapp.com.br` para `127.0.0.1:3004`
- `api-support.hublyapp.com.br` para `127.0.0.1:3003`

Exemplo de Nginx: `deploy/nginx/support-hubly.conf`.

## Rodar com Docker

```bash
docker-compose up --build -d
```

URLs locais conforme `.env` atual:

- Web: `http://localhost:5173`
- API: `http://localhost:3334`

## Acesso administrador inicial

O seed cria um administrador quando a API sobe:

```text
E-mail: admin@hublyapp.com.br
Senha: admin123
```

Altere esses valores no `.env` antes do primeiro deploy em producao.

## Funcionalidades do MVP

- Cadastro publico de cliente com acesso imediato.
- Controle simples por IP: ate 5 cadastros por hora por IP.
- Login de cliente/admin.
- Cliente cria e acompanha apenas os proprios tickets.
- Equipe interna/admin visualiza todos os tickets.
- Filtros por status e busca por assunto.
- Respostas no ticket e notas internas para equipe.
- Anexos `jpg`, `png`, `webp` e `pdf` ate 10MB.
- Releases/atualizacoes visiveis para todos os clientes.
- Notificacao de novo ticket via Evolution API para telefone fixo configurado.

## Observacoes

- O MVP usa `synchronize: true` do TypeORM para criar/ajustar tabelas automaticamente.
- Para producao mais rigida, o proximo passo e trocar isso por migrations versionadas.
