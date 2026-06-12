# Manual de Operacion

## 1. Uso general
- Ingresar el `Punto` (codificacion o nombre). Campo opcional: puede dejarse vacio sin bloquear el calculo.
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

### Turbidez: redondeo previo segun norma

En `Turbidez` el equipo entrega un dato bruto con muchos decimales (ejemplo `5.56`). La norma exige reportar el valor redondeado segun el rango en que cae la lectura. Por eso, antes de calcular el `RPD`, la app redondea automaticamente cada dato (`D1` y `D2`) y recien con esos valores redondeados aplica la formula de error.

**Tabla de redondeo (por rango de lectura):**

| Rango de lectura (NTU) | Redondear al multiplo de |
|------------------------|--------------------------|
| `0 - 1.0`              | `0.05`                   |
| `1 - 10`               | `0.1`                    |
| `10 - 40`              | `1`                      |
| `40 - 100`             | `5`                      |
| `100 - 400`            | `10`                     |
| `400 - 1000`           | `50`                     |
| `> 1000`               | `100`                    |

**Flujo del calculo:**
1. Se ingresa el dato bruto del equipo (ejemplo `5.56`).
2. La app lo redondea segun su rango (`5.56` cae en `1 - 10`, multiplo `0.1`, da `5.6`).
3. El `RPD` se calcula con los valores ya redondeados (`5.6`), nunca con los brutos.
4. En el historial cada dato se muestra como `redondeado (bruto)`, ejemplo `5.6 (5.56)`.

**Ejemplos:**

| Dato bruto | Rango   | Redondeado |
|------------|---------|------------|
| `5.56`     | `1-10`  | `5.6`      |
| `8.53`     | `1-10`  | `8.5`      |
| `0.523`    | `0-1`   | `0.5`      |
| `37.6`     | `10-40` | `38`       |
| `88`       | `40-100`| `90`       |

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
  `N`, `Punto`, `Parametro`, `Estado`, `D1`, `D2`, `Fecha`, `Resultado`, `Criterio`

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

## 8. Publicacion con Vercel por consola

### Requisitos previos
- Tener `Node.js` instalado.
- Tener una cuenta en Vercel.
- Tener la carpeta local del proyecto con todos los archivos entregados.

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

### Primer despliegue
Este procedimiento aplica cuando se recibe la carpeta del proyecto por primera vez.

1. Copiar la carpeta del proyecto en el equipo.
2. Abrir `CMD` dentro de la carpeta del proyecto.
3. Ejecutar:

```powershell
vercel
```

4. Responder las preguntas de la consola.
   La vinculacion inicial puede solicitar:
   - confirmar que se desea desplegar esa carpeta
   - seleccionar la cuenta
   - indicar el nombre del proyecto
   - confirmar la carpeta actual del proyecto
5. Al finalizar, la consola devolvera una URL de despliegue.
6. Para publicar directamente en produccion, ejecutar despues:

```powershell
vercel --prod
```

7. En la primera configuracion se creara la carpeta `.vercel` dentro del proyecto.

### Publicacion posterior
Este procedimiento aplica cuando el proyecto ya fue vinculado antes en esa misma carpeta.

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
