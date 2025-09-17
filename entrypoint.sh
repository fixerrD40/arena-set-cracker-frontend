#!/bin/sh

# Create config.json dynamically from env vars
cat <<EOF > /usr/share/nginx/html/assets/config.json
{
  "baseUrl": "${BASE_URL}"
}
EOF

# Start nginx
exec nginx -g 'daemon off;'