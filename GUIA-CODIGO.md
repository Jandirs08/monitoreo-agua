# Guía de código — `app.js`

Cómo leer esto: seguimos **el flujo del botón "Calcular y guardar"** de principio a fin, en orden. Cada bloque es código real con **comentarios `//` explicando cada método y cada línea**. Cuando una línea llama a otra función, bajamos a esa función y seguimos. Así no te pierdes.

> Contexto: vanilla JS, sin librerías. Los datos se guardan en `localStorage`. Todo corre dentro de un `DOMContentLoaded`.

---

# EL FLUJO DEL SUBMIT, PASO A PASO

## Paso 0 — El usuario llena el form y da clic

El navegador dispara el evento `submit`. Este listener lo atrapa:

```js
form.addEventListener("submit", (event) => {
  // preventDefault() = NO recargar la página (comportamiento normal de un <form>).
  event.preventDefault();

  // PASO 1: validar. validateForm() devuelve "" si todo bien, o el texto del error.
  const validationMessage = validateForm();
  if (validationMessage) {
    showToast(validationMessage, "error");          // muestra globito rojo
    const firstError = form.querySelector(".input-error");  // busca el campo marcado en rojo
    if (firstError) firstError.focus();             // pone el cursor ahí
    return;                                         // y CORTA todo aquí
  }

  // PASO 2: leer los valores del formulario.
  const param = selectParam.value;                  // ej. "Turbidez"
  const d1 = parseDecimal(inputD1.value);           // texto "5,63" -> número 5.63
  const d2 = parseDecimal(inputD2.value);
  const punto = inputPunto.value.trim();            // .trim() = quita espacios sobrantes

  // PASO 3: calcular conforme / no conforme.
  const calculation = calculateResult(param, d1, d2);
  if (calculation.error) {                          // si el cálculo devolvió un error...
    showToast(calculation.error, "error");
    return;                                         // ...corta
  }
  // ... (sigue en el Paso 5 más abajo)
```

Tres cosas pasan aquí: **validar (Paso 1)**, **leer (Paso 2)**, **calcular (Paso 3)**. Veamos cada una.

---

## Paso 1 — `validateForm()` revisa los campos

```js
function validateForm() {
  clearValidation();                                // quita los bordes rojos de un intento anterior

  // ¿Eligió un parámetro? selectParam.value es "" si no eligió nada.
  if (!selectParam.value) {
    selectParam.classList.add("input-error");       // pinta el <select> de rojo
    return "Selecciona un parametro";               // devuelve el error -> corta el submit
  }

  // Valida D1 y D2 por separado. Devuelve "" si OK, o el texto del error.
  const d1Message = validateMeasurementField(inputD1, selectParam.value, "D1");
  const d2Message = validateMeasurementField(inputD2, selectParam.value, "D2");

  if (d1Message) {
    inputD1.classList.add("input-error");           // marca D1 en rojo
    return d1Message;
  }
  if (d2Message) {
    inputD2.classList.add("input-error");           // marca D2 en rojo
    return d2Message;
  }

  return "";                                         // "" = todo bien, sigue el submit
}
```

Y `validateMeasurementField` (revisa UN campo):

```js
function validateMeasurementField(input, param, fieldLabel) {
  const trimmed = input.value.trim();               // quita espacios
  if (!trimmed) {
    return fieldLabel + " es obligatorio";          // está vacío
  }

  const value = parseDecimal(trimmed);              // intenta convertir a número
  if (Number.isNaN(value)) {                        // Number.isNaN = ¿quedó "no es número"?
    return fieldLabel + " debe ser un numero valido";
  }

  const config = PARAM_CONFIG[param];               // trae la config del parámetro (ver abajo)
  if (!config) {
    return "Selecciona un parametro";
  }

  // Cada parámetro trae SU propia regla. Ej. pH exige > 0. Devuelve "" si pasa.
  return config.validate(value);
}
```

---

## Paso 2 — `parseDecimal()` convierte texto a número

El usuario puede escribir `"5,63"` (con coma). Hay que pasarlo a `5.63`:

