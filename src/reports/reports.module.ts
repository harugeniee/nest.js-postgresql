import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report, ReportAction } from './entities';
import { User } from 'src/users/entities/user.entity';
import { RabbitmqModule } from 'src/shared/services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, ReportAction, User]),
    RabbitmqModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
