
#!/bin/bash

# Navigate to voter-web
cd voter-web

# Run API Server in background
node server.js &
API_PID=$!

# Run Vite Frontend
npx vite --host

# Kill API server when frontend stops
kill $API_PID
