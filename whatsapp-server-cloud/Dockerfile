FROM node:20-alpine

# Instalar dependências necessárias para o Baileys (python e build-base)
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Diretório para volumes (Autenticação Persistente)
VOLUME ["/usr/src/app/auth_sessions"]

EXPOSE 8080

CMD ["npm", "start"]
