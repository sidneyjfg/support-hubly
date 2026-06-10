import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { User } from "./User.js";
import { Ticket } from "./Ticket.js";

@Entity("organizations")
export class Organization {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @OneToMany(() => User, (user) => user.organization)
  users!: Relation<User[]>;

  @OneToMany(() => Ticket, (ticket) => ticket.organization)
  tickets!: Relation<Ticket[]>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
