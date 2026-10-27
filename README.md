# Hackathon Frontend: One Piece — Rumbo al Grand Line

**Log Pose Console** · Tripulación TEAM-014 (Vibe coders profesionales)

## Integrantes

| Nombre | Código |
|:--|:--|
| Gabriel Murillo Machicao | 202510160 |
| Indira Shian Yabar Ramos | 202520029 |
| Rafael Antonio Vargas Portocarrero | 202610126 |

## Cómo ejecutar

Requisitos: Node 24 LTS y npm.

1. Crear un archivo `.env` en la raíz del proyecto con:

   ```txt
   VITE_API_BASE_URL=https://logpose-api-jg7f.onrender.com/api/v1
   ```

2. Instalar dependencias y levantar el servidor de desarrollo:

   ```bash
   npm install
   npm run dev
   ```

3. Abrir la URL que muestra la terminal (por defecto `http://localhost:5173`).

Otros comandos: `npm run build` (compila con TypeScript estricto) y `npm run lint`.

## Rutas

| Ruta | Checkpoint |
|:--|:--|
| `/login`, `/register`, `/` (dashboard) | CP1 |
| `/wanted`, `/wanted/:id` | CP2 |
| `/news`, `/news/:id` | CP4 (requiere Log Pose) |
| `/sagas`, `/sagas/:id?stage=<slug>` | CP5 (requiere Log Pose) |
