
FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY ./package*.json ./
RUN npm ci

# Copy all files
COPY . .

# Build app (optional)
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]

