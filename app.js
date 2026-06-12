document.addEventListener("DOMContentLoaded", () => {
  let currentPage = 1;
  let pageSize = parseInt(document.getElementById("pageSize").value, 10) || 10;
  let statusFilter = "";
  let lastFilterSignature = "";

  const form = document.getElementById("qaqcForm");
  const resBox = document.getElementById("resultadoBox");
  const resIcon = document.getElementById("resIcon");
  const resTitle = document.getElementById("resTitle");
  const resDetails = document.getElementById("resDetails");
  const tbody = document.getElementById("tablaBody");
  const emptyState = document.getElementById("emptyState");
  const emptyTitle = document.getElementById("emptyTitle");
  const emptySub = document.getElementById("emptySub");
  const tableEl = document.querySelector(".table-wrapper table");
  const pageSizeSelect = document.getElementById("pageSize");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnExcel = document.getElementById("btnExcel");
  const btnCopiar = document.getElementById("btnCopiar");
  const btnBorrar = document.getElementById("btnBorrar");
  const pageInfo = document.getElementById("pageInfo");
  const paginacionDiv = document.getElementById("paginacion");
  const btnLimpiar = document.getElementById("btnLimpiar");
  const inputPunto = document.getElementById("punto");
  const inputD1 = document.getElementById("dato1");
  const inputD2 = document.getElementById("dato2");
  const selectParam = document.getElementById("parametro");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalCancel = document.getElementById("modalCancel");
  const modalConfirm = document.getElementById("modalConfirm");
  const filterFecha = document.getElementById("filterFecha");
  const filterEstadoButtons = Array.from(document.querySelectorAll("[data-filter-estado]"));
  const btnClearFilters = document.getElementById("btnClearFilters");
  const filterSummary = document.getElementById("filterSummary");
  const toastContainer = document.getElementById("toastContainer");
  const storageNotice = document.getElementById("storageNotice");
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  const STORAGE_KEY = "qaqc_modern";
  const MAX_RECORDS = 1000;
  const STORAGE_WARNING_COUNT = Math.ceil(MAX_RECORDS * 0.9);
  const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const FILTER_DATE_FORMATTER = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const TEXT_ENCODER = new TextEncoder();
  const ZIP_CRC_TABLE = createCrc32Table();
  const PARAM_CONFIG = {
    pH: {
      tableLabel: "pH",
      mode: "absolute",
      limit: 0.1,
      criterionText: "Limite: +/- 0.1",
      formatValueText: (value) => "Error absoluto: " + value.toFixed(2),
      validate: createGreaterThanValidator(0, "El pH debe ser mayor a 0."),
    },
    CE: {
      tableLabel: "CE",
      mode: "rpd",
      limit: 2,
      criterionText: "Limite: <= 2% RPD",
      formatValueText: (value) => "RPD: " + value.toFixed(2) + "%",
      validate: createMinimumValidator(0, "La CE no puede ser negativa."),
    },
    OD: {
      tableLabel: "OD",
      mode: "rpd",
      limit: 4,
      criterionText: "Limite: <= 4% RPD",
      formatValueText: (value) => "RPD: " + value.toFixed(2) + "%",
      validate: createMinimumValidator(0, "El OD no puede ser negativo."),
    },
    T: {
      tableLabel: "Temp.",
      mode: "absolute",
      limit: 0.5,
      criterionText: "Limite: <= 0.5 C",
      formatValueText: (value) => "Error absoluto: " + value.toFixed(2) + " C",
      validate: () => "",
    },
    Turbidez: {
      tableLabel: "Turb.",
      mode: "rpd",
      limit: 10,
      criterionText: "Limite: <= 10% RPD",
      formatValueText: (value) => "RPD: " + value.toFixed(2) + "%",
      validate: createMinimumValidator(0, "La turbidez no puede ser negativa."),
    },
  };

  hydrateHistorial();
  initializeFilterControls();
  syncDecimalInput(inputD1);
  syncDecimalInput(inputD2);
  cargarTabla();
  registerServiceWorker();

  const handleFilterFechaChange = () => {
    applyFilterChange();
  };

  filterFecha.addEventListener("input", handleFilterFechaChange);
  filterFecha.addEventListener("change", handleFilterFechaChange);

  filterEstadoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextValue = button.dataset.filterEstado || "";
      if (statusFilter === nextValue) return;

      statusFilter = nextValue;
      syncSegmentedState(filterEstadoButtons, statusFilter, "filterEstado");
      applyFilterChange();
    });
  });

  btnClearFilters.addEventListener("click", () => {
    if (!filterFecha.value && !statusFilter) return;
    filterFecha.value = "";
    statusFilter = "";
    syncSegmentedState(filterEstadoButtons, statusFilter, "filterEstado");
    applyFilterChange();
  });

  inputD1.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      inputD2.focus();
    }
  });

  inputD2.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  [selectParam, inputD1, inputD2].forEach((element) => {
    element.addEventListener("input", () => {
      element.classList.remove("input-error");
    });
    element.addEventListener("change", () => {
      element.classList.remove("input-error");
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      showToast(validationMessage, "error");
      const firstError = form.querySelector(".input-error");
      if (firstError) firstError.focus();
      return;
    }

    const param = selectParam.value;
    const d1 = parseDecimal(inputD1.value);
    const d2 = parseDecimal(inputD2.value);
    const punto = inputPunto.value.trim();
    const calculation = calculateResult(param, d1, d2);
    if (calculation.error) {
      showToast(calculation.error, "error");
      return;
    }

    resBox.classList.remove("hidden");
    resBox.className = "result-box " + (calculation.conforme ? "res-c" : "res-nc");
    resIcon.textContent = calculation.conforme ? "OK" : "X";
    resTitle.textContent = calculation.conforme ? "CONFORME" : "NO CONFORME";
    resDetails.textContent = calculation.valueText + " | " + calculation.criterionText;

    const now = new Date();
    const registro = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...buildDatePayload(now),
      param,
      punto: punto || null,
      d1,
      d2,
      d1Redondeado: calculation.d1Rounded,
      d2Redondeado: calculation.d2Rounded,
      res: calculation.conforme ? "C" : "NC",
      valor: calculation.value.toFixed(2),
    };

    const hist = getHistorial();
    if (hist.length >= MAX_RECORDS) {
      updateStorageNotice(hist.length);
      showToast(
        "Historial lleno (" + MAX_RECORDS + "). Exporta el Excel y vacia registros antiguos para seguir guardando.",
        "error"
      );
      return;
    }

    hist.unshift(registro);
    if (!saveHistorial(hist)) {
      return;
    }

    currentPage = 1;
    cargarTabla();
    if (hist.length === STORAGE_WARNING_COUNT) {
      showToast(
        "Historial al 90% de capacidad. Exporta el Excel y elimina registros antiguos pronto.",
        "info"
      );
    }

    inputD1.value = "";
    inputD2.value = "";
    if (!isCoarsePointer) {
      inputD1.focus();
    }
  });

  btnLimpiar.addEventListener("click", () => {
    resBox.classList.add("hidden");
    clearValidation();
    inputPunto.value = "";
  });

  pageSizeSelect.addEventListener("change", () => {
    const nextPageSize = parseInt(pageSizeSelect.value, 10);
    if (!nextPageSize || nextPageSize === pageSize) return;

    pageSize = nextPageSize;
    currentPage = 1;
    cargarTabla();
  });

  btnPrev.addEventListener("click", () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    cargarTabla();
  });

  btnNext.addEventListener("click", () => {
    const totalPages = getTotalPages(applyFilters(getHistorial()).length);
    if (currentPage >= totalPages) return;
    currentPage += 1;
    cargarTabla();
  });

  tbody.addEventListener("click", (event) => {
    const btn = event.target.closest(".btn-delete-row");
    if (!btn) return;

    const row = btn.closest("tr");
    if (!row) return;

    const id = row.getAttribute("data-id");
    row.classList.add("row-deleting");
    row.addEventListener(
      "animationend",
      () => {
        deleteRecord(id);
      },
      { once: true }
    );
  });

  btnBorrar.addEventListener("click", () => {
    const hist = getHistorial();
    if (hist.length === 0) {
      showToast("No hay registros que limpiar", "info");
      return;
    }
    openModal();
  });

  modalCancel.addEventListener("click", closeModal);

  modalConfirm.addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      showToast("No se pudo vaciar el historial", "error");
      return;
    }
    resBox.classList.add("hidden");
    currentPage = 1;
    cargarTabla();
    closeModal();
    showToast("Historial vaciado completamente", "success");
  });

  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) closeModal();
  });

  btnExcel.addEventListener("click", () => {
    const exportRows = buildExportRows(getHistorial());
    if (exportRows.length === 0) {
      showToast("No hay datos para exportar", "info");
      return;
    }

    const workbookBlob = createXlsxBlob(exportRows);
    downloadBlob(workbookBlob, "Monitoreo_QAQC_" + formatDateKey(new Date()) + ".xlsx");
    showToast("Excel descargado correctamente", "success");
  });

  btnCopiar.addEventListener("click", async () => {
    const exportRows = buildExportRows(getHistorial());
    if (exportRows.length === 0) {
      showToast("No hay datos para copiar", "info");
      return;
    }

    try {
      await copyTextToClipboard(buildClipboardText(exportRows));
      showToast("Historial copiado al portapapeles", "success");
    } catch {
      showToast("No se pudo copiar el historial", "error");
    }
  });

  function hydrateHistorial() {
    const hist = getHistorial();
    saveHistorial(hist, { silent: true });
  }

  function initializeFilterControls() {
    syncSegmentedState(filterEstadoButtons, statusFilter, "filterEstado");
    setupSegmentedKeyboard(filterEstadoButtons);
  }

  function parseDecimal(value) {
    if (!isValidDecimalInput(value)) {
      return Number.NaN;
    }

    return Number(normalizeDecimalString(value));
  }

  function createGreaterThanValidator(minExclusive, message) {
    return (value) => (value > minExclusive ? "" : message);
  }

  function createMinimumValidator(min, message) {
    return (value) => (value >= min ? "" : message);
  }

  function validateMeasurementField(input, param, fieldLabel) {
    const trimmed = input.value.trim();
    if (!trimmed) {
      return fieldLabel + " es obligatorio";
    }

    const value = parseDecimal(trimmed);
    if (Number.isNaN(value)) {
      return fieldLabel + " debe ser un numero valido";
    }

    const config = PARAM_CONFIG[param];
    if (!config) {
      return "Selecciona un parametro";
    }

    return config.validate(value);
  }

  function roundToNearestMultiple(value, multiple) {
    if (multiple === 0) return value;
    const quotient = value / multiple;
    // Redondeo "mitad hacia afuera de cero" (igual que REDOND.MULT de Excel).
    const steps = Math.sign(quotient) * Math.round(Math.abs(quotient));
    // Limpia error de punto flotante (ej. 56 * 0.1 = 5.6000000000000005 -> 5.6).
    return Number((steps * multiple).toFixed(10));
  }

  function roundTurbidityValue(value) {
    if (value <= 1) {
      return roundToNearestMultiple(value, 0.05);
    } else if (value <= 10) {
      return roundToNearestMultiple(value, 0.1);
    } else if (value <= 40) {
      return roundToNearestMultiple(value, 1);
    } else if (value <= 100) {
      return roundToNearestMultiple(value, 5);
    } else if (value <= 400) {
      return roundToNearestMultiple(value, 10);
    } else if (value <= 1000) {
      return roundToNearestMultiple(value, 50);
    } else {
      return roundToNearestMultiple(value, 100);
    }
  }

  function calculateResult(param, d1, d2) {
    const config = PARAM_CONFIG[param];
    if (!config) {
      return { error: "Selecciona un parametro valido" };
    }

    let d1Calc = d1;
    let d2Calc = d2;
    let d1Rounded = null;
    let d2Rounded = null;

    if (param === "Turbidez") {
      d1Rounded = roundTurbidityValue(d1);
      d2Rounded = roundTurbidityValue(d2);
      d1Calc = d1Rounded;
      d2Calc = d2Rounded;
    }

    if (config.mode === "absolute") {
      const value = Math.abs(d1Calc - d2Calc);
      return {
        value,
        conforme: value <= config.limit,
        valueText: config.formatValueText(value),
        criterionText: config.criterionText,
        d1Rounded,
        d2Rounded,
      };
    }

    const promedio = (d1Calc + d2Calc) / 2;
    const base = Math.abs(promedio);
    if (base === 0) {
      return { error: "El promedio no puede ser cero" };
    }

    const value = (Math.abs(d1Calc - d2Calc) / base) * 100;
    return {
      value,
      conforme: value <= config.limit,
      valueText: config.formatValueText(value),
      criterionText: config.criterionText,
      d1Rounded,
      d2Rounded,
    };
  }

  function buildDatePayload(date) {
    return {
      fecha: DISPLAY_DATE_FORMATTER.format(date),
      fechaKey: formatDateKey(date),
      createdAt: date.toISOString(),
    };
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function deriveDateKey(record) {
    if (record.fechaKey) return record.fechaKey;

    if (record.createdAt) {
      const createdAtDate = new Date(record.createdAt);
      if (!Number.isNaN(createdAtDate.getTime())) {
        return formatDateKey(createdAtDate);
      }
    }

    const match = /^(\d{2})\/(\d{2})\/(\d{2,4})/.exec(record.fecha || "");
    if (!match) return "";

    const year = match[3].length === 2 ? "20" + match[3] : match[3];
    return year + "-" + match[2] + "-" + match[1];
  }

  function normalizeRecord(record) {
    const safeRecord = record && typeof record === "object" ? record : {};
    const fechaKey = deriveDateKey(safeRecord);
    const createdAt =
      safeRecord.createdAt ||
      (fechaKey ? fechaKey + "T00:00:00.000Z" : "");
    const d1 = Number(safeRecord.d1);
    const d2 = Number(safeRecord.d2);
    const valor = Number(safeRecord.valor);
    const param = typeof safeRecord.param === "string" && PARAM_CONFIG[safeRecord.param] ? safeRecord.param : "";
    const punto = typeof safeRecord.punto === "string" ? safeRecord.punto : (safeRecord.punto == null ? null : "");
    const d1Redondeado = safeRecord.d1Redondeado != null ? Number(safeRecord.d1Redondeado) : null;
    const d2Redondeado = safeRecord.d2Redondeado != null ? Number(safeRecord.d2Redondeado) : null;

    return {
      ...safeRecord,
      id: typeof safeRecord.id === "string" ? safeRecord.id : "",
      fecha: safeRecord.fecha || "",
      fechaKey,
      createdAt,
      param,
      punto,
      d1,
      d2,
      d1Redondeado,
      d2Redondeado,
      res: safeRecord.res === "C" || safeRecord.res === "NC" ? safeRecord.res : "",
      valor: Number.isFinite(valor) ? valor.toFixed(2) : "",
    };
  }

  function getHistorial() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      if (!Array.isArray(stored)) return [];

      return stored.map((record) => normalizeRecord(record)).filter((record) => isPersistableRecord(record));
    } catch {
      return [];
    }
  }

  function saveHistorial(data, { silent = false } = {}) {
    const sanitized = Array.isArray(data)
      ? data.map((record) => normalizeRecord(record)).filter((record) => isPersistableRecord(record))
      : [];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      return true;
    } catch (error) {
      console.error("No se pudo guardar el historial", error);
      if (!silent) {
        const message = isQuotaExceededError(error)
          ? "Se lleno el almacenamiento local. Exporta el Excel y vacia registros antiguos."
          : "No se pudo guardar el historial";
        showToast(message, "error");
      }
      return false;
    }
  }

  function normalizeDecimalString(value) {
    return String(value).trim().replace(",", ".");
  }

  function isValidDecimalInput(value) {
    const trimmed = String(value).trim();
    if (!trimmed) return false;
    return /^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(trimmed);
  }

  function getFilterSignature() {
    return filterFecha.value + "|" + statusFilter;
  }

  function applyFilterChange() {
    const nextSignature = getFilterSignature();
    if (nextSignature === lastFilterSignature) return;

    currentPage = 1;
    cargarTabla();
  }

  function syncSegmentedState(buttons, selectedValue, type) {
    buttons.forEach((button) => {
      const buttonValue = type === "filterEstado" ? button.dataset.filterEstado || "" : "";
      const isActive = buttonValue === selectedValue;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });
  }

  function setupSegmentedKeyboard(buttons) {
    buttons.forEach((button, index) => {
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + direction + buttons.length) % buttons.length;
        const nextButton = buttons[nextIndex];

        nextButton.focus();
        nextButton.click();
      });
    });
  }

  function syncDecimalInput(input) {
    input.addEventListener("input", () => {
      const sanitized = sanitizeDecimalInput(input.value);
      if (sanitized !== input.value) {
        input.value = sanitized;
      }
    });
  }

  function sanitizeDecimalInput(value) {
    const trimmed = String(value).replace(/\s+/g, "");
    const isNegative = trimmed.startsWith("-");
    const body = trimmed.replace(/-/g, "");
    let hasSeparator = false;
    let result = "";

    for (const char of body) {
      if (/\d/.test(char)) {
        result += char;
        continue;
      }

      if ((char === "." || char === ",") && !hasSeparator) {
        hasSeparator = true;
        result += char;
      }
    }

    return (isNegative ? "-" : "") + result;
  }

  function clearValidation() {
    selectParam.classList.remove("input-error");
    inputD1.classList.remove("input-error");
    inputD2.classList.remove("input-error");
  }

  function validateForm() {
    clearValidation();

    if (!selectParam.value) {
      selectParam.classList.add("input-error");
      return "Selecciona un parametro";
    }

    const d1Message = validateMeasurementField(inputD1, selectParam.value, "D1");
    const d2Message = validateMeasurementField(inputD2, selectParam.value, "D2");

    if (d1Message) {
      inputD1.classList.add("input-error");
      return d1Message;
    }

    if (d2Message) {
      inputD2.classList.add("input-error");
      return d2Message;
    }

    return "";
  }

  function applyFilters(hist) {
    const fecha = filterFecha.value;
    const estado = statusFilter;

    return hist.filter((record) => {
      const matchFecha = !fecha || record.fechaKey === fecha;
      const matchEstado = !estado || record.res === estado;
      return matchFecha && matchEstado;
    });
  }

  function updateFilterSummary(filteredCount, totalCount) {
    const parts = [];

    if (filterFecha.value) {
      parts.push("Fecha: " + formatFilterDate(filterFecha.value));
    }

    if (statusFilter) {
      parts.push("Estado: " + (statusFilter === "C" ? "Conforme" : "No conforme"));
    }

    if (parts.length === 0) {
      filterSummary.textContent =
        totalCount > 0
          ? "Mostrando todos los registros"
          : "Sin registros guardados";
      btnClearFilters.disabled = true;
      return;
    }

    filterSummary.textContent =
      parts.join(" | ") + " | " + filteredCount + " resultado" + (filteredCount === 1 ? "" : "s");
    btnClearFilters.disabled = false;
  }

  function formatFilterDate(dateKey) {
    const date = new Date(dateKey + "T00:00:00");
    if (Number.isNaN(date.getTime())) return dateKey;
    return FILTER_DATE_FORMATTER.format(date);
  }

  function getTotalPages(totalItems) {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }

  function isPersistableRecord(record) {
    return Boolean(
      record &&
      typeof record.id === "string" &&
      record.id &&
      typeof record.param === "string" &&
      PARAM_CONFIG[record.param] &&
      Number.isFinite(record.d1) &&
      Number.isFinite(record.d2) &&
      (record.res === "C" || record.res === "NC") &&
      typeof record.valor === "string" &&
      record.fechaKey
    );
  }

  function setEmptyState(mode) {
    if (mode === "filtered") {
      emptyTitle.textContent = "No hay coincidencias";
      emptySub.textContent = "Prueba con otra fecha o estado";
      return;
    }

    emptyTitle.textContent = "No hay registros aun";
    emptySub.textContent = "Los datos calculados apareceran aqui";
  }

  function buildRowMarkup(record, index) {
    const badgeClass = record.res === "C" ? "badge badge-c" : "badge badge-nc";
    const badgeLabel = record.res === "C" ? "Conforme" : "No conforme";
    const paramLabel = formatParamLabel(record.param);

    let d1Display = record.d1;
    let d2Display = record.d2;

    if (record.param === "Turbidez") {
      if (record.d1Redondeado != null) {
        d1Display = record.d1Redondeado + ' <span class="cell-raw">(' + record.d1 + ")</span>";
      }

      if (record.d2Redondeado != null) {
        d2Display = record.d2Redondeado + ' <span class="cell-raw">(' + record.d2 + ")</span>";
      }
    }

    const puntoRaw = (record.punto || "").trim();
    const puntoCell = puntoRaw || "-";
    // Mobile sub-line: "#N · Punto" or just "#N" when there is no punto.
    const subline = puntoRaw
      ? `#${index} · <span class="card-sub-punto">${puntoRaw}</span>`
      : `#${index} <span class="card-sub-empty">· Sin punto</span>`;

    return `
      <td class="cell-num" data-label="#"><span class="cell-num-val">${index}</span><span class="card-subline" aria-hidden="true">${subline}</span></td>
      <td class="cell-punto" data-label="Punto">${puntoCell}</td>
      <td class="cell-param" data-label="Parametro" title="${record.param}">${paramLabel}</td>
      <td class="cell-estado" data-label="Estado"><span class="${badgeClass}" title="${badgeLabel}" aria-label="${badgeLabel}"><span class="badge-dot" aria-hidden="true"></span>${badgeLabel}</span></td>
      <td class="cell-data cell-d1" data-label="D1">${d1Display}</td>
      <td class="cell-data cell-d2" data-label="D2">${d2Display}</td>
      <td class="cell-fecha" data-label="Fecha">${record.fecha || "-"}</td>
      <td class="cell-actions" data-label="Accion"><button type="button" class="btn-delete-row" title="Eliminar registro ${index}" aria-label="Eliminar registro ${index}"><svg class="btn-delete-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v8H7V9Zm4 0h2v8h-2V9Zm4 0h2v8h-2V9Z" fill="currentColor"/></svg><span class="btn-delete-label">Eliminar</span></button></td>
    `;
  }

  function formatParamLabel(param) {
    return PARAM_CONFIG[param]?.tableLabel || param;
  }

  function updatePaginationState(totalItems) {
    const totalPages = getTotalPages(totalItems);

    if (totalItems > pageSize) {
      paginacionDiv.classList.remove("hidden");
      pageInfo.textContent = "Pag. " + currentPage + " de " + totalPages;
    } else {
      paginacionDiv.classList.add("hidden");
      pageInfo.textContent = "";
    }

    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
  }

  function cargarTabla() {
    const hist = getHistorial();
    const filtered = applyFilters(hist);
    const totalPages = getTotalPages(filtered.length);

    lastFilterSignature = getFilterSignature();
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    updateFilterSummary(filtered.length, hist.length);
    updateStorageNotice(hist.length);

    if (hist.length === 0) {
      tbody.replaceChildren();
      setEmptyState("empty");
      emptyState.classList.remove("hidden");
      tableEl.classList.add("hidden");
      paginacionDiv.classList.add("hidden");
      return;
    }

    if (filtered.length === 0) {
      tbody.replaceChildren();
      setEmptyState("filtered");
      emptyState.classList.remove("hidden");
      tableEl.classList.add("hidden");
      paginacionDiv.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    tableEl.classList.remove("hidden");

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filtered.length);
    const pageItems = filtered.slice(start, end);
    const fragment = document.createDocumentFragment();

    pageItems.forEach((record, index) => {
      const row = document.createElement("tr");
      row.setAttribute("data-id", record.id);
      row.setAttribute("data-res", record.res === "C" ? "C" : "NC");
      row.innerHTML = buildRowMarkup(record, start + index + 1);
      fragment.appendChild(row);
    });

    tbody.replaceChildren(fragment);
    updatePaginationState(filtered.length);
  }

  function deleteRecord(id) {
    const hist = getHistorial().filter((record) => record.id !== id);
    if (!saveHistorial(hist)) {
      cargarTabla();
      return;
    }
    cargarTabla();
    showToast("Registro eliminado", "info");
  }

  function openModal() {
    modalOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    modalCancel.focus();
    modalOverlay.addEventListener("keydown", trapFocus);
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
    document.body.style.overflow = "";
    modalOverlay.removeEventListener("keydown", trapFocus);
    btnBorrar.focus();
  }

  function trapFocus(event) {
    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = modalOverlay.querySelectorAll("button");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function buildExportRows(hist) {
    return hist.map((record, index) => {
      let d1Display = record.d1;
      let d2Display = record.d2;

      if (record.param === "Turbidez") {
        if (record.d1Redondeado != null) {
          d1Display = record.d1Redondeado + " (" + record.d1 + ")";
        }

        if (record.d2Redondeado != null) {
          d2Display = record.d2Redondeado + " (" + record.d2 + ")";
        }
      }

      return {
        number: index + 1,
        punto: record.punto || "-",
        parametro: formatParamLabel(record.param),
        estado: formatStatusLabel(record.res),
        d1: d1Display,
        d2: d2Display,
        fecha: record.fecha || "",
        resultado: formatExportResult(record),
        criterio: PARAM_CONFIG[record.param]?.criterionText || "",
        isConforme: record.res === "C",
      };
    });
  }

  function formatStatusLabel(status) {
    return status === "C" ? "Conforme" : "No conforme";
  }

  function formatExportResult(record) {
    const config = PARAM_CONFIG[record.param];
    const numericValue = Number(record.valor);
    if (!config || !Number.isFinite(numericValue)) {
      return record.valor || "";
    }

    return config.formatValueText(numericValue);
  }

  function buildClipboardText(rows) {
    const lines = [
      "Monitoreo QA/QC",
      "Generado: " + DISPLAY_DATE_FORMATTER.format(new Date()) + " | Total registros: " + rows.length,
      "",
      ["N", "Punto", "Parametro", "Estado", "D1", "D2", "Fecha", "Resultado", "Criterio"].join("\t"),
    ];

    rows.forEach((row) => {
      lines.push(
        [
          row.number,
          row.punto,
          row.parametro,
          row.estado,
          row.d1,
          row.d2,
          row.fecha,
          row.resultado,
          row.criterio,
        ].join("\t")
      );
    });

    return lines.join("\n");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("No se pudo copiar");
    }
  }

  function createXlsxBlob(rows) {
    const now = new Date();
    const files = [
      { name: "[Content_Types].xml", content: createContentTypesXml() },
      { name: "_rels/.rels", content: createRootRelsXml() },
      { name: "docProps/app.xml", content: createAppPropsXml() },
      { name: "docProps/core.xml", content: createCorePropsXml(now) },
      { name: "xl/workbook.xml", content: createWorkbookXml() },
      { name: "xl/_rels/workbook.xml.rels", content: createWorkbookRelsXml() },
      { name: "xl/styles.xml", content: createStylesXml() },
      { name: "xl/worksheets/sheet1.xml", content: createWorksheetXml(rows, now) },
    ];

    return createZipBlob(files, now);
  }

  function createContentTypesXml() {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      "</Types>"
    );
  }

  function createRootRelsXml() {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      "</Relationships>"
    );
  }

  function createAppPropsXml() {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      "<Application>Monitoreo QA/QC</Application>" +
      "<DocSecurity>0</DocSecurity>" +
      "<ScaleCrop>false</ScaleCrop>" +
      '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>' +
      '<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Historial QAQC</vt:lpstr></vt:vector></TitlesOfParts>' +
      "<Company>OEFA</Company>" +
      "<LinksUpToDate>false</LinksUpToDate>" +
      "<SharedDoc>false</SharedDoc>" +
      "<HyperlinksChanged>false</HyperlinksChanged>" +
      "<AppVersion>1.0</AppVersion>" +
      "</Properties>"
    );
  }

  function createCorePropsXml(now) {
    const timestamp = now.toISOString();
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      "<dc:title>Monitoreo QA/QC</dc:title>" +
      "<dc:creator>Monitoreo QA/QC</dc:creator>" +
      "<cp:lastModifiedBy>Monitoreo QA/QC</cp:lastModifiedBy>" +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + timestamp + "</dcterms:created>" +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + timestamp + "</dcterms:modified>" +
      "</cp:coreProperties>"
    );
  }

  function createWorkbookXml() {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      "<sheets>" +
      '<sheet name="Historial QAQC" sheetId="1" r:id="rId1"/>' +
      "</sheets>" +
      "</workbook>"
    );
  }

  function createWorkbookRelsXml() {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      "</Relationships>"
    );
  }

  function createStylesXml() {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="5">' +
      '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF2E7D32"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFC62828"/><name val="Calibri"/><family val="2"/></font>' +
      "</fonts>" +
      '<fills count="7">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1D2939"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF0090CA"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE5F3FA"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF4E4"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/><bgColor indexed="64"/></patternFill></fill>' +
      "</fills>" +
      '<borders count="2">' +
      "<border><left/><right/><top/><bottom/><diagonal/></border>" +
      '<border><left style="thin"><color rgb="FFDCE1E8"/></left><right style="thin"><color rgb="FFDCE1E8"/></right><top style="thin"><color rgb="FFDCE1E8"/></top><bottom style="thin"><color rgb="FFDCE1E8"/></bottom><diagonal/></border>' +
      "</borders>" +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="7">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      "</cellXfs>" +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      "</styleSheet>"
    );
  }

  function createWorksheetXml(rows, now) {
    const headers = ["N", "Punto", "Parametro", "Estado", "D1", "D2", "Fecha", "Resultado", "Criterio"];
    const widths = [6, 16, 18, 16, 16, 16, 24, 22, 24];
    const sheetRows = [
      buildSheetRow(1, [{ value: "Monitoreo QA/QC", style: 1 }]),
      buildSheetRow(2, [{ value: "Generado: " + DISPLAY_DATE_FORMATTER.format(now) + " | Total registros: " + rows.length, style: 2 }]),
      buildSheetRow(
        3,
        headers.map((header) => ({
          value: header,
          style: 3,
        }))
      ),
    ];

    rows.forEach((row, index) => {
      sheetRows.push(
        buildSheetRow(4 + index, [
          { value: row.number, type: "n", style: 4 },
          { value: row.punto, style: 4 },
          { value: row.parametro, style: 4 },
          { value: row.estado, style: row.isConforme ? 5 : 6 },
          { value: row.d1, style: 4 },
          { value: row.d2, style: 4 },
          { value: row.fecha, style: 4 },
          { value: row.resultado, style: 4 },
          { value: row.criterio, style: 4 },
        ])
      );
    });

    const lastRow = rows.length + 3;
    const colsXml = widths
      .map((width, index) => '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' + width + '" customWidth="1"/>')
      .join("");

    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A4" sqref="A4"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="18"/>' +
      "<cols>" + colsXml + "</cols>" +
      "<sheetData>" + sheetRows.join("") + "</sheetData>" +
      '<autoFilter ref="A3:I' + lastRow + '"/>' +
      '<mergeCells count="2"><mergeCell ref="A1:I1"/><mergeCell ref="A2:I2"/></mergeCells>' +
      "</worksheet>"
    );
  }

  function buildSheetRow(rowNumber, cells) {
    return (
      '<row r="' +
      rowNumber +
      '">' +
      cells
        .map((cell, index) => buildSheetCell(columnLetter(index + 1) + rowNumber, cell))
        .join("") +
      "</row>"
    );
  }

  function buildSheetCell(reference, cell) {
    const style = typeof cell.style === "number" ? cell.style : 0;
    if (cell.type === "n" && Number.isFinite(cell.value)) {
      return '<c r="' + reference + '" s="' + style + '"><v>' + cell.value + "</v></c>";
    }

    return (
      '<c r="' +
      reference +
      '" s="' +
      style +
      '" t="inlineStr"><is><t>' +
      escapeXml(cell.value == null ? "" : String(cell.value)) +
      "</t></is></c>"
    );
  }

  function columnLetter(columnNumber) {
    let current = columnNumber;
    let result = "";

    while (current > 0) {
      const remainder = (current - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      current = Math.floor((current - 1) / 26);
    }

    return result;
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function createZipBlob(files, now) {
    const localParts = [];
    const centralParts = [];
    const dosDateTime = getDosDateTime(now);
    let offset = 0;

    files.forEach((file) => {
      const nameBytes = TEXT_ENCODER.encode(file.name);
      const contentBytes = TEXT_ENCODER.encode(file.content);
      const crc = crc32(contentBytes);
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);

      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, dosDateTime.time, true);
      localView.setUint16(12, dosDateTime.date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, contentBytes.length, true);
      localView.setUint32(22, contentBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      localParts.push(localHeader, contentBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, dosDateTime.time, true);
      centralView.setUint16(14, dosDateTime.date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, contentBytes.length, true);
      centralView.setUint32(24, contentBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      centralParts.push(centralHeader);
      offset += localHeader.length + contentBytes.length;
    });

    const centralDirectoryOffset = offset;
    const centralDirectorySize = centralParts.reduce((total, part) => total + part.length, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralDirectorySize, true);
    endView.setUint32(16, centralDirectoryOffset, true);
    endView.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, endRecord], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  function getDosDateTime(date) {
    const safeYear = Math.max(date.getFullYear(), 1980);
    return {
      date: ((safeYear - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    };
  }

  function createCrc32Table() {
    const table = new Uint32Array(256);

    for (let index = 0; index < 256; index += 1) {
      let current = index;
      for (let bit = 0; bit < 8; bit += 1) {
        current = (current & 1) === 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
      }
      table[index] = current >>> 0;
    }

    return table;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;

    for (const byte of bytes) {
      crc = ZIP_CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  function updateStorageNotice(totalRecords) {
    if (!storageNotice) return;

    if (totalRecords >= MAX_RECORDS) {
      storageNotice.textContent =
        "Historial lleno: " +
        totalRecords +
        " / " +
        MAX_RECORDS +
        " registros. Exporta el Excel y vacia registros antiguos para seguir guardando.";
      storageNotice.className = "storage-notice is-full";
      return;
    }

    if (totalRecords >= STORAGE_WARNING_COUNT) {
      storageNotice.textContent =
        "Historial casi lleno: " +
        totalRecords +
        " / " +
        MAX_RECORDS +
        " registros. Se recomienda exportar el Excel y limpiar registros antiguos.";
      storageNotice.className = "storage-notice is-warning";
      return;
    }

    storageNotice.textContent = "";
    storageNotice.className = "storage-notice hidden";
  }

  function isQuotaExceededError(error) {
    return Boolean(
      error &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error.code === 22 ||
        error.code === 1014)
    );
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let hasRefreshed = false;

    const activateWaitingWorker = (worker, shouldNotify) => {
      if (!worker) return;
      if (shouldNotify) {
        showToast("Actualizacion encontrada. Recargando la version mas reciente...", "info");
      }
      worker.postMessage({ type: "SKIP_WAITING" });
    };

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || hasRefreshed) return;
      hasRefreshed = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js", { updateViaCache: "none" })
        .then((reg) => {
          if (reg.waiting) {
            activateWaitingWorker(reg.waiting, false);
          }

          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;

            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                activateWaitingWorker(installing, true);
              }
            });
          });

          reg.update();
          console.log("SW registrado:", reg.scope);
        })
        .catch((error) => {
          console.log("SW error:", error);
        });
    });
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    const icons = {
      success: "OK",
      error: "!",
      info: "i",
    };

    toast.innerHTML =
      '<span class="toast-icon" aria-hidden="true">' + (icons[type] || "i") + "</span>" +
      "<span>" + message + "</span>";

    toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add("toast-exit");
      toast.addEventListener(
        "animationend",
        () => {
          toast.remove();
        },
        { once: true }
      );
    }, 2800);
  }

  window.showToast = showToast;
});
