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
  const pageInfo = document.getElementById("pageInfo");
  const paginacionDiv = document.getElementById("paginacion");
  const btnLimpiar = document.getElementById("btnLimpiar");
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
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  const STORAGE_KEY = "qaqc_modern";
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

  hydrateHistorial();
  initializeFilterControls();
  syncDecimalInput(inputD1);
  syncDecimalInput(inputD2);
  cargarTabla();

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

    if (!validateForm()) {
      showToast("Completa todos los campos correctamente", "error");
      const firstError = form.querySelector(".input-error");
      if (firstError) firstError.focus();
      return;
    }

    const param = selectParam.value;
    const d1 = parseDecimal(inputD1.value);
    const d2 = parseDecimal(inputD2.value);

    let dif = 0;
    let limite = 0;
    let conforme = false;
    let txtValor = "";
    let txtCriterio = "";

    if (param === "pH") {
      dif = Math.abs(d1 - d2);
      limite = 0.1;
      conforme = dif <= limite;
      txtValor = "Error absoluto: " + dif.toFixed(2);
      txtCriterio = "Limite: +/- 0.1";
    } else if (param === "T") {
      dif = Math.abs(d1 - d2);
      limite = 0.5;
      conforme = dif <= limite;
      txtValor = "Error absoluto: " + dif.toFixed(2) + " C";
      txtCriterio = "Limite: <= 0.5 C";
    } else {
      const promedio = (d1 + d2) / 2;
      if (promedio === 0) {
        showToast("El promedio no puede ser cero", "error");
        return;
      }

      dif = (Math.abs(d1 - d2) / promedio) * 100;

      if (param === "CE") {
        limite = 2;
        txtCriterio = "Limite: <= 2% RPD";
      } else if (param === "OD") {
        limite = 4;
        txtCriterio = "Limite: <= 4% RPD";
      } else if (param === "Turbidez") {
        limite = 10;
        txtCriterio = "Limite: <= 10% RPD";
      }

      conforme = dif <= limite;
      txtValor = "RPD: " + dif.toFixed(2) + "%";
    }

    resBox.classList.remove("hidden");
    resBox.className = "result-box " + (conforme ? "res-c" : "res-nc");
    resIcon.textContent = conforme ? "OK" : "X";
    resTitle.textContent = conforme ? "CONFORME" : "NO CONFORME";
    resDetails.textContent = txtValor + " | " + txtCriterio;

    const now = new Date();
    const registro = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...buildDatePayload(now),
      param,
      d1,
      d2,
      res: conforme ? "C" : "NC",
      valor: dif.toFixed(2),
    };

    const hist = getHistorial();
    hist.unshift(registro);
    if (!saveHistorial(hist)) {
      return;
    }

    currentPage = 1;
    cargarTabla();

    inputD1.value = "";
    inputD2.value = "";
    if (!isCoarsePointer) {
      inputD1.focus();
    }
  });

  btnLimpiar.addEventListener("click", () => {
    resBox.classList.add("hidden");
    clearValidation();
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

  document.getElementById("btnBorrar").addEventListener("click", () => {
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

  document.getElementById("btnExcel").addEventListener("click", () => {
    const hist = getHistorial();
    if (hist.length === 0) {
      showToast("No hay datos para exportar", "info");
      return;
    }

    const headerBg = "#00A0DF";
    let tablaHtml =
      "<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='utf-8'></head><body><table border='1'>" +
      "<tr>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>N</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>FECHA</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>PARAMETRO</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>D1</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>D2</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>ESTADO</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>ERROR/RPD</th>" +
      "</tr>";

    hist.forEach((record, index) => {
      const color = record.res === "C" ? "#38a169" : "#e53e3e";
      tablaHtml +=
        "<tr>" +
        "<td>" + (index + 1) + "</td>" +
        "<td>" + (record.fecha || "") + "</td>" +
        "<td>" + record.param + "</td>" +
        "<td>" + record.d1 + "</td>" +
        "<td>" + record.d2 + "</td>" +
        "<td style='color:" + color + "; font-weight:bold;'>" + record.res + "</td>" +
        "<td>" + record.valor + "</td>" +
        "</tr>";
    });

    tablaHtml += "</table></body></html>";

    const blob = new Blob([tablaHtml], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Monitoreo_QAQC_" + formatDateKey(new Date()) + ".xls";
    link.click();
    URL.revokeObjectURL(link.href);

    showToast("Excel descargado correctamente", "success");
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

    return {
      ...safeRecord,
      id: typeof safeRecord.id === "string" ? safeRecord.id : "",
      fecha: safeRecord.fecha || "",
      fechaKey,
      createdAt,
      param: typeof safeRecord.param === "string" ? safeRecord.param : "",
      d1,
      d2,
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
        showToast("No se pudo guardar el historial", "error");
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
    let valid = true;
    clearValidation();

    if (!selectParam.value) {
      selectParam.classList.add("input-error");
      valid = false;
    }

    if (inputD1.value.trim() === "" || Number.isNaN(parseDecimal(inputD1.value))) {
      inputD1.classList.add("input-error");
      valid = false;
    }

    if (inputD2.value.trim() === "" || Number.isNaN(parseDecimal(inputD2.value))) {
      inputD2.classList.add("input-error");
      valid = false;
    }

    return valid;
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
      record.param &&
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
    const badgeShort = record.res === "C" ? "C" : "NC";

    return `
      <td class="cell-num" data-label="#">${index}</td>
      <td class="cell-fecha" data-label="Fecha">${record.fecha || "-"}</td>
      <td class="cell-param" data-label="Parametro">${record.param}</td>
      <td class="cell-data" data-label="D1">${record.d1}</td>
      <td class="cell-data" data-label="D2">${record.d2}</td>
      <td class="cell-estado" data-label="Estado"><span class="${badgeClass}" title="${badgeLabel}" aria-label="${badgeLabel}">${badgeShort}</span></td>
      <td class="cell-actions" data-label="Accion"><button type="button" class="btn-delete-row" title="Eliminar registro" aria-label="Eliminar registro ${index}">Eliminar</button></td>
    `;
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
    document.getElementById("btnBorrar").focus();
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
