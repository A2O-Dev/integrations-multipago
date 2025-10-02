import { v4 as uuidv4 } from 'uuid'

import { parseBoolean } from 'src/utils'

export const getKafkaConfig = () => {
  const isEnabled = parseBoolean(process.env.KAFKA_ENABLED)

  if (!isEnabled) return { isEnabled: false }

  const brokers = process.env.KAFKA_BROKERS.split(',').filter((a) => a)
  const clientId = `integrations-${uuidv4()}`
  const groupId = process.env.KAFKA_GROUP_ID

  return {
    isEnabled: true,
    config: {
      client: {
        clientId,
        brokers,
        connectionTimeout: parseInt(
          process.env.KAFKA_CONSUMER_CONNECTION_TIMEOUT,
          10,
        ),
      },
      consumer: {
        groupId,
        retry: {
          retries: parseInt(process.env.KAFKA_CONSUMER_RETRIES, 10),
          factor: parseInt(process.env.KAFKA_CONSUMER_RETRY_FACTOR, 10),
          initialRetryTime: parseInt(
            process.env.KAFKA_CONSUMER_INITIAL_RETRY_TIME,
            10,
          ),
        },
        sessionTimeout: parseInt(
          process.env.KAFKA_CONSUMER_SESSION_TIMEOUT,
          10,
        ),
        heartbeatInterval: parseInt(
          process.env.KAFKA_CONSUMER_HEARTBEAT_INTERVAL,
          10,
        ),
      },
    },
  }
}
