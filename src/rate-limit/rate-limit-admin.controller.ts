import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { RateLimitService } from './rate-limit.service';
import { BypassRateLimit } from './rate-limit.decorator';
import { Plan } from './entities/plan.entity';
import { ApiKey } from './entities/api-key.entity';
import { IpWhitelist } from './entities/ip-whitelist.entity';
import { RateLimitPolicy } from './entities/rate-limit-policy.entity';
import { CacheStats, RateLimitInfo } from '../common/interface';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  CreateIpWhitelistDto,
  UpdateIpWhitelistDto,
  CreateRateLimitPolicyDto,
  UpdateRateLimitPolicyDto,
  TestPolicyMatchDto,
} from './dto';

/**
 * Admin controller for managing rate limits
 * All endpoints bypass rate limiting for admin access
 */
@ApiTags('Rate Limit Admin')
@Controller('admin/rate-limit')
@BypassRateLimit() // Bypass rate limiting for admin endpoints
export class RateLimitAdminController {
  private readonly logger = new Logger(RateLimitAdminController.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  /**
   * Get all rate limit plans
   */
  @Get('plans')
  @ApiOperation({ summary: 'Get all rate limit plans' })
  @ApiResponse({ status: 200, description: 'List of rate limit plans' })
  async getPlans(): Promise<Plan[]> {
    this.logger.log('Getting all rate limit plans');
    return this.rateLimitService.getAllPlans();
  }

  /**
   * Create a new rate limit plan
   */
  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new rate limit plan' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(@Body() createPlanDto: CreatePlanDto): Promise<Plan> {
    this.logger.log(`Creating new plan: ${createPlanDto.name}`);
    return this.rateLimitService.createPlan(createPlanDto);
  }

  /**
   * Update a rate limit plan
   */
  @Put('plans/:name')
  @ApiOperation({ summary: 'Update a rate limit plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async updatePlan(
    @Param('name') name: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ): Promise<Plan> {
    this.logger.log(`Updating plan: ${name}`);
    return this.rateLimitService.updatePlan(name, updatePlanDto);
  }

  /**
   * Get all API keys
   */
  @Get('api-keys')
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async getApiKeys(): Promise<ApiKey[]> {
    this.logger.log('Getting all API keys');
    return this.rateLimitService.getAllApiKeys();
  }

  /**
   * Create a new API key
   */
  @Post('api-keys')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKey> {
    this.logger.log(
      `Creating new API key: ${createApiKeyDto.name || 'unnamed'}`,
    );
    return this.rateLimitService.createApiKey(createApiKeyDto);
  }

  /**
   * Update an API key
   */
  @Put('api-keys/:id')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ): Promise<ApiKey> {
    this.logger.log(`Updating API key: ${id}`);
    return this.rateLimitService.updateApiKey(id, updateApiKeyDto as any);
  }

  /**
   * Delete an API key
   */
  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully' })
  async deleteApiKey(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting API key: ${id}`);
    return this.rateLimitService.deleteApiKey(id);
  }

  /**
   * Get all IP whitelist entries
   */
  @Get('ip-whitelist')
  @ApiOperation({ summary: 'Get all IP whitelist entries' })
  @ApiResponse({ status: 200, description: 'List of IP whitelist entries' })
  async getIpWhitelist(): Promise<IpWhitelist[]> {
    this.logger.log('Getting all IP whitelist entries');
    return this.rateLimitService.getAllIpWhitelist();
  }

  /**
   * Add IP to whitelist
   */
  @Post('ip-whitelist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add IP to whitelist' })
  @ApiResponse({
    status: 201,
    description: 'IP added to whitelist successfully',
  })
  async addIpToWhitelist(
    @Body() createIpDto: CreateIpWhitelistDto,
  ): Promise<IpWhitelist> {
    this.logger.log(`Adding IP to whitelist: ${createIpDto.ip}`);
    return this.rateLimitService.addIpToWhitelist(createIpDto);
  }

  /**
   * Update IP whitelist entry
   */
  @Put('ip-whitelist/:id')
  @ApiOperation({ summary: 'Update IP whitelist entry' })
  @ApiResponse({
    status: 200,
    description: 'IP whitelist entry updated successfully',
  })
  async updateIpWhitelist(
    @Param('id') id: string,
    @Body() updateIpDto: UpdateIpWhitelistDto,
  ): Promise<IpWhitelist> {
    this.logger.log(`Updating IP whitelist entry: ${id}`);
    return this.rateLimitService.updateIpWhitelist(id, updateIpDto);
  }

  /**
   * Remove IP from whitelist
   */
  @Delete('ip-whitelist/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove IP from whitelist' })
  @ApiResponse({
    status: 204,
    description: 'IP removed from whitelist successfully',
  })
  async removeIpFromWhitelist(@Param('id') id: string): Promise<void> {
    this.logger.log(`Removing IP from whitelist: ${id}`);
    return this.rateLimitService.removeIpFromWhitelist(id);
  }

  /**
   * Publish cache invalidation to all instances
   */
  @Post('cache/invalidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate rate limit cache across all instances' })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidation published successfully',
  })
  async invalidateCache(): Promise<{ message: string; timestamp: string }> {
    this.logger.log('Publishing cache invalidation');
    await this.rateLimitService.publishCacheInvalidation();
    return {
      message: 'Cache invalidation published successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get cache statistics
   */
  @Get('cache/stats')
  @ApiOperation({ summary: 'Get rate limit cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics' })
  async getCacheStats(): Promise<CacheStats> {
    this.logger.log('Getting cache statistics');
    return this.rateLimitService.getCacheStats();
  }

  /**
   * Reset rate limit for a specific key
   */
  @Post('reset/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset rate limit for a specific key' })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetRateLimit(
    @Param('key') key: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Resetting rate limit for key: ${key}`);
    await this.rateLimitService.resetRateLimit(key);
    return { message: 'Rate limit reset successfully' };
  }

  /**
   * Get rate limit information for a specific key
   */
  @Get('info/:key')
  @ApiOperation({ summary: 'Get rate limit information for a specific key' })
  @ApiResponse({ status: 200, description: 'Rate limit information' })
  async getRateLimitInfo(@Param('key') key: string): Promise<RateLimitInfo> {
    this.logger.log(`Getting rate limit info for key: ${key}`);
    return this.rateLimitService.getRateLimitInfo(key);
  }

  // Policy Management Endpoints

  /**
   * Get all rate limit policies
   */
  @Get('policies')
  @ApiOperation({ summary: 'Get all rate limit policies' })
  @ApiResponse({ status: 200, description: 'List of rate limit policies' })
  async getPolicies(): Promise<RateLimitPolicy[]> {
    this.logger.log('Getting all rate limit policies');
    return this.rateLimitService.getAllPolicies();
  }

  /**
   * Create a new rate limit policy
   */
  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new rate limit policy' })
  @ApiResponse({ status: 201, description: 'Policy created successfully' })
  async createPolicy(
    @Body() createPolicyDto: CreateRateLimitPolicyDto,
  ): Promise<RateLimitPolicy> {
    this.logger.log(`Creating new policy: ${createPolicyDto.name}`);
    return this.rateLimitService.createPolicy(createPolicyDto);
  }

  /**
   * Update a rate limit policy
   */
  @Put('policies/:id')
  @ApiOperation({ summary: 'Update a rate limit policy' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully' })
  async updatePolicy(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdateRateLimitPolicyDto,
  ): Promise<RateLimitPolicy> {
    this.logger.log(`Updating policy: ${id}`);
    return this.rateLimitService.updatePolicy(id, updatePolicyDto);
  }

  /**
   * Delete a rate limit policy
   */
  @Delete('policies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rate limit policy' })
  @ApiResponse({ status: 204, description: 'Policy deleted successfully' })
  async deletePolicy(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting policy: ${id}`);
    return this.rateLimitService.deletePolicy(id);
  }

  /**
   * Get policy by name
   */
  @Get('policies/name/:name')
  @ApiOperation({ summary: 'Get policy by name' })
  @ApiResponse({ status: 200, description: 'Policy found' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async getPolicyByName(
    @Param('name') name: string,
  ): Promise<RateLimitPolicy | null> {
    this.logger.log(`Getting policy by name: ${name}`);
    return this.rateLimitService.getPolicyByName(name);
  }

  /**
   * Test policy matching
   */
  @Post('policies/:id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test policy matching against context' })
  @ApiResponse({ status: 200, description: 'Policy test result' })
  async testPolicyMatch(
    @Param('id') id: string,
    @Body() testContext: TestPolicyMatchDto,
  ): Promise<{ matches: boolean; policy: RateLimitPolicy | null }> {
    this.logger.log(`Testing policy match for policy: ${id}`);
    return this.rateLimitService.testPolicyMatch(id, testContext);
  }
}
