# Stage 1: Build Angular app
FROM node:24-alpine AS builder
WORKDIR /app

# Copy only the files needed for install & build
COPY package*.json ./
RUN npm install

COPY . .
RUN npx ng build --configuration production --verbose

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist/arena-set-cracker/browser/ /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]