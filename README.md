# Guia de Uso y Cambios

## Que hace el usuario
- Selecciona el parametro.
- Ingresa `D1` y `D2`.
- Pulsa `Calcular y Guardar`.
- Revisa si el resultado sale `Conforme` o `No conforme`.
- Si necesita respaldo, usa `Descargar Excel (.xlsx)` o `Copiar Historial`.

## Que significa el resultado
- `Conforme`: la diferencia entre `D1` y `D2` esta dentro del limite permitido.
- `No conforme`: la diferencia supera el limite permitido.

## Formulas que usa la app
- `pH`
  `Error absoluto = |D1 - D2|`
  Sale `Conforme` si el resultado es `<= 0.1`

- `Temperatura`
  `Error absoluto = |D1 - D2|`
  Sale `Conforme` si el resultado es `<= 0.5 C`

- `CE`, `OD`, `Turbidez`
  `RPD = (|D1 - D2| / |(D1 + D2) / 2|) * 100`

  Limites:
  `CE <= 2%`
  `OD <= 4%`
  `Turbidez <= 10%`

## Validaciones que ahora tiene
- `pH`: debe ser mayor a `0`.
- `CE`: no permite valores negativos.
- `OD`: no permite valores negativos.
- `Turbidez`: no permite valores negativos.
- `Temperatura`: se deja libre.
- En calculos con `RPD`, el promedio no puede ser `0`.

## Cambios importantes hechos en la app

### 1. Se corrigio la validacion de datos
Antes se podian ingresar valores negativos en parametros donde no correspondia.
Eso podia generar resultados enganosos.

Ahora:
- `CE`, `OD` y `Turbidez` bloquean valores negativos.
- `pH` solo exige que sea mayor a `0`.
- Si el dato no corresponde, la app lo avisa antes de guardar.

### 2. La app offline ahora se actualiza mejor
La app usa cache para poder funcionar sin internet.

Ahora:
- cuando se publica una nueva version, el navegador puede tomarla mejor
- si el usuario abre la app con internet, esa version nueva se actualiza
- despues puede volver a usarla offline con esa version ya cacheada

Importante:
- si alguien entra por primera vez totalmente sin internet, no tendra la app cargada todavia
- primero debe abrirla una vez con internet

### 3. El historial ahora tiene limite controlado
El historial se guarda en el navegador del equipo.
No se envia a un servidor.

Ahora:
- el limite es de `1000` registros
- desde `900` registros aparece un aviso preventivo
- cuando llega a `1000`, la app ya no guarda mas hasta que se exporte y se limpie

Esto evita que el navegador falle de forma silenciosa por falta de espacio.

### 4. La descarga ya sale en Excel real
Antes se descargaba como `.xls`.
Ahora se descarga como `.xlsx`.

El archivo incluye:
- `N`
- `Parametro`
- `Estado`
- `D1`
- `D2`
- `Fecha`
- `Resultado`
- `Criterio`

Ademas:
- el encabezado sale mas ordenado
- los estados salen mas claros
- el archivo abre mejor en Excel

### 5. Se agrego el boton `Copiar Historial`
Este boton copia todo el historial al portapapeles.

Sirve para:
- pegarlo en Excel
- pegarlo en un correo
- pegarlo en Word o en un chat

## Botones principales
- `Calcular y Guardar`
  Calcula el resultado y guarda el registro en el historial.

- `Limpiar`
  Limpia el formulario actual.

- `Descargar Excel (.xlsx)`
  Descarga todo el historial en un archivo Excel.

- `Copiar Historial`
  Copia todo el historial al portapapeles.

- `Vaciar Historial`
  Elimina todo el historial guardado en el navegador.
  Conviene usarlo solo despues de exportar o copiar la informacion.

## Como se guardan los datos
- Los datos se guardan en el navegador del equipo.
- Si se borra el almacenamiento del navegador, el historial tambien se puede perder.
- Si se cambia de equipo o de navegador, ese historial no viaja automaticamente.

## Como subir cambios para que Vercel publique la nueva version
Esto aplica si el proyecto ya esta conectado a Vercel y el repositorio remoto ya existe.
En ese caso no hace falta entrar a GitHub cada vez.
Basta con hacer `push` desde `CMD`.

### Flujo normal
1. Abrir `CMD` dentro de la carpeta del proyecto.
2. Revisar cambios:
   `git status`
3. Agregar los cambios:
   `git add .`
4. Crear el commit:
   `git commit -m "ajuste de la app"`
5. Subir los cambios:
   `git push origin master`

Si el proyecto usa otra rama principal, cambiar `master` por `main` o por la rama que corresponda.

### Si el push no deja avanzar
Primero traer los cambios mas recientes:
`git pull --ff-only origin master`

Despues volver a intentar:
`git push origin master`

### Que pasa despues del push
- Vercel detecta el cambio
- genera un nuevo despliegue
- la URL publica queda actualizada
- cuando el usuario vuelva a abrir la app con internet, podra recibir la version nueva

## Archivos principales del proyecto
- `index.html`
  Estructura de la pantalla.

- `style.css`
  Colores, tamanos, distribucion y comportamiento visual.

- `app.js`
  Calculos, validaciones, historial, exportacion y copia.

- `sw.js`
  Funcionamiento offline y actualizacion del cache.
