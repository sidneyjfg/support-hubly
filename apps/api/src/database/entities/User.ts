import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { Organization } from "./Organization.js";
import { Ticket } from "./Ticket.js";
import { TicketMessage } from "./TicketMessage.js";

export type UserRole = "client" | "staff" | "admin";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: "varchar", length: 20, default: "client" })
  role!: UserRole;

  @ManyToOne(() => Organization, (organization) => organization.users, { nullable: true, eager: true })
  organization!: Relation<Organization> | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  organizationId!: string | null;

  @OneToMany(() => Ticket, (ticket) => ticket.requester)
  tickets!: Relation<Ticket[]>;

  @OneToMany(() => TicketMessage, (message) => message.author)
  messages!: Relation<TicketMessage[]>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
