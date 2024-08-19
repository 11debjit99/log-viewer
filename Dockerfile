# Use an official Node.js runtime as a parent image
FROM node:18-alpine
 
# Set the working directory in the container
WORKDIR /usr/src/app
 
# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./
 
# Install any needed packages
RUN npm install
 
# Copy the rest of the application code to the working directory
COPY . .
 
# Expose the port that your app runs on
EXPOSE 3000
 
# Set the environment variables
ENV NODE_ENV=production
 
# Start the application
CMD ["node", "server.js"]

