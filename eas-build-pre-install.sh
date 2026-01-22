#!/bin/bash

echo "========================================="
echo "🔧 Running pre-install script..."
echo "========================================="

if [ -n "$GOOGLE_SERVICES_JSON" ]; then
  echo "✅ GOOGLE_SERVICES_JSON variable found"
  echo "📝 Length: ${#GOOGLE_SERVICES_JSON}"
  echo "🔧 Decoding google-services.json..."
  echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json
  
  if [ -f google-services.json ]; then
    echo "✅ google-services.json created successfully"
    echo "📊 File size: $(wc -c < google-services.json) bytes"
  else
    echo "❌ Failed to create google-services.json"
    exit 1
  fi
else
  echo "❌ GOOGLE_SERVICES_JSON variable NOT FOUND"
  echo "Available env vars:"
  env | grep -i google || echo "No GOOGLE env vars found"
  exit 1
fi

echo "========================================="
echo "✅ Pre-install script completed"
echo "========================================="