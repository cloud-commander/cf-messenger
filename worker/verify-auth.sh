#!/bin/bash

# Base URL
API_URL="http://localhost:8787"

echo "1. Fetching Accounts..."
curl -s "$API_URL/api/auth/accounts" | head -c 100
echo "..."

echo -e "\n\n2. Logging in as user_1..."
LOGIN_RES=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"userId":"user_1"}')
echo "Response: $LOGIN_RES"

TOKEN=$(echo $LOGIN_RES | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "Login failed!"
  exit 1
fi

echo -e "\n3. Verifying Session (Who am I?)..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/auth/me"
echo ""

echo -e "\n4. Logging Out..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" "$API_URL/api/auth/logout"
echo ""

echo -e "\n5. Verifying Session after Logout (Should be 401)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL/api/auth/me")
echo "Status: $STATUS"

if [ "$STATUS" -eq 401 ]; then
    echo "SUCCESS: Session invalidated."
else
    echo "FAILURE: Session still active or other error."
fi
