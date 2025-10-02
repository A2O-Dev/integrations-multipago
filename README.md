# Integrations Multipago

Microservice for Integrations Multipago Service.

## Installation

### Technologies

- [NodeJS 20.14.0 (LTS)](https://nodejs.org/en/)
- [NestJS](https://nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Docker](https://www.docker.com/)
- [Kubernetes](https://kubernetes.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [PM2](https://pm2.io/)

### Development

- Install Dependencies

  ```bash
  npm install
  ```

- Copy env file

  ```bash
  cp .env.example .env
  ```

## Start Docker Services with Kafka

- Configure .env

  ```bash
  DB_HOST=database
  DB_PORT=5432
  DB_NAME=integrations_multipago
  DB_USERNAME=postgres
  DB_PASSWORD=postgres
  DB_SCHEMA=integrations

  #Enable kafka
  KAFKA_ENABLED=true
  ```

- Run docker compose

  ```bash
  docker compose up -d --build --wait
  ```

- Create kafka topics

  ```bash
  docker compose --profile setup up kafka-topics-init
  ```

- Create Schema Database

  ```bash
  docker exec -it integrations-db psql -U postgres -d integrations_multipago -c "CREATE SCHEMA IF NOT EXISTS integrations";
  ```

- Run migrations

  ```bash
  docker exec integrations-app node ./node_modules/typeorm/cli migration:run -d ./config/database.js
  ```

## Start NestJS development mode

- Configure .env

  ```bash
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=integrations_multipago
  DB_USERNAME=postgres
  DB_PASSWORD=postgres
  DB_SCHEMA=integrations

  #Disable kafka
  KAFKA_ENABLED=false
  ```

- Create Database 'integrations_multipago'
- Create Schema 'integrations'
- Run migrations

  ```bash
  npm run build
  npm run migration:run
  ```

- Run app

  ```bash
  npm run start:dev
  ```

- Go to http://localhost:3000
