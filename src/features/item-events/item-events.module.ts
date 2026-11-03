import { Module } from '@nestjs/common';
import { ItemEventRecorder } from './application/item-event-recorder.js';
import { ItemEventsApplicationService } from './application/item-events.application.service.js';
import { ITEM_EVENTS_REPOSITORY } from './domain/item-events.types.js';
import { PrismaItemEventsRepository } from './infrastructure/item-events.prisma.repository.js';
import { ItemEventsController } from './presentation/http/item-events.controller.js';

@Module({
  controllers: [ItemEventsController],
  providers: [
    ItemEventsApplicationService,
    ItemEventRecorder,
    { provide: ITEM_EVENTS_REPOSITORY, useClass: PrismaItemEventsRepository },
  ],
  exports: [ItemEventRecorder, ITEM_EVENTS_REPOSITORY],
})
export class ItemEventsModule {}
