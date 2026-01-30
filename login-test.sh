#!/bin/bash

API_KEY="AIzaSyCz2c3HvQoV7RvFCbCaudbEEelEQaO-tY8"
EMAIL="rafael.minatto@yahoo.com.br"
PASSWORD="Yukari30@"

curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"${EMAIL}"'",
    "password": "'"${PASSWORD}"'",
    "returnSecureToken": true
  }'
