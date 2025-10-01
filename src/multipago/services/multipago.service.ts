import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cache } from 'cache-manager'
import { AxiosError } from 'axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import _ = require('lodash')

import { MULTIPAGO_ENDPOINTS } from '../interfaces/multipago.interface'

@Injectable()
export class MultipagoService {
  private readonly logger = new Logger(MultipagoService.name)
  private readonly cacheKey = 'multipago_auth_token'

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject('MULTIPAGO_HTTP_SERVICE') private readonly httpService: HttpService,
  ) {}

  async getToken(): Promise<string> {
    const cachedToken = await this.cacheManager.get<string>(this.cacheKey)
    if (cachedToken) {
      this.logger.log('Returning cached token')
      return cachedToken
    }

    this.logger.log(
      `Fetching new token from API ${MULTIPAGO_ENDPOINTS.GET_TOKEN}`,
    )

    return await firstValueFrom(
      this.httpService.post(MULTIPAGO_ENDPOINTS.GET_TOKEN, {
        provider: process.env.MULTIPAGO_PROVIDER,
        uid: process.env.MULTIPAGO_UID,
      }),
    )
      .then((response) => {
        const {
          data: { data: token },
        } = response
        if (token) {
          this.cacheManager.set(this.cacheKey, token, 3600 * 1000)
          this.logger.log('Token fetched and cached successfully')
          return token
        } else {
          throw new Error('Token not found in response')
        }
      })
      .catch((error) => {
        this.logger.error(
          `Failed to fetch token from API ${MULTIPAGO_ENDPOINTS.GET_TOKEN}`,
          error,
        )
        throw error
      })
  }

  async sendRequest(endpoint: string, payload: any): Promise<any> {
    const token = await this.getToken()
    const headers = {
      'Content-Type': 'application/json',
      Authorization: token,
    }
    const quotationIdLog = `[quotation: ${_.get(payload, 'payment_data.item_selecteds[0].id', '')}]`

    try {
      this.logger.log(
        `[Logbook] ${quotationIdLog} Sending POST request to API ${endpoint} with payload: ${JSON.stringify(payload)}`,
      )
      const response = await firstValueFrom(
        this.httpService.post(endpoint, payload, { headers }),
      )
      if (response.data.status === 'ERROR') {
        throw new Error(`API returned error: ${JSON.stringify(response.data)}`)
      }
      this.logger.log(
        `[Logbook] ${quotationIdLog} Response from API ${endpoint}: ${JSON.stringify(response.data)}`,
      )
      return response.data.data
    } catch (error) {
      if (error instanceof AxiosError) {
        const responseData = error.response?.data || error.message
        const errorMessage = `Error sending request to API ${endpoint}`
        this.logger.error(
          `[Logbook] ${quotationIdLog} ${errorMessage} ${JSON.stringify(responseData)}`,
        )
        throw new Error(errorMessage)
      } else {
        const errorMessage = 'Unexpected error occurred'
        this.logger.error(
          `[Logbook] ${quotationIdLog} ${errorMessage} ${JSON.stringify(error)}`,
        )
        throw new Error(errorMessage)
      }
    }
  }
}
