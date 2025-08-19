export interface IPaginationMeta {
  currentPage?: number;
  pageSize: number;
  totalRecords?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
}

export interface IPagination<T = unknown> {
  result: T[];
  metaData: IPaginationMeta;
}

export interface IPaginationCursorMeta {
  nextCursor?: string | null;
  prevCursor?: string | null;
  take: number;
  sortBy: string;
  order: 'ASC' | 'DESC';
}

export interface IPaginationCursor<T = unknown> {
  result: T[];
  metaData: IPaginationCursorMeta;
}
