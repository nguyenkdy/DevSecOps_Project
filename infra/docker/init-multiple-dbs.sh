#!/bin/bash
# Tạo nhiều database trong 1 PostgreSQL instance (chỉ dùng cho local dev).
# Production: mỗi service có RDS instance riêng.
set -e
if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
  for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
    echo "Creating database: $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
      CREATE DATABASE $db;
EOSQL
  done
fi
