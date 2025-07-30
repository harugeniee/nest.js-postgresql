// import { Injectable } from '@nestjs/common';
// import {
//   EntitySubscriberInterface,
//   InsertEvent,
//   UpdateEvent,
//   DataSource,
// } from 'typeorm';

// @Injectable()
// export class MetadataSubscriber implements EntitySubscriberInterface {
//   constructor(private dataSource: DataSource) {
//     this.dataSource.subscribers.push(this);
//   }

//   beforeInsert(event: InsertEvent<any>) {
//     if (event.entity.metadata !== undefined) {
//       event.entity.metadata = {
//         ...event.entity.metadata,
//         createdAt: new Date().toISOString(),
//         source: 'api',
//         version: '1.0',
//         ipAddress: this.getClientIP(event),
//         userAgent: this.getUserAgent(event),
//       };
//     }
//   }

//   beforeUpdate(event: UpdateEvent<any>) {
//     if (event.entity.metadata !== undefined) {
//       event.entity.metadata = {
//         ...event.entity.metadata,
//         updatedAt: new Date().toISOString(),
//         lastModifiedBy: this.getCurrentUserId(event),
//         modificationCount: (event.entity.metadata.modificationCount || 0) + 1,
//       };
//     }
//   }

//   afterInsert(event: InsertEvent<any>) {
//     console.log(
//       `[MetadataSubscriber] Record created: ${event.entity.constructor.name}`,
//       {
//         id: event.entity.id,
//         metadata: event.entity.metadata,
//       },
//     );
//   }

//   afterUpdate(event: UpdateEvent<any>) {
//     console.log(
//       `[MetadataSubscriber] Record updated: ${event.entity.constructor.name}`,
//       {
//         id: event.entity.id,
//         metadata: event.entity.metadata,
//       },
//     );
//   }

//   private getClientIP(event: InsertEvent<any> | UpdateEvent<any>): string {
//     // Implement logic to get client IP from request context
//     return 'unknown';
//   }

//   private getUserAgent(event: InsertEvent<any> | UpdateEvent<any>): string {
//     // Implement logic to get user agent from request context
//     return 'unknown';
//   }

//   private getCurrentUserId(event: InsertEvent<any> | UpdateEvent<any>): string {
//     // Implement logic to get current user ID from request context
//     return 'system';
//   }
// }
