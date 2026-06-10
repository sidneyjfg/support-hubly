# Plano do Projeto - Plataforma de Tickets

## 1. Objetivo

Criar uma plataforma simples de abertura e acompanhamento de tickets para empresas clientes, com painel interno de atendimento e notificacao via WhatsApp usando Evolution API.

O foco da primeira versao e permitir que clientes autenticados abram tickets, a equipe interna acompanhe e responda pelo sistema, e o responsavel receba notificacoes no WhatsApp quando novos tickets forem criados.

## 2. Escopo do MVP

### Cliente

- Cadastro publico.
- Cadastro liberado imediatamente, sem aprovacao interna.
- Sem confirmacao de e-mail no MVP.
- Controle simples por IP no cadastro publico para reduzir abuso.
- Login de cliente.
- Tela para abrir novo ticket.
- Lista dos proprios tickets.
- Visualizacao dos detalhes do ticket.
- Envio de mensagens/respostas dentro do ticket.
- Upload de anexo/imagem no ticket ou em mensagens.
- Area para acompanhar novas releases e itens resolvidos.

### Equipe interna

- Login administrativo.
- Lista geral de tickets.
- Visualizacao detalhada dos tickets.
- Busca e filtros por status, prioridade, categoria, organizacao e texto.
- Alteracao de status: aberto, em atendimento, resolvido.
- Resposta pelo proprio sistema.
- Visualizacao de dados adicionais do cliente e da organizacao.

### WhatsApp

- Enviar notificacao via Evolution API quando um novo ticket for criado.
- Conteudo inicial da notificacao:
  - Nome do solicitante.
  - Assunto.
  - Link ou identificador do ticket, quando a URL final estiver definida.
- As notificacoes de novos tickets sempre serao enviadas para um telefone pessoal fixo.

## 3. Stack Proposta

- Docker e Docker Compose para ambiente local e deploy em VPS.
- Node.js com TypeScript.
- API backend em Node.js.
- TypeORM para acesso ao banco.
- MySQL existente na maquina/VPS como banco principal, sem criar container de banco.
- Frontend em React/Next.js ou React com Vite.
- Autenticacao com sessoes/JWT.
- Upload local em volume Docker no MVP.

Decisao sugerida: usar uma aplicacao full-stack com frontend e backend separados dentro do mesmo monorepo:

```text
apps/
  api/
  web/
docker-compose.yml
```

## 4. Perfis e Permissoes

### Cliente

- Pode abrir tickets.
- Pode listar apenas tickets que ele mesmo abriu.
- Pode responder tickets abertos ou em atendimento.
- Pode visualizar anexos dos proprios tickets.
- Pode visualizar releases e itens resolvidos publicados pela equipe interna.
- Ve todas as releases e atualizacoes publicadas, sem segmentacao por organizacao no MVP.

### Equipe interna

- Pode visualizar todos os tickets.
- Pode alterar status, prioridade e categoria.
- Pode responder qualquer ticket.
- Pode acessar mais detalhes da organizacao e do solicitante.

### Administrador

- Todas as permissoes da equipe interna.
- Pode gerenciar usuarios, organizacoes, categorias e configuracoes de WhatsApp.
- Pode publicar releases e itens resolvidos para os clientes.

## 5. Modelo de Dados Inicial

### users

- id
- name
- email
- password_hash
- role: client, staff, admin
- organization_id
- created_at
- updated_at

### organizations

- id
- name
- created_at
- updated_at

### tickets

- id
- organization_id
- requester_id
- subject
- details
- category_id
- priority: baixa, media, alta, urgente
- status: aberto, em_atendimento, resolvido
- created_at
- updated_at
- resolved_at

### ticket_messages

- id
- ticket_id
- author_id
- message
- visibility: public, internal
- created_at
- updated_at

### ticket_attachments

- id
- ticket_id
- message_id
- uploaded_by
- original_name
- file_path
- mime_type
- size
- created_at

### categories

- id
- name
- active
- created_at
- updated_at

Categorias iniciais:

- Analisando
- Em desenvolvimento
- Em homologacao
- Liberado no site

### whatsapp_notifications

- id
- ticket_id
- target_phone
- status: pending, sent, failed
- provider_response
- error_message
- created_at
- sent_at

### releases

- id
- title
- description
- status: planejado, em_andamento, resolvido, publicado
- published
- published_at
- created_by
- created_at
- updated_at

### release_items

- id
- release_id
- title
- description
- ticket_id
- created_at
- updated_at

## 6. Fluxos Principais

### Abertura de ticket

1. Cliente faz login.
2. Cliente acessa "Novo ticket".
3. Preenche nome, organizacao, e-mail, assunto, detalhes, categoria, prioridade e anexo.
4. Sistema salva o ticket.
5. Sistema cria a primeira mensagem do ticket com os detalhes.
6. Sistema envia notificacao via Evolution API.
7. Cliente ve confirmacao e pode acompanhar o ticket.

### Atendimento interno

