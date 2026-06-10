import type { FastifyBaseLogger } from "fastify";
import { env } from "../config/env.js";
import { AppDataSource } from "../database/data-source.js";
import { WhatsappNotification } from "../database/entities/WhatsappNotification.js";
import type { Ticket } from "../database/entities/Ticket.js";

const NOTIFICATION_TIMEOUT_MS = 8000;
const CONNECTION_CHECK_TIMEOUT_MS = 8000;

function getEvolutionBaseUrl() {
  return env.evolution.url.replace(/\/$/, "");
}

function getConnectionState(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const instance = data.instance && typeof data.instance === "object" ? data.instance as Record<string, unknown> : null;
  const state = instance?.state ?? data.state ?? data.connectionStatus ?? data.status;
  return typeof state === "string" ? state : null;
}

export async function logEvolutionConnection(logger: FastifyBaseLogger) {
  if (!env.evolution.url || !env.evolution.apiKey || !env.evolution.instance || !env.evolution.notifyPhone) {
    logger.warn({
      instance: env.evolution.instance || "not-configured",
      notifyPhone: env.evolution.notifyPhone || "not-configured"
    }, "Evolution API nao configurada para notificacoes");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTION_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${getEvolutionBaseUrl()}/instance/connectionState/${env.evolution.instance}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        apikey: env.evolution.apiKey
      }
    });
    const body = await response.json().catch(() => null);
    const state = getConnectionState(body);
    const connected = response.ok && (state === "open" || state === "connected");
    const logPayload = {
      instance: env.evolution.instance,
      notifyPhone: env.evolution.notifyPhone,
      connected,
      state: state ?? "unknown",
      statusCode: response.status,
      providerResponse: body
    };

    if (connected) logger.info(logPayload, "Evolution API conectada");
    else logger.warn(logPayload, "Evolution API sem conexao confirmada");
  } catch (error) {
    logger.warn({
      instance: env.evolution.instance,
      notifyPhone: env.evolution.notifyPhone,
      connected: false,
      error: error instanceof Error && error.name === "AbortError"
        ? "Tempo limite ao checar Evolution API."
        : error instanceof Error ? error.message : "Erro desconhecido."
    }, "Falha ao checar conexao com Evolution API");
  } finally {
    clearTimeout(timeout);
  }
}

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT_MS);

  try {
    const response = await fetch(`${getEvolutionBaseUrl()}/message/sendText/${env.evolution.instance}`, {
      method: "POST",
      signal: controller.signal,
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
    notification.errorMessage = error instanceof Error && error.name === "AbortError"
      ? "Tempo limite ao chamar Evolution API."
      : error instanceof Error ? error.message : "Erro desconhecido.";
    await repo.save(notification);
    return notification;
  } finally {
    clearTimeout(timeout);
  }
}
