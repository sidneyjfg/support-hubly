import type { FastifyInstance } from "fastify";
import { AppDataSource } from "../database/data-source.js";
import { Category } from "../database/entities/Category.js";
import { requireAuth } from "../utils/auth.js";

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/categories", { preHandler: requireAuth }, async () => {
    return AppDataSource.getRepository(Category).find({ where: { active: true }, order: { name: "ASC" } });
  });
}
