#!/bin/sh

# Function to wait for database
wait_for_db() {
  echo "Waiting for database to be ready..."
  max_attempts=30
  attempt=1
  
  # Try to connect to MySQL using the URL from environment
  # We use prisma to check the connection
  while [ $attempt -le $max_attempts ]; do
    npx prisma db push --preview-feature > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "Database is ready! (Attempt $attempt)"
      return 0
    fi
    
    echo "Database is not ready yet... (Attempt $attempt/$max_attempts)"
    attempt=$((attempt + 1))
    sleep 2
  done
  
  echo "Error: Database timed out."
  return 1
}

# Run the wait function
wait_for_db

if [ $? -eq 0 ]; then
  # Final push to ensure schema is synced
  echo "Syncing database schema..."
  npx prisma db push --accept-data-loss
  
  # Start the application
  echo "Starting application..."
  node dist/index.js
else
  exit 1
fi
