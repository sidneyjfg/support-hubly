import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { Ticket } from "./Ticket.js";
import { TicketMessage } from "./TicketMessage.js";
import { User } from "./User.js";

@Entity("ticket_attachments")
export class TicketAttachment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.attachments)
  ticket!: Relation<Ticket>;

  @Column()
  ticketId!: number;

  @ManyToOne(() => TicketMessage, (message) => message.attachments, { nullable: true })
  message!: Relation<TicketMessage> | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  messageId!: string | null;

  @ManyToOne(() => User, { eager: true })
  uploadedBy!: Relation<User>;

  @Column()
  uploadedById!: string;

  @Column()
  originalName!: string;

  @Column()
  filePath!: string;

  @Column()
  mimeType!: string;

  @Column()
  size!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
