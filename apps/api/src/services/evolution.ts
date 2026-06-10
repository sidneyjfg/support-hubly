import { env } from "../config/env.js";
import { AppDataSource } from "../database/data-source.js";
import { WhatsappNotification } from "../database/entities/WhatsappNotification.js";
import type { Ticket } from "../database/entities/Ticket.js";

export async function notifyNewTicket(ticket: Ticket) {
  const repo = AppDataSource.getRepository(WhatsappNotification);
  const notification = await repo.save(
    repo.create({
      ticketId: ticket.id,
      targetPhone: env.evolution.notifyPhone || "not-configured",
      status: "pending"
    })
  );

  if (!env.evolution.url || !env.evolution.apiKey || !env.evolution.instance || !env.evolution.notifyPhone) {
    notification.status = "failed";
    notification.errorMessage = "Evolution API nao configurada.";
    await repo.save(notification);
    return notification;
  }

  const link = `${env.appPublicUrl.replace(/\/$/, "")}/admin/tickets/${ticket.id}`;
  const text = `Novo ticket recebido\nNome: ${ticket.requester.name}\nAssunto: ${ticket.subject}\nTicket: #${ticket.id}\nLink: ${link}`;

  try {
    const response = await fetch(`${env.evolution.url.replace(/\/$/, "")}/message/sendText/${env.evolution.instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.evolution.apiKey
      },
      body: JSON.stringify({
        number: env.evolution.notifyPhone,
        text
      })
    });

    const body = await response.text();
    notification.providerResponse = body;
    notification.status = response.ok ? "sent" : "failed";
    notification.errorMessage = response.ok ? null : `HTTP ${response.status}`;
    notification.sentAt = response.ok ? new Date() : null;
    await repo.save(notification);
    return notification;
  } catch (error) {
    notification.status = "failed";
    notification.errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    await repo.save(notification);
    return notification;
  }
}
