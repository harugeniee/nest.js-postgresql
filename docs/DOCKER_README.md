# Docker Setup for NestJS Application

This project includes a complete Docker setup for running the NestJS application with PostgreSQL, Redis, and RabbitMQ.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### 1. Environment Configuration

Create a `.env` file with the required environment variables:

```bash
# Copy from example or create new
cp .env.example .env
```

Edit the `.env` file with your desired configuration values.

### 2. Start Infrastructure Services

First, start the supporting services (PostgreSQL, Redis, RabbitMQ):

```bash
# Start infrastructure services
cd service
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
```

### 3. Start Application

In the root directory, start the NestJS application:

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 4. Stop Services

```bash
# Stop application
docker-compose down

# Stop infrastructure services
cd service
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

## Services Overview

### 1. NestJS Application (`app`)
- **Port**: 3000 (configurable via `APP_PORT`)
- **Health Check**: Available at `http://localhost:3000/health`
- **Dependencies**: Requires PostgreSQL, Redis, and RabbitMQ to be running
- **Configuration**: Uses environment variables for database and service connections

### 2. PostgreSQL Database (`postgres`) - Infrastructure Service
- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Database**: Configurable via `POSTGRES_DB` environment variable
- **User**: Configurable via `POSTGRES_USER` environment variable
- **Password**: Configurable via `POSTGRES_PASSWORD` environment variable
- **Data Persistence**: Stored in `postgres_data` volume
- **Initialization**: Uses scripts from `./service/init-scripts/`

### 3. Redis Cache (`redis`) - Infrastructure Service
- **Port**: 6379 (configurable via `REDIS_PORT`)
- **Password**: Configurable via `REDIS_PASSWORD`
- **Data Persistence**: Stored in `redis_data` volume
- **Configuration**: Redis server with append-only file enabled

### 4. RabbitMQ Message Broker (`rabbitmq`) - Infrastructure Service
- **AMQP Port**: 5672 (configurable via `RABBITMQ_PORT`)
- **Management UI**: 15672 (configurable via `RABBITMQ_MANAGEMENT_PORT`)
- **User**: Configurable via `RABBITMQ_USER` environment variable
- **Password**: Configurable via `RABBITMQ_PASSWORD` environment variable
- **Virtual Host**: Configurable via `RABBITMQ_VHOST` environment variable
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
# Check application status
docker-compose ps

# Check infrastructure services status
cd service
docker-compose ps
```

### Access Application Shell
```bash
docker-compose exec app sh
```

### Access Database
```bash
# Access PostgreSQL (from service directory)
cd service
docker-compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### Access Redis CLI
```bash
# Access Redis (from service directory)
cd service
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD}
```

### Access RabbitMQ Management
```bash
# Open browser to RabbitMQ Management UI
open http://localhost:15672
# Login with credentials from environment variables
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