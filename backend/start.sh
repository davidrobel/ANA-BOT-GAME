#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
# We can use npx prisma db push to sync schema without migration history for now, 
# or prisma migrate deploy if migrations exist.
# Let's use db push to ensure tables are created based on schema.prisma

npx prisma db push --accept-data-loss

# Start the application
echo "Starting application..."
node dist/index.js