```js
function parseDecimal(value) {
  // Primero: ¿es un decimal válido? Si no, devolvemos NaN.
  if (!isValidDecimalInput(value)) {
    return Number.NaN;
  }
  // normalizeDecimalString cambia coma por punto; Number() convierte a número real.
  return Number(normalizeDecimalString(value));
}

function isValidDecimalInput(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  // Regex que acepta: 5 / 5.2 / 5,2 / .5 / -3   (un signo opcional, un separador opcional)
  return /^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(trimmed);
}

function normalizeDecimalString(value) {
  // .replace(",", ".") -> Number() solo entiende punto, no coma.
  return String(value).trim().replace(",", ".");
}
```

---

## Paso 3 — `calculateResult()` decide CONFORME o NO CONFORME

Esta es la lógica de negocio. Pero primero hay que entender `PARAM_CONFIG`, de donde saca TODO.

### La tabla de reglas `PARAM_CONFIG` (cerca del inicio del archivo)

Cada parámetro guarda sus reglas como datos (no como `if` regados por el código):

```js
const PARAM_CONFIG = {
  pH: {
    tableLabel: "pH",                               // cómo se ve en la tabla
    mode: "absolute",                               // tipo de cálculo: diferencia absoluta
    limit: 0.1,                                     // umbral: conforme si <= 0.1
    criterionText: "Limite: +/- 0.1",              // texto que se muestra
    formatValueText: (value) => "Error absoluto: " + value.toFixed(2),  // cómo mostrar el número
    validate: createGreaterThanValidator(0, "El pH debe ser mayor a 0."),  // regla de entrada
  },
  Turbidez: {
    tableLabel: "Turb.",
    mode: "rpd",                                    // tipo de cálculo: % de diferencia (RPD)
    limit: 10,                                      // conforme si RPD <= 10%
    criterionText: "Limite: <= 10% RPD",
    formatValueText: (value) => "RPD: " + value.toFixed(2) + "%",
    validate: createMinimumValidator(0, "La turbidez no puede ser negativa."),
  },
  // ... CE, OD, T (Temperatura) igual, cada uno con su mode/limit
};
```

Hay **dos modos de cálculo**:
- `"absolute"` → diferencia directa `|d1 - d2|`  (pH, Temperatura)
- `"rpd"` → diferencia porcentual `|d1-d2| / promedio × 100`  (CE, OD, Turbidez)

Las `validate` se crean con dos fábricas (devuelven una función):

```js
// "mayor que": value > min ? OK : error.  (ej. pH > 0)
function createGreaterThanValidator(minExclusive, message) {
  return (value) => (value > minExclusive ? "" : message);
}
// "mínimo": value >= min ? OK : error.  (ej. turbidez >= 0)
function createMinimumValidator(min, message) {
  return (value) => (value >= min ? "" : message);
}
```

### Ahora sí, `calculateResult()`

```js
function calculateResult(param, d1, d2) {
  const config = PARAM_CONFIG[param];               // trae las reglas del parámetro
  if (!config) {
    return { error: "Selecciona un parametro valido" };
  }

  let d1Calc = d1;                                  // valores con los que se va a calcular
  let d2Calc = d2;
  let d1Rounded = null;                             // valores redondeados (solo turbidez)
  let d2Rounded = null;

  // === CASO ESPECIAL: TURBIDEZ ===
  // Antes de calcular, se redondea cada dato (como hace el turbidímetro real).
  if (param === "Turbidez") {
    d1Rounded = roundTurbidityValue(d1);            // 5.63 -> 5.6
    d2Rounded = roundTurbidityValue(d2);
    d1Calc = d1Rounded;                             // y se calcula con el redondeado
    d2Calc = d2Rounded;
  }

  // === MODO ABSOLUTO (pH, Temperatura) ===
  if (config.mode === "absolute") {
    const value = Math.abs(d1Calc - d2Calc);        // Math.abs = valor sin signo (diferencia)
    return {
      value,                                        // el número calculado
      conforme: value <= config.limit,              // ¿está dentro del límite?
      valueText: config.formatValueText(value),     // ej. "Error absoluto: 0.05"
      criterionText: config.criterionText,          // ej. "Limite: +/- 0.1"
      d1Rounded,                                     // null si no es turbidez
      d2Rounded,
    };
  }

  // === MODO RPD (CE, OD, Turbidez) ===
  const promedio = (d1Calc + d2Calc) / 2;
  const base = Math.abs(promedio);
  if (base === 0) {                                 // no se puede dividir entre 0
    return { error: "El promedio no puede ser cero" };
  }
  const value = (Math.abs(d1Calc - d2Calc) / base) * 100;  // fórmula RPD en %
  return {
    value,
    conforme: value <= config.limit,                // ej. conforme si RPD <= 10%
    valueText: config.formatValueText(value),       // ej. "RPD: 8.42%"
    criterionText: config.criterionText,
    d1Rounded,
    d2Rounded,
  };
}
```

