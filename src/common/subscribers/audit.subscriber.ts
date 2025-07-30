// import { Injectable } from '@nestjs/common';
// import {
//   EntitySubscriberInterface,
//   InsertEvent,
//   UpdateEvent,
//   RemoveEvent,
//   DataSource,
// } from 'typeorm';

// @Injectable()
// export class AuditSubscriber implements EntitySubscriberInterface {
//   constructor(private dataSource: DataSource) {
//     this.dataSource.subscribers.push(this);
//   }

//   afterInsert(event: InsertEvent<any>) {
//     this.logAudit('INSERT', event.entity, null, event.entity);
//   }

//   afterUpdate(event: UpdateEvent<any>) {
//     this.logAudit('UPDATE', event.entity, event.databaseEntity, event.entity);
//   }

//   afterRemove(event: RemoveEvent<any>) {
//     this.logAudit('DELETE', event.entity, event.entity, null);
//   }

//   private logAudit(
//     operation: 'INSERT' | 'UPDATE' | 'DELETE',
//     entity: any,
//     oldValues: any,
//     newValues: any,
//   ) {
//     const auditLog = {
//       timestamp: new Date().toISOString(),
//       operation,
//       table: entity.constructor.name,
//       entityId: entity.id,
//       oldValues: this.sanitizeData(oldValues),
//       newValues: this.sanitizeData(newValues),
//       userId: this.getCurrentUserId(),
//       ipAddress: this.getClientIP(),
//       userAgent: this.getUserAgent(),
//     };

//     console.log(
//       `[AuditSubscriber] ${operation} on ${entity.constructor.name}:`,
//       auditLog,
//     );

//     // TODO: Save to audit log table or external logging service
//     // this.saveAuditLog(auditLog);
//   }

//   private sanitizeData(data: any): any {
//     if (!data) return null;

//     // Remove sensitive fields
//     const sensitiveFields = ['password', 'token', 'secret', 'key'];
//     const sanitized = { ...data };

//     sensitiveFields.forEach((field) => {
//       if (sanitized[field]) {
//         sanitized[field] = '[REDACTED]';
//       }
//     });

//     return sanitized;
//   }

//   private getCurrentUserId(): string {
//     // TODO: Get from JWT token or session
//     return 'system';
//   }

//   private getClientIP(): string {
//     // TODO: Get from request context
//     return 'unknown';
//   }

//   private getUserAgent(): string {
//     // TODO: Get from request context
//     return 'unknown';
//   }
// }
