#!/bin/sh

# Function to wait for database using Prisma
wait_for_db() {
  echo "Checking database connection..."
  max_attempts=30
  attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    # Try to validate schema connection
    ./node_modules/.bin/prisma db push --accept-data-loss > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "Connection successful! Database is ready."
      return 0
    fi
    
    echo "Waiting for MySQL... (Attempt $attempt/$max_attempts)"
    attempt=$((attempt + 1))
    sleep 3
  done
  
  echo "ERROR: Could not connect to database after $max_attempts attempts."
  # Print the URL for debugging (masked password)
  DEBUG_URL=$(echo $DATABASE_URL | sed 's/:[^@]*@/:****@/')
  echo "Tried connection string: $DEBUG_URL"
  return 1
}

# Run the wait function
wait_for_db

if [ $? -eq 0 ]; then
  # Ensure Prisma client is in sync with the DB in this environment
  echo "Finalizing database setup..."
  ./node_modules/.bin/prisma generate
  
  # Start the application
  echo "🚀 Starting application..."
  node dist/index.js
else
  exit 1
fi
