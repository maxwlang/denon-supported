FROM node:22
WORKDIR /app
ADD . /app
RUN chmod +x ./startup.sh
RUN npm ci
RUN npm run build
CMD ./startup.sh