# GS1 - Registry Sync

GS1 Microservice for System Synchronization with GS1 Platform.

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

- Start docker services

  ```bash
  docker-compose up -d
  ```

- Start Server in Development Mode

  ```bash
  npm run start:dev
  ```

- Run migrations

  ```bash
  npm run migration:run
  ```

### Production

#### Docker

- Build docker image

  ```bash
  docker build -t gs1-registry-sync --no-cache .
  ```

- Run docker container

  ```bash
  docker run -d -p 80:3000 --name gs1-registry-sync gs1-registry-sync
  ```

- Go to http://localhost

#### Kubernetes

- Create gs1 namespace

  ```bash
  kubectl create namespace gs1
  ```

- Create a persistent volume with size "10Gi" and labels; project: gs1 and service: gs1-registry-sync

- Create a Secret with name "gs1-shared" for next envinments vars:

  ```bash
  KAFKA_BROKERS='localhost:9092,localhost:9093...'
  ```

- Create secrets: Edit your credentials

  ```bash
  cp k8s/00-secrets.yaml.example k8s/00-secrets.yaml
  ```

- Deploy k8s

  ```bash
  kubectl apply -f k8s
  ```
