import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { ReleaseItem } from "./ReleaseItem.js";

export type ReleaseStatus = "planejado" | "em_andamento" | "resolvido" | "publicado";

@Entity("releases")
export class Release {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "varchar", length: 30, default: "planejado" })
  status!: ReleaseStatus;

  @Column({ default: false })
  published!: boolean;

  @Column({ type: "datetime", nullable: true })
  publishedAt!: Date | null;

  @Column()
  createdBy!: string;

  @OneToMany(() => ReleaseItem, (item) => item.release, { cascade: true })
  items!: Relation<ReleaseItem[]>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
