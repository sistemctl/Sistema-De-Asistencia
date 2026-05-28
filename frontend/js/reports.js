/* reports.js — Módulo unificado e interactivo de Reportes y Analítica Premium */

const ReportsPage = {
  currentTab: 'general',
  doughnutChart: null,
  lineChart: null,

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <style>

        /* Estilos para el Selector de Búsqueda Dinámica */
        .searchable-select-item {
          padding: 8px 12px;
          font-size: 0.82rem;
          color: var(--text-2);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .searchable-select-item:hover {
          background: var(--accent);
          color: var(--bg-base) !important;
        }
        .searchable-select-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .searchable-select-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .searchable-select-dropdown::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }
      </style>

      <!-- ── TARJETA 1: FILTROS DE CONSULTA ── -->
      <div class="card" style="margin-bottom: 24px; overflow: visible; z-index: 10;">
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          Filtros de Búsqueda
        </div>
        
        <div class="grid-4" style="gap: 16px; align-items: flex-end; margin-bottom: 16px;">
          <!-- Selector Dinámico de Empleado (Búsqueda Dinámica) -->
          <div class="field" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Filtrar por Empleado</label>
            <div class="searchable-select-wrapper" style="position: relative; width: 100%;">
              <input type="text" id="repFilterEntityInput" placeholder="🔍 Todos los empleados" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-1);" autocomplete="off" />
              <input type="hidden" id="repFilterEntity" value="" />
              <div class="searchable-select-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <!-- Se llena dinámicamente -->
              </div>
            </div>
          </div>
          
          <!-- Selector Departamento -->
          <div class="field" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Departamento</label>
            <select id="repFilterDepartment" onchange="ReportsPage.onDropdownFilterChange()" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
              <option value="">🏢 Todos los departamentos</option>
            </select>
          </div>

          <!-- Selector Cargo -->
          <div class="field" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Cargo</label>
            <select id="repFilterPosition" onchange="ReportsPage.onDropdownFilterChange()" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
              <option value="">💼 Todos los cargos</option>
            </select>
          </div>

          <!-- Selector Horario -->
          <div class="field" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Horario</label>
            <select id="repFilterSchedule" onchange="ReportsPage.onDropdownFilterChange()" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
              <option value="">🕒 Todos los horarios</option>
            </select>
          </div>
        </div>

        <div class="grid-4" style="gap: 16px; align-items: flex-end;">
          <!-- Selector Granularidad -->
          <div class="field" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Granularidad / Vista</label>
            <select id="repGranularity" onchange="ReportsPage.onGranularityChange()" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
              <option value="daily">📅 Vista Diaria</option>
              <option value="weekly">📅 Vista Semanal</option>
              <option value="monthly">📅 Vista Mensual</option>
            </select>
          </div>
          
          <!-- Selector de Rango de Fechas Único -->
          <div class="field" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Rango de Fechas</label>
            <input type="text" id="unifiedDateRange" placeholder="Seleccionar rango de fechas..." style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);" />
          </div>

          <!-- Espaciador -->
          <div class="field" style="margin: 0;"></div>
          
          <!-- Botón Buscar -->
          <div>
            <button class="btn btn-primary" onclick="ReportsPage.onFilterChange()" style="width: 100%; height: 38px; border-radius: 8px; font-weight: 600;">
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      <!-- ── TARJETA 2: ACCIONES DE EXPORTACIÓN Y DESCARGA ── -->
      <div class="card" style="margin-bottom: 24px;">
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Exportación de Reportes
        </div>
        
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-success" onclick="ReportsPage.exportReport('excel')" style="flex: 1; min-width: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 0.82rem; padding: 12px;">
            <span>📊</span> Descargar Excel Detallado
          </button>
          <button class="btn btn-primary" onclick="ReportsPage.exportReport('pdf')" style="flex: 1; min-width: 200px; background: var(--accent); border-color: var(--accent); color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 0.82rem; padding: 12px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.15);">
            <span>📄</span> Descargar PDF Imprimible
          </button>
          <button class="btn btn-success" onclick="ReportsPage.exportConsolidated()" style="flex: 1; min-width: 200px; background: rgba(0, 230, 118, 0.08); border-color: rgba(0, 230, 118, 0.25); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 0.82rem; padding: 12px;">
            <span>📅</span> Descargar Consolidado Diario
          </button>
        </div>
      </div>

      <div id="repAnalyticsDashboard">
        <!-- ── TARJETAS DE KPI PREMIUM REDISEÑADAS ── -->
        <div class="grid-4" style="margin-bottom: 24px;">
          <div class="kpi-card" style="--accent-color:var(--accent);">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div class="kpi-value" id="anTasaAsistencia">-</div>
            <div class="kpi-label">Puntualidad General</div>
            <div class="kpi-sub">Entradas sin tardanza en el período</div>
          </div>
          
          <div class="kpi-card" style="--accent-color:var(--warning);">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div class="kpi-value" id="anTotalTardanzas">-</div>
            <div class="kpi-label">Total Tardanzas</div>
            <div class="kpi-sub">Registros marcados como tarde</div>
          </div>
          
          <div class="kpi-card" style="--accent-color:var(--success);">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div class="kpi-value" id="anPromedioEntrada">-</div>
            <div class="kpi-label">Hora Promedio Entrada</div>
            <div class="kpi-sub">Frecuencia promedio de llegada</div>
          </div>
          
          <div class="kpi-card" style="--accent-color:var(--accent-2);">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div class="kpi-value" id="anDiaCritico">-</div>
            <div class="kpi-label">Día Crítico</div>
            <div class="kpi-sub">Día de la semana con más retrasos</div>
          </div>
        </div>

        <!-- ── GRÁFICOS ANALÍTICOS SINCRONIZADOS ── -->
        <div class="grid-2" style="margin-bottom: 24px;">
          <div class="card" style="margin:0;">
            <div class="card-header">
              <div>
                <div class="card-title">Distribución del Estado de Asistencia</div>
                <div class="card-sub">Resumen porcentual del comportamiento del personal</div>
              </div>
            </div>
            <div class="chart-container" style="height:250px;"><canvas id="anDoughnutChart"></canvas></div>
          </div>
          
          <div class="card" style="margin:0;">
            <div class="card-header">
              <div>
                <div class="card-title">Tendencia de Asistencia Diaria</div>
                <div class="card-sub">Evolución de puntualidad y retrasos a lo largo del tiempo</div>
              </div>
            </div>
            <div class="chart-container" style="height:250px;"><canvas id="anLineChart"></canvas></div>
          </div>
        </div>
      </div>

      <!-- ── TABLA COMPARATIVA DE ANALÍTICAS ── -->
      <div id="repAnalyticsTableContainer" style="display:none; margin-bottom: 24px;"></div>

      <!-- ── TABLA INTERACTIVA DE VISUALIZACIÓN DE REGISTROS ── -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Detalle de Registros del Reporte
            </div>
            <div class="card-sub">Registros estructurados según el tipo de horario del empleado y la granularidad seleccionada</div>
          </div>
        </div>

        <div class="table-wrap" style="margin-top:16px;">
          <table>
            <thead id="repTableHead">
              <!-- Generado dinámicamente -->
            </thead>
            <tbody id="repTableBody">
              <tr>
                <td colspan="10" style="text-align:center; color:var(--text-3); padding: 40px 20px;">
                  <div class="spinner" style="margin: 0 auto 12px;"></div>
                  Cargando reporte estructurado...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="pagination" id="repPagination" style="margin-top:16px;"></div>
      </div>
    `;

    // Fechas por defecto (últimos 30 días)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Inicializar el selector de fechas unificado
    flatpickr("#unifiedDateRange", { 
      mode: "range", 
      locale: "es", 
      showMonths: 1,
      dateFormat: "Y-m-d", 
      altInput: true, 
      altFormat: "d M Y", 
      defaultDate: [thirtyDaysAgo, todayStr],
      onClose: () => {
        // Se ejecuta cuando el selector de calendario se cierra
        ReportsPage.onFilterChange();
      }
    });

    // Cargar todas las opciones de los dropdowns y autocomplete
    await this.loadDropdownOptions();

    // Configurar listeners del buscador dinámico
    const input = document.getElementById('repFilterEntityInput');
    const dropdown = document.querySelector('.searchable-select-dropdown');
    
    if (input && dropdown) {
      input.addEventListener('focus', () => {
        const available = this.getFilteredEmployees();
        this.renderSearchableSelectItems(available);
        dropdown.style.display = 'block';
      });

      input.addEventListener('input', (e) => {
        const query = e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const available = this.getFilteredEmployees();
        if (!query) {
          this.renderSearchableSelectItems(available);
        } else {
          const filtered = available.filter(item => item.searchable.includes(query));
          this.renderSearchableSelectItems(filtered);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Intentar seleccionar la primera coincidencia que no sea "Todos"
          const firstItem = dropdown.querySelector('.searchable-select-item:not(.all-option)');
          const allItem = dropdown.querySelector('.searchable-select-item');
          const targetItem = firstItem || allItem;
          if (targetItem) {
            targetItem.click();
          }
        }
      });

      // Ocultar dropdown al hacer clic fuera
      document.addEventListener('click', (e) => {
        const wrapper = document.querySelector('.searchable-select-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
          dropdown.style.display = 'none';
          
          // Reestablecer texto si lo dejó vacío o escribió algo no coincidente
          const hiddenVal = document.getElementById('repFilterEntity')?.value;
          if (!hiddenVal) {
            input.value = '';
          } else {
            const currentObj = this.filterOptionsData.find(x => x.id == hiddenVal);
            if (currentObj) {
              input.value = currentObj.text;
            }
          }
        }
      });
    }

    // Carga inicial sincronizada
    await this.loadAnalytics();
    await this.loadReportTable(1);
  },

  filterOptionsData: [],

  async loadDropdownOptions() {
    const input = document.getElementById('repFilterEntityInput');
    const hidden = document.getElementById('repFilterEntity');
    const dropdown = document.querySelector('.searchable-select-dropdown');
    if (!input || !dropdown) return;

    hidden.value = '';
    input.value = '';
    input.placeholder = '👤 Todos los empleados';

    this.filterOptionsData = [];

    try {
      // 1. Cargar Departamentos
      const depts = await API.get('/api/employees/departments') || [];
      const deptSel = document.getElementById('repFilterDepartment');
      if (deptSel) {
        deptSel.innerHTML = '<option value="">🏢 Todos los departamentos</option>' + 
          depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      }

      // 2. Cargar Cargos
      const positions = await API.get('/api/employees/positions') || [];
      const posSel = document.getElementById('repFilterPosition');
      if (posSel) {
        posSel.innerHTML = '<option value="">💼 Todos los cargos</option>' + 
          positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      }

      // 3. Cargar Horarios
      const schedules = await API.get('/api/schedules') || [];
      const schedSel = document.getElementById('repFilterSchedule');
      if (schedSel) {
        schedSel.innerHTML = '<option value="">🕒 Todos los horarios</option>' + 
          schedules.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }

      // 4. Cargar Empleados para buscador dinámico (con límite ampliado para evitar truncamiento)
      const emps = await API.get('/api/employees?limit=5000') || [];
      this.filterOptionsData = emps.map(e => {
        const fullName = `${e.first_name} ${e.last_name} ${e.employee_code}`;
        const searchable = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return {
          id: e.id,
          text: `👤 ${e.first_name} ${e.last_name} (${e.employee_code})`,
          searchable,
          department_id: e.department_id,
          position_id: e.position_id,
          schedule_id: e.schedule_id
        };
      });

      this.renderSearchableSelectItems(this.filterOptionsData);

    } catch(e) {
      console.error('Error al cargar opciones de filtro de entidad', e);
      Toast.show('Error al cargar opciones de filtro', 'error');
    }
  },

  getFilteredEmployees() {
    const deptId = document.getElementById('repFilterDepartment')?.value;
    const posId = document.getElementById('repFilterPosition')?.value;
    const schedId = document.getElementById('repFilterSchedule')?.value;
    
    let list = this.filterOptionsData;
    if (deptId) list = list.filter(e => e.department_id == deptId);
    if (posId) list = list.filter(e => e.position_id == posId);
    if (schedId) list = list.filter(e => e.schedule_id == schedId);
    return list;
  },

  onDropdownFilterChange() {
    // Al cambiar departamento, cargo o turno, opcionalmente limpiamos la selección del empleado si no pertenece a la nueva selección.
    const hiddenVal = document.getElementById('repFilterEntity')?.value;
    if (hiddenVal) {
      const currentObj = this.filterOptionsData.find(x => x.id == hiddenVal);
      if (currentObj) {
        const deptId = document.getElementById('repFilterDepartment')?.value;
        const posId = document.getElementById('repFilterPosition')?.value;
        const schedId = document.getElementById('repFilterSchedule')?.value;
        
        let isValid = true;
        if (deptId && currentObj.department_id != deptId) isValid = false;
        if (posId && currentObj.position_id != posId) isValid = false;
        if (schedId && currentObj.schedule_id != schedId) isValid = false;
        
        if (!isValid) {
          document.getElementById('repFilterEntity').value = '';
          document.getElementById('repFilterEntityInput').value = '';
          document.getElementById('repFilterEntityInput').placeholder = '👤 Todos los empleados';
        }
      }
    }
    
    this.onFilterChange();
  },

  renderSearchableSelectItems(items) {
    const dropdown = document.querySelector('.searchable-select-dropdown');
    const input = document.getElementById('repFilterEntityInput');
    const hidden = document.getElementById('repFilterEntity');
    if (!dropdown) return;

    dropdown.innerHTML = '';

    // Opción por defecto (Todos)
    const allText = '👤 Todos los empleados';

    const allDiv = document.createElement('div');
    allDiv.className = 'searchable-select-item all-option';
    allDiv.textContent = allText;
    allDiv.addEventListener('click', () => {
      input.value = '';
      input.placeholder = allText;
      hidden.value = '';
      dropdown.style.display = 'none';
      ReportsPage.onFilterChange();
    });
    dropdown.appendChild(allDiv);

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'searchable-select-item';
      div.textContent = item.text;
      div.addEventListener('click', () => {
        input.value = item.text;
        hidden.value = item.id;
        dropdown.style.display = 'none';
        ReportsPage.onFilterChange();
      });
      dropdown.appendChild(div);
    });
  },

  async loadComparativeAnalytics() {
    const container = document.getElementById('repAnalyticsTableContainer');
    if (!container) return;

    const getEntityHeader = () => {
      if (this.currentTab === 'general') return 'Empleado';
      if (this.currentTab === 'departments') return 'Departamento';
      if (this.currentTab === 'positions') return 'Cargo';
      if (this.currentTab === 'schedules') return 'Horario';
      return 'Nombre';
    };

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title" style="font-size: 1.1rem; color: var(--accent);">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Tabla Comparativa de Analíticas
            </div>
            <div class="card-sub">Resumen de puntualidad y métricas clave de todos los elementos en el periodo seleccionado</div>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th style="padding: 12px 16px;">${getEntityHeader()}</th>
                <th style="text-align:center; padding: 12px 16px;">Puntualidad</th>
                <th style="text-align:center; padding: 12px 16px;">Total Tardanzas</th>
                <th style="text-align:center; padding: 12px 16px;">Hora Promedio Entrada</th>
                <th style="text-align:center; padding: 12px 16px;">Día Crítico</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" style="text-align:center; color:var(--text-3); padding: 40px 20px;">
                  <div class="spinner" style="margin: 0 auto 12px;"></div>
                  Cargando métricas comparativas...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const { date_from, date_to } = this.getDates();
    let entities = [];

    try {
      let emps = await API.get('/api/employees?limit=5000') || [];
      const deptId = document.getElementById('repFilterDepartment')?.value;
      const posId = document.getElementById('repFilterPosition')?.value;
      const schedId = document.getElementById('repFilterSchedule')?.value;
      
      if (deptId) emps = emps.filter(e => e.department_id == deptId);
      if (posId) emps = emps.filter(e => e.position_id == posId);
      if (schedId) emps = emps.filter(e => e.schedule_id == schedId);
      
      entities = emps;

      if (!entities.length) {
        container.querySelector('tbody').innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; color:var(--text-3); padding: 30px 20px;">
              No hay elementos registrados para mostrar.
            </td>
          </tr>
        `;
        return;
      }

      const promises = entities.map(async (ent) => {
        let params = new URLSearchParams();
        if (date_from) params.set('date_from', date_from);
        if (date_to) params.set('date_to', date_to);

        if (this.currentTab === 'general') {
          params.set('search', ent.employee_code);
        } else if (this.currentTab === 'departments') {
          params.set('department_id', ent.id);
        } else if (this.currentTab === 'positions') {
          params.set('position_id', ent.id);
        } else if (this.currentTab === 'schedules') {
          params.set('schedule_id', ent.id);
        }

        try {
          const data = await API.get(`/api/reports/analytics?${params}`);
          return {
            name: this.currentTab === 'general' ? `${ent.first_name} ${ent.last_name}` : ent.name,
            code: this.currentTab === 'general' ? ent.employee_code : null,
            punctuality: data.kpis.punctuality_rate,
            lates: data.kpis.total_lates,
            avg_entry: data.kpis.avg_entry_time,
            critical: data.kpis.critical_day
          };
        } catch (err) {
          return {
            name: this.currentTab === 'general' ? `${ent.first_name} ${ent.last_name}` : ent.name,
            code: this.currentTab === 'general' ? ent.employee_code : null,
            punctuality: '0%',
            lates: 0,
            avg_entry: '--:--',
            critical: 'Ninguno'
          };
        }
      });

      const results = await Promise.all(promises);

      const tbody = container.querySelector('tbody');
      tbody.innerHTML = results.map(r => {
        const rateVal = parseFloat(r.punctuality);
        let badgeClass = 'badge-gray';
        if (!isNaN(rateVal)) {
          if (rateVal >= 90) badgeClass = 'badge-green';
          else if (rateVal >= 70) badgeClass = 'badge-yellow';
          else badgeClass = 'badge-red';
        }
        return `
          <tr style="transition: background 0.2s;">
            <td style="font-weight:600; color:var(--text-1); padding: 12px 16px;">
              ${r.name} ${r.code ? `<code style="background:var(--surface-3);padding:2px 6px;border-radius:4px;font-size:.7rem;margin-left:8px;font-family:'JetBrains Mono',monospace;">${r.code}</code>` : ''}
            </td>
            <td style="text-align:center; padding: 12px 16px;">
              <span class="badge ${badgeClass}">${r.punctuality}</span>
            </td>
            <td style="text-align:center; font-weight:600; color:var(--text-2); font-family:'JetBrains Mono',monospace; padding: 12px 16px;">
              ${r.lates}
            </td>
            <td style="text-align:center; color:var(--text-2); font-family:'JetBrains Mono',monospace; padding: 12px 16px;">
              ${r.avg_entry}
            </td>
            <td style="text-align:center; color:var(--text-2); padding: 12px 16px;">
              ${r.critical}
            </td>
          </tr>
        `;
      }).join('');

    } catch (e) {
      console.error('Error al generar la tabla comparativa', e);
      container.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:var(--danger); padding: 20px;">
            Error al generar los datos de la tabla comparativa.
          </td>
        </tr>
      `;
    }
  },

  // Obtiene las fechas del Flatpickr unificado
  getDates() {
    const range = document.getElementById('unifiedDateRange').value;
    const res = { date_from: '', date_to: '' };
    if (range) {
      const dates = range.split(range.includes(' a ') ? ' a ' : ' to ');
      if (dates.length > 0 && dates[0]) res.date_from = dates[0].trim();
      if (dates.length > 1 && dates[1]) res.date_to = dates[1].trim();
      else if (dates.length === 1 && dates[0]) res.date_to = dates[0].trim();
    }
    return res;
  },

  // Evento al cambiar la selección del filtro principal o presionar filtrar
  async onFilterChange() {
    const filterVal = document.getElementById('repFilterEntity')?.value || '';
    const dashboard = document.getElementById('repAnalyticsDashboard');
    const compTable = document.getElementById('repAnalyticsTableContainer');

    if (filterVal === '') {
      // Ocultar dashboard individual, mostrar tabla comparativa
      if (dashboard) dashboard.style.display = 'none';
      if (compTable) compTable.style.display = 'block';
      await this.loadComparativeAnalytics();
    } else {
      // Mostrar dashboard individual, ocultar tabla comparativa
      if (dashboard) dashboard.style.display = 'block';
      if (compTable) compTable.style.display = 'none';
      await this.loadAnalytics();
    }

    await this.loadReportTable(1);
  },

  // Evento al cambiar la granularidad (Diario, Semanal, Mensual)
  async onGranularityChange() {
    // Al cambiar la granularidad, refrescamos la tabla con la nueva estructura
    await this.loadReportTable(1);
  },

  // Carga KPIs y Gráficos Sincronizados
  async loadAnalytics() {
    try {
      const filterVal = document.getElementById('repFilterEntity')?.value || '';
      const { date_from, date_to } = this.getDates();
      
      const params = new URLSearchParams();
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      if (filterVal) {
        const text = document.getElementById('repFilterEntityInput')?.value || '';
        const match = text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          params.set('search', match[1]);
        }
      }
      
      const deptId = document.getElementById('repFilterDepartment')?.value;
      const posId = document.getElementById('repFilterPosition')?.value;
      const schedId = document.getElementById('repFilterSchedule')?.value;
      if (deptId) params.set('department_id', deptId);
      if (posId) params.set('position_id', posId);
      if (schedId) params.set('schedule_id', schedId);

      const data = await API.get(`/api/reports/analytics?${params}`);

      // Actualizar valores de los KPIs en la UI
      document.getElementById('anTasaAsistencia').textContent = data.kpis.punctuality_rate;
      document.getElementById('anTotalTardanzas').textContent = data.kpis.total_lates;
      document.getElementById('anPromedioEntrada').textContent = data.kpis.avg_entry_time;
      document.getElementById('anDiaCritico').textContent = data.kpis.critical_day;

      // Renderizar Doughnut Chart
      const dCanvas = document.getElementById('anDoughnutChart');
      if (dCanvas) {
        const dCtx = dCanvas.getContext('2d');
        if (this.doughnutChart) this.doughnutChart.destroy();
        this.doughnutChart = new Chart(dCtx, {
          type: 'doughnut',
          data: {
            labels: ['A tiempo', 'Tardanza', 'Ausente', 'Licencia'],
            datasets: [{
              data: [
                data.distribution.ontime, 
                data.distribution.late, 
                data.distribution.absent, 
                data.distribution.leaves
              ],
              backgroundColor: [
                'rgba(0, 230, 118, 0.85)', // Cyan/Cian success
                'rgba(255, 179, 0, 0.85)',  // Yellow warning
                'rgba(255, 61, 0, 0.85)',   // Red danger
                'rgba(170, 0, 255, 0.85)'   // Purple accent
              ],
              borderColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: '#cbd5e1',
                  font: { family: 'Plus Jakarta Sans', size: 10, weight: 600 }
                }
              }
            },
            cutout: '72%'
          }
        });
      }

      // Renderizar Line Chart
      const lCanvas = document.getElementById('anLineChart');
      if (lCanvas) {
        const lCtx = lCanvas.getContext('2d');
        if (this.lineChart) this.lineChart.destroy();

        const gradPresent = lCtx.createLinearGradient(0, 0, 0, 200);
        gradPresent.addColorStop(0, 'rgba(0, 230, 118, 0.2)');
        gradPresent.addColorStop(1, 'rgba(0, 230, 118, 0.0)');

        const gradLate = lCtx.createLinearGradient(0, 0, 0, 200);
        gradLate.addColorStop(0, 'rgba(255, 179, 0, 0.2)');
        gradLate.addColorStop(1, 'rgba(255, 179, 0, 0.0)');

        this.lineChart = new Chart(lCtx, {
          type: 'line',
          data: {
            labels: data.trend.labels,
            datasets: [
              {
                label: 'A tiempo',
                data: data.trend.present,
                borderColor: 'rgba(0, 230, 118, 0.9)',
                backgroundColor: gradPresent,
                fill: true,
                tension: 0.3,
                borderWidth: 2
              },
              {
                label: 'Tardanzas',
                data: data.trend.late,
                borderColor: 'rgba(255, 179, 0, 0.9)',
                backgroundColor: gradLate,
                fill: true,
                tension: 0.3,
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: '#cbd5e1',
                  font: { family: 'Plus Jakarta Sans', size: 10, weight: 600 }
                }
              }
            },
            scales: {
              x: { 
                ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9, weight: 500 } }, 
                grid: { color: 'rgba(255,255,255,.015)' } 
              },
              y: { 
                ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9, weight: 500 }, stepSize: 1 }, 
                grid: { color: 'rgba(255,255,255,.015)' } 
              }
            }
          }
        });
      }
    } catch(e) {
      console.error(e);
      Toast.show('Error al refrescar analíticas', 'error');
    }
  },

  // Carga la Tabla de Datos según los Filtros Unificados
  reportPage: 1,

  async loadReportTable(page = 1) {
    this.reportPage = page;
    const filterVal = document.getElementById('repFilterEntity')?.value || '';
    const repGranularity = document.getElementById('repGranularity').value;
    const { date_from, date_to } = this.getDates();
    
    const params = new URLSearchParams({
      page: this.reportPage,
      page_size: 15,
      granularity: repGranularity
    });

    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);

    if (filterVal) params.set('employee_id', filterVal);
    
    const deptId = document.getElementById('repFilterDepartment')?.value;
    const posId = document.getElementById('repFilterPosition')?.value;
    const schedId = document.getElementById('repFilterSchedule')?.value;
    if (deptId) params.set('department_id', deptId);
    if (posId) params.set('position_id', posId);
    if (schedId) params.set('schedule_id', schedId);

    const tbody = document.getElementById('repTableBody');
    tbody.innerHTML = Array.from({length: 4}).map(() => `<tr>
      <td colspan="10"><div class="skeleton sk-text w-100" style="height:22px; margin:4px 0;"></div></td>
    </tr>`).join('');

    try {
      const data = await API.get(`/api/reports/report?${params}`);
      const thead = document.getElementById('repTableHead');
      
      // Adaptar el encabezado de la tabla según la Granularidad
      if (repGranularity === 'daily') {
        thead.innerHTML = `
          <tr>
            <th>Empleado</th>
            <th>Código</th>
            <th>Departamento</th>
            <th>Fecha</th>
            <th>Horario</th>
            <th>Entrada</th>
            <th>Sal. Alm.</th>
            <th>Ret. Alm.</th>
            <th>Salida</th>
            <th>Estado</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th>Empleado</th>
            <th>Código</th>
            <th>Departamento</th>
            <th>Período</th>
            <th>Horario</th>
            <th>Asistió</th>
            <th>Tardanzas</th>
            <th>Incompletos</th>
            <th>Eventos Totales</th>
          </tr>
        `;
      }

      if (!data?.items?.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><h3>Sin registros de asistencia</h3><p>No se encontraron marcas de reloj para el empleado o rango de fechas seleccionado.</p></div></td></tr>`;
        document.getElementById('repPagination').innerHTML = '';
        return;
      }

      const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit'});
      };

      tbody.innerHTML = data.items.map(r => {
        if (repGranularity === 'daily') {
          let statusBadge = '<span class="badge badge-green">OK</span>';
          if (!r.is_present) statusBadge = '<span class="badge badge-red">Ausente</span>';
          else if (r.missing_punches) statusBadge = '<span class="badge badge-yellow">Incompleto</span>';
          else if (r.is_late) statusBadge = '<span class="badge badge-yellow">Tardanza</span>';

          const isSplit = r.schedule_type === 'split';

          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="emp-avatar" style="background:var(--accent-glow); color:var(--accent); font-weight:700;">${r.employee_name.charAt(0).toUpperCase()}</div>
                  <span style="font-weight:600">${r.employee_name}</span>
                </div>
              </td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2)">${new Date(r.date + "T00:00:00").toLocaleDateString('es')}</td>
              <td>
                <span class="badge ${isSplit ? 'badge-yellow' : (r.schedule_type === 'continuous' ? 'badge-green' : 'badge-gray')}">
                  ${isSplit ? 'Partido' : (r.schedule_type === 'continuous' ? 'Continuo' : 'Sin Horario')}
                </span>
              </td>
              <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${formatTime(r.punches.entry_1)}</td>
              <td style="color:var(--text-3);font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.exit_1) : '—'}</td>
              <td style="color:var(--text-3);font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.entry_2) : '—'}</td>
              <td style="font-weight:600;font-family:'JetBrains Mono',monospace;">${isSplit ? formatTime(r.punches.exit_2) : formatTime(r.punches.exit_1)}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        } else {
          const pStart = new Date(r.period_start + "T00:00:00").toLocaleDateString('es', {day:'2-digit', month:'2-digit'});
          const pEnd = new Date(r.period_end + "T00:00:00").toLocaleDateString('es', {day:'2-digit', month:'2-digit', year:'numeric'});
          
          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="emp-avatar" style="background:var(--accent-glow); color:var(--accent); font-weight:700;">${r.employee_name.charAt(0).toUpperCase()}</div>
                  <span style="font-weight:600">${r.employee_name}</span>
                </div>
              </td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2); font-weight:500;">${pStart} - ${pEnd}</td>
              <td>
                <span class="badge ${r.schedule_type === 'split' ? 'badge-yellow' : (r.schedule_type === 'continuous' ? 'badge-green' : 'badge-gray')}">
                  ${r.schedule_type === 'split' ? 'Partido' : (r.schedule_type === 'continuous' ? 'Continuo' : 'Sin Horario')}
                </span>
              </td>
              <td>${r.is_present ? '<span class="badge badge-green">Sí</span>' : '<span class="badge badge-red">No</span>'}</td>
              <td>${r.is_late ? '<span class="badge badge-yellow">Sí</span>' : '<span class="badge badge-green">No</span>'}</td>
              <td>${r.missing_punches ? '<span class="badge badge-yellow">Sí</span>' : '<span class="badge badge-green">No</span>'}</td>
              <td style="font-weight:600; font-family:'JetBrains Mono',monospace; text-align:center;">${r.total_raw_events}</td>
            </tr>
          `;
        }
      }).join('');

      // Generar paginación limpia
      const pag = document.getElementById('repPagination');
      pag.innerHTML = `
        <span class="pagination-info">${data.total} registros encontrados — Página ${data.page} de ${data.pages}</span>
        <div class="pagination-btns">
          <button class="page-btn" ${data.page <= 1 ? 'disabled' : ''} onclick="ReportsPage.loadReportTable(${data.page - 1})">← Anterior</button>
          <button class="page-btn" ${data.page >= data.pages ? 'disabled' : ''} onclick="ReportsPage.loadReportTable(${data.page + 1})">Siguiente →</button>
        </div>
      `;

    } catch (e) {
      console.error(e);
      Toast.show('Error al refrescar tabla de reportes', 'error');
    }
  },

  // Exportar Excel o PDF Detallado unificado
  exportReport(format) {
    const token = API.token();
    const filterVal = document.getElementById('repFilterEntity')?.value || '';
    const repGranularity = document.getElementById('repGranularity').value;
    const { date_from, date_to } = this.getDates();
    
    const params = new URLSearchParams({
      granularity: repGranularity,
      export: format
    });

    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);

    if (filterVal) params.set('employee_id', filterVal);
    
    const deptId = document.getElementById('repFilterDepartment')?.value;
    const posId = document.getElementById('repFilterPosition')?.value;
    const schedId = document.getElementById('repFilterSchedule')?.value;
    if (deptId) params.set('department_id', deptId);
    if (posId) params.set('position_id', posId);
    if (schedId) params.set('schedule_id', schedId);

    if (format === 'excel') {
      Toast.show('Generando reporte EXCEL...', 'info');
      fetch(`/api/reports/report?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error();
          return r.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `reporte_${repGranularity}_${new Date().toISOString().split('T')[0]}.xlsx`;
          a.click();
          Toast.show('Reporte EXCEL descargado con éxito', 'success');
        })
        .catch(() => Toast.show('Error al generar reporte EXCEL', 'error'));
      return;
    }

    // PDF Asíncrono
    Toast.show('Iniciando generación de PDF...', 'info');
    
    // Quitar export de los params de async
    params.delete('export');

    fetch(`/api/reports/report/async?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Error al iniciar generación de reporte');
        return r.json();
      })
      .then(data => {
        const taskId = data.task_id;
        
        // Abrir Modal de Progreso
        Modal.open(
          'Generando Reporte PDF',
          `
          <div style="text-align: center; padding: 15px 10px;">
            <p style="font-weight: 600; font-size: 1rem; color: #1e293b; margin-bottom: 8px;">
              Generando reporte de asistencia con gráficos individuales...
            </p>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 20px;">
              Esto puede demorar unos segundos. Por favor, no cierre esta ventana.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 9999px; height: 10px; width: 100%; overflow: hidden; margin-bottom: 12px; border: 1px solid #e2e8f0;">
              <div id="reportProgressBar" style="background-color: var(--accent, #7c3aed); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <div id="reportProgressPercent" style="font-weight: 700; font-size: 1.1rem; color: #1e293b;">0%</div>
          </div>
          `,
          `
          <button class="btn btn-secondary" id="cancelReportBtn" style="width: 100%; background: #64748b; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">Cancelar</button>
          `
        );

        // Ocultar botón de cerrar modal para evitar cierres accidentales
        const closeBtn = document.getElementById('modalClose');
        if (closeBtn) closeBtn.style.display = 'none';

        let isPolling = true;
        const pollInterval = setInterval(() => {
          if (!isPolling) return;

          fetch(`/api/reports/report/status/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(statusData => {
              if (statusData.status === 'processing') {
                const progress = statusData.progress || 0;
                const bar = document.getElementById('reportProgressBar');
                const pct = document.getElementById('reportProgressPercent');
                if (bar) bar.style.width = `${progress}%`;
                if (pct) pct.textContent = `${progress}%`;
              } else if (statusData.status === 'completed') {
                isPolling = false;
                clearInterval(pollInterval);
                
                // Actualizar a 100%
                const bar = document.getElementById('reportProgressBar');
                const pct = document.getElementById('reportProgressPercent');
                if (bar) bar.style.width = '100%';
                if (pct) pct.textContent = '100% - Descargando...';

                // Descargar archivo
                setTimeout(() => {
                  fetch(`/api/reports/report/download/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(res => {
                      if (!res.ok) throw new Error();
                      return res.blob();
                    })
                    .then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `reporte_${repGranularity}_${new Date().toISOString().split('T')[0]}.pdf`;
                      a.click();
                      
                      if (closeBtn) closeBtn.style.display = 'block';
                      Modal.close();
                      Toast.show('Reporte PDF descargado con éxito', 'success');
                    })
                    .catch(() => {
                      if (closeBtn) closeBtn.style.display = 'block';
                      Modal.close();
                      Toast.show('Error al descargar el archivo PDF', 'error');
                    });
                }, 500);

              } else if (statusData.status === 'failed' || statusData.status === 'not_found') {
                isPolling = false;
                clearInterval(pollInterval);
                if (closeBtn) closeBtn.style.display = 'block';
                Modal.close();
                Toast.show(`Falla al generar reporte: ${statusData.error || 'Desconocido'}`, 'error');
              }
            })
            .catch(() => {
              isPolling = false;
              clearInterval(pollInterval);
              if (closeBtn) closeBtn.style.display = 'block';
              Modal.close();
              Toast.show('Error de conexión al verificar estado del reporte', 'error');
            });
        }, 1500);

        // Si el usuario cancela
        const handleCancel = () => {
          isPolling = false;
          clearInterval(pollInterval);
          if (closeBtn) closeBtn.style.display = 'block';
          Modal.close();
          Toast.show('Generación de reporte cancelada', 'warning');
        };

        const cancelBtn = document.getElementById('cancelReportBtn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', handleCancel);
        }
      })
      .catch(err => {
        Toast.show(err.message || 'Error al solicitar reporte PDF', 'error');
      });
  },

  // Exportar Excel Consolidado unificado
  exportConsolidated() {
    const token = API.token();
    const filterVal = document.getElementById('repFilterEntity')?.value || '';
    const { date_from, date_to } = this.getDates();
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);

    const deptId = document.getElementById('repFilterDepartment')?.value;
    const posId = document.getElementById('repFilterPosition')?.value;
    const schedId = document.getElementById('repFilterSchedule')?.value;
    if (deptId) params.set('department_id', deptId);
    if (posId) params.set('position_id', posId);
    if (schedId) params.set('schedule_id', schedId);

    Toast.show('Generando consolidado diario...', 'info');

    fetch(`/api/reports/consolidated?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `consolidado_asistencia_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
        Toast.show('Reporte Consolidado descargado con éxito', 'success');
      })
      .catch(() => Toast.show('Error al generar Excel Consolidado', 'error'));
  }
};

