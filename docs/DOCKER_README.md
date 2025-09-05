# Docker Setup for NestJS Application

This project includes a complete Docker setup for running the NestJS application with PostgreSQL, Redis, and RabbitMQ.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### 1. Environment Configuration

Copy the environment template and configure your variables:

```bash
cp env.example .env
```

Edit the `.env` file with your desired configuration values.

### 2. Start All Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
```

### 3. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

## Services Overview

### 1. NestJS Application (`app`)
- **Port**: 3000 (configurable via `APP_PORT`)
- **Health Check**: Available at `http://localhost:3000/health`
- **Dependencies**: Waits for PostgreSQL, Redis, and RabbitMQ to be healthy

### 2. PostgreSQL Database (`postgres`)
- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Database**: Configurable via environment variables
- **Data Persistence**: Stored in `postgres_data` volume
- **Initialization**: Uses scripts from `./service/init-scripts/`

### 3. Redis Cache (`redis`)
- **Port**: 6379 (configurable via `REDIS_PORT`)
- **Password**: Configurable via `REDIS_PASSWORD`
- **Data Persistence**: Stored in `redis_data` volume

### 4. RabbitMQ Message Broker (`rabbitmq`)
- **AMQP Port**: 5672 (configurable via `RABBITMQ_PORT`)
- **Management UI**: 15672 (configurable via `RABBITMQ_MANAGEMENT_PORT`)
- **Credentials**: Configurable via environment variables
- **Management UI**: Access at `http://localhost:15672`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | Application port | 3000 |
| `POSTGRES_DB` | Database name | nestjs_db |
| `POSTGRES_USER` | Database user | nestjs_user |
| `POSTGRES_PASSWORD` | Database password | nestjs_password |
| `POSTGRES_PORT` | Database port | 5432 |
| `REDIS_PASSWORD` | Redis password | redis_password |
| `REDIS_PORT` | Redis port | 6379 |
| `RABBITMQ_USER` | RabbitMQ user | admin |
| `RABBITMQ_PASSWORD` | RabbitMQ password | admin_password |
| `RABBITMQ_VHOST` | RabbitMQ virtual host | / |
| `RABBITMQ_PORT` | RabbitMQ AMQP port | 5672 |
| `RABBITMQ_MANAGEMENT_PORT` | RabbitMQ management port | 15672 |

## Development Commands

### Build Application Only
```bash
docker-compose build app
```

### Rebuild and Restart Application
```bash
docker-compose up -d --build app
```

### View Service Status
```bash
docker-compose ps
```

### Access Application Shell
```bash
docker-compose exec app sh
```

### Access Database
```bash
docker-compose exec postgres psql -U nestjs_user -d nestjs_db
```

### Access Redis CLI
```bash
docker-compose exec redis redis-cli -a redis_password
```

## Health Checks

All services include health checks to ensure proper startup order:

- **PostgreSQL**: Uses `pg_isready` command
- **Redis**: Uses `redis-cli ping` command
- **RabbitMQ**: Uses `rabbitmq-diagnostics ping` command
- **NestJS App**: Checks HTTP health endpoint

## Data Persistence

All data is persisted using Docker volumes:

- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis data files
- `rabbitmq_data`: RabbitMQ data files

## Network

All services communicate through the `nest-network` bridge network, ensuring secure inter-service communication.

## Troubleshooting

### Service Won't Start
1. Check if ports are already in use
2. Verify environment variables are set correctly
3. Check Docker logs: `docker-compose logs [service-name]`

### Application Can't Connect to Database
1. Ensure PostgreSQL is healthy: `docker-compose ps`
2. Check database credentials in `.env` file
3. Verify network connectivity between services

### Permission Issues
The application runs as a non-root user (nestjs) for security. If you encounter permission issues, check file ownership in the Dockerfile.

## Production Considerations

1. **Security**: Change all default passwords in production
2. **Ports**: Consider using reverse proxy (nginx) for production
3. **SSL**: Configure SSL certificates for production deployment
4. **Backup**: Implement regular backup strategies for volumes
5. **Monitoring**: Add monitoring and logging solutions
6. **Scaling**: Consider using Docker Swarm or Kubernetes for scaling 