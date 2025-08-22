import { AdvancedPaginationDto } from 'src/common/dto';
import { USER_CONSTANTS } from 'src/shared/constants';
import {
  Like,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  Not,
  In,
  ILike,
  FindOptionsWhere,
} from 'typeorm';

export class ConditionBuilder {
  static build(
    data: Partial<AdvancedPaginationDto> & {
      userId?: string;
    } = {},
    defaultField = 'name',
  ) {
    let conditions: FindOptionsWhere<any> = {
      status: Not(USER_CONSTANTS.STATUS.REMOVED),
    };

    if (data.status) {
      if (Array.isArray(data.status)) {
        conditions.status = In(data.status);
      } else {
        conditions.status = data.status;
      }
    }

    if (data.ids) {
      if (Array.isArray(data.ids)) {
        conditions.id = In(data.ids);
      } else {
        conditions.id = data.ids;
      }
    }

    if (data.userId) conditions.user = { userId: data.userId };

    const dateField = data.dateFilterField || 'createdAt';

    if (data.fromDate && data.toDate) {
      const fromDate = new Date(data.fromDate);
      fromDate.setHours(0, 0, 0, 0); // Set to start of day

      const toDate = new Date(data.toDate);
      toDate.setHours(23, 59, 59, 999); // Set to end of day

      conditions[dateField] = Between(fromDate, toDate);
    } else if (data.fromDate) {
      const fromDate = new Date(data.fromDate);
      fromDate.setHours(0, 0, 0, 0); // Set to start of day

      conditions[dateField] = MoreThanOrEqual(fromDate);
    } else if (data.toDate) {
      const toDate = new Date(data.toDate);
      toDate.setHours(23, 59, 59, 999); // Set to end of day

      conditions[dateField] = LessThanOrEqual(toDate);
    }

    // Handle multi-field search
    if (data.query) {
      const searchOperator = data.caseSensitive == 1 ? Like : ILike;

      if (data.fields) {
        const searchFields = Array.isArray(data.fields)
          ? data.fields
          : [data.fields];
        if (searchFields.length > 1) {
          conditions = searchFields.map((field) => ({
            ...conditions,
            [field]: searchOperator(`%${data.query}%`),
          }));
        } else {
          conditions[searchFields[0]] = searchOperator(`%${data.query}%`);
        }
      } else {
        conditions[defaultField] = searchOperator(`%${data.query}%`);
      }
    }

    return conditions;
  }
}
