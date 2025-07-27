# Docker Services Setup

This directory contains Docker Compose configuration for PostgreSQL and Redis services.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git Bash (for Windows users)

## Setup Instructions

### 1. Create Environment File

Copy the example environment file and customize it for your needs:

```bash
cp env.example .env
```

### 2. Customize Environment Variables

Edit the `.env` file and update the following variables:

- `POSTGRES_DB`: Database name (default: nestjs_db)
- `POSTGRES_USER`: Database username (default: nestjs_user)
- `POSTGRES_PASSWORD`: Database password (default: nestjs_password)
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (default: redis_password)

### 3. Start Services

Navigate to the service directory and start the services:

```bash
cd service
docker-compose up -d
```

### 4. Verify Services

Check if services are running:

```bash
docker-compose ps
```

### 5. Stop Services

To stop the services:

```bash
docker-compose down
```

To stop and remove volumes (this will delete all data):

```bash
docker-compose down -v
```

## Service Details

### PostgreSQL
- **Image**: postgres:15
- **Container Name**: nest-postgres
- **Port**: 5432 (configurable via POSTGRES_PORT)
- **Data Persistence**: postgres_data volume
- **Health Check**: Enabled

### Redis
- **Image**: redis:7
- **Container Name**: nest-redis
- **Port**: 6379 (configurable via REDIS_PORT)
- **Data Persistence**: redis_data volume
- **Authentication**: Enabled (password required)
- **Health Check**: Enabled

## Connection Information

### PostgreSQL Connection
- **Host**: localhost
- **Port**: 5432 (or POSTGRES_PORT from .env)
- **Database**: nestjs_db (or POSTGRES_DB from .env)
- **Username**: nestjs_user (or POSTGRES_USER from .env)
- **Password**: nestjs_password (or POSTGRES_PASSWORD from .env)

### Redis Connection
- **Host**: localhost
- **Port**: 6379 (or REDIS_PORT from .env)
- **Password**: redis_password (or REDIS_PASSWORD from .env)

## Network

Services are connected through a custom bridge network named `nest-network` for secure communication.

## Data Persistence

- PostgreSQL data is stored in the `postgres_data` volume
- Redis data is stored in the `redis_data` volume
- Data persists between container restarts

## Health Checks

Both services include health checks to ensure they are running properly:
- PostgreSQL: Uses `pg_isready` command
- Redis: Uses `redis-cli ping` command 