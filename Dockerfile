# Dockerfile for RoadPro API
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api/package*.json ./api/

# Install dependencies
RUN npm install
RUN cd api && npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD cd api && npm start