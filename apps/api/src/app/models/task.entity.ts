import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'Work' })
  category: string;

  @Column({ default: 'Todo' })
  status: string; // e.g., Todo, InProgress, Done

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => User, user => user.id)
  assignedTo: User;

  @ManyToOne(() => Organization, org => org.id)
  organization: Organization;
}
