# Guia Rapida

## Uso
- Registrar `D1` y `D2`, calcular y guardar.
- Exportar historial con `Descargar Excel (.xlsx)`.
- Copiar todo el historial con `Copiar Historial`.
- Vaciar historial solo cuando ya se haya exportado o respaldado.

## Formulas
- `pH`: `Error absoluto = |D1 - D2|`.
  Criterio: `Conforme` si el error absoluto es `<= 0.1`.
- `Temperatura`: `Error absoluto = |D1 - D2|`.
  Criterio: `Conforme` si el error absoluto es `<= 0.5 C`.
- `CE`, `OD`, `Turbidez`: `RPD = (|D1 - D2| / |(D1 + D2) / 2|) * 100`.
  Criterios:
  `CE <= 2%`
  `OD <= 4%`
  `Turbidez <= 10%`

## Validaciones y logica
- `pH`: debe ser mayor a `0`.
- `CE`, `OD` y `Turbidez`: no aceptan valores negativos.
- `Temperatura`: se deja libre.
- En `RPD`, el promedio no puede ser `0`.
- Si el valor calculado supera el limite, el resultado es `No conforme`.
- El historial se guarda en `localStorage`.
- Limite del historial: `1000` registros.
- Aviso preventivo desde `900` registros.
- Al llegar al limite, ya no se guardan registros nuevos hasta exportar y limpiar.

## Exportacion
- El archivo descargado es `.xlsx` real.
- Incluye:
  `N`, `Parametro`, `Estado`, `D1`, `D2`, `Fecha`, `Resultado`, `Criterio`.
- El boton `Copiar Historial` copia todo el historial en formato tabulado, listo para pegar en Excel.

## Offline
- La app usa `service worker`.
- Si se publica una nueva version, el usuario debe abrir la app al menos una vez con internet para cachear la version actualizada.
- Una primera visita totalmente offline no tendra archivos cacheados.

## Cambios y despliegue en Vercel
- Si el proyecto ya esta conectado a Vercel:
  1. Hacer los cambios.
  2. Confirmar y hacer `push`.
  3. Vercel genera un nuevo despliegue automaticamente.
- Si el proyecto aun no esta conectado:
  1. Subir el codigo a GitHub, GitLab o Bitbucket.
  2. En Vercel, importar el repositorio.
  3. Para este proyecto estatico usar `Framework Preset: Other`.
  4. Dejar `Build Command` vacio.
  5. Usar `Output Directory: .` si Vercel pide una carpeta de salida.
  6. Desplegar.
- Alternativa con CLI:
  `vercel --cwd .`
  Produccion:
  `vercel --prod --cwd .`
- Referencia oficial:
  [Deploying Git Repositories with Vercel](https://vercel.com/docs/deployments/git)
  [Deploying to Vercel](https://vercel.com/docs/deployments/deployment-methods)

## Archivos principales
- `index.html`: estructura.
- `style.css`: estilos.
- `app.js`: validaciones, calculos, historial, exportacion y copia.
- `sw.js`: cache offline y actualizacion.

## Verificacion rapida despues de un cambio
1. Crear un registro valido.
2. Probar un valor negativo en `CE`, `OD` o `Turbidez`.
3. Descargar el `.xlsx`.
4. Probar `Copiar Historial`.
5. Recargar la app.
6. Abrir la app sin internet si ya fue cargada antes online.
