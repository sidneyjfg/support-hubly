import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type NotificationStatus = "pending" | "sent" | "failed";

@Entity("whatsapp_notifications")
export class WhatsappNotification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  ticketId!: number;

  @Column()
  targetPhone!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: NotificationStatus;

  @Column({ type: "text", nullable: true })
  providerResponse!: string | null;

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "datetime", nullable: true })
  sentAt!: Date | null;
}
