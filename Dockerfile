FROM node:20-alpine

WORKDIR /app

# Instalar dependências do better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --production

COPY . .

RUN mkdir -p data public/uploads

EXPOSE 3000

CMD ["node", "server.js"]
