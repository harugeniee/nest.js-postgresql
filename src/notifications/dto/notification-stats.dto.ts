/**
 * DTO for notification statistics response
 */
export class NotificationStatsDto {
  total: number;

  unread: number;

  byType: Record<string, number>;

  byStatus: Record<string, number>;
}
