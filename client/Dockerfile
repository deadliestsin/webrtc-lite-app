# Stage 1: Build the React Application
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine
# Copy build artifacts from Stage 1 to Nginx html folder
COPY --from=build /app/build /usr/share/nginx/html
# Copy custom nginx config (required for SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]