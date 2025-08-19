import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max, IsString, IsIn } from 'class-validator';

/**
 * GraphQL field node interface for better type safety
 * Used for extracting field selection from GraphQL resolve info
 */
export interface GraphQLFieldNode {
  kind: string;
  name?: { value: string };
  selectionSet?: {
    selections: GraphQLFieldNode[];
  };
}

/**
 * GraphQL pagination DTO following the Relay connection specification
 * Supports both forward and backward pagination
 */
export class GraphQLPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  first?: number;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  last?: number;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}

/**
 * GraphQL connection response following Relay specification
 */
export interface GraphQLConnection<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: GraphQLPageInfo;
  totalCount: number;
}

/**
 * GraphQL edge with node and cursor
 */
export interface GraphQLEdge<T> {
  node: GraphQLFieldNode;
  cursor: string;
}

/**
 * GraphQL page info for navigation
 */
export interface GraphQLPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}
