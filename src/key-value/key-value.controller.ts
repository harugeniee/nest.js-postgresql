import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators';
import { IPagination } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes/snowflake-id.pipe';
import { CreateKeyValueDto, QueryKeyValueDto, UpdateKeyValueDto } from './dto';
import { KeyValueService } from './key-value.service';

/**
 * Key-Value Store Controller
 *
 * Provides REST API endpoints for key-value storage operations
 */
@ApiTags('Key-Value Store')
@Controller('key-value')
export class KeyValueController {
  constructor(private readonly keyValueService: KeyValueService) {}

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new key-value pair' })
  @ApiResponse({
    status: 201,
    description: 'Key-value pair created successfully',
  })
  async create(@Body() createKeyValueDto: CreateKeyValueDto) {
    return this.keyValueService.create(createKeyValueDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get key-value pairs with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of key-value pairs with pagination metadata',
  })
  async findAll(@Query() query: QueryKeyValueDto): Promise<IPagination<any>> {
    return this.keyValueService.listOffset(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a key-value pair by ID' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pair found',
  })
  @ApiResponse({
    status: 404,
    description: 'Key-value pair not found',
  })
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.keyValueService.findById(id);
  }

  @Put(':id')
  @Auth()
  @ApiOperation({ summary: 'Update a key-value pair' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pair updated successfully',
  })
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateKeyValueDto: UpdateKeyValueDto,
  ) {
    return this.keyValueService.update(id, updateKeyValueDto);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a key-value pair' })
  @ApiResponse({
    status: 204,
    description: 'Key-value pair deleted successfully',
  })
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    await this.keyValueService.remove(id);
  }

  // Custom endpoints for key-value operations

  @Get('key/:key')
  @ApiOperation({ summary: 'Get a key-value pair by key' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pair found',
  })
  @ApiResponse({
    status: 404,
    description: 'Key-value pair not found',
  })
  async findByKey(
    @Param('key') key: string,
    @Query('namespace') namespace?: string,
  ) {
    const result = await this.keyValueService.getByKey(key, namespace);
    if (!result) {
      throw new Error('Key-value pair not found');
    }
    return result;
  }

  @Post('batch')
  @Auth()
  @ApiOperation({ summary: 'Set multiple key-value pairs' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pairs set successfully',
  })
  async setMultiple(@Body() entries: Record<string, any>) {
    return this.keyValueService.setMultiple(entries);
  }

  @Get('batch')
  @ApiOperation({ summary: 'Get multiple key-value pairs by keys' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pairs retrieved successfully',
  })
  async getMultiple(@Query('keys') keys: string[]) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    return this.keyValueService.getMultiple(keysArray);
  }

  @Post(':key/increment')
  @Auth()
  @ApiOperation({ summary: 'Atomically increment a numeric value' })
  @ApiResponse({
    status: 200,
    description: 'Value incremented successfully',
  })
  async increment(
    @Param('key') key: string,
    @Body() dto: { amount?: number; namespace?: string },
  ): Promise<{ value: number }> {
    const { amount = 1, namespace } = dto;
    const newValue = await this.keyValueService.increment(
      key,
      amount,
      namespace,
    );
    return { value: newValue };
  }

  @Post('ttl')
  @Auth()
  @ApiOperation({ summary: 'Set a key-value pair with TTL' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pair with TTL set successfully',
  })
  async setWithTTL(
    @Body()
    dto: {
      key: string;
      value: any;
      ttlSeconds: number;
      namespace?: string;
    },
  ) {
    const { key, value, ttlSeconds, namespace } = dto;
    return this.keyValueService.setWithTTL(key, value, ttlSeconds, namespace);
  }

  @Get('namespace/:namespace')
  @ApiOperation({ summary: 'Get all key-value pairs in a namespace' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pairs in namespace retrieved successfully',
  })
  async getByNamespace(@Param('namespace') namespace: string) {
    return this.keyValueService.getByNamespace(namespace);
  }

  @Get('pattern/:pattern')
  @ApiOperation({ summary: 'Get key-value pairs by key pattern' })
  @ApiResponse({
    status: 200,
    description: 'Key-value pairs matching pattern retrieved successfully',
  })
  async getByPattern(
    @Param('pattern') pattern: string,
    @Query('namespace') namespace?: string,
  ) {
    return this.keyValueService.getByKeyPattern(pattern, namespace);
  }

  @Get(':key/exists')
  @ApiOperation({ summary: 'Check if a key exists' })
  @ApiResponse({
    status: 200,
    description: 'Key existence checked successfully',
  })
  async exists(
    @Param('key') key: string,
    @Query('namespace') namespace?: string,
  ) {
    const exists = await this.keyValueService.exists(key, namespace);
    return { exists };
  }

  @Post('cleanup')
  @Auth()
  @ApiOperation({ summary: 'Clean up expired key-value pairs' })
  @ApiResponse({
    status: 200,
    description: 'Expired entries cleaned up successfully',
  })
  async cleanupExpired() {
    const deletedCount = await this.keyValueService.deleteExpired();
    return { deletedCount };
  }
}
