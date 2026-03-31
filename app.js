document.addEventListener("DOMContentLoaded", () => {
  // ===== STATE =====
  let currentPage = 1;
  let pageSize = parseInt(document.getElementById("pageSize").value) || 10;

  // ===== DOM REFS =====
  const form = document.getElementById("qaqcForm");
  const resBox = document.getElementById("resultadoBox");
  const resIcon = document.getElementById("resIcon");
  const resTitle = document.getElementById("resTitle");
  const resDetails = document.getElementById("resDetails");
  const tbody = document.getElementById("tablaBody");
  const emptyState = document.getElementById("emptyState");
  const pageSizeSelect = document.getElementById("pageSize");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const pageInfo = document.getElementById("pageInfo");
  const paginacionDiv = document.getElementById("paginacion");
  const btnLimpiar = document.getElementById("btnLimpiar");
  const inputD1 = document.getElementById("dato1");
  const inputD2 = document.getElementById("dato2");
  const selectParam = document.getElementById("parametro");

  // Modal refs
  const modalOverlay = document.getElementById("modalOverlay");
  const modalCancel = document.getElementById("modalCancel");
  const modalConfirm = document.getElementById("modalConfirm");

  // Filter refs
  const filterFecha = document.getElementById("filterFecha");
  const filterEstado = document.getElementById("filterEstado");
  const btnClearFilters = document.getElementById("btnClearFilters");

  // ===== STORAGE HELPERS =====
  const STORAGE_KEY = "qaqc_modern";

  function getHistorial() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveHistorial(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ===== INIT =====
  cargarTabla();

  // ===== FILTER EVENTS =====
  filterFecha.addEventListener("change", () => {
    currentPage = 1;
    cargarTabla();
  });

  filterEstado.addEventListener("change", () => {
    currentPage = 1;
    cargarTabla();
  });

  btnClearFilters.addEventListener("click", () => {
    filterFecha.value = "";
    filterEstado.value = "";
    currentPage = 1;
    cargarTabla();
  });
  // ===== ENTER KEY NAVIGATION: D1 → D2 → Submit =====
  inputD1.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputD2.focus();
    }
  });

  inputD2.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ===== FORM VALIDATION VISUAL =====
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

    if (inputD1.value.trim() === "" || isNaN(parseFloat(inputD1.value))) {
      inputD1.classList.add("input-error");
      valid = false;
    }

    if (inputD2.value.trim() === "" || isNaN(parseFloat(inputD2.value))) {
      inputD2.classList.add("input-error");
      valid = false;
    }

    return valid;
  }

  // Remove error state on input
  [selectParam, inputD1, inputD2].forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("input-error");
    });
    el.addEventListener("change", () => {
      el.classList.remove("input-error");
    });
  });

  // ===== FORM SUBMIT =====
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Completa todos los campos correctamente", "error");
      // Focus the first invalid field
      const firstError = form.querySelector(".input-error");
      if (firstError) firstError.focus();
      return;
    }

    const param = selectParam.value;
    const d1 = parseFloat(inputD1.value);
    const d2 = parseFloat(inputD2.value);

    let dif = 0;
    let limite = 0;
    let conforme = false;
    let txtValor = "";
    let txtCriterio = "";

    // Calculation logic
    if (param === "pH") {
      dif = Math.abs(d1 - d2);
      limite = 0.1;
      conforme = dif <= limite;
      txtValor = "Error Absoluto: " + dif.toFixed(2);
      txtCriterio = "Límite: ± 0.1";
    } else if (param === "T") {
      dif = Math.abs(d1 - d2);
      limite = 0.5;
      conforme = dif <= limite;
      txtValor = "Error Absoluto: " + dif.toFixed(2) + " °C";
      txtCriterio = "Límite: ≤ 0.5 °C";
    } else {
      const promedio = (d1 + d2) / 2;
      if (promedio === 0) {
        showToast("El promedio no puede ser cero", "error");
        return;
      }
      dif = (Math.abs(d1 - d2) / promedio) * 100;

      if (param === "CE") {
        limite = 2;
        txtCriterio = "Límite: ≤ 2% RPD";
      } else if (param === "OD") {
        limite = 4;
        txtCriterio = "Límite: ≤ 4% RPD";
      } else if (param === "Turbidez") {
        limite = 10;
        txtCriterio = "Límite: ≤ 10% RPD";
      }

      conforme = dif <= limite;
      txtValor = "RPD: " + dif.toFixed(2) + "%";
    }

    // Show result (update in-place, no DOM thrashing)
    resBox.classList.remove("hidden");
    resBox.className = "result-box " + (conforme ? "res-c" : "res-nc");
    resIcon.textContent = conforme ? "✅" : "❌";
    resTitle.textContent = conforme ? "CONFORME" : "NO CONFORME";
    resDetails.textContent = txtValor + "  |  " + txtCriterio;

    // Save to localStorage
    const registro = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fecha: new Date().toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      param: param,
      d1: d1,
      d2: d2,
      res: conforme ? "C" : "NC",
      valor: dif.toFixed(2),
    };

    const hist = getHistorial();
    hist.unshift(registro);
    saveHistorial(hist);

    // Insert new row at top WITHOUT full re-render (no flicker)
    currentPage = 1;
    insertRowAtTop(registro, hist.length);

    // Update pagination info quietly
    updatePaginationState(hist);

    showToast(
      conforme ? "✓ Registro conforme guardado" : "✗ Registro no conforme guardado",
      conforme ? "success" : "error"
    );

    // Clear inputs and re-focus D1
    inputD1.value = "";
    inputD2.value = "";
    inputD1.focus();
  });

  // ===== INSERT NEW ROW WITHOUT FULL REBUILD (prevents flicker) =====
  function insertRowAtTop(r, totalCount) {
    const tableEl = document.querySelector(".table-wrapper table");

    // If table was hidden (empty state), show it
    if (tableEl.classList.contains("hidden")) {
      tableEl.classList.remove("hidden");
      emptyState.classList.add("hidden");
    }

    // Remove last row if we're over pageSize
    const existingRows = tbody.querySelectorAll("tr");
    if (existingRows.length >= pageSize) {
      const lastRow = existingRows[existingRows.length - 1];
      lastRow.remove();
    }

    // Re-number existing rows (shift +1)
    existingRows.forEach((row) => {
      const numCell = row.querySelector(".cell-num");
      if (numCell) {
        numCell.textContent = parseInt(numCell.textContent) + 1;
      }
    });

    // Create the new row
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", r.id);
    tr.classList.add("row-new");

    const badgeClass = r.res === "C" ? "badge badge-c" : "badge badge-nc";
    const badgeLabel = r.res === "C" ? "Conforme" : "No Conforme";

    tr.innerHTML =
      '<td class="cell-num">1</td>' +
      '<td class="cell-fecha">' + (r.fecha || "—") + "</td>" +
      '<td class="cell-param">' + r.param + "</td>" +
      '<td class="cell-data">' + r.d1 + "</td>" +
      '<td class="cell-data">' + r.d2 + "</td>" +
      '<td class="cell-estado"><span class="' + badgeClass + '" title="' + badgeLabel + '">' + r.res + "</span></td>" +
      '<td class="cell-actions"><button class="btn-delete-row" title="Eliminar registro" aria-label="Eliminar registro 1">✕</button></td>';

    // Prepend
    tbody.insertBefore(tr, tbody.firstChild);

    // Setup swipe on this new row
    setupSwipeRow(tr);
  }

  // ===== UPDATE PAGINATION WITHOUT FULL RE-RENDER =====
  function updatePaginationState(hist) {
    const totalPages = Math.ceil(hist.length / pageSize);

    if (totalPages > 1) {
      paginacionDiv.classList.remove("hidden");
      pageInfo.textContent = "Pág. " + currentPage + " de " + totalPages;
      btnPrev.disabled = currentPage <= 1;
      btnNext.disabled = currentPage >= totalPages;
    } else {
      paginacionDiv.classList.add("hidden");
    }
  }

  // ===== CLEAR FORM =====
  btnLimpiar.addEventListener("click", () => {
    resBox.classList.add("hidden");
    clearValidation();
  });

  // ===== APPLY FILTERS =====
  function applyFilters(hist) {
    let filtered = hist;

    // Date filter — match by dd/mm/yy prefix
    const fechaVal = filterFecha.value; // yyyy-mm-dd
    if (fechaVal) {
      const parts = fechaVal.split("-");
      // Convert to dd/mm/yy for matching against stored fecha
      const matchStr = parts[2] + "/" + parts[1] + "/" + parts[0].slice(2);
      filtered = filtered.filter((r) => r.fecha && r.fecha.startsWith(matchStr));
    }

    // Estado filter
    const estadoVal = filterEstado.value;
    if (estadoVal) {
      filtered = filtered.filter((r) => r.res === estadoVal);
    }

    return filtered;
  }

  // ===== TABLE RENDERING WITH PAGINATION (full rebuild — used on page change, delete, filter) =====
  function cargarTabla() {
    const hist = getHistorial();
    const filtered = applyFilters(hist);
    tbody.innerHTML = "";

    const tableEl = document.querySelector(".table-wrapper table");

    if (hist.length === 0) {
      emptyState.classList.remove("hidden");
      paginacionDiv.classList.add("hidden");
      tableEl.classList.add("hidden");
      return;
    }

    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      paginacionDiv.classList.add("hidden");
      tableEl.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    tableEl.classList.remove("hidden");

    const totalPages = Math.ceil(filtered.length / pageSize);

    // Clamp current page
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filtered.length);
    const pageItems = filtered.slice(start, end);

    // Build all rows as a DocumentFragment (single DOM insertion = no flicker)
    const fragment = document.createDocumentFragment();

    pageItems.forEach((r, i) => {
      const globalIndex = start + i + 1;
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", r.id);

      const badgeClass = r.res === "C" ? "badge badge-c" : "badge badge-nc";
      const badgeLabel = r.res === "C" ? "Conforme" : "No Conforme";

      tr.innerHTML =
        '<td class="cell-num">' + globalIndex + "</td>" +
        '<td class="cell-fecha">' + (r.fecha || "—") + "</td>" +
        '<td class="cell-param">' + r.param + "</td>" +
        '<td class="cell-data">' + r.d1 + "</td>" +
        '<td class="cell-data">' + r.d2 + "</td>" +
        '<td class="cell-estado"><span class="' + badgeClass + '" title="' + badgeLabel + '">' + r.res + "</span></td>" +
        '<td class="cell-actions"><button class="btn-delete-row" title="Eliminar registro" aria-label="Eliminar registro ' + globalIndex + '">✕</button></td>';

      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);

    // Pagination controls
    updatePaginationState(filtered);

    // Setup swipe-to-delete on touch devices
    setupSwipeDelete();
  }

  // ===== PAGE SIZE CHANGE =====
  pageSizeSelect.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSelect.value);
    currentPage = 1;
    cargarTabla();
  });

  // ===== PAGINATION BUTTONS =====
  btnPrev.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      cargarTabla();
    }
  });

  btnNext.addEventListener("click", () => {
    const hist = getHistorial();
    const totalPages = Math.ceil(hist.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      cargarTabla();
    }
  });

  // ===== INDIVIDUAL ROW DELETE (click) =====
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-delete-row");
    if (!btn) return;

    const tr = btn.closest("tr");
    const id = tr.getAttribute("data-id");

    tr.classList.add("row-deleting");
    tr.addEventListener("animationend", () => {
      deleteRecord(id);
    }, { once: true });
  });

  function deleteRecord(id) {
    let hist = getHistorial();
    hist = hist.filter((r) => r.id !== id);
    saveHistorial(hist);
    cargarTabla();
    showToast("Registro eliminado", "info");
  }

  // ===== SWIPE-TO-DELETE (touch) — single row =====
  function setupSwipeRow(row) {
    let startX = 0;
    let currentX = 0;
    let swiping = false;

    row.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      currentX = startX;
      swiping = true;
      row.style.transition = "none";
    }, { passive: true });

    row.addEventListener("touchmove", (e) => {
      if (!swiping) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;

      if (diff < 0) {
        const translate = Math.max(diff, -120);
        row.style.transform = "translateX(" + translate + "px)";
        row.style.opacity = String(1 - Math.abs(translate) / 200);
      }
    }, { passive: true });

    row.addEventListener("touchend", () => {
      if (!swiping) return;
      swiping = false;

      const diff = currentX - startX;
      row.style.transition = "transform 0.3s ease, opacity 0.3s ease";

      if (diff < -80) {
        row.style.transform = "translateX(-100%)";
        row.style.opacity = "0";
        row.addEventListener("transitionend", () => {
          const id = row.getAttribute("data-id");
          deleteRecord(id);
        }, { once: true });
      } else {
        row.style.transform = "translateX(0)";
        row.style.opacity = "1";
      }
    });
  }

  // ===== SWIPE-TO-DELETE (all rows) =====
  function setupSwipeDelete() {
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => setupSwipeRow(row));
  }

  // ===== MODAL: VACIAR HISTORIAL =====
  document.getElementById("btnBorrar").addEventListener("click", () => {
    const hist = getHistorial();
    if (hist.length === 0) {
      showToast("No hay registros que limpiar", "info");
      return;
    }
    openModal();
  });

  function openModal() {
    modalOverlay.classList.remove("hidden");
    modalCancel.focus();
    document.body.style.overflow = "hidden";
    modalOverlay.addEventListener("keydown", trapFocus);
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
    document.body.style.overflow = "";
    modalOverlay.removeEventListener("keydown", trapFocus);
    document.getElementById("btnBorrar").focus();
  }

  function trapFocus(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const focusable = modalOverlay.querySelectorAll("button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  modalCancel.addEventListener("click", closeModal);

  modalConfirm.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    resBox.classList.add("hidden");
    currentPage = 1;
    cargarTabla();
    closeModal();
    showToast("Historial vaciado completamente", "success");
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // ===== EXCEL EXPORT =====
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
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>N°</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>FECHA</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>PARÁMETRO</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>D1</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>D2</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>ESTADO</th>" +
      "<th style='background:" + headerBg + "; color:white; font-weight:bold;'>ERROR/RPD</th>" +
      "</tr>";

    hist.forEach((r, i) => {
      const color = r.res === "C" ? "#38a169" : "#e53e3e";
      tablaHtml +=
        "<tr>" +
        "<td>" + (i + 1) + "</td>" +
        "<td>" + (r.fecha || "") + "</td>" +
        "<td>" + r.param + "</td>" +
        "<td>" + r.d1 + "</td>" +
        "<td>" + r.d2 + "</td>" +
        "<td style='color:" + color + "; font-weight:bold;'>" + r.res + "</td>" +
        "<td>" + r.valor + "</td>" +
        "</tr>";
    });

    tablaHtml += "</table></body></html>";

    const blob = new Blob([tablaHtml], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Monitoreo_QAQC_" + new Date().toISOString().slice(0, 10) + ".xls";
    a.click();
    URL.revokeObjectURL(a.href);

    showToast("Excel descargado correctamente", "success");
  });

  // ===== TOAST SYSTEM =====
  function showToast(message, type) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    const icons = { success: "✓", error: "✗", info: "ℹ" };
    toast.innerHTML =
      '<span class="toast-icon" aria-hidden="true">' + (icons[type] || "ℹ") + "</span>" +
      "<span>" + message + "</span>";

    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add("toast-exit");
      toast.addEventListener("animationend", () => {
        toast.remove();
      }, { once: true });
    }, 3000);
  }

  window.showToast = showToast;
});
