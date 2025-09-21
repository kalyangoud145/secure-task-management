import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './models/user.entity';
import { Organization } from './models/organization.entity';
import { Role } from './models/role.entity';
import { Permission } from './models/permission.entity';
import { Task } from './models/task.entity';
import { AuthController } from './controllers/auth.controller';
import { TaskService } from './services/task.service';
import { UserService } from './services/user.service';
import { SeederService } from './services/seeder.service';
import { TaskController } from './controllers/task.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [User, Organization, Role, Permission, Task],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Organization, Role, Permission, Task]),
  ],
  controllers: [AppController, AuthController, TaskController],
  providers: [AppService, TaskService, UserService, SeederService],
})
export class AppModule {
  constructor(private readonly seederService: SeederService) {
    this.seederService.seed();
  }
}