1. Equipe interna faz login.
2. Acessa a lista de tickets.
3. Filtra por status, prioridade, categoria ou organizacao.
4. Abre o ticket.
5. Responde ao cliente ou adiciona nota interna.
6. Altera status quando necessario.

### Resposta do cliente

1. Cliente abre um ticket existente.
2. Envia nova mensagem ou anexo.
3. Equipe interna visualiza no historico.
4. Cliente acompanha a resposta dentro do painel, sem notificacao externa no MVP.

### Cadastro publico

1. Cliente acessa a tela de cadastro.
2. Informa nome, organizacao, e-mail e senha.
3. Sistema valida limite basico por IP.
4. Sistema cria usuario cliente.
5. Acesso e liberado imediatamente.
6. Cliente entra no painel e passa a ver apenas tickets criados por ele.

### Releases e resolvidos

1. Equipe interna cria um registro de release ou item resolvido.
2. Opcionalmente vincula o item a um ticket.
3. Publica o registro para os clientes.
4. Todos os clientes visualizam a lista no painel.

## 7. Integracao Evolution API

Configuracoes esperadas via variaveis de ambiente:

```env
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
WHATSAPP_NOTIFY_PHONE=
APP_PUBLIC_URL=
```

Mensagem inicial sugerida:

```text
Novo ticket recebido
Nome: {nome}
Assunto: {assunto}
Ticket: #{id}
```

Quando `APP_PUBLIC_URL` estiver configurado, incluir:

```text
Link: {APP_PUBLIC_URL}/admin/tickets/{id}
```

O dominio/subdominio final ainda sera criado, provavelmente em `hublyapp.com.br`.

## 8. Design e UX

- Idioma: portugues.
- Visual: moderno, operacional e direto.
- Referencia visual: paleta do Hubly.
- A paleta deve ser consultada no projeto `~/automacoes/saas/hubly` durante a implementacao.
- Sem cara de landing page; a primeira tela apos login deve ser uma area util de trabalho.
- Painel com navegacao simples:
  - Dashboard
  - Tickets
  - Organizacoes
  - Usuarios
  - Configuracoes

## 9. Fases de Desenvolvimento

### Fase 1 - Base do projeto

- Criar estrutura Docker.
- Criar backend TypeScript.
- Criar frontend.
- Configurar MySQL.
- Configurar TypeORM.
- Criar variaveis de ambiente.
- Criar scripts de desenvolvimento.

### Fase 2 - Autenticacao e usuarios

- Criar entidades de usuario e organizacao.
- Implementar login.
- Implementar controle de permissao por perfil.
- Criar seed de administrador inicial.
- Criar cadastro publico de cliente.
- Aplicar controle simples por IP no cadastro publico.

### Fase 3 - Tickets

- Criar entidades de ticket, mensagem, anexo e categoria.
- Criar abertura de ticket pelo cliente.
- Criar listagem de tickets.
- Criar detalhe do ticket.
- Criar alteracao de status.
- Criar filtros e busca.
- Garantir que clientes vejam apenas os proprios tickets.

### Fase 4 - Respostas e anexos

- Implementar conversa dentro do ticket.
- Implementar notas internas.
- Implementar upload e download de anexos.
- Validar anexos: jpg, png, webp e pdf ate 10MB.

### Fase 5 - WhatsApp

- Criar cliente da Evolution API.
- Enviar notificacao ao criar ticket.
- Registrar sucesso/falha da notificacao.
- Exibir status da notificacao no painel interno.

### Fase 6 - Releases e resolvidos

- Criar cadastro interno de releases.
- Criar itens resolvidos.
- Permitir vinculo opcional com tickets.
- Criar tela do cliente para visualizar releases e resolvidos publicados.
- Releases publicadas ficam visiveis para todos os clientes.

### Fase 7 - Acabamento e deploy

- Aplicar paleta visual do Hubly.
- Ajustar responsividade.
- Criar compose de producao.
- Documentar deploy em VPS.
- Validar backup de banco e pasta de uploads.

## 10. Decisoes Pendentes

Nenhuma decisao funcional pendente para o MVP.

## 11. Criterios de Pronto do MVP

- Cliente consegue fazer login.
- Cliente consegue se cadastrar publicamente.
- Cadastro publico libera acesso imediatamente sem confirmacao de e-mail.
- Cadastro publico possui controle basico por IP.
- Cliente consegue abrir ticket com campos obrigatorios.
- Cliente ve apenas tickets criados por ele.
- Ticket fica salvo no MySQL.
- Equipe interna consegue fazer login.
- Equipe interna consegue listar, filtrar e abrir tickets.
- Equipe interna consegue responder e alterar status.
- Cliente consegue acompanhar respostas dentro do painel.
- Cliente consegue ver releases e itens resolvidos publicados.
- Releases publicadas aparecem para todos os clientes.
- Sistema aceita anexos jpg, png, webp e pdf ate 10MB.
- Sistema envia notificacao via Evolution API ao criar ticket.
- Aplicacao roda via Docker em ambiente local.
- Aplicacao possui instrucoes basicas de deploy em VPS.
