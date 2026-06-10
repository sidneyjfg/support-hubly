import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { Category } from "./Category.js";
import { Organization } from "./Organization.js";
import { TicketAttachment } from "./TicketAttachment.js";
import { TicketMessage } from "./TicketMessage.js";
import { User } from "./User.js";

export type TicketPriority = "baixa" | "media" | "alta" | "urgente";
export type TicketStatus = "em_fila" | "analisando" | "em_desenvolvimento" | "resolvido";

@Entity("tickets")
export class Ticket {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @ManyToOne(() => Organization, (organization) => organization.tickets, { eager: true })
  organization!: Relation<Organization>;

  @Column()
  organizationId!: string;

  @ManyToOne(() => User, (user) => user.tickets, { eager: true })
  requester!: Relation<User>;

  @Column()
  requesterId!: string;

  @Column()
  subject!: string;

  @Column({ type: "text" })
  details!: string;

  @ManyToOne(() => Category, { eager: true })
  category!: Relation<Category>;

  @Column()
  categoryId!: string;

  @Column({ type: "varchar", length: 20, default: "media" })
  priority!: TicketPriority;

  @Column({ type: "varchar", length: 30, default: "em_fila" })
  status!: TicketStatus;

  @Column({ type: "datetime", nullable: true })
  resolvedAt!: Date | null;

  @OneToMany(() => TicketMessage, (message) => message.ticket)
  messages!: Relation<TicketMessage[]>;

  @OneToMany(() => TicketAttachment, (attachment) => attachment.ticket)
  attachments!: Relation<TicketAttachment[]>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
