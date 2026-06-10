import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { Ticket } from "./Ticket.js";
import { TicketAttachment } from "./TicketAttachment.js";
import { User } from "./User.js";

export type MessageVisibility = "public" | "internal";

@Entity("ticket_messages")
export class TicketMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.messages)
  ticket!: Relation<Ticket>;

  @Column()
  ticketId!: number;

  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  author!: Relation<User>;

  @Column()
  authorId!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "varchar", length: 20, default: "public" })
  visibility!: MessageVisibility;

  @OneToMany(() => TicketAttachment, (attachment) => attachment.message)
  attachments!: Relation<TicketAttachment[]>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
