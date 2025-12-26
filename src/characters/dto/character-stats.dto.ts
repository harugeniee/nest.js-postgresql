import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for character statistics response
 */
export class CharacterStatsDto {
  @ApiProperty({
    description: 'Total number of characters',
    example: 1500,
  })
  totalCharacters: number;

  @ApiProperty({
    description: 'Number of active characters',
    example: 1450,
  })
  activeCharacters: number;

  @ApiProperty({
    description: 'Characters count by status',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      active: 1450,
      inactive: 30,
      pending: 15,
      archived: 5,
    },
  })
  charactersByStatus: Record<string, number>;

  @ApiProperty({
    description: 'Characters count by gender',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      male: 750,
      female: 650,
      non_binary: 50,
      other: 50,
    },
  })
  charactersByGender: Record<string, number>;

  @ApiProperty({
    description: 'Characters count by blood type',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      A: 450,
      B: 400,
      AB: 350,
      O: 300,
    },
  })
  charactersByBloodType: Record<string, number>;

  @ApiProperty({
    description: 'Number of characters with images',
    example: 1200,
  })
  charactersWithImages: number;

  @ApiProperty({
    description: 'Number of characters with at least one voice actor',
    example: 1000,
  })
  charactersWithVoiceActors: number;

  @ApiProperty({
    description: 'Total number of voice actor relationships',
    example: 2500,
  })
  totalVoiceActors: number;

  @ApiProperty({
    description: 'Total reaction count across all characters',
    example: 50000,
  })
  totalReactions: number;

  @ApiProperty({
    description: 'Top series by character count',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        seriesId: { type: 'string' },
        count: { type: 'number' },
      },
    },
    example: [
      { seriesId: '1234567890123456789', count: 50 },
      { seriesId: '9876543210987654321', count: 45 },
      { seriesId: '1111111111111111111', count: 40 },
    ],
  })
  charactersBySeries: Array<{ seriesId: string; count: number }>;
}
