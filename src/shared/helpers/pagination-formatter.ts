import { IPagination } from '../../common/interface/pagination.interface';

export class PaginationFormatter {
  static offset<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): IPagination<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      result: data,
      metaData: {
        currentPage: page,
        pageSize: limit,
        totalRecords: total,
        totalPages,
      },
    };
  }

  static cursor<T>(
    data: T[],
    limit: number,
    cursorKey: keyof T,
  ): IPagination<T> {
    const nextCursor =
      data.length > 0 ? String(data[data.length - 1][cursorKey]) : null;

    return {
      result: data,
      metaData: {
        pageSize: limit,
        nextCursor,
        hasNextPage: data.length === limit,
      },
    };
  }
}
