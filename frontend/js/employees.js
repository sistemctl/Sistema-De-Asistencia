/* employees.js — Gestión de empleados */
const EmployeesPage = {
  page: 1, limit: 50, search: '', depts: [], positions: [], schedules: [],
  filterDept: '', filterPosition: '', filterStatus: '',
  visibleColumns: { code: true, position: true, dept: true, schedule: true, device: true, creds: true, status: true },

  async render() {
    const isAdmin = Auth.canManageEmployees();
    document.getElementById('pageContent').innerHTML = `      <!-- ── CONTENEDOR ÚNICO DE TABLA Y FILTROS ── -->
      <div class="double-bezel-outer" style="height: 100%; display: flex; flex-direction: column;">
        <div class="double-bezel-inner" style="padding: 0; display: flex; flex-direction: column; overflow: hidden; height: 100%; border: none; box-shadow: none;">
        
        <!-- Cabecera: Búsqueda y Filtros -->
        <div style="padding: 16px 20px; background: var(--surface-1);">
          <div style="display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap;">

            <!-- Lado Izquierdo: Búsqueda + Filtros -->
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; flex:1; min-width:280px;">
              <!-- Búsqueda -->
              <div class="search-bar" style="flex:1; min-width:200px; max-width:280px; margin: 0;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;color:var(--text-3);flex-shrink:0;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="empSearch" placeholder="Buscar por nombre o código…" />
              </div>

              <!-- Divisor vertical -->
              <div style="width:1px; height:28px; background:var(--border); flex-shrink:0;"></div>

              <!-- Filtros Dropdown -->
              <div style="position:relative;">
                <button class="btn btn-secondary" onclick="document.getElementById('advancedFiltersMenu').style.display = document.getElementById('advancedFiltersMenu').style.display === 'none' ? 'flex' : 'none';" style="padding:8px 12px; gap:6px;">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  Filtros
                </button>
                <div id="advancedFiltersMenu" style="display:none; position:absolute; top:40px; left:0; background:var(--bg-raised); border:1px solid var(--border); border-radius:12px; padding:16px; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:100; min-width:200px; flex-direction:column; gap:12px;">
                  <h4 style="margin: 0; font-size: 0.75rem; text-transform: uppercase; color: var(--text-3); letter-spacing: 0.05em; font-weight: 700;">Filtros Avanzados</h4>
                  <select id="filterDept" class="form-control" style="width:100%;">
                    <option value="">🏢 Departamento</option>
                  </select>
                  <select id="filterPosition" class="form-control" style="width:100%;">
                    <option value="">💼 Cargo</option>
                  </select>
                  <select id="filterStatus" class="form-control" style="width:100%;">
                    <option value="">👤 Estado</option>
                    <option value="true">✅ Activo</option>
                    <option value="false">⛔ Inactivo</option>
                  </select>
                  <select id="pageSize" class="form-control" style="width:100%;">
                    <option value="10">📄 10 filas</option>
                    <option value="50" selected>📄 50 filas</option>
                    <option value="100">📄 100 filas</option>
                    <option value="200">📄 200 filas</option>
                    <option value="500">📄 500 filas</option>
                    <option value="1000">📄 1000 filas</option>
                    <option value="10000">📄 Todos</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Lado Derecho: Acciones -->
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <span id="empFilterCount" style="display:none; font-size:.75rem; color:var(--accent); font-weight:700; padding:3px 10px; background:rgba(var(--accent-rgb),0.10); border-radius:99px; white-space:nowrap;"></span>
              <button id="btnClearFilters" style="display:none; align-items:center; gap:5px; padding:7px 12px; background:var(--surface-2); border:1px solid var(--border); border-radius:8px; color:var(--text-3); font-size:.78rem; font-weight:600; font-family:inherit; cursor:pointer; transition:all .2s; white-space:nowrap;">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Limpiar
              </button>
              <div class="col-selector-container" style="position: relative;">
                <button class="btn btn-secondary" id="btnToggleColSelector" onclick="EmployeesPage.toggleColSelector(event)" style="padding: 8px 12px; gap: 6px;" title="Seleccionar Columnas">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  Columnas
                </button>
                <div id="colSelectorDropdown" style="display: none; position: absolute; right: 0; top: 40px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 12px; z-index: 100; min-width: 170px; flex-direction: column; gap: 8px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 0.75rem; text-transform: uppercase; color: var(--text-3); letter-spacing: 0.05em; font-weight: 700;">Mostrar Columnas</h4>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; color: var(--text-2);"><input type="checkbox" ${this.visibleColumns.code ? 'checked' : ''} onchange="EmployeesPage.toggleColumn('code', this.checked)"> Código</label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; color: var(--text-2);"><input type="checkbox" ${this.visibleColumns.position ? 'checked' : ''} onchange="EmployeesPage.toggleColumn('position', this.checked)"> Cargo</label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; color: var(--text-2);"><input type="checkbox" ${this.visibleColumns.dept ? 'checked' : ''} onchange="EmployeesPage.toggleColumn('dept', this.checked)"> Departamento</label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; color: var(--text-2);"><input type="checkbox" ${this.visibleColumns.schedule ? 'checked' : ''} onchange="EmployeesPage.toggleColumn('schedule', this.checked)"> Horario</label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; color: var(--text-2);"><input type="checkbox" ${this.visibleColumns.device ? 'checked' : ''} onchange="EmployeesPage.toggleColumn('device', this.checked)"> Dispositivo</label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; color: var(--text-2);"><input type="checkbox" ${this.visibleColumns.creds ? 'checked' : ''} onchange="EmployeesPage.toggleColumn('creds', this.checked)"> Credenciales</label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; color: var(--text-2);"><input type="checkbox" ${this.visibleColumns.status ? 'checked' : ''} onchange="EmployeesPage.toggleColumn('status', this.checked)"> Estado</label>
                </div>
              </div>
              ${isAdmin ? `
                <button class="btn btn-secondary" id="btnImportFromDevice">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Importar del Biométrico
                </button>
                <button class="btn btn-secondary" id="btnBulkQR" style="background:var(--surface-2); border:1px solid var(--border);" title="Generar QR para los que aún no lo tienen">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  Generar QRs Masivos
                </button>
                <button class="btn btn-primary" id="btnNewEmp">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Nuevo empleado
                </button>
              ` : ''}
            </div>

          </div>
        </div>

        <style>
          .emp-filter-select {
            padding: 8px 12px;
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-2);
            font-size: .82rem;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all .2s;
            outline: none;
            appearance: auto;
          }
          .emp-filter-select:hover {
            border-color: var(--accent);
            background: var(--surface-1);
            color: var(--text-1);
          }
          .emp-filter-select:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12);
            background: var(--surface-1);
            color: var(--text-1);
          }
          .emp-filter-select.active-filter {
            border-color: var(--accent);
            background: rgba(var(--accent-rgb), 0.06);
            color: var(--accent);
            font-weight: 600;
          }
          #btnClearFilters:hover {
            background: var(--surface-3);
            color: var(--danger);
            border-color: rgba(220,38,38,0.3);
          }
        </style>

        <div style="height:1px; background:var(--border);"></div>

        <!-- Acciones en lote integradas -->
        ${isAdmin ? `
          <div id="bulkActionsBar" style="display: none; align-items: center; justify-content: space-between; padding: 12px 20px; background: var(--surface-2); border-bottom: 1px solid var(--border); animation: slideDown 0.3s ease;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span id="bulkCount" style="font-weight: 600; color: var(--accent); background: rgba(var(--accent-rgb),0.08); padding: 4px 10px; border-radius: 999px; font-size: 0.85rem;">0 seleccionados</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <select id="bulkDeptSelect" style="width: 160px; padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-1); color: var(--text-1);">
                  <option value="">-- Dep. --</option>
                </select>
                <button class="btn btn-secondary" onclick="EmployeesPage.applyBulkDept()" style="padding: 6px 12px; font-size: 0.82rem; border-radius: 6px;">Asignar</button>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <select id="bulkScheduleSelect" style="width: 180px; padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-1); color: var(--text-1);">
                  <option value="">-- Horario --</option>
                </select>
                <button class="btn btn-secondary" onclick="EmployeesPage.applyBulkSchedule()" style="padding: 6px 12px; font-size: 0.82rem; border-radius: 6px;">Asignar</button>
              </div>
              <button class="btn btn-primary" onclick="EmployeesPage.applyBulkSync()" style="display: flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 0.82rem; border-radius: 6px;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Sincronizar
              </button>
              <button class="btn btn-danger" onclick="EmployeesPage.applyBulkDelete()" style="display: flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 0.82rem; border-radius: 6px;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Eliminar
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Tabla con scroll vertical interno -->
        <div class="table-wrap" style="margin: 0; border: none; border-radius: 0; overflow-y: auto; max-height: 520px; flex: 1;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-top: none;">
                ${isAdmin ? `<th style="width:40px;text-align:center;border-top:none;"><input type="checkbox" id="selectAllEmps" onchange="EmployeesPage.toggleSelectAll(this)"></th>` : ''}
                <th style="border-top:none;">Empleado</th>
                <th style="border-top:none;" class="col-code">Código</th>
                <th style="border-top:none;" class="col-position">Cargo</th>
                <th style="border-top:none;" class="col-dept">Departamento</th>
                <th style="border-top:none;" class="col-schedule">Horario</th>
                <th style="border-top:none;" class="col-device">Dispositivo</th>
                <th style="border-top:none;" class="col-creds">Credenciales</th>
                <th style="border-top:none;" class="col-status">Estado</th>
                <th style="border-top:none;">Acciones</th>
              </tr>
            </thead>
            <tbody id="empTable">
              ${[1,2,3,4].map(() => `<tr>
                ${isAdmin ? `<td style="text-align:center;"><div class="skeleton" style="width:16px;height:16px;border-radius:4px;margin:auto;"></div></td>` : ''}
                <td><div style="display:flex;gap:10px;align-items:center"><div class="skeleton sk-avatar"></div><div style="flex:1"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-text w-75" style="margin:0"></div></div></div></td>
                <td class="col-code"><div class="skeleton sk-text w-50"></div></td>
                <td class="col-position"><div class="skeleton sk-text w-75"></div></td>
                <td class="col-dept"><div class="skeleton sk-text w-75"></div></td>
                <td class="col-schedule"><div class="skeleton sk-text w-50"></div></td>
                <td class="col-device"><div class="skeleton sk-text w-50"></div></td>
                <td class="col-creds"><div class="skeleton sk-text w-50"></div></td>
                <td class="col-status"><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div style="height:1px; background:var(--border);"></div>

        <!-- Pie de página (Paginación) -->
        <div style="padding: 14px 20px; background: var(--surface-1);">
          <div class="pagination" id="empPagination" style="margin-top: 0;"></div>
        </div>

      </div>
    </div>`;

    this.depts     = await API.get('/api/employees/departments', true) || [];
    this.positions = await API.get('/api/employees/positions', true)   || [];
    this.schedules = await API.get('/api/schedules', true)             || [];

    // Llenar dropdowns de filtro
    const deptSel = document.getElementById('filterDept');
    const posSel  = document.getElementById('filterPosition');
    if (deptSel) deptSel.innerHTML = '<option value="">🏢 Departamento</option>' +
      this.depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    if (posSel) posSel.innerHTML = '<option value="">💼 Cargo</option>' +
      this.positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    // Restaurar valores previos de filtros
    if (this.filterDept)     deptSel.value = this.filterDept;
    if (this.filterPosition) posSel.value  = this.filterPosition;
    const statusSel = document.getElementById('filterStatus');
    if (this.filterStatus && statusSel) statusSel.value = this.filterStatus;
    const sizeSel = document.getElementById('pageSize');
    if (sizeSel) sizeSel.value = this.limit.toString();

    if (isAdmin) {
      const deptOpts = this.depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      const schedOpts = this.schedules.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      const bulkDept = document.getElementById('bulkDeptSelect');
      if (bulkDept) bulkDept.innerHTML = '<option value="">-- Dep. --</option>' + deptOpts;
      const bulkSched = document.getElementById('bulkScheduleSelect');
      if (bulkSched) bulkSched.innerHTML = '<option value="">-- Horario --</option><option value="none">Sin Horario</option>' + schedOpts;
    }

    // Listeners de búsqueda y filtros — filtrado automático al cambiar
    let searchTimeout = null;
    document.getElementById('empSearch').addEventListener('input', (e) => {
      const val = e.target.value;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.search = val; this.page = 1; this.loadTable();
      }, 300);
    });
    document.getElementById('filterDept').addEventListener('change', (e) => {
      this.filterDept = e.target.value; this.page = 1; this.loadTable();
    });
    document.getElementById('filterPosition').addEventListener('change', (e) => {
      this.filterPosition = e.target.value; this.page = 1; this.loadTable();
    });
    document.getElementById('filterStatus').addEventListener('change', (e) => {
      this.filterStatus = e.target.value; this.page = 1; this.loadTable();
    });
    document.getElementById('pageSize').addEventListener('change', (e) => {
      this.limit = parseInt(e.target.value); this.page = 1; this.loadTable();
    });
    document.getElementById('btnClearFilters').addEventListener('click', () => {
      this.search = ''; this.filterDept = ''; this.filterPosition = ''; this.filterStatus = '';
      document.getElementById('empSearch').value = '';
      document.getElementById('filterDept').value = '';
      document.getElementById('filterPosition').value = '';
      document.getElementById('filterStatus').value = '';
      this.page = 1; this.loadTable();
    });

    if (isAdmin) {
      document.getElementById('btnNewEmp')?.addEventListener('click', () => this.openForm());
      document.getElementById('btnBulkQR')?.addEventListener('click', () => this.generateBulkQR());
      document.getElementById('btnImportFromDevice')?.addEventListener('click', () => this.importFromDevice());
    }
    // Close dropdowns if clicked outside
    document.addEventListener('click', (e) => {
      const colDropdown = document.getElementById('colSelectorDropdown');
      const colBtn = document.getElementById('btnToggleColSelector');
      if (colDropdown && colBtn && !colDropdown.contains(e.target) && !colBtn.contains(e.target)) {
        colDropdown.style.display = 'none';
      }
      
      const filterMenu = document.getElementById('advancedFiltersMenu');
      const filterBtn = filterMenu?.previousElementSibling;
      if (filterMenu && filterBtn && !filterMenu.contains(e.target) && !filterBtn.contains(e.target)) {
        filterMenu.style.display = 'none';
      }
    });

    this.updateColumnStyles();
    await this.loadTable();
  },

  toggleColSelector(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('colSelectorDropdown');
    if (dropdown) {
      const isHidden = dropdown.style.display === 'none';
      dropdown.style.display = isHidden ? 'flex' : 'none';
    }
  },

  toggleColumn(col, visible) {
    this.visibleColumns[col] = visible;
    this.updateColumnStyles();
  },

  updateColumnStyles() {
    let styleHtml = '';
    for (const [col, visible] of Object.entries(this.visibleColumns)) {
      if (!visible) {
        styleHtml += `.col-${col} { display: none !important; }\n`;
      }
    }
    let styleEl = document.getElementById('col-toggle-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'col-toggle-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = styleHtml;
  },

  async loadTable() {
    const params = new URLSearchParams({ skip: (this.page-1)*this.limit, limit: this.limit });
    if (this.search)         params.set('search',        this.search);
    if (this.filterDept)     params.set('department_id', this.filterDept);
    if (this.filterPosition) params.set('position_id',   this.filterPosition);
    if (this.filterStatus !== '') params.set('is_active', this.filterStatus);

    // Actualizar UI del indicador de filtros activos
    const activeFilters = [this.filterDept, this.filterPosition, this.filterStatus, this.search]
      .filter(v => v !== '').length;
    const clearBtn    = document.getElementById('btnClearFilters');
    const filterCount = document.getElementById('empFilterCount');
    if (clearBtn) {
      clearBtn.style.display = activeFilters > 0 ? 'inline-flex' : 'none';
    }
    if (filterCount) {
      if (activeFilters > 0) {
        filterCount.style.display = 'inline-block';
        filterCount.textContent   = `${activeFilters} filtro${activeFilters > 1 ? 's' : ''} activo${activeFilters > 1 ? 's' : ''}`;
      } else {
        filterCount.style.display = 'none';
      }
    }
    // Resaltar visualmente los dropdowns con valor activo
    ['filterDept','filterPosition','filterStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active-filter', el.value !== '');
    });

    try {
      const emps = await API.get(`/api/employees?${params}`);
      const tbody = document.getElementById('empTable');
      const isAdmin = Auth.canManageEmployees();
      
      const selectAll = document.getElementById('selectAllEmps');
      if (selectAll) selectAll.checked = false;
      const bar = document.getElementById('bulkActionsBar');
      if (bar) bar.style.display = 'none';

      if (!emps?.length) { 
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 10 : 9}"><div class="empty-state" style="padding:80px 20px;">
          <div style="margin-bottom:24px; color:var(--text-3); opacity:0.6;">
            <svg viewBox="0 0 24 24" width="80" height="80" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
          </div>
          <h3 style="font-size:1.2rem; margin-bottom:8px;">Aún no hay equipo</h3>
          <p style="font-size:0.9rem;">Registra a tu primer empleado o importa desde el dispositivo biométrico.</p>
        </div></td></tr>`; 
        return; 
      }
      tbody.innerHTML = emps.map(e => `
        <tr>
          ${isAdmin ? `<td style="text-align:center;"><input type="checkbox" class="emp-checkbox" value="${e.id}" onchange="EmployeesPage.onRowCheckboxChange()"></td>` : ''}
          <td>
            <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="EmployeesPage.showProfile(${e.id})" title="Ver perfil de asistencia">
              ${e.photo_path ? `<div class="emp-avatar"><img src="/uploads/${e.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(`${e.first_name} ${e.last_name}`)}
              <div>
                <div class="emp-name-link">${e.first_name} ${e.last_name}</div>
                <div style="font-size:.75rem;color:var(--text-3)">${e.email||''}</div>
              </div>
            </div>
          </td>
          <td class="col-code"><code class="copyable" title="Clic para copiar código de empleado" style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:'JetBrains Mono',monospace;">${e.employee_code}</code></td>
          <td class="col-position" style="color:var(--text-2)">${e.position?.name||'-'}</td>
          <td class="col-dept">${e.department?.name||'-'}</td>
          <td class="col-schedule" style="font-size:.78rem;color:var(--text-3)">${e.schedule ? `<strong style="color:var(--primary-color)">${e.schedule.name}</strong><br><span style="font-size:0.72rem;color:var(--text-2)">(${e.schedule.work_start_time} - ${e.schedule.work_end_time})</span>` : `${e.work_start_time} – ${e.work_end_time}`}</td>
          <td class="col-device">
            ${e.synced_to_device 
              ? `<span class="badge badge-green">✓ Sync</span>` 
              : `<span id="sync-badge-${e.id}" class="badge badge-gray" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="EmployeesPage.syncEmployeeToDevice(${e.id})" title="Haga clic para sincronizar ahora con el biométrico">
                  ⚠️ Sin sync 🔄
                 </span>`}
          </td>
          <td class="col-creds">
            <div style="display:flex; gap:10px; align-items:center; justify-content:flex-start;">
              <span title="${e.photo_path ? 'Rostro registrado' : 'Sin rostro'}" style="color: ${e.photo_path ? 'var(--success)' : 'var(--text-3)'}; opacity: ${e.photo_path ? '1' : '0.4'}; display:flex; filter: ${e.photo_path ? 'drop-shadow(0 0 4px rgba(22,163,74,0.4))' : 'none'};">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8V5c0-1.1.9-2 2-2h3"></path><path d="M16 3h3c1.1 0 2 .9 2 2v3"></path><path d="M19 16v3c0 1.1-.9 2-2 2h-3"></path><path d="M8 21H5c-1.1 0-2-.9-2-2v-3"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </span>
              <span title="${e.card_number ? `Tarjeta: ${e.card_number} (Clic para copiar)` : 'Sin tarjeta'}" style="color: ${e.card_number ? 'var(--success)' : 'var(--text-3)'}; opacity: ${e.card_number ? '1' : '0.4'}; display:flex; filter: ${e.card_number ? 'drop-shadow(0 0 4px rgba(22,163,74,0.4))' : 'none'}; cursor: ${e.card_number ? 'pointer' : 'default'};" class="${e.card_number ? 'copyable' : ''}" data-copy="${e.card_number || ''}">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              </span>
            </div>
          </td>
          <td class="col-status">${e.is_active ? `<span class="badge badge-green">Activo</span>` : `<span class="badge badge-red">Inactivo</span>`}</td>
          <td>
            <div class="table-actions" style="display:flex;gap:6px">
              <button class="btn btn-icon btn-sm" onclick="EmployeesPage.showProfile(${e.id})" title="Ver perfil de asistencia" style="color:var(--accent);border-color:rgba(var(--accent-rgb),0.2);background:rgba(var(--accent-rgb),0.06);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </button>
              ${isAdmin ? `
                ${e.qr_enabled ? `
                <button class="btn btn-icon btn-sm" onclick="EmployeesPage.showBadge(${e.id})" title="Imprimir Gafete" style="color:#0ea5e9;border-color:rgba(14,165,233,0.2);background:rgba(14,165,233,0.06);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </button>` : ''}
                <button class="btn btn-icon btn-sm" onclick="EmployeesPage.openForm(${e.id})" title="Editar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn btn-icon btn-sm btn-danger" onclick="EmployeesPage.deleteEmployee(${e.id}, '${e.first_name} ${e.last_name}')" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--danger);"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>` : ''}
            </div>
          </td>
        </tr>`).join('');

      // Render pagination UI
      const pagEl = document.getElementById('empPagination');
      if (pagEl) {
        const count = emps.length;
        if (count === 0 && this.page === 1) {
          pagEl.innerHTML = '';
        } else {
          const start = (this.page - 1) * this.limit + 1;
          const totalText = this.limit >= 10000 ? `Mostrando todos los ${count} empleados` : `Mostrando ${start} a ${start + count - 1} empleados`;
          
          pagEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="pagination-info">${totalText}</div>
              <select id="bottomPageSize" style="padding: 5px 10px; font-size: 0.76rem; font-weight: 600; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-2); cursor: pointer; outline: none;">
                <option value="10" ${this.limit === 10 ? 'selected' : ''}>10 por pág.</option>
                <option value="50" ${this.limit === 50 ? 'selected' : ''}>50 por pág.</option>
                <option value="100" ${this.limit === 100 ? 'selected' : ''}>100 por pág.</option>
                <option value="200" ${this.limit === 200 ? 'selected' : ''}>200 por pág.</option>
                <option value="500" ${this.limit === 500 ? 'selected' : ''}>500 por pág.</option>
                <option value="1000" ${this.limit === 1000 ? 'selected' : ''}>1000 por pág.</option>
                <option value="10000" ${this.limit === 10000 ? 'selected' : ''}>Todos</option>
              </select>
            </div>
            <div class="pagination-btns">
              <button class="page-btn" id="prevPageBtn" ${this.page === 1 ? 'disabled' : ''}>Anterior</button>
              <span style="align-self:center; font-size:.82rem; font-weight:600; color:var(--text-2); padding: 0 4px;">Página ${this.page}</span>
              <button class="page-btn" id="nextPageBtn" ${count < this.limit ? 'disabled' : ''}>Siguiente</button>
            </div>
          `;
          
          // Listeners para botones y select de página
          document.getElementById('bottomPageSize')?.addEventListener('change', (e) => {
            this.limit = parseInt(e.target.value);
            const topSel = document.getElementById('pageSize');
            if (topSel) topSel.value = e.target.value;
            this.page = 1;
            this.loadTable();
          });
          document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (this.page > 1) {
              this.page--;
              this.loadTable();
            }
          });
          document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (count === this.limit) {
              this.page++;
              this.loadTable();
            }
          });
        }
      }
    } catch(e) { Toast.show('Error cargando empleados', 'error'); }
  },



  async generateBulkQR() {
    if(!confirm('¿Estás seguro de generar y habilitar Códigos QR para todos los empleados que aún no lo tienen?')) return;
    try {
      const res = await API.post('/api/employees/bulk-qr-generate');
      Toast.show(res.message || 'QRs generados correctamente', 'success');
      this.loadTable();
    } catch(e) {
      console.error(e);
      Toast.show(e.message || 'Error al generar QRs', 'error');
    }
  },

  async regenerateQR(id) {
    if(!confirm('¿Seguro que deseas revocar el QR actual y generar uno nuevo?')) return;
    try {
      const res = await API.post(`/api/employees/${id}/regenerate-qr`);
      Toast.show(res.message || 'Código QR regenerado', 'success');
      Modal.close();
      this.openForm(id); // Recargar formulario
    } catch(e) {
      console.error(e);
      Toast.show(e.message || 'Error al regenerar QR', 'error');
    }
  },

  async openForm(id = null) {
    this.selectedPhotoFile = null;
    let emp = null;
    if (id) emp = await API.get(`/api/employees/${id}`);
    
    // Cargar departamentos, cargos y horarios
    const depts = this.depts;
    const positions = this.positions.length ? this.positions : await API.get('/api/employees/positions', true) || [];
    this.positions = positions;
    const schedules = await API.get('/api/schedules', true) || [];
    
    const depOpts = depts.map(d => `<option value="${d.id}" ${emp?.department_id==d.id?'selected':''}>${d.name}</option>`).join('');
    const posOpts = positions.map(p => `<option value="${p.id}" ${emp?.position_id==p.id?'selected':''}>${p.name}</option>`).join('');
    const schedOpts = schedules.map(s => `<option value="${s.id}" ${emp?.schedule_id==s.id?'selected':''}>${s.name} (${s.work_start_time} - ${s.work_end_time})</option>`).join('');

    const initials = emp ? (emp.first_name.charAt(0) + (emp.last_name && emp.last_name !== '-' ? emp.last_name.charAt(0) : '')).toUpperCase() : '+';

    Modal.open(id ? 'Editar Empleado' : 'Nuevo Empleado', `
      <!-- Selector de foto de perfil interactivo -->
      <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color, #e2e8f0);">
        <div style="position: relative; width: 70px; height: 70px; border-radius: 50%; overflow: hidden; border: 2px dashed var(--primary-color, #7c3aed); display: flex; align-items: center; justify-content: center; background: var(--surface-3, #f8fafc); cursor: pointer;" onclick="document.getElementById('fPhotoInput').click()" title="Hacer clic para subir foto">
          <img id="fPhotoPreview" src="${emp?.photo_path ? `/uploads/${emp.photo_path}?t=${new Date().getTime()}` : ''}" style="width: 100%; height: 100%; object-fit: cover; display: ${emp?.photo_path ? 'block' : 'none'};" />
          <span id="fPhotoPlaceholder" style="font-size: 1.8rem; font-weight: 700; color: var(--text-3, #94a3b8); display: ${emp?.photo_path ? 'none' : 'block'};">
            ${initials}
          </span>
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.6); color: #fff; font-size: 0.62rem; text-align: center; padding: 2px 0; font-weight: 600; font-family: inherit;">Subir</div>
        </div>
        <input type="file" id="fPhotoInput" accept="image/*" style="display: none;" onchange="EmployeesPage.onPhotoSelected(event)" />
        <div>
          <h4 style="margin: 0 0 4px; color: var(--text-1); font-size: 0.95rem; font-weight: 600;">Foto del Rostro</h4>
          <p style="margin: 0 0 10px; font-size: 0.76rem; color: var(--text-3);">Se sincronizará automáticamente al biométrico Hikvision para habilitar el reconocimiento facial.</p>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="EmployeesPage.startWebcam()" style="font-size:0.72rem; padding: 3px 6px; display: flex; align-items: center; gap: 4px;">
              📷 WebCam
            </button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="EmployeesPage.captureFromDevice()" style="font-size:0.72rem; padding: 3px 6px; display: flex; align-items: center; gap: 4px;">
              📟 Biométrico
            </button>
          </div>
        </div>
      </div>

      <!-- Contenedor de cámara web en vivo -->
      <div id="webcamContainer" style="display: none; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 20px; padding: 12px; background: var(--surface-2, #f1f5f9); border-radius: 8px; border: 1px solid var(--border-color, #e2e8f0);">
        <video id="fWebcamVideo" autoplay playsinline style="width: 100%; max-width: 320px; border-radius: 6px; background: #000; transform: scaleX(-1);"></video>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-sm btn-primary" onclick="EmployeesPage.captureWebcam()">Capturar Foto</button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="EmployeesPage.stopWebcam()">Cancelar</button>
        </div>
        <canvas id="fWebcamCanvas" style="display: none;" width="640" height="480"></canvas>
      </div>

      <div class="form-row">
        <div class="field"><label>Nombre</label><input id="fFirstName" value="${emp?.first_name||''}" placeholder="Nombre" /></div>
        <div class="field"><label>Apellido</label><input id="fLastName" value="${emp?.last_name||''}" placeholder="Apellido" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Código empleado</label><input id="fCode" value="${emp?.employee_code||''}" placeholder="EMP001" ${id?'readonly':''} /></div>
        <div class="field" style="position:relative;">
          <label style="display:flex; justify-content:space-between; align-items:center;">
            <span>Cargo</span>
            ${Auth.canManageEmployees() ? `
              <a href="#" onclick="Modal.close(); setTimeout(() => { window.location.hash = '#parameters'; }, 200); return false;" style="font-size:0.75rem; color:var(--primary-color); font-weight:600; text-decoration:none; display:flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 5v14M5 12h14"></path></svg>
                Gestionar
              </a>` : ''}
          </label>
          <select id="fPositionId"><option value="">Sin cargo</option>${posOpts}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Email</label><input id="fEmail" type="email" value="${emp?.email||''}" placeholder="correo@empresa.com" /></div>
        <div class="field"><label>Teléfono</label><input id="fPhone" value="${emp?.phone||''}" placeholder="+57 300..." /></div>
      </div>
      <div class="form-row">
        <div class="field" style="position:relative;">
          <label style="display:flex; justify-content:space-between; align-items:center;">
            <span>Departamento</span>
            ${Auth.canManageEmployees() ? `
              <a href="#" onclick="Modal.close(); setTimeout(() => { window.location.hash = '#parameters'; }, 200); return false;" style="font-size:0.75rem; color:var(--primary-color); font-weight:600; text-decoration:none; display:flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 5v14M5 12h14"></path></svg>
                Gestionar
              </a>` : ''}
          </label>
          <select id="fDept"><option value="">Sin departamento</option>${depOpts}</select>
        </div>
        <div class="field"><label>N° Tarjeta M1</label><input id="fCard" value="${emp?.card_number||''}" placeholder="Opcional" ${emp?.qr_enabled ? 'readonly title="Gestionado por Gafete QR"' : ''} /></div>
      </div>
      <div class="form-row">
        <div class="field" style="display:flex; align-items:center;">
          <div style="display:flex; align-items:center; justify-content:space-between; background:var(--surface-3); padding:10px 16px; border-radius:10px; border:1px solid var(--border); width: 100%;">
            <span style="font-weight:600; color:var(--text-1); font-size: 0.85rem;">Habilitar Gafete / Código QR</span>
            <div style="display:flex; align-items:center; gap: 12px;">
              ${id && emp?.qr_enabled ? `<button type="button" class="btn btn-secondary" onclick="EmployeesPage.regenerateQR(${id})" style="padding: 4px 8px; font-size: 0.75rem; color: var(--danger); border-color: var(--danger); background: transparent;">Rotar/Regenerar</button>` : ''}
              <label class="toggle-switch">
                <input type="checkbox" id="fQrEnabled" ${emp?.qr_enabled ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>Horario de Trabajo</label>
          <select id="fScheduleId" onchange="EmployeesPage.onScheduleChange(this)">
            <option value="">Sin Horario / Personalizado (Definir abajo)</option>
            ${schedOpts}
          </select>
        </div>
        <div class="field">
          <label>Estado</label>
          <select id="fIsActive">
            <option value="true" ${emp ? (emp.is_active ? 'selected' : '') : 'selected'}>✅ Activo</option>
            <option value="false" ${emp ? (!emp.is_active ? 'selected' : '') : ''}>⛔ Inactivo</option>
          </select>
        </div>
      </div>
      <div class="form-row collapse-section" id="manualHoursRow" style="${emp?.schedule_id ? '' : 'max-height: 100px; opacity: 1; margin-bottom: 16px;'}">
        <div class="field"><label>Hora de Entrada</label><input id="fStart" type="time" value="${emp?.work_start_time||'07:00'}" /></div>
        <div class="field"><label>Hora de Salida</label><input id="fEnd" type="time" value="${emp?.work_end_time||'18:00'}" /></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="EmployeesPage.saveEmployee(${id||'null'})">Guardar</button>`);
  },

  onScheduleChange(selectEl) {
    const manualRow = document.getElementById('manualHoursRow');
    if (manualRow) {
      if (selectEl.value === "") {
        manualRow.style.maxHeight = '100px';
        manualRow.style.opacity = '1';
        manualRow.style.marginBottom = '16px';
      } else {
        manualRow.style.maxHeight = '0';
        manualRow.style.opacity = '0';
        manualRow.style.marginBottom = '0';
      }
    }
  },

  async saveEmployee(id) {
    const saveBtn = document.querySelector('button[onclick^="EmployeesPage.saveEmployee"]');
    if (saveBtn) saveBtn.classList.add('btn-loading');

    try {
      const first_name = document.getElementById('fFirstName').value.trim();
      const last_name = document.getElementById('fLastName').value.trim();
      const email = document.getElementById('fEmail').value.trim() || null;
      const phone = document.getElementById('fPhone').value.trim() || null;

      if (!first_name) {
        if (saveBtn) saveBtn.classList.remove('btn-loading');
        Toast.show('El nombre es obligatorio', 'warning');
        return;
      }
      if (!last_name) {
        if (saveBtn) saveBtn.classList.remove('btn-loading');
        Toast.show('El apellido es obligatorio', 'warning');
        return;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (saveBtn) saveBtn.classList.remove('btn-loading');
        Toast.show('El formato del correo electrónico no es válido', 'warning');
        return;
      }

      const schedId = document.getElementById('fScheduleId').value || null;
      let startTime = "07:00";
      let endTime = "18:00";
      
      if (schedId === null) {
        startTime = document.getElementById('fStart').value;
        endTime = document.getElementById('fEnd').value;
        if (startTime >= endTime) {
          if (saveBtn) saveBtn.classList.remove('btn-loading');
          Toast.show('La hora de entrada debe ser anterior a la hora de salida', 'warning');
          return;
        }
      }

      const empCode = document.getElementById('fCode').value.trim();
      if (!empCode) {
        if (saveBtn) saveBtn.classList.remove('btn-loading');
        Toast.show('El código de empleado es obligatorio', 'warning');
        return;
      }
      if (!/^\d+$/.test(empCode)) {
        if (saveBtn) saveBtn.classList.remove('btn-loading');
        Toast.show('El código de empleado debe contener únicamente números', 'error');
        return;
      }

      const body = {
        first_name: first_name,
        last_name: last_name,
        employee_code: empCode,
        position_id: document.getElementById('fPositionId').value ? parseInt(document.getElementById('fPositionId').value) : null,
        email: email,
        phone: phone,
        department_id: document.getElementById('fDept').value || null,
        schedule_id: schedId ? parseInt(schedId) : null,
        card_number: document.getElementById('fCard').value.trim() || null,
        qr_enabled: document.getElementById('fQrEnabled')?.checked || false,
        work_start_time: startTime,
        work_end_time: endTime,
        is_active: document.getElementById('fIsActive').value === 'true',
      };

      let savedEmp;
      if (id) {
        savedEmp = await API.put(`/api/employees/${id}`, body);
      } else {
        savedEmp = await API.post('/api/employees', body);
      }

      if (this.selectedPhotoFile) {
        const empId = id || savedEmp.id;
        const fd = new FormData();
        fd.append('file', this.selectedPhotoFile);
        try {
          await API.postForm(`/api/employees/${empId}/photo`, fd);
          Toast.show('Empleado y foto de rostro guardados con éxito', 'success');
        } catch(photoErr) {
          Toast.show(`Empleado guardado, pero falló la carga de foto: ${photoErr.message}`, 'warning');
        }
      } else {
        Toast.show('Empleado guardado con éxito', 'success');
      }

      Modal.close();
      this.loadTable();
    } catch(e) {
      if (saveBtn) saveBtn.classList.remove('btn-loading');
      Toast.show(e.message || 'Error desconocido al guardar', 'error');
      console.error(e);
    }
  },
  onPhotoSelected(event) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        Toast.show('Selecciona un archivo de imagen válido', 'error');
        return;
      }
      this.selectedPhotoFile = file;
      const previewImg = document.getElementById('fPhotoPreview');
      const placeholder = document.getElementById('fPhotoPlaceholder');
      const photoContainer = previewImg?.parentElement;
      if (previewImg) {
        previewImg.src = URL.createObjectURL(file);
        previewImg.style.display = 'block';
        if (photoContainer) {
          photoContainer.classList.remove('success-flash');
          void photoContainer.offsetWidth; // Force reflow
          photoContainer.classList.add('success-flash');
        }
      }
      if (placeholder) {
        placeholder.style.display = 'none';
      }
    }
  },

  async showBadge(id) {
    try {
      const emp = await API.get(`/api/employees/${id}`);
      if (!emp) return;
      if (!emp.card_number) {
        Toast.show("Este empleado no tiene código QR generado.", "error");
        return;
      }
      
      const settings = await API.get('/api/settings') || {};
      const companyName = settings.company_name || "Mi Empresa";
      const primaryColor = settings.primary_color || "#4f46e5";
      const logoPath = settings.logo_path || "";
      
      const photoSrc = emp.photo_path ? `/uploads/${emp.photo_path}?t=${new Date().getTime()}` : null;
      const initial = emp.first_name.charAt(0);
      
      Modal.open('Credencial / Gafete', `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <p style="font-size:0.8rem; color:var(--text-3); text-align:center; margin-bottom:20px;">
            Presiona el botón de abajo para imprimir esta credencial.
          </p>
          
          <!-- CONTENEDOR A IMPRIMIR (Tamaño CR80 - Tarjeta de PVC) -->
          <div id="printBadgeContainer" style="width: 213px; height: 338px; background: #fff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; position: relative; font-family: 'Inter', sans-serif; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <!-- Fondo Superior -->
            <div style="height: 120px; background: linear-gradient(135deg, ${primaryColor}, #312e81); position: relative; text-align: center; padding-top: 15px;">
              ${logoPath ? `<img src="${logoPath}" style="max-height:35px; max-width:80%; object-fit:contain; filter: brightness(0) invert(1);" />` : `<div style="color:#fff; font-weight:800; font-size:1.1rem; letter-spacing:-0.5px;">${companyName}</div>`}
              <div style="position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); width: 70px; height: 70px; border-radius: 50%; background: #fff; border: 3px solid #fff; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                ${photoSrc ? `<img src="${photoSrc}" style="width:100%; height:100%; object-fit:cover;" />` : `<div style="width:100%; height:100%; background:var(--surface-3); display:flex; align-items:center; justify-content:center; font-size:1.8rem; font-weight:bold; color:var(--text-3);">${initial}</div>`}
              </div>
            </div>
            
            <!-- Datos del empleado -->
            <div style="margin-top: 45px; text-align: center; padding: 0 15px;">
              <div style="font-weight: 800; font-size: 1.1rem; color: #0f172a; line-height: 1.1; margin-bottom: 4px;">${emp.first_name}<br/>${emp.last_name}</div>
              <div style="font-size: 0.75rem; font-weight: 600; color: ${primaryColor}; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">${emp.position?.name || 'EMPLEADO'}</div>
              
              ${settings.qr_badge_show_department && emp.department?.name ? `<div style="font-size: 0.65rem; color: #64748b; font-weight: 600; margin-bottom: 4px; line-height:1;">${emp.department.name}</div>` : ''}
              ${settings.qr_badge_show_blood_type ? `<div style="font-size: 0.65rem; color: #ef4444; font-weight: 800; margin-bottom: 10px; line-height:1; letter-spacing: 0.5px;">O+</div>` : ''}
              
              <!-- Contenedor del QR -->
              <div style="display:flex; justify-content:center; margin-bottom:8px;">
                <div id="qrcodeBadge" style="padding:4px; background:#fff; border-radius:8px; border:1px solid #e2e8f0;"></div>
              </div>
              
              <div style="font-size: 0.65rem; color: #64748b; font-family: monospace; font-weight: 600; letter-spacing:1px;">ID: ${emp.employee_code}</div>
            </div>
            
            <!-- Franja inferior -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 8px; background: ${primaryColor};"></div>
          </div>
        </div>
      `, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>
          <button class="btn btn-primary" onclick="window.print()" style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Imprimir
          </button>`);
          
      // Generar el código QR dentro del div correspondiente
      setTimeout(() => {
        new QRCode(document.getElementById("qrcodeBadge"), {
          text: emp.card_number,
          width: 70,
          height: 70,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      }, 50);
      
    } catch(e) {
      Toast.show(e.message, "error");
    }
  },

  async startWebcam() {
    const container = document.getElementById('webcamContainer');
    const video = document.getElementById('fWebcamVideo');
    if (!container || !video) return;
    
    if (this.webcamStream) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Toast.show('Acceso denegado: La cámara requiere HTTPS o configurar el origen seguro en el navegador.', 'error');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      this.webcamStream = stream;
      video.srcObject = stream;
      container.style.display = 'flex';
      Toast.show('WebCam iniciada', 'info');
    } catch (err) {
      Toast.show('No se pudo acceder a la WebCam: ' + err.message, 'error');
    }
  },

  stopWebcam() {
    const container = document.getElementById('webcamContainer');
    const video = document.getElementById('fWebcamVideo');
    if (container) container.style.display = 'none';
    if (video) video.srcObject = null;
    
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
  },

  captureWebcam() {
    const video = document.getElementById('fWebcamVideo');
    const canvas = document.getElementById('fWebcamCanvas');
    if (!video || !canvas || !this.webcamStream) return;
    
    const context = canvas.getContext('2d');
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0);
    
    canvas.toBlob(blob => {
      this.selectedPhotoFile = blob;
      
      const previewImg = document.getElementById('fPhotoPreview');
      const placeholder = document.getElementById('fPhotoPlaceholder');
      if (previewImg) {
        previewImg.src = URL.createObjectURL(blob);
        previewImg.style.display = 'block';
      }
      if (placeholder) {
        placeholder.style.display = 'none';
      }
      
      this.stopWebcam();
      Toast.show('Foto capturada con WebCam', 'success');
    }, 'image/jpeg', 0.9);
  },

  async captureFromDevice() {
    Toast.show('Conectando con la cámara del biométrico...', 'info');
    this.stopWebcam();
    
    try {
      const response = await fetch('/api/employees/device-capture', {
        headers: { 'Authorization': `Bearer ${API.token()}` }
      });
      
      if (!response.ok) {
        let msg = 'Error al capturar desde el dispositivo';
        try { msg = (await response.json()).detail || msg; } catch(e) { console.warn(e); }
        throw new Error(msg);
      }
      
      const blob = await response.blob();
      this.selectedPhotoFile = blob;
      
      const previewImg = document.getElementById('fPhotoPreview');
      const placeholder = document.getElementById('fPhotoPlaceholder');
      if (previewImg) {
        previewImg.src = URL.createObjectURL(blob);
        previewImg.style.display = 'block';
      }
      if (placeholder) {
        placeholder.style.display = 'none';
      }
      
      Toast.show('Foto capturada con éxito desde el biométrico', 'success');
    } catch(err) {
      Toast.show(err.message, 'error');
    }
  },

  async importFromDevice() {
    Modal.confirm(
      '¿Importar Empleados?',
      '¿Deseas importar todos los empleados registrados en el dispositivo biométrico? Esto agregará a los empleados nuevos y actualizará los existentes, junto con sus fotos de perfil.',
      async () => {
        // Abrir Modal de Progreso
        Modal.open(
          'Importando desde el Biométrico',
          `
          <div style="text-align: center; padding: 15px 10px;">
            <p style="font-weight: 600; font-size: 1.05rem; color: #1e293b; margin-bottom: 8px;">
              Sincronizando empleados y fotos de perfil...
            </p>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 20px;">
              Descargando imágenes de rostro desde el dispositivo. Por favor, no cierre esta ventana.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 9999px; height: 10px; width: 100%; overflow: hidden; margin-bottom: 12px; border: 1px solid #e2e8f0;">
              <div id="importProgressBar" style="background-color: var(--primary-color, #7c3aed); height: 100%; width: 0%; transition: width 0.4s ease;"></div>
            </div>
            <div id="importProgressPercent" style="font-weight: 700; font-size: 1.1rem; color: #1e293b;">0%</div>
          </div>
          `,
          ''
        );

        // Ocultar botón de cerrar modal para evitar cierres accidentales
        const closeBtn = document.getElementById('modalClose');
        if (closeBtn) closeBtn.style.display = 'none';

        // Iniciar progreso simulado mientras se realiza la consulta síncrona
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          if (currentProgress < 50) {
            currentProgress += Math.floor(Math.random() * 4) + 3; // Rápido al inicio
          } else if (currentProgress < 85) {
            currentProgress += Math.floor(Math.random() * 2) + 1; // Ralentiza a la mitad
          } else if (currentProgress < 95) {
            currentProgress += 0.4; // Muy lento cerca del final
          }
          
          const bar = document.getElementById('importProgressBar');
          const pct = document.getElementById('importProgressPercent');
          if (bar) bar.style.width = `${Math.min(currentProgress, 95)}%`;
          if (pct) pct.textContent = `${Math.floor(Math.min(currentProgress, 95))}%`;
        }, 250);

        try {
          const res = await API.post('/api/employees/import-from-device');
          clearInterval(progressInterval);

          // Completar al 100%
          const bar = document.getElementById('importProgressBar');
          const pct = document.getElementById('importProgressPercent');
          if (bar) bar.style.width = '100%';
          if (pct) pct.textContent = '100% - Completado';

          setTimeout(() => {
            Modal.close();
            if (closeBtn) closeBtn.style.display = '';
            
            if (res.status === 'success') {
              Toast.show(`Importación finalizada: ${res.imported} creados, ${res.updated} actualizados y ${res.photos_imported} fotos sincronizadas (Total: ${res.total_device_users} en dispositivo).`, 'success');
              this.loadTable();
            } else {
              Toast.show('Error al importar empleados', 'error');
            }
          }, 800);
        } catch(e) {
          clearInterval(progressInterval);
          Modal.close();
          if (closeBtn) closeBtn.style.display = '';
          Toast.show(e.message || 'Error de conexión', 'error');
        }
      },
      'warning'
    );
  },

  async deleteEmployee(id, name) {
    Modal.confirm(
      '¿Eliminar Empleado?',
      `¿Estás seguro de que deseas eliminar al empleado <strong>${name}</strong>? Esta acción no se puede deshacer y también intentará eliminarlo del dispositivo biométrico si está conectado.`,
      async () => {
        try {
          // Buscar la fila correspondiente en el DOM para aplicar animación de borrado
          const checkbox = document.querySelector(`.emp-checkbox[value="${id}"]`);
          const row = checkbox ? checkbox.closest('tr') : null;
          if (row) {
            row.classList.add('row-destroying');
            await new Promise(resolve => setTimeout(resolve, 400)); // wait for CSS animation
          }

          await API.delete(`/api/employees/${id}`);
          Toast.show('Empleado eliminado con éxito', 'success');
          this.loadTable();
        } catch(e) {
          Toast.show(e.message || 'Error al eliminar empleado', 'error');
        }
      },
      'danger'
    );
  },

  async syncEmployeeToDevice(id) {
    const syncBadge = document.getElementById(`sync-badge-${id}`);
    if (syncBadge) {
      syncBadge.classList.add('syncing-badge');
      syncBadge.innerHTML = `⟳ Syncing...`;
      syncBadge.style.pointerEvents = 'none';
    }

    Toast.show('Sincronizando empleado con el biométrico...', 'info');
    try {
      const res = await API.post(`/api/employees/${id}/sync-to-device`);
      if (res.ok) {
        Toast.show('Empleado sincronizado con éxito', 'success');
        this.loadTable();
      } else {
        if (syncBadge) {
          syncBadge.classList.remove('syncing-badge');
          syncBadge.innerHTML = `⚠️ Sin sync 🔄`;
          syncBadge.style.pointerEvents = '';
        }
        Toast.show(res.message || 'Error al sincronizar con el dispositivo', 'error');
      }
    } catch(e) {
      if (syncBadge) {
        syncBadge.classList.remove('syncing-badge');
        syncBadge.innerHTML = `⚠️ Sin sync 🔄`;
        syncBadge.style.pointerEvents = '';
      }
      Toast.show(e.message || 'Error de conexión', 'error');
    }
  },

  toggleSelectAll(master) {
    const checkboxes = document.querySelectorAll('.emp-checkbox');
    checkboxes.forEach(cb => cb.checked = master.checked);
    this.onRowCheckboxChange();
  },

  onRowCheckboxChange() {
    const checkboxes = document.querySelectorAll('.emp-checkbox');
    const selected = Array.from(checkboxes).filter(cb => cb.checked);
    const bar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('bulkCount');
    const master = document.getElementById('selectAllEmps');
    
    if (bar && count) {
      if (selected.length > 0) {
        bar.style.display = 'flex';
        count.textContent = `${selected.length} seleccionados`;
      } else {
        bar.style.display = 'none';
      }
    }
    
    if (master) {
      master.checked = checkboxes.length > 0 && selected.length === checkboxes.length;
    }
  },

  getSelectedEmployeeIds() {
    const checkboxes = document.querySelectorAll('.emp-checkbox');
    return Array.from(checkboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));
  },

  async applyBulkDept() {
    const ids = this.getSelectedEmployeeIds();
    if (!ids.length) return;
    const deptVal = document.getElementById('bulkDeptSelect').value;
    if (!deptVal) {
      Toast.show('Seleccione un departamento para aplicar', 'warning');
      return;
    }
    const deptId = parseInt(deptVal);
    
    Toast.show('Aplicando cambios...', 'info');
    try {
      await API.put('/api/employees/bulk-update', {
        employee_ids: ids,
        department_id: deptId
      });
      Toast.show('Departamento actualizado correctamente', 'success');
      await this.loadTable();
    } catch(e) {
      Toast.show(e.message || 'Error al aplicar departamento', 'error');
    }
  },

  async applyBulkSchedule() {
    const ids = this.getSelectedEmployeeIds();
    if (!ids.length) return;
    const schedVal = document.getElementById('bulkScheduleSelect').value;
    if (schedVal === '') {
      Toast.show('Seleccione un horario para aplicar', 'warning');
      return;
    }
    const scheduleId = schedVal === 'none' ? null : parseInt(schedVal);
    
    Toast.show('Aplicando cambios...', 'info');
    try {
      await API.put('/api/employees/bulk-update', {
        employee_ids: ids,
        schedule_id: scheduleId
      });
      Toast.show('Horario actualizado correctamente', 'success');
      await this.loadTable();
    } catch(e) {
      Toast.show(e.message || 'Error al aplicar horario', 'error');
    }
  },

  async applyBulkSync() {
    const ids = this.getSelectedEmployeeIds();
    if (!ids.length) return;
    
    Toast.show('Sincronizando empleados con el biométrico...', 'info');
    try {
      const res = await API.post('/api/employees/bulk-sync', {
        employee_ids: ids
      });
      if (res.failed > 0) {
        Toast.show(`Sincronización parcial: ${res.synced} exitosos, ${res.failed} fallidos.`, 'warning');
      } else {
        Toast.show(`Sincronizados ${res.synced} empleados con éxito.`, 'success');
      }
      await this.loadTable();
    } catch(e) {
      Toast.show(e.message || 'Error al sincronizar empleados', 'error');
    }
  },

  async applyBulkDelete() {
    const ids = this.getSelectedEmployeeIds();
    if (!ids.length) return;
    
    Modal.confirm(
      '¿Eliminar en Lote?',
      `¿Estás seguro de eliminar de forma permanente a los <strong>${ids.length}</strong> empleados seleccionados? Esta acción eliminará sus rostros del biométrico y sus archivos locales de fotos de perfil.`,
      async () => {
        Toast.show('Eliminando empleados...', 'info');
        try {
          const res = await API.post('/api/employees/bulk-delete', {
            employee_ids: ids
          });
          Toast.show(`Eliminados ${res.deleted_count} empleados correctamente.`, 'success');
          await this.loadTable();
        } catch(e) {
          Toast.show(e.message || 'Error al eliminar empleados', 'error');
        }
      },
      'warning'
    );
  },

  // ── Perfil de Asistencia por Empleado ──────────────────────────────────────
  async showProfile(employeeId) {
    Toast.show('Cargando perfil...', 'info');
    try {
      const d = await API.get(`/api/employees/${employeeId}/attendance-summary`);
      const emp = d.employee;
      const stats = d.stats;
      const period = d.period;
      const records = d.recent_records || [];

      const avatar = emp.photo_path
        ? `<img src="/uploads/${emp.photo_path}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid rgba(var(--accent-rgb),0.3);">`
        : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;color:#fff;border:3px solid rgba(var(--accent-rgb),0.2);">${emp.full_name.charAt(0)}</div>`;

      const statBar = (label, value, max, color) => {
        const pct = Math.round(((value||0) / (max||1)) * 100);
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:.78rem;font-weight:600;color:var(--text-2);">${label}</span>
              <span style="font-size:.78rem;font-weight:700;color:var(--text-1);">${value}</span>
            </div>
            <div style="height:6px;background:var(--surface-3);border-radius:99px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;transition:width .8s cubic-bezier(.4,0,.2,1);"></div>
            </div>
          </div>`;
      };

      const eventTypeLabel = (type, isLate) => {
        const icon = type === 'entry'
          ? `<span style="color:var(--success);">▲ Entrada</span>`
          : `<span style="color:var(--danger);">▼ Salida</span>`;
        const late = isLate ? ` <span style="color:var(--warning);font-size:.7rem;font-weight:700;">TARDE</span>` : '';
        return icon + late;
      };

      // SVG Circle math for donut chart
      const radius = 28;
      const circumference = 2 * Math.PI * radius;
      const rate = stats.attendance_rate || 0;
      const strokeDashoffset = circumference - (rate / 100) * circumference;
      const chartColor = rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)';

      const html = `
        <!-- Cabecera del perfil -->
        <div style="display:flex;gap:16px;align-items:center;padding:24px;background:var(--surface-1);border-radius:16px;margin-bottom:20px;box-shadow:0 4px 20px rgba(0,0,0,0.03);border:1px solid var(--border);">
          ${avatar}
          <div style="flex:1;min-width:0;">
            <div style="font-size:1.25rem;font-weight:800;color:var(--text-1);">${emp.full_name}</div>
            <div style="font-size:.85rem;color:var(--text-3);margin-top:2px;">${emp.position} · ${emp.department}</div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
              <span class="badge" style="background:var(--surface-3);color:var(--text-2);display:flex;align-items:center;gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${emp.schedule}
              </span>
              <span class="badge ${emp.is_active ? 'badge-green' : 'badge-red'}" style="display:flex;align-items:center;gap:4px;">
                ${emp.is_active ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Activo' : '⛔ Inactivo'}
              </span>
              <code style="background:var(--surface-3);color:var(--text-2);padding:2px 8px;border-radius:5px;font-size:.75rem;font-family:'JetBrains Mono',monospace;">ID: ${emp.employee_code}</code>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; background:var(--surface-2); border-radius:12px; border:1px solid var(--border); width:120px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02);">
            <div style="position:relative; width:64px; height:64px; display:flex; align-items:center; justify-content:center;">
              <svg width="64" height="64" viewBox="0 0 64 64" style="transform: rotate(-90deg);">
                <!-- Background circle -->
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--surface-3)" stroke-width="6" />
                <!-- Progress circle -->
                <circle cx="32" cy="32" r="28" fill="none" stroke="${chartColor}" stroke-width="6" stroke-linecap="round" 
                  stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" 
                  style="transition: stroke-dashoffset 1s ease-in-out;" />
              </svg>
              <div style="position:absolute; font-size:.9rem; font-weight:800; color:${chartColor};">${rate}%</div>
            </div>
            <div style="font-size:.7rem;color:var(--text-3);font-weight:700;margin-top:6px;text-transform:uppercase;letter-spacing:0.05em;">Asistencia</div>
          </div>
        </div>

        <!-- Período -->
        <div style="font-size:.75rem;color:var(--text-3);font-weight:700;text-align:center;margin-bottom:16px;letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:10px;">
          <div style="height:1px;background:var(--border);flex:1;max-width:50px;"></div>
          Últimos 30 días · ${period.date_from} al ${period.date_to}
          <div style="height:1px;background:var(--border);flex:1;max-width:50px;"></div>
        </div>

        <!-- Stats KPIs con íconos -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          ${[
            {label:'Presentes', value: stats.days_present, color:'var(--success)', bg:'rgba(0,230,118,.1)', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'},
            {label:'Ausentes', value: stats.days_absent, color:'#f43f5e', bg:'rgba(244,63,94,.1)', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'},
            {label:'Tardanzas', value: stats.days_late, color:'#f59e0b', bg:'rgba(245,158,11,.1)', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'},
            {label:'Horas totales', value: stats.total_hours_worked > 0 ? stats.total_hours_worked + 'h' : '-', color:'var(--text-2)', bg:'var(--surface-2)', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'},
          ].map(k => `
            <div style="padding:16px;background:${k.bg};border-radius:12px;border:1px solid rgba(0,0,0,.02);display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform 0.2s;cursor:default;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="color:${k.color};margin-bottom:8px;opacity:0.9;">${k.icon}</div>
              <div style="font-size:1.5rem;font-weight:800;color:${k.color};line-height:1;">${k.value}</div>
              <div style="font-size:.72rem;color:var(--text-3);font-weight:600;margin-top:6px;text-transform:uppercase;letter-spacing:0.02em;">${k.label}</div>
            </div>`).join('')}
        </div>

        <!-- Últimos registros -->
        <div style="border-top:1px solid var(--border);padding-top:20px;">
          <div style="font-size:.8rem;font-weight:700;color:var(--text-2);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:6px;">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
             Últimos Registros del Dispositivo
          </div>
          ${records.length === 0
            ? `<div style="text-align:center;padding:24px;background:var(--surface-2);border-radius:10px;color:var(--text-3);font-size:.86rem;font-weight:500;">Sin registros recientes</div>`
            : `<div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:12px;box-shadow:inset 0 2px 10px rgba(0,0,0,0.01);">
                <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
                  <thead>
                    <tr>
                      <th style="position:sticky;top:0;z-index:10;background:#ffffff;padding:10px 14px;text-align:left;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);">Fecha y hora</th>
                      <th style="position:sticky;top:0;z-index:10;background:#ffffff;padding:10px 14px;text-align:left;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);">Tipo</th>
                      <th style="position:sticky;top:0;z-index:10;background:#ffffff;padding:10px 14px;text-align:left;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${records.map(r => {
                      const dt = new Date(r.event_time);
                      const dateStr = dt.toLocaleDateString('es-PE', {day:'2-digit',month:'short',year:'2-digit'});
                      const timeStr = dt.toLocaleTimeString('es-PE', {hour:'2-digit',minute:'2-digit',hour12:false});
                      return `<tr style="border-bottom:1px solid var(--border);transition:background 0.2s;" onmouseover="this.style.background='var(--surface-1)'" onmouseout="this.style.background='transparent'">
                        <td style="padding:10px 14px;font-family:'JetBrains Mono',monospace;font-size:.78rem;"><span style="color:var(--text-3);">${dateStr}</span> <strong>${timeStr}</strong></td>
                        <td style="padding:10px 14px;font-weight:600;">${eventTypeLabel(r.event_type, r.is_late)}</td>
                        <td style="padding:10px 14px;color:var(--text-3);font-size:.75rem;">${r.auth_method}</td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>`}
        </div>`;

      Modal.open(`Perfil · ${emp.full_name}`, html, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`);
      const modalEl = document.querySelector('#modalOverlay .modal');
      if (modalEl) modalEl.style.maxWidth = '680px';

    } catch(err) {
      Toast.show('Error al cargar el perfil: ' + err.message, 'error');
    }
  }
};
