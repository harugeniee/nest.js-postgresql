import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { formatI18nResponse } from '../helpers/format-i18n-response';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<{ i18nLang?: string }>();

    return next.handle().pipe(
      switchMap((response: Record<string, unknown>) => {
        const lang = request.i18nLang || 'en';
        return from(
          Promise.resolve(formatI18nResponse(this.i18n, lang, response)).then(
            translated => ({
              success: true,
              data: response?.data ?? response ?? {},
              message: translated.message,
              metadata: {
                messageKey: translated.messageKey,
                messageArgs: translated.messageArgs,
              },
            }),
          ),
        );
      }),
    );
  }
}
