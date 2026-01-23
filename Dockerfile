# Usamos una versión estable de Node.js
FROM node:18

# Creamos la carpeta de la app
WORKDIR /usr/src/app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las librerías
RUN npm install

# Copiamos el resto del código (incluyendo tu nuevo index.js)
COPY . .

# Exponemos el puerto que usa Koyeb
EXPOSE 8000

# Comando para arrancar el bot
CMD [ "node", "index.js" ]
