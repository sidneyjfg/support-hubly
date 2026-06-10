import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppDataSource } from "../database/data-source.js";
import { Release } from "../database/entities/Release.js";
import { ReleaseItem } from "../database/entities/ReleaseItem.js";
import { requireAuth, requireRoles } from "../utils/auth.js";

export async function releaseRoutes(app: FastifyInstance) {
  app.get("/releases", { preHandler: requireAuth }, async (request) => {
    const includeDrafts = request.user?.role === "admin" || request.user?.role === "staff";
    return AppDataSource.getRepository(Release).find({
      where: includeDrafts ? {} : { published: true },
      relations: { items: true },
      order: { publishedAt: "DESC", createdAt: "DESC" }
    });
  });

  app.post("/releases", { preHandler: requireRoles("staff", "admin") }, async (request, reply) => {
    const input = z
      .object({
        title: z.string().min(3),
        description: z.string().min(3),
        status: z.enum(["planejado", "em_andamento", "resolvido", "publicado"]).default("planejado"),
        published: z.boolean().default(false),
        items: z
          .array(
            z.object({
              title: z.string().min(2),
              description: z.string().min(2),
              ticketId: z.number().nullable().optional()
            })
          )
          .default([])
      })
      .parse(request.body);

    const repo = AppDataSource.getRepository(Release);
    const release = repo.create({
      title: input.title,
      description: input.description,
      status: input.status,
      published: input.published,
      publishedAt: input.published ? new Date() : null,
      createdBy: request.user!.id,
      items: input.items.map((item) => AppDataSource.getRepository(ReleaseItem).create(item))
    });
    return reply.code(201).send(await repo.save(release));
  });

  app.patch("/releases/:id", { preHandler: requireRoles("staff", "admin") }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = z
      .object({
        title: z.string().min(3).optional(),
        description: z.string().min(3).optional(),
        status: z.enum(["planejado", "em_andamento", "resolvido", "publicado"]).optional(),
        published: z.boolean().optional()
      })
      .parse(request.body);

    const repo = AppDataSource.getRepository(Release);
    const release = await repo.findOne({ where: { id: params.id } });
    if (!release) return reply.code(404).send({ message: "Release nao encontrada." });

    if (input.title) release.title = input.title;
    if (input.description) release.description = input.description;
    if (input.status) release.status = input.status;
    if (typeof input.published === "boolean") {
      release.published = input.published;
      release.publishedAt = input.published ? release.publishedAt ?? new Date() : null;
    }
    return repo.save(release);
  });

  app.post("/releases/:id/items", { preHandler: requireRoles("staff", "admin") }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = z
      .object({
        title: z.string().min(2),
        description: z.string().min(2),
        ticketId: z.number().nullable().optional()
      })
      .parse(request.body);

    const release = await AppDataSource.getRepository(Release).findOne({ where: { id: params.id } });
    if (!release) return reply.code(404).send({ message: "Release nao encontrada." });

    const item = await AppDataSource.getRepository(ReleaseItem).save(
      AppDataSource.getRepository(ReleaseItem).create({
        release,
        releaseId: release.id,
        title: input.title,
        description: input.description,
        ticketId: input.ticketId ?? null
      })
    );
    return reply.code(201).send(item);
  });
}
