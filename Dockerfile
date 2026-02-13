# Usamos una versión estable de Node.js
FROM node:18-slim

# Crear carpeta de trabajo
WORKDIR /usr/src/app

# Copiar archivos de configuración primero (optimiza la caché)
COPY package*.json ./

# Instalar las librerías necesarias
RUN npm install --production

# Copiar el resto del código del juego
COPY . .

# Exponer el puerto que Koyeb usará (8000 es estándar)
EXPOSE 8000

# Variable de entorno para asegurar que Node escuche en todas las interfaces
ENV HOST=0.0.0.0
ENV PORT=8000

# Arrancar la aplicación
CMD ["node", "index.js"]
