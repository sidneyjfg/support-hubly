import path from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { Like } from "typeorm";
import { z } from "zod";
import { AppDataSource } from "../database/data-source.js";
import { Category } from "../database/entities/Category.js";
import { Ticket, type TicketPriority, type TicketStatus } from "../database/entities/Ticket.js";
import { TicketAttachment } from "../database/entities/TicketAttachment.js";
import { TicketMessage, type MessageVisibility } from "../database/entities/TicketMessage.js";
import { User } from "../database/entities/User.js";
import { notifyNewTicket } from "../services/evolution.js";
import { saveUpload, uploadsDir } from "../services/upload.js";
import { isStaff, requireAuth, requireRoles } from "../utils/auth.js";

type MultipartFields = Record<string, string>;

async function readMultipart(request: FastifyRequest) {
  const fields: MultipartFields = {};
  const files = [];
  for await (const part of request.parts()) {
    if (part.type === "file") files.push(part);
    else fields[part.fieldname] = String(part.value ?? "");
  }
  return { fields, files };
}

function canAccessTicket(request: FastifyRequest, ticket: Ticket) {
  const user = request.user;
  if (!user) return false;
  if (isStaff(user)) return true;
  return ticket.requesterId === user.id;
}

export async function ticketRoutes(app: FastifyInstance) {
  app.get("/tickets", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        status: z.string().optional(),
        priority: z.string().optional(),
        categoryId: z.string().optional(),
        search: z.string().optional()
      })
      .parse(request.query);

    const where: Record<string, unknown> = {};
    if (!isStaff(request.user!)) where.requesterId = request.user!.id;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) where.subject = Like(`%${query.search}%`);

    return AppDataSource.getRepository(Ticket).find({
      where,
      order: { updatedAt: "DESC" },
      take: 200
    });
  });

  app.post("/tickets", { preHandler: requireAuth }, async (request, reply) => {
    const { fields, files } = await readMultipart(request);
    const schema = z.object({
      subject: z.string().min(3),
      details: z.string().min(5),
      categoryId: z.string().uuid(),
      priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media")
    });
    const input = schema.parse(fields);
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: request.user!.id } });
    const category = await AppDataSource.getRepository(Category).findOne({ where: { id: input.categoryId } });
    if (!user?.organizationId || !category) return reply.code(400).send({ message: "Dados invalidos para criar ticket." });

    const ticketRepo = AppDataSource.getRepository(Ticket);
    const ticket = await ticketRepo.save(
      ticketRepo.create({
        requester: user,
        requesterId: user.id,
        organization: user.organization!,
        organizationId: user.organizationId,
        subject: input.subject.trim(),
        details: input.details.trim(),
        category,
        categoryId: category.id,
        priority: input.priority,
        status: "em_fila"
      })
    );

    const messageRepo = AppDataSource.getRepository(TicketMessage);
    const message = await messageRepo.save(
      messageRepo.create({
        ticket,
        ticketId: ticket.id,
        author: user,
        authorId: user.id,
        message: input.details.trim(),
        visibility: "public"
      })
    );

    const attachmentRepo = AppDataSource.getRepository(TicketAttachment);
    for (const file of files) {
      const saved = await saveUpload(file);
      await attachmentRepo.save(
        attachmentRepo.create({
          ticket,
          ticketId: ticket.id,
          message,
          messageId: message.id,
          uploadedBy: user,
          uploadedById: user.id,
          ...saved
        })
      );
    }

    const fullTicket = await ticketRepo.findOneOrFail({ where: { id: ticket.id } });
    void notifyNewTicket(fullTicket).catch((error) => {
      request.log.error({ err: error, ticketId: fullTicket.id }, "Erro ao notificar novo ticket");
    });
    return reply.code(201).send(fullTicket);
  });

  app.get("/tickets/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.coerce.number() }).parse(request.params);
    const ticket = await AppDataSource.getRepository(Ticket).findOne({
      where: { id: params.id },
      relations: { messages: { attachments: true }, attachments: true }
    });
    if (!ticket || !canAccessTicket(request, ticket)) return reply.code(404).send({ message: "Ticket nao encontrado." });

    if (!isStaff(request.user!)) {
      ticket.messages = ticket.messages.filter((message) => message.visibility === "public");
    }
    ticket.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return ticket;
  });

  app.patch("/tickets/:id", { preHandler: requireRoles("staff", "admin") }, async (request, reply) => {
    const params = z.object({ id: z.coerce.number() }).parse(request.params);
    const input = z
      .object({
        status: z.enum(["em_fila", "analisando", "em_desenvolvimento", "resolvido"]).optional(),
        priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
        categoryId: z.string().uuid().optional()
      })
      .parse(request.body);

    const repo = AppDataSource.getRepository(Ticket);
    const ticket = await repo.findOne({ where: { id: params.id } });
    if (!ticket) return reply.code(404).send({ message: "Ticket nao encontrado." });

    if (input.status) {
      ticket.status = input.status as TicketStatus;
      ticket.resolvedAt = input.status === "resolvido" ? new Date() : null;
    }
    if (input.priority) ticket.priority = input.priority as TicketPriority;
    if (input.categoryId) ticket.categoryId = input.categoryId;
    return repo.save(ticket);
  });

  app.post("/tickets/:id/messages", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.coerce.number() }).parse(request.params);
    const ticket = await AppDataSource.getRepository(Ticket).findOne({ where: { id: params.id } });
    if (!ticket || !canAccessTicket(request, ticket)) return reply.code(404).send({ message: "Ticket nao encontrado." });

    const { fields, files } = await readMultipart(request);
    const input = z
      .object({
        message: z.string().min(1),
        visibility: z.enum(["public", "internal"]).default("public")
      })
      .parse(fields);

    const visibility: MessageVisibility = isStaff(request.user!) ? input.visibility : "public";
    const user = await AppDataSource.getRepository(User).findOneOrFail({ where: { id: request.user!.id } });
    const messageRepo = AppDataSource.getRepository(TicketMessage);
    const message = await messageRepo.save(
      messageRepo.create({
        ticket,
        ticketId: ticket.id,
        author: user,
        authorId: user.id,
        message: input.message.trim(),
        visibility
      })
    );

    const attachmentRepo = AppDataSource.getRepository(TicketAttachment);
    for (const file of files) {
      const saved = await saveUpload(file);
      await attachmentRepo.save(
        attachmentRepo.create({
          ticket,
          ticketId: ticket.id,
          message,
          messageId: message.id,
          uploadedBy: user,
          uploadedById: user.id,
          ...saved
        })
      );
    }

    ticket.updatedAt = new Date();
    await AppDataSource.getRepository(Ticket).save(ticket);
    return reply.code(201).send(message);
  });

  app.get("/attachments/:id/download", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const attachment = await AppDataSource.getRepository(TicketAttachment).findOne({
      where: { id: params.id },
      relations: { ticket: true }
    });
    if (!attachment || !canAccessTicket(request, attachment.ticket)) {
      return reply.code(404).send({ message: "Anexo nao encontrado." });
    }
    return reply.header("Content-Type", attachment.mimeType).sendFile(path.basename(attachment.filePath), uploadsDir);
  });
}
