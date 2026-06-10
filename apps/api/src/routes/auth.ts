import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppDataSource } from "../database/data-source.js";
import { Organization } from "../database/entities/Organization.js";
import { User } from "../database/entities/User.js";
import { requireAuth, signToken } from "../utils/auth.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const registerAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRegisterIp(ip: string) {
  const now = Date.now();
  const entry = registerAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    registerAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 5;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      organization: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6)
    });
    const input = schema.parse(request.body);

    if (!checkRegisterIp(request.ip)) {
      return reply.code(429).send({ message: "Muitas tentativas de cadastro. Tente novamente mais tarde." });
    }

    const userRepo = AppDataSource.getRepository(User);
    const exists = await userRepo.findOne({ where: { email: input.email.toLowerCase() } });
    if (exists) return reply.code(409).send({ message: "E-mail ja cadastrado." });

    const orgRepo = AppDataSource.getRepository(Organization);
    let organization = await orgRepo.findOne({ where: { name: input.organization.trim() } });
    if (!organization) {
      organization = await orgRepo.save(orgRepo.create({ name: input.organization.trim() }));
    }

    const user = await userRepo.save(
      userRepo.create({
        name: input.name.trim(),
        email: input.email.toLowerCase(),
        passwordHash: hashPassword(input.password),
        role: "client",
        organization,
        organizationId: organization.id
      })
    );

    const authUser = { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId };
    return { token: signToken(authUser), user: authUser };
  });

  app.post("/auth/login", async (request, reply) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const input = schema.parse(request.body);
    const user = await AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .leftJoinAndSelect("user.organization", "organization")
      .where("user.email = :email", { email: input.email.toLowerCase() })
      .getOne();
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return reply.code(401).send({ message: "E-mail ou senha invalidos." });
    }
    const authUser = { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId };
    return { token: signToken(authUser), user: authUser };
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request) => ({ user: request.user }));
}
