import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // Owner, Admin, Viewer

  @OneToMany(() => User, user => user.role)
  users: User[];

  @ManyToMany(() => Permission)
  @JoinTable()
  permissions: Permission[];
}