### El redondeo de turbidez (las dos funciones que llama)

```js
// Elige el múltiplo de redondeo según el tamaño del valor.
function roundTurbidityValue(value) {
  if (value <= 1)    return roundToNearestMultiple(value, 0.05);
  if (value <= 10)   return roundToNearestMultiple(value, 0.1);
  if (value <= 40)   return roundToNearestMultiple(value, 1);
  if (value <= 100)  return roundToNearestMultiple(value, 5);
  if (value <= 400)  return roundToNearestMultiple(value, 10);
  if (value <= 1000) return roundToNearestMultiple(value, 50);
  return roundToNearestMultiple(value, 100);
}

// Redondea el valor al número permitido más cercano.
function roundToNearestMultiple(value, multiple) {
  if (multiple === 0) return value;

  // "multiple" significa de cuánto en cuánto se permite redondear.
  // Si multiple = 0.1, se permite 5.5, 5.6, 5.7, 5.8...
  // Si multiple = 5, se permite 50, 55, 60, 65...

  // Ejemplo completo: value = 5.63 y multiple = 0.1

  // 1) Divide para mover el decimal y poder redondear fácil.
  //    5.63 / 0.1 = 56.3
  const quotient = value / multiple;

  // 2) Calcula cuántos "saltos" completos quedan.
  //    Con quotient = 56.3:
  //    Math.sign(56.3) = 1       porque el número es positivo
  //    Math.abs(56.3) = 56.3     quita el signo; aquí queda igual
  //    Math.round(56.3) = 56     redondea al entero más cercano
  //    steps = 1 * 56 = 56
  //
  //    Entonces, para este ejemplo, steps vale 56.
  //
  //    Si value fuera 5.67:
  //    5.67 / 0.1 = 56.7
  //    Math.round(56.7) = 57
  //    steps valdría 57.
  const steps = Math.sign(quotient) * Math.round(Math.abs(quotient));

  // 3) Multiplica para regresar al número normal.
  //    En el ejemplo:
  //    steps * multiple = 56 * 0.1 = 5.6
  //
  //    Resultado final: 5.63 se redondea a 5.6.
  //
  //    toFixed(10) limpia basura de coma flotante:
  //    56 * 0.1 puede dar 5.6000000000000005, y lo deja como 5.6.
  return Number((steps * multiple).toFixed(10));
}
```

> Ejemplo turbidez: usuario escribe `5.63`. → `roundTurbidityValue(5.63)` cae en `<= 10` → `roundToNearestMultiple(5.63, 0.1)` → **5.6**. Se calcula el RPD con 5.6, y en la tabla se ve `5.6 (5.63)`.

Más simple:

- Si escribes `5.63`, como está entre `1` y `10`, el sistema redondea de `0.1` en `0.1`: `5.5`, `5.6`, `5.7`, `5.8`...
  - `5.63` está más cerca de `5.6` que de `5.7`.
  - Resultado: `5.6`.
- Si escribes `5.67`, también redondea de `0.1` en `0.1`.
  - `5.67` está más cerca de `5.7` que de `5.6`.
  - Resultado: `5.7`.
