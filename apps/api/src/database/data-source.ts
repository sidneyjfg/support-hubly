import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { Category } from "./entities/Category.js";
import { Organization } from "./entities/Organization.js";
import { Release } from "./entities/Release.js";
import { ReleaseItem } from "./entities/ReleaseItem.js";
import { Ticket } from "./entities/Ticket.js";
import { TicketAttachment } from "./entities/TicketAttachment.js";
import { TicketMessage } from "./entities/TicketMessage.js";
import { User } from "./entities/User.js";
import { WhatsappNotification } from "./entities/WhatsappNotification.js";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  entities: [Category, Organization, Release, ReleaseItem, Ticket, TicketAttachment, TicketMessage, User, WhatsappNotification],
  synchronize: true,
  logging: env.nodeEnv === "development" ? ["error", "warn"] : ["error"]
});

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}
