# Manual de Operacion

## 1. Uso general
- Seleccionar el parametro.
- Ingresar `D1` y `D2`.
- Pulsar `Calcular y Guardar`.
- Revisar el estado obtenido:
  `Conforme` o `No conforme`.

## 2. Criterio de resultado
- `Conforme`: la diferencia entre `D1` y `D2` se encuentra dentro del limite permitido.
- `No conforme`: la diferencia entre `D1` y `D2` supera el limite permitido.

## 3. Formulas utilizadas

### pH
- Formula:
  `Error absoluto = |D1 - D2|`
- Criterio:
  `Conforme` si el resultado es `<= 0.1`

### Temperatura
- Formula:
  `Error absoluto = |D1 - D2|`
- Criterio:
  `Conforme` si el resultado es `<= 0.5 C`

### CE, OD y Turbidez
- Formula:
  `RPD = (|D1 - D2| / |(D1 + D2) / 2|) * 100`
- Criterios:
  `CE <= 2%`
  `OD <= 4%`
  `Turbidez <= 10%`

## 4. Restricciones de ingreso
- `pH`: debe ser mayor a `0`.
- `CE`: no permite valores negativos.
- `OD`: no permite valores negativos.
- `Turbidez`: no permite valores negativos.
- `Temperatura`: ingreso libre.
- En calculos con `RPD`, el promedio no puede ser `0`.

## 5. Historial
- Cada calculo guardado se registra en el historial local del navegador.
- El historial no se envia a un servidor.
- Limite del historial: `1000` registros.
- Aviso preventivo desde `900` registros.
- Al llegar a `1000`, la app deja de guardar registros nuevos hasta exportar y limpiar.

## 6. Respaldo de informacion

### Descargar Excel
- Boton: `Descargar Excel (.xlsx)`
- Genera un archivo Excel real `.xlsx`.
- Contenido del archivo:
  `N`, `Parametro`, `Estado`, `D1`, `D2`, `Fecha`, `Resultado`, `Criterio`

### Copiar historial
- Boton: `Copiar Historial`
- Copia todo el historial al portapapeles en formato tabulado.
- Puede pegarse en Excel, Word, correo o mensajeria.

### Vaciar historial
- Boton: `Vaciar Historial`
- Elimina el historial guardado en el navegador.
- Usar esta accion solo despues de exportar o copiar la informacion.

## 7. Operacion offline
- La app puede funcionar sin internet si ya fue abierta al menos una vez con conexion.
- En la primera apertura con internet, el navegador guarda los archivos necesarios.
- Si se publica una nueva version, el usuario debe abrir la app con internet para recibir la actualizacion.
- Una primera apertura totalmente offline no tendra archivos cacheados.

## 8. Actualizacion de la app con Vercel por consola

### Requisitos previos
- Tener `Node.js` instalado.
- Tener acceso al proyecto en Vercel.
- Tener la carpeta local del proyecto.

### Instalacion de Vercel CLI
Ejecutar en `CMD`:

```powershell
npm i -g vercel
```

### Inicio de sesion
Ejecutar en `CMD`:

```powershell
vercel login
```

Seguir las instrucciones de inicio de sesion.

### Vinculacion inicial del proyecto
Este paso se realiza una sola vez en la carpeta del proyecto, si la carpeta aun no esta vinculada.

Ubicarse en la carpeta del proyecto y ejecutar:

```powershell
vercel
```

La consola solicitara datos de vinculacion del proyecto.
Al finalizar, se creara la carpeta `.vercel` en el proyecto.

### Publicacion cuando se requiera un cambio
1. Guardar los cambios en los archivos del proyecto.
2. Abrir `CMD` dentro de la carpeta del proyecto.
3. Ejecutar:

```powershell
vercel --prod
```

### Resultado esperado
- Vercel genera un nuevo despliegue.
- La consola devuelve la URL del despliegue.
- La version publicada queda disponible en produccion.
- Para que el usuario reciba la nueva version offline, debe abrir la app con internet al menos una vez despues del despliegue.

## 9. Archivos principales
- `index.html`
  Estructura de la interfaz.

- `style.css`
  Diseno visual y distribucion.

- `app.js`
  Validaciones, calculos, historial, exportacion y copia.

- `sw.js`
  Funcionamiento offline y actualizacion de cache.
