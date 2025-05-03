#!/bin/bash

# Reset the database
docker-compose down
docker-compose up -d

# Wait for database to be ready
sleep 5

# Run the tests
newman run tests/books-api.postman_collection.json 