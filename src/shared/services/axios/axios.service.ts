import { AxiosRequestConfig } from 'axios';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AxiosService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Make a GET request using Axios
   * @param url - The URL to make the request to
   * @param configuration - Optional Axios configuration
   * @returns Promise with the response data
   */
  public async get(
    url: string,
    configuration?: AxiosRequestConfig,
  ): Promise<any> {
    return lastValueFrom(
      this.httpService.get(url, configuration).pipe(
        map((res) => {
          return res || null;
        }),
      ),
    );
  }

  /**
   * Make a POST request using Axios
   * @param url - The URL to make the request to
   * @param configuration - Optional Axios configuration
   * @returns Promise with the response data
   */
  public async post(
    url: string,
    configuration?: AxiosRequestConfig,
  ): Promise<any> {
    return lastValueFrom(
      this.httpService.post(url, configuration).pipe(
        map((res) => {
          return res || null;
        }),
      ),
    );
  }

  /**
   * Make a PUT request using Axios
   * @param url - The URL to make the request to
   * @param configuration - Optional Axios configuration
   * @returns Promise with the response data
   */
  public async put(
    url: string,
    configuration?: AxiosRequestConfig,
  ): Promise<any> {
    return lastValueFrom(
      this.httpService.put(url, configuration).pipe(
        map((res) => {
          return res || null;
        }),
      ),
    );
  }

  /**
   * Make a DELETE request using Axios
   * @param url - The URL to make the request to
   * @param configuration - Optional Axios configuration
   * @returns Promise with the response data
   */
  public async delete(
    url: string,
    configuration?: AxiosRequestConfig,
  ): Promise<any> {
    return lastValueFrom(
      this.httpService.delete(url, configuration).pipe(
        map((res) => {
          return res || null;
        }),
      ),
    );
  }

  /**
   * Make a PATCH request using Axios
   * @param url - The URL to make the request to
   * @param configuration - Optional Axios configuration
   * @returns Promise with the response data
   */
  public async patch(
    url: string,
    configuration?: AxiosRequestConfig,
  ): Promise<any> {
    return lastValueFrom(
      this.httpService.patch(url, configuration).pipe(
        map((res) => {
          return res || null;
        }),
      ),
    );
  }
}