- Si escribes `58`, como está entre `40` y `100`, el sistema redondea de `5` en `5`: `50`, `55`, `60`, `65`...
  - `58` está más cerca de `60` que de `55`.
  - Resultado: `60`.
- Si escribes `56`, también redondea de `5` en `5`.
  - `56` está más cerca de `55` que de `60`.
  - Resultado: `55`.

O sea: **no redondea siempre a 1 decimal**. Primero mira qué tan grande es la turbidez y según eso decide si debe redondear de `0.05`, `0.1`, `1`, `5`, `10`, `50` o `100` en `100`.

---

## Paso 4 — Pintar el resultado en pantalla

Volvemos al submit. Ya tenemos `calculation`. Se muestra la cajita de resultado:

```js
  resBox.classList.remove("hidden");                // muestra la caja de resultado
  // Clase verde (res-c) si conforme, roja (res-nc) si no.
  resBox.className = "result-box " + (calculation.conforme ? "res-c" : "res-nc");
  resIcon.textContent = calculation.conforme ? "OK" : "X";
  resTitle.textContent = calculation.conforme ? "CONFORME" : "NO CONFORME";
  // ej: "RPD: 8.42% | Limite: <= 10% RPD"
  resDetails.textContent = calculation.valueText + " | " + calculation.criterionText;
```

---

## Paso 5 — Armar el registro que se va a guardar

```js
  const now = new Date();                           // fecha/hora actual
  const registro = {
    // id único = timestamp en base36 + 4 letras al azar. Sin librería de UUID.
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...buildDatePayload(now),                        // mete fecha, fechaKey y createdAt (ver abajo)
    param,                                           // "Turbidez"
    punto: punto || null,                            // punto opcional; null si vacío
    d1,                                              // dato crudo
    d2,
    d1Redondeado: calculation.d1Rounded,             // redondeado (null si no es turbidez)
    d2Redondeado: calculation.d2Rounded,
    res: calculation.conforme ? "C" : "NC",          // "C" conforme / "NC" no conforme
    valor: calculation.value.toFixed(2),             // el número como texto, 2 decimales
  };
```

`buildDatePayload` crea las 3 formas de fecha:

```js
function buildDatePayload(date) {
  return {
    fecha: DISPLAY_DATE_FORMATTER.format(date),     // texto bonito "12/06/26 14:30" (Intl)
    fechaKey: formatDateKey(date),                  // "2026-06-12" para filtrar/ordenar
    createdAt: date.toISOString(),                  // fecha estándar ISO (respaldo)
  };
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");  // +1 porque enero=0; padStart pone el "0"
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;            // "2026-06-12"
}
```

---

## Paso 6 — Guardar y repintar la tabla

```js
  const hist = getHistorial();                       // lee TODOS los registros guardados

  // Tope de capacidad: máximo 1000 registros.
  if (hist.length >= MAX_RECORDS) {
    updateStorageNotice(hist.length);
    showToast("Historial lleno (" + MAX_RECORDS + ")...", "error");
    return;                                          // no guarda más
  }

  hist.unshift(registro);                            // .unshift = mete al INICIO (más reciente arriba)

  if (!saveHistorial(hist)) {                        // guarda; si falla (false), corta
    return;
  }

  currentPage = 1;                                   // vuelve a la primera página
  cargarTabla();                                     // repinta la tabla con el nuevo registro

  // Aviso al llegar al 90% de capacidad.
  if (hist.length === STORAGE_WARNING_COUNT) {
    showToast("Historial al 90%...", "info");
  }

  inputD1.value = "";                                // limpia los inputs
  inputD2.value = "";
  if (!isCoarsePointer) {                            // si NO es pantalla táctil...
    inputD1.focus();                                 // ...vuelve a enfocar D1 (comodidad en PC)
  }
});  // <- fin del listener del submit
```

`saveHistorial` (escribe en localStorage):

