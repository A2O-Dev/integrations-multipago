import { v4 as uuidv4 } from 'uuid'

import { parseBoolean } from 'src/utils'
import { ConfigService } from '@nestjs/config'

export const getKafkaConfig = async (configService: ConfigService) => {
  const isEnabled = parseBoolean(
    await configService.get('INTEGRATIONS_KAFKA_ENABLED', true),
  )

  if (!isEnabled) return { isEnabled: false }

  const brokers = (await configService.get('KAFKA_BROKERS'))
    .split(',')
    .filter((a) => a)
  const clientId = `gs1-integrations-${uuidv4()}`
  const groupId = await configService.get('KAFKA_GROUP_ID', 'gs1-integrations')

  return {
    isEnabled: true,
    config: {
      client: {
        clientId,
        brokers,
        connectionTimeout: parseInt(
          await configService.get('KAFKA_CONSUMER_CONNECTION_TIMEOUT', '10000'),
          10,
        ),
      },
      consumer: {
        groupId,
        retry: {
          retries: parseInt(
            await configService.get('KAFKA_CONSUMER_RETRIES', '3'),
            10,
          ),
          factor: parseInt(
            await configService.get('KAFKA_CONSUMER_RETRY_FACTOR', '2'),
            10,
          ),
          initialRetryTime: parseInt(
            await configService.get(
              'KAFKA_CONSUMER_INITIAL_RETRY_TIME',
              '3000',
            ),
            10,
          ),
        },
        sessionTimeout: parseInt(
          await configService.get('KAFKA_CONSUMER_SESSION_TIMEOUT', '100000'),
          10,
        ),
        heartbeatInterval: parseInt(
          await configService.get('KAFKA_CONSUMER_HEARTBEAT_INTERVAL', '10000'),
          10,
        ),
      },
    },
  }
}
