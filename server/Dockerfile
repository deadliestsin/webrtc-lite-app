# Use a lightweight Node image
FROM node:18-alpine

ENV NODE_ENV=production

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production && chown -R node:node /app

# Copy source code
COPY --chown=node:node . .

# Expose the API/Socket port
EXPOSE 5000

# Run as non-root user for security
USER node

CMD ["npm", "start"]