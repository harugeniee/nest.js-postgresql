import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export function mapTypeOrmError(error: any): never {
  if (error && typeof error === 'object') {
    const code: string | undefined = (error as { code?: string }).code;
    if (code === '23505') {
      throw new ConflictException('Duplicate key');
    }
    if (code === '23503') {
      throw new BadRequestException('Foreign key constraint');
    }
  }
  throw new InternalServerErrorException();
}

export function notFound(entityName: string, id?: string): never {
  const messageKey = `${entityName.toLowerCase()}.NOT_FOUND`;
  throw new NotFoundException({ messageKey, messageArgs: { id } });
}
