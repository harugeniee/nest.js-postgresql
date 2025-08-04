export interface IPaginationMeta {
  currentPage?: number;
  pageSize: number;
  totalRecords?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
}

export interface IPagination<T = any> {
  result: T[];
  metaData: IPaginationMeta;
}
