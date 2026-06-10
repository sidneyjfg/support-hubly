import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { initializeDatabase } from "./database/data-source.js";
import { seedDatabase } from "./database/seed.js";
import { authRoutes } from "./routes/auth.js";
import { categoryRoutes } from "./routes/categories.js";
import { releaseRoutes } from "./routes/releases.js";
import { ticketRoutes } from "./routes/tickets.js";
import { logEvolutionConnection } from "./services/evolution.js";
import { uploadsDir } from "./services/upload.js";

async function bootstrap() {
  await initializeDatabase();
  await seedDatabase();

  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: [env.webOrigin, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
  });
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 5
    }
  });
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/static/",
    decorateReply: false
  });

  app.get("/health", async () => ({ ok: true }));
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(categoryRoutes, { prefix: "/api" });
  await app.register(ticketRoutes, { prefix: "/api" });
  await app.register(releaseRoutes, { prefix: "/api" });
  await logEvolutionConnection(app.log);

  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    app.log.error(error);
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: "Dados invalidos.", issues: error.issues });
    }
    const status = typeof error.statusCode === "number" ? error.statusCode : 500;
    const message = status === 500 ? "Erro interno." : error.message;
    reply.code(status).send({ message });
  });

  await app.listen({ port: env.port, host: "0.0.0.0" });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
