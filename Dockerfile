# Use Node.js LTS base image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose app port
EXPOSE 3000

# Start the server
CMD ["node", "start"]