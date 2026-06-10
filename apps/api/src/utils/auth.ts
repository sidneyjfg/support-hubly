import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import type { UserRole } from "../database/entities/User.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: "7d" });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const queryToken =
    typeof request.query === "object" && request.query && "token" in request.query ? String((request.query as { token?: string }).token) : null;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : queryToken;
  if (!token) return reply.code(401).send({ message: "Nao autenticado." });

  try {
    request.user = jwt.verify(token, env.jwtSecret) as AuthUser;
  } catch {
    return reply.code(401).send({ message: "Sessao invalida." });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.code(403).send({ message: "Sem permissao." });
    }
  };
}

export function isStaff(user: AuthUser) {
  return user.role === "staff" || user.role === "admin";
}