```js
function saveHistorial(data, { silent = false } = {}) {
  // Antes de guardar, limpia: normaliza cada registro y descarta los corruptos.
  const sanitized = Array.isArray(data)
    ? data.map((record) => normalizeRecord(record)).filter((record) => isPersistableRecord(record))
    : [];

  try {
    // JSON.stringify convierte el array a texto; localStorage solo guarda texto.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return true;                                     // guardó bien
  } catch (error) {
    console.error("No se pudo guardar el historial", error);
    if (!silent) {
      // isQuotaExceededError = ¿se llenó el almacenamiento del navegador?
      const message = isQuotaExceededError(error)
        ? "Se lleno el almacenamiento local. Exporta el Excel..."
        : "No se pudo guardar el historial";
      showToast(message, "error");
    }
    return false;                                    // falló
  }
}
```

`cargarTabla` (lee de nuevo y repinta — la función central del render):

```js
function cargarTabla() {
  const hist = getHistorial();                       // SIEMPRE re-lee de localStorage
  const filtered = applyFilters(hist);               // aplica filtro de fecha/estado si hay
  const totalPages = getTotalPages(filtered.length);

  // Ajusta la página actual para que no se salga de rango.
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  updateFilterSummary(filtered.length, hist.length);
  updateStorageNotice(hist.length);

  if (hist.length === 0) { /* muestra "No hay registros aun" y oculta tabla */ return; }
  if (filtered.length === 0) { /* muestra "No hay coincidencias" */ return; }

  // Corta solo la página actual.
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, filtered.length);
  const pageItems = filtered.slice(start, end);      // .slice = recorta el trozo de esta página

  // DocumentFragment = contenedor en memoria (fuera del DOM). Se arman todas las filas aquí...
  const fragment = document.createDocumentFragment();
  pageItems.forEach((record, index) => {
    const row = document.createElement("tr");
    row.setAttribute("data-id", record.id);          // guarda el id en la fila (para borrar luego)
    row.innerHTML = buildRowMarkup(record, start + index + 1);  // genera el HTML de la fila
    fragment.appendChild(row);
  });

  // ...y se insertan TODAS de golpe. Un solo repintado = más rápido.
  tbody.replaceChildren(fragment);
  updatePaginationState(filtered.length);            // actualiza botones "anterior/siguiente"
}
```

---

# FIN DEL FLUJO. Resumen en una línea

```
clic Calcular
  -> validateForm()        valida campos (usa validateMeasurementField + parseDecimal)
  -> parseDecimal()        "5,63" -> 5.63
  -> calculateResult()     decide CONFORME/NO CONFORME
       -> roundTurbidityValue() -> roundToNearestMultiple()   (solo si es Turbidez)
  -> (pinta la caja de resultado verde/roja)
  -> arma el objeto "registro" (con buildDatePayload)
  -> hist.unshift(registro)  mete arriba del todo
  -> saveHistorial()       escribe en localStorage
  -> cargarTabla()         re-lee y repinta la tabla (usa buildRowMarkup)
```

---

# OTROS FLUJOS (resumidos)

- **Eliminar una fila:** clic en papelera → un solo listener en `<tbody>` detecta el botón con `event.target.closest(".btn-delete-row")` → añade clase de animación → al terminar (`animationend`) llama `deleteRecord(id)` → este filtra por id, `saveHistorial`, `cargarTabla`.
- **Vaciar todo:** clic → `openModal()` (abre el diálogo de confirmación con foco atrapado) → confirmar → `localStorage.removeItem(...)` → `cargarTabla`.
- **Filtrar:** cambiar fecha o estado → `applyFilterChange()` (compara firma para no repintar de gusto) → `cargarTabla` (que aplica `applyFilters`).
- **Exportar Excel:** clic → `buildExportRows()` arma las filas → `createXlsxBlob()` genera los 8 XML del .xlsx → `createZipBlob()` los empaqueta en ZIP a mano (con `crc32`) → `downloadBlob()` dispara la descarga.
- **Copiar:** clic → `buildClipboardText()` (texto separado por tabs, pegable en Excel) → `copyTextToClipboard()` (usa `navigator.clipboard`, o `<textarea>` + `execCommand` como respaldo).

> Si quieres que cualquiera de estos "otros flujos" lo expanda con el mismo detalle (código + comentarios paso a paso), dime cuál.
