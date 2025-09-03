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
COPY --from=builder /app/dist/* /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]