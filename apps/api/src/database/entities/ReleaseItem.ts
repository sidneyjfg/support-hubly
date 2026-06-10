import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { Release } from "./Release.js";

@Entity("release_items")
export class ReleaseItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Release, (release) => release.items, { onDelete: "CASCADE" })
  release!: Relation<Release>;

  @Column()
  releaseId!: string;

  @Column()
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "int", nullable: true })
  ticketId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
