import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for following a user
 */
export class FollowUserDto {
  @ApiProperty({ description: 'ID of the user to follow' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

/**
 * DTO for unfollowing a user
 */
export class UnfollowUserDto {
  @ApiProperty({ description: 'ID of the user to unfollow' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

/**
 * DTO for pagination parameters
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page number for offset pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;
}

/**
 * DTO for mutual friends query
 */
export class MutualFriendsDto extends PaginationDto {
  @ApiProperty({ description: 'First user ID' })
  @IsString()
  @IsNotEmpty()
  userA: string;

  @ApiProperty({ description: 'Second user ID' })
  @IsString()
  @IsNotEmpty()
  userB: string;
}

/**
 * DTO for follow suggestions
 */
export class FollowSuggestionsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Algorithm to use for suggestions',
    enum: ['friends_of_friends', 'popular', 'similar_interests'],
  })
  @IsOptional()
  @IsEnum(['friends_of_friends', 'popular', 'similar_interests'])
  algorithm?: 'friends_of_friends' | 'popular' | 'similar_interests' =
    'friends_of_friends';

  @ApiPropertyOptional({
    description: 'Include mutual friends count in response',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeMutualCount?: boolean = false;
}

/**
 * DTO for follow counters
 */
export class FollowCountersDto {
  @ApiProperty({ description: 'Number of users being followed' })
  following: number;

  @ApiProperty({ description: 'Number of followers' })
  followers: number;

  @ApiProperty({ description: 'Number of mutual friends' })
  mutuals?: number;
}

/**
 * DTO for follow status
 */
export class FollowStatusDto {
  @ApiProperty({ description: 'Whether the user is being followed' })
  isFollowing: boolean;

  @ApiProperty({ description: 'Whether the user is following back' })
  isFollowedBy: boolean;

  @ApiProperty({ description: 'Whether the users are mutual friends' })
  isMutual: boolean;

  @ApiProperty({ description: 'Number of mutual friends' })
  mutualCount: number;
}

/**
 * DTO for user suggestion
 */
export class UserSuggestionDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User username' })
  username: string;

  @ApiProperty({ description: 'User avatar URL' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Suggestion score' })
  score: number;

  @ApiProperty({ description: 'Number of mutual friends' })
  mutualCount?: number;

  @ApiProperty({ description: 'Reason for suggestion' })
  reason: string;

  @ApiProperty({ description: 'Whether user is verified' })
  isVerified: boolean;
}

/**
 * DTO for following list response
 */
export class FollowingListDto {
  @ApiProperty({ description: 'List of users being followed' })
  users: UserSuggestionDto[];

  @ApiProperty({ description: 'Pagination cursor for next page' })
  nextCursor?: string;

  @ApiProperty({ description: 'Whether there are more results' })
  hasMore: boolean;

  @ApiProperty({ description: 'Total count' })
  total: number;
}

/**
 * DTO for followers list response
 */
export class FollowersListDto {
  @ApiProperty({ description: 'List of followers' })
  users: UserSuggestionDto[];

  @ApiProperty({ description: 'Pagination cursor for next page' })
  nextCursor?: string;

  @ApiProperty({ description: 'Whether there are more results' })
  hasMore: boolean;

  @ApiProperty({ description: 'Total count' })
  total: number;
}

/**
 * DTO for mutual friends response
 */
export class MutualFriendsListDto {
  @ApiProperty({ description: 'List of mutual friends' })
  users: UserSuggestionDto[];

  @ApiProperty({ description: 'Pagination cursor for next page' })
  nextCursor?: string;

  @ApiProperty({ description: 'Whether there are more results' })
  hasMore: boolean;

  @ApiProperty({ description: 'Total count' })
  total: number;
}

/**
 * DTO for follow suggestions response
 */
export class FollowSuggestionsListDto {
  @ApiProperty({ description: 'List of suggested users' })
  suggestions: UserSuggestionDto[];

  @ApiProperty({ description: 'Pagination cursor for next page' })
  nextCursor?: string;

  @ApiProperty({ description: 'Whether there are more results' })
  hasMore: boolean;

  @ApiProperty({ description: 'Algorithm used for suggestions' })
  algorithm: string;
}

/**
 * DTO for bitset export
 */
export class BitsetExportDto {
  @ApiProperty({ description: 'Base64 encoded bitset data' })
  data: string;

  @ApiProperty({ description: 'Type of bitset' })
  type: 'following' | 'followers';

  @ApiProperty({ description: 'Export timestamp' })
  exportedAt: Date;

  @ApiProperty({ description: 'Number of items in bitset' })
  count: number;
}

/**
 * DTO for bitset import
 */
export class BitsetImportDto {
  @ApiProperty({ description: 'Base64 encoded bitset data' })
  data: string;

  @ApiProperty({ description: 'Type of bitset to import' })
  @IsEnum(['following', 'followers'])
  type: 'following' | 'followers';

  @ApiPropertyOptional({ description: 'Whether to replace existing data' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  replace?: boolean = false;
}

/**
 * DTO for rebuild operation
 */
export class RebuildDto {
  @ApiProperty({ description: 'User ID to rebuild bitset for' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: 'Whether to rebuild from edges' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  fromEdges?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether to force rebuild even if not needed',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  force?: boolean = false;
}
