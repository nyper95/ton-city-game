FROM node:18

# Crear carpeta de trabajo
WORKDIR /usr/src/app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar las librerías necesarias (Esto soluciona tu error de 'module not found')
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de Koyeb
EXPOSE 8000

# Arrancar la aplicación
CMD ["node", "index.js"]
