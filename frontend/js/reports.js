/* reports.js — Módulo unificado e interactivo de Reportes y Analítica Premium */

const ReportsPage = {
  currentTab: 'general',
  doughnutChart: null,
  lineChart: null,
  loadedTabs: { analytics: false, records: false },

  async render() {
    const hash = window.location.hash;
    const isRecords = hash.includes('/records') || hash.includes('-records');

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
        .export-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          color: var(--text-2);
          font-size: 0.82rem;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
        }
        .export-menu-item:hover {
          background: var(--surface-2);
          color: var(--accent) !important;
        }
        .reports-tab-btn {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--text-3);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.92rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .reports-tab-btn:hover {
          color: var(--text-1);
        }
        .reports-tab-btn.active {
          border-bottom-color: var(--accent);
          color: var(--accent);
          font-weight: 700;
        }

        /* KPIs más compactos para la pestaña de Analíticas */
        #repTabContentAnalytics .kpi-card {
          padding: 16px 20px;
        }
        #repTabContentAnalytics .kpi-icon {
          width: 36px;
          height: 36px;
          font-size: 16px;
          margin-bottom: 10px;
          border-radius: 8px;
        }
        #repTabContentAnalytics .kpi-icon svg {
          width: 18px;
          height: 18px;
        }
        #repTabContentAnalytics .kpi-value {
          font-size: 1.65rem;
        }
        #repTabContentAnalytics .kpi-label {
          font-size: 0.8rem;
          margin-top: 6px;
        }
        #repTabContentAnalytics .kpi-sub {
          font-size: 0.7rem;
          margin-top: 2px;
        }

        /* Gráficos más compactos */
        #repTabContentAnalytics .chart-container {
          height: 200px !important;
        }
        #repTabContentAnalytics .card {
          padding: 16px 20px;
        }
      </style>

      <!-- ── Navegación por Pestañas de Reportes ── -->
      <div style="display: flex; justify-content: center; margin-bottom: 24px;">
        <div class="segmented-control">
          <button id="repTabBtnAnalytics" class="segmented-btn ${isRecords ? '' : 'active'}" onclick="ReportsPage.switchReportTab('analytics')">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Analíticas y Consulta
          </button>
          <button id="repTabBtnRecords" class="segmented-btn ${isRecords ? 'active' : ''}" onclick="ReportsPage.switchReportTab('records')">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            Registros Detallados
          </button>
        </div>
      </div>

      <!-- ── PESTAÑA 1: ANALÍTICAS Y FILTROS ── -->
      <div id="repTabContentAnalytics" style="${isRecords ? 'display: none;' : ''}">
        <!-- ── TARJETA 1: FILTROS DE CONSULTA (ANALÍTICAS) ── -->
        <div class="double-bezel-outer" style="margin-bottom: 24px; overflow: visible; z-index: 10;">
          <div class="double-bezel-inner" style="overflow: visible; border: none; box-shadow: none; padding: 24px;">
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filtros de Búsqueda (Analíticas)
          </div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; margin-bottom: 20px;">
            <!-- Selector Dinámico de Empleado (Búsqueda Dinámica) -->
            <div class="field" style="margin: 0; flex: 1; min-width: 250px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Filtrar por Empleado</label>
              <div class="searchable-select-wrapper an-select-wrapper" style="position: relative; width: 100%;">
                <input type="text" id="anFilterEntityInput" placeholder="🔍 Todos los empleados" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-1);" autocomplete="off" />
                <input type="hidden" id="anFilterEntity" value="" />
                <div class="searchable-select-dropdown an-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                  <!-- Se llena dinámicamente -->
                </div>
              </div>
            </div>
            
            <!-- Selector de Rango de Fechas Único -->
            <div class="field" style="margin: 0; flex: 1; min-width: 200px; max-width: 320px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Rango de Fechas</label>
              <input type="text" id="anDateRange" placeholder="Seleccionar rango de fechas..." style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);" />
            </div>

            <!-- Botón Filtros Avanzados y Acciones -->
            <div style="display: flex; gap: 10px; align-items: flex-end; position: relative;">
              <button class="btn btn-secondary" onclick="document.getElementById('anAdvancedFilters').style.display = document.getElementById('anAdvancedFilters').style.display === 'none' ? 'flex' : 'none';" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                Filtros
              </button>
              
              <div id="anAdvancedFilters" style="display:none; position:absolute; top:45px; left:0; background:var(--bg-raised); border:1px solid var(--border); border-radius:12px; padding:16px; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:100; min-width:240px; flex-direction:column; gap:12px;">
                <h4 style="margin: 0; font-size: 0.75rem; text-transform: uppercase; color: var(--text-3); letter-spacing: 0.05em; font-weight: 700;">Filtros Adicionales</h4>
                <select id="anFilterDepartment" onchange="ReportsPage.onDropdownFilterChange('an')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">🏢 Todos los departamentos</option>
                </select>
                <select id="anFilterPosition" onchange="ReportsPage.onDropdownFilterChange('an')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">💼 Todos los cargos</option>
                </select>
                <select id="anFilterSchedule" onchange="ReportsPage.onDropdownFilterChange('an')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">🕒 Todos los horarios</option>
                </select>
              </div>

              <button class="btn btn-secondary" onclick="ReportsPage.clearAllFilters('an')" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
                Limpiar
              </button>
              <button class="btn btn-primary" onclick="ReportsPage.onFilterChange('an')" style="padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
                Aplicar
              </button>
            </div>
          </div>
        </div>

        <div id="repAnalyticsDashboard">
          <!-- ── TARJETAS DE KPI CORPORATE PRECISION ── -->
          <div class="grid-4" style="margin-bottom: 24px;">
            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('punctuality')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Puntualidad General</span>
              <span class="corp-display-lg" id="anTasaAsistencia">-</span>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--corp-on-surface-var);">Entradas sin tardanza</span>
            </div>
            
            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('lates')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Total Tardanzas</span>
              <span class="corp-display-lg" id="anTotalTardanzas" style="color: var(--corp-secondary);">-</span>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--corp-on-surface-var);">Registros con retraso</span>
            </div>
            
            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('avg_entry')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Hora Promedio Entrada</span>
              <span class="corp-display-lg" id="anPromedioEntrada">-</span>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--corp-on-surface-var);">Llegada general</span>
            </div>
            
            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('critical_day')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Día Crítico</span>
              <span class="corp-display-lg" id="anDiaCritico">-</span>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--corp-on-surface-var);">Más retrasos</span>
            </div>
          </div>

          <!-- ── GRÁFICOS ANALÍTICOS SINCRONIZADOS ── -->
          <div class="grid-2" style="margin-bottom: 24px;">
            <div class="corp-card" style="margin:0;">
              <div style="margin-bottom: 24px; border-bottom: 1px solid var(--corp-outline); padding-bottom: 12px;">
                <span class="corp-label-caps" style="display: block;">Distribución del Estado de Asistencia</span>
                <span class="corp-body-sm" style="color: var(--corp-on-surface-var);">Resumen porcentual del comportamiento del personal</span>
              </div>
              <div class="chart-container" style="height:250px;"><canvas id="anDoughnutChart"></canvas></div>
            </div>
            
            <div class="corp-card" style="margin:0;">
              <div style="margin-bottom: 24px; border-bottom: 1px solid var(--corp-outline); padding-bottom: 12px;">
                <span class="corp-label-caps" style="display: block;">Tendencia de Asistencia Diaria</span>
                <span class="corp-body-sm" style="color: var(--corp-on-surface-var);">Evolución de puntualidad y retrasos a lo largo del tiempo</span>
              </div>
              <div class="chart-container" style="height:250px;"><canvas id="anLineChart"></canvas></div>
            </div>
          </div>
          </div>
        </div>

        <!-- ── TABLA COMPARATIVA DE ANALÍTICAS ── -->
        <div id="repAnalyticsTableContainer" style="display:none; margin-bottom: 24px;"></div>
      </div>

      <!-- ── PESTAÑA 2: REGISTROS DETALLADOS ── -->
      <div id="repTabContentRecords" style="${isRecords ? '' : 'display: none;'}">
        <!-- ── UNIFICACIÓN: FILTROS Y TABLA EN UN SOLO CUADRO ── -->
        <div class="double-bezel-outer" style="overflow: visible; z-index: 10;">
          <div class="double-bezel-inner" style="overflow: visible; border: none; box-shadow: none; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Reporte Detallado de Asistencia
              </div>
              <div style="font-size: 0.75rem; color: var(--text-3); font-weight: 600; margin-top: 2px;">
                Configure el rango de fechas, filtre colaboradores y exporte el reporte en Excel o PDF
              </div>
            </div>
            
            <!-- Dropdown Desplegable Premium de Exportación -->
            <div style="position: relative;" id="repExportDropdownContainer">
              <button class="btn btn-primary" onclick="ReportsPage.toggleExportMenu(event)" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Exportar Reporte
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div id="repExportMenu" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 6px; background: #ffffff; border: 1px solid var(--border); border-radius: 10px; width: 220px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); z-index: 100; overflow: hidden; animation: slideDown 0.2s ease;">
                <a href="#" onclick="ReportsPage.exportReport('excel'); ReportsPage.closeExportMenu(); return false;" class="export-menu-item">
                  <span style="font-size: 1.1rem; width: 20px;">📊</span> Excel Detallado
                </a>
                <a href="#" onclick="ReportsPage.exportReport('pdf'); ReportsPage.closeExportMenu(); return false;" class="export-menu-item" style="border-top: 1px solid var(--border);">
                  <span style="font-size: 1.1rem; width: 20px;">📄</span> PDF Imprimible
                </a>
                <a href="#" onclick="ReportsPage.exportConsolidated(); ReportsPage.closeExportMenu(); return false;" class="export-menu-item" style="border-top: 1px solid var(--border);">
                  <span style="font-size: 1.1rem; width: 20px;">📅</span> Consolidado Diario
                </a>
              </div>
            </div>
          </div>
          
          <select id="recGranularity" style="display: none;"><option value="daily" selected></option></select>

          <div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 20px;">
            <!-- Selector Dinámico de Empleado -->
            <div class="field" style="margin: 0; flex: 1; min-width: 250px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Filtrar por Empleado</label>
              <div class="searchable-select-wrapper rec-select-wrapper" style="position: relative; width: 100%;">
                <input type="text" id="recFilterEntityInput" placeholder="🔍 Todos los empleados" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-1);" autocomplete="off" />
                <input type="hidden" id="recFilterEntity" value="" />
                <div class="searchable-select-dropdown rec-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                  <!-- Se llena dinámicamente -->
                </div>
              </div>
            </div>
            
            <!-- Selector de Rango de Fechas Único -->
            <div class="field" style="margin: 0; flex: 1; min-width: 200px; max-width: 320px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Rango de Fechas</label>
              <input type="text" id="recDateRange" placeholder="Seleccionar rango de fechas..." style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);" />
            </div>

            <!-- Botones alineados en la misma fila con Filtros -->
            <div style="display: flex; gap: 10px; position: relative;">
              <button class="btn btn-secondary" onclick="document.getElementById('recAdvancedFilters').style.display = document.getElementById('recAdvancedFilters').style.display === 'none' ? 'flex' : 'none';" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                Filtros
              </button>
              
              <div id="recAdvancedFilters" style="display:none; position:absolute; top:45px; left:0; background:var(--bg-raised); border:1px solid var(--border); border-radius:12px; padding:16px; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:100; min-width:240px; flex-direction:column; gap:12px;">
                <h4 style="margin: 0; font-size: 0.75rem; text-transform: uppercase; color: var(--text-3); letter-spacing: 0.05em; font-weight: 700;">Filtros Adicionales</h4>
                <select id="recFilterDepartment" onchange="ReportsPage.onDropdownFilterChange('rec')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">🏢 Todos los departamentos</option>
                </select>
                <select id="recFilterPosition" onchange="ReportsPage.onDropdownFilterChange('rec')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">💼 Todos los cargos</option>
                </select>
                <select id="recFilterSchedule" onchange="ReportsPage.onDropdownFilterChange('rec')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">🕒 Todos los horarios</option>
                </select>
              </div>

              <button class="btn btn-secondary" onclick="ReportsPage.clearAllFilters('rec')" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
                Limpiar
              </button>
              <button class="btn btn-primary" onclick="ReportsPage.onFilterChange('rec')" style="padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
                Filtrar
              </button>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 20px 0;" />

          <div class="table-wrap" style="border:none;">
            <table class="corp-zebra-table">
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
        </div>
      </div>
    `;

    // Fechas por defecto (últimos 30 días)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Inicializar los selectores de fechas independientes
    flatpickr("#anDateRange", { 
      mode: "range", 
      locale: "es", 
      showMonths: 1,
      dateFormat: "Y-m-d", 
      altInput: true, 
      altFormat: "d M Y", 
      defaultDate: [thirtyDaysAgo, todayStr],
      onClose: () => {
        ReportsPage.onFilterChange('an');
      }
    });

    flatpickr("#recDateRange", { 
      mode: "range", 
      locale: "es", 
      showMonths: 1,
      dateFormat: "Y-m-d", 
      altInput: true, 
      altFormat: "d M Y", 
      defaultDate: [thirtyDaysAgo, todayStr],
      onClose: () => {
        ReportsPage.onFilterChange('rec');
      }
    });

    // Cargar todas las opciones de los dropdowns y autocomplete
    await this.loadDropdownOptions();

    // Configurar listeners del buscador dinámico para 'an' y 'rec'
    ['an', 'rec'].forEach(prefix => {
      const input = document.getElementById(`${prefix}FilterEntityInput`);
      const dropdown = document.querySelector(`.${prefix}-dropdown`);
      
      if (input && dropdown) {
        input.addEventListener('focus', () => {
          const available = this.getFilteredEmployees(prefix);
          this.renderSearchableSelectItems(available, prefix);
          dropdown.style.display = 'block';
        });

        input.addEventListener('input', (e) => {
          const query = e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const available = this.getFilteredEmployees(prefix);
          if (!query) {
            this.renderSearchableSelectItems(available, prefix);
          } else {
            const filtered = available.filter(item => item.searchable.includes(query));
            this.renderSearchableSelectItems(filtered, prefix);
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const firstItem = dropdown.querySelector('.searchable-select-item:not(.all-option)');
            const allItem = dropdown.querySelector('.searchable-select-item');
            const targetItem = firstItem || allItem;
            if (targetItem) {
              targetItem.click();
            }
          }
        });
      }
    });

    // Listener global para clics fuera
    document.addEventListener('click', (e) => {
      ['an', 'rec'].forEach(prefix => {
        const wrapper = document.querySelector(`.${prefix}-select-wrapper`);
        const dropdown = document.querySelector(`.${prefix}-dropdown`);
        const input = document.getElementById(`${prefix}FilterEntityInput`);
        if (wrapper && !wrapper.contains(e.target)) {
          if (dropdown) dropdown.style.display = 'none';
          
          const hiddenVal = document.getElementById(`${prefix}FilterEntity`)?.value;
          if (!hiddenVal) {
            if (input) input.value = '';
          } else {
            const currentObj = this.filterOptionsData.find(x => x.id == hiddenVal);
            if (currentObj && input) {
              input.value = currentObj.text;
            }
          }
        }
      });
      
      ['an', 'rec'].forEach(prefix => {
        const advFilters = document.getElementById(`${prefix}AdvancedFilters`);
        const advBtn = advFilters?.previousElementSibling;
        if (advFilters && advBtn && !advFilters.contains(e.target) && !advBtn.contains(e.target)) {
          advFilters.style.display = 'none';
        }
      });
      
      const expContainer = document.getElementById('repExportDropdownContainer');
      if (expContainer && !expContainer.contains(e.target)) {
        ReportsPage.closeExportMenu();
      }
    });

    // Resetear banderas de pestañas cargadas
    this.loadedTabs = { analytics: false, records: false };

    // Cargar y mostrar la pestaña inicial
    this.switchReportTab(isRecords ? 'records' : 'analytics');
  },

  async loadDropdownOptions() {
    this.filterOptionsData = [];

    try {
      // 1. Cargar Departamentos
      const depts = await API.get('/api/employees/departments') || [];
      ['an', 'rec'].forEach(prefix => {
        const deptSel = document.getElementById(`${prefix}FilterDepartment`);
        if (deptSel) {
          deptSel.innerHTML = '<option value="">🏢 Todos los departamentos</option>' + 
            depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }
      });

      // 2. Cargar Cargos
      const positions = await API.get('/api/employees/positions') || [];
      ['an', 'rec'].forEach(prefix => {
        const posSel = document.getElementById(`${prefix}FilterPosition`);
        if (posSel) {
          posSel.innerHTML = '<option value="">💼 Todos los cargos</option>' + 
            positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
      });

      // 3. Cargar Horarios
      const schedules = await API.get('/api/schedules') || [];
      ['an', 'rec'].forEach(prefix => {
        const schedSel = document.getElementById(`${prefix}FilterSchedule`);
        if (schedSel) {
          schedSel.innerHTML = '<option value="">🕒 Todos los horarios</option>' + 
            schedules.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
      });

      // 4. Cargar Empleados para buscador dinámico
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

      ['an', 'rec'].forEach(prefix => {
        const input = document.getElementById(`${prefix}FilterEntityInput`);
        const hidden = document.getElementById(`${prefix}FilterEntity`);
        if (input && hidden) {
          hidden.value = '';
          input.value = '';
          input.placeholder = '👤 Todos los empleados';
        }
        this.renderSearchableSelectItems(this.filterOptionsData, prefix);
      });

    } catch(e) {
      console.error('Error al cargar opciones de filtro de entidad', e);
      Toast.show('Error al cargar opciones de filtro', 'error');
    }
  },

  getFilteredEmployees(prefix) {
    const deptId = document.getElementById(`${prefix}FilterDepartment`)?.value;
    const posId = document.getElementById(`${prefix}FilterPosition`)?.value;
    const schedId = document.getElementById(`${prefix}FilterSchedule`)?.value;
    
    let list = this.filterOptionsData;
    if (deptId) list = list.filter(e => e.department_id == deptId);
    if (posId) list = list.filter(e => e.position_id == posId);
    if (schedId) list = list.filter(e => e.schedule_id == schedId);
    return list;
  },

  onDropdownFilterChange(prefix) {
    const hiddenVal = document.getElementById(`${prefix}FilterEntity`)?.value;
    if (hiddenVal) {
      const currentObj = this.filterOptionsData.find(x => x.id == hiddenVal);
      if (currentObj) {
        const deptId = document.getElementById(`${prefix}FilterDepartment`)?.value;
        const posId = document.getElementById(`${prefix}FilterPosition`)?.value;
        const schedId = document.getElementById(`${prefix}FilterSchedule`)?.value;
        
        let isValid = true;
        if (deptId && currentObj.department_id != deptId) isValid = false;
        if (posId && currentObj.position_id != posId) isValid = false;
        if (schedId && currentObj.schedule_id != schedId) isValid = false;
        
        if (!isValid) {
          document.getElementById(`${prefix}FilterEntity`).value = '';
          document.getElementById(`${prefix}FilterEntityInput`).value = '';
          document.getElementById(`${prefix}FilterEntityInput`).placeholder = '👤 Todos los empleados';
        }
      }
    }
    
    this.onFilterChange(prefix);
  },

  renderSearchableSelectItems(items, prefix) {
    const dropdown = document.querySelector(`.${prefix}-dropdown`);
    const input = document.getElementById(`${prefix}FilterEntityInput`);
    const hidden = document.getElementById(`${prefix}FilterEntity`);
    if (!dropdown) return;

    dropdown.innerHTML = '';

    const allText = '👤 Todos los empleados';

    const allDiv = document.createElement('div');
    allDiv.className = 'searchable-select-item all-option';
    allDiv.textContent = allText;
    allDiv.addEventListener('click', () => {
      input.value = '';
      input.placeholder = allText;
      hidden.value = '';
      dropdown.style.display = 'none';
      ReportsPage.onFilterChange(prefix);
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
        ReportsPage.onFilterChange(prefix);
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
      <div class="double-bezel-outer">
        <div class="double-bezel-inner" style="border:none; box-shadow:none; padding:0;">
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
      </div>
    `;

    const { date_from, date_to } = this.getDates('anDateRange');
    let entities = [];

    try {
      let emps = await API.get('/api/employees?limit=5000') || [];
      const deptId = document.getElementById('anFilterDepartment')?.value;
      const posId = document.getElementById('anFilterPosition')?.value;
      const schedId = document.getElementById('anFilterSchedule')?.value;
      
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

  // Obtiene las fechas del Flatpickr por ID de input
  getDates(inputId) {
    const el = document.getElementById(inputId);
    const range = el ? el.value : '';
    const res = { date_from: '', date_to: '' };
    if (range) {
      const dates = range.split(range.includes(' a ') ? ' a ' : ' to ');
      if (dates.length > 0 && dates[0]) res.date_from = dates[0].trim();
      if (dates.length > 1 && dates[1]) res.date_to = dates[1].trim();
      else res.date_to = res.date_from; // Si no hay rango, date_to es igual a date_from
    }
    return res;
  },

  // Evento al cambiar la selección de algún filtro
  async onFilterChange(prefix) {
    if (prefix === 'an') {
      const filterVal = document.getElementById('anFilterEntity')?.value || '';
      const dashboard = document.getElementById('repAnalyticsDashboard');
      const compTable = document.getElementById('repAnalyticsTableContainer');

      if (filterVal === '') {
        // Mostrar ambos para la vista general
        if (dashboard) dashboard.style.display = 'block';
        if (compTable) compTable.style.display = 'block';
        // Ejecutar ambos en paralelo para mayor rapidez
        await Promise.all([
          this.loadAnalytics(),
          this.loadComparativeAnalytics()
        ]);
      } else {
        // Mostrar solo el dashboard para el empleado específico
        if (dashboard) dashboard.style.display = 'block';
        if (compTable) compTable.style.display = 'none';
        await this.loadAnalytics();
      }
    } else if (prefix === 'rec') {
      await this.loadReportTable(1);
    }
  },

  // Evento al cambiar la granularidad (Diario, Semanal, Mensual)
  async onGranularityChange() {
    await this.loadReportTable(1);
  },

  clearAllFilters(prefix) {
    document.getElementById(`${prefix}FilterEntity`).value = '';
    const input = document.getElementById(`${prefix}FilterEntityInput`);
    if (input) {
      input.value = '';
      input.placeholder = '👤 Todos los empleados';
    }
    document.getElementById(`${prefix}FilterDepartment`).value = '';
    document.getElementById(`${prefix}FilterPosition`).value = '';
    document.getElementById(`${prefix}FilterSchedule`).value = '';
    
    if (prefix === 'rec') {
      document.getElementById('recGranularity').value = 'daily';
    }
    
    // Restablecer flatpickr fecha a los últimos 30 días
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const fp = document.getElementById(`${prefix}DateRange`)?._flatpickr;
    if (fp) {
      fp.setDate([thirtyDaysAgo, todayStr]);
    }
    
    this.onFilterChange(prefix);
  },

  toggleExportMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('repExportMenu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  },

  closeExportMenu() {
    const menu = document.getElementById('repExportMenu');
    if (menu) {
      menu.style.display = 'none';
    }
  },

  switchReportTab(tabName) {
    const btnAnalytics = document.getElementById('repTabBtnAnalytics');
    const btnRecords = document.getElementById('repTabBtnRecords');
    const contentAnalytics = document.getElementById('repTabContentAnalytics');
    const contentRecords = document.getElementById('repTabContentRecords');
    
    const isAnalyticsActive = btnAnalytics?.classList.contains('active');
    const isRecordsActive = btnRecords?.classList.contains('active');
    
    if (tabName === 'analytics') {
      if (isAnalyticsActive) return;
      btnAnalytics?.classList.add('active');
      btnRecords?.classList.remove('active');
      if (contentAnalytics) contentAnalytics.style.display = 'block';
      if (contentRecords) contentRecords.style.display = 'none';
      if (window.location.hash.startsWith('#reports')) {
        window.location.hash = 'reports/analytics';
      }
      if (!this.loadedTabs.analytics) {
        this.loadedTabs.analytics = true;
        this.onFilterChange('an'); // Usar onFilterChange para cargar todo correctamente
      }
    } else {
      if (isRecordsActive) return;
      btnAnalytics?.classList.remove('active');
      btnRecords?.classList.add('active');
      if (contentAnalytics) contentAnalytics.style.display = 'none';
      if (contentRecords) contentRecords.style.display = 'block';
      if (window.location.hash.startsWith('#reports')) {
        window.location.hash = 'reports/records';
      }
      if (!this.loadedTabs.records) {
        this.loadedTabs.records = true;
        this.loadReportTable(1);
      }
    }
  },

  // Carga KPIs y Gráficos Sincronizados
  async loadAnalytics() {
    try {
      const filterVal = document.getElementById('anFilterEntity')?.value || '';
      const { date_from, date_to } = this.getDates('anDateRange');
      
      const params = new URLSearchParams();
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      if (filterVal) {
        const text = document.getElementById('anFilterEntityInput')?.value || '';
        const match = text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          params.set('search', match[1]);
        }
      }
      
      const deptId = document.getElementById('anFilterDepartment')?.value;
      const posId = document.getElementById('anFilterPosition')?.value;
      const schedId = document.getElementById('anFilterSchedule')?.value;
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

  // Carga la Tabla de Datos según los Filtros de Registros (recPrefix)
  reportPage: 1,

  async loadReportTable(page = 1) {
    this.reportPage = page;
    const filterVal = document.getElementById('recFilterEntity')?.value || '';
    const repGranularity = document.getElementById('recGranularity').value;
    const { date_from, date_to } = this.getDates('recDateRange');
    
    const params = new URLSearchParams({
      page: this.reportPage,
      page_size: 15,
      granularity: repGranularity
    });

    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);

    if (filterVal) params.set('employee_id', filterVal);
    
    const deptId = document.getElementById('recFilterDepartment')?.value;
    const posId = document.getElementById('recFilterPosition')?.value;
    const schedId = document.getElementById('recFilterSchedule')?.value;
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
          let statusBadge = '<span class="corp-badge corp-badge-present">OK</span>';
          if (!r.is_present) statusBadge = '<span class="corp-badge corp-badge-absent">Ausente</span>';
          else if (r.missing_punches) statusBadge = '<span class="corp-badge corp-badge-late">Incompleto</span>';
          else if (r.is_late) statusBadge = '<span class="corp-badge corp-badge-late">Tardanza</span>';

          const isSplit = r.schedule_type === 'split';
          const typeBadge = isSplit ? '<span class="corp-badge corp-badge-rest">Partido</span>' : (r.schedule_type === 'continuous' ? '<span class="corp-badge corp-badge-present">Continua</span>' : '<span class="corp-badge corp-badge-rest">Sin Horario</span>');

          return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  ${r.photo_path ? `<div class="emp-avatar"><img src="/uploads/${r.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(r.employee_name)}
                  <span style="font-weight:600">${r.employee_name}</span>
                </div>
              </td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2)">${new Date(r.date + "T00:00:00").toLocaleDateString('es')}</td>
              <td>${typeBadge}</td>
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
                  ${r.photo_path ? `<div class="emp-avatar"><img src="/uploads/${r.photo_path}?t=${new Date().getTime()}" alt=""></div>` : avatarHtml(r.employee_name)}
                  <span style="font-weight:600">${r.employee_name}</span>
                </div>
              </td>
              <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.75rem; font-family:'JetBrains Mono',monospace;">${r.employee_code}</code></td>
              <td style="color:var(--text-2)">${r.department}</td>
              <td style="color:var(--text-2); font-weight:500;">${pStart} - ${pEnd}</td>
              <td>${r.schedule_type === 'split' ? '<span class="corp-badge corp-badge-rest">Partido</span>' : (r.schedule_type === 'continuous' ? '<span class="corp-badge corp-badge-present">Continuo</span>' : '<span class="corp-badge corp-badge-rest">Sin Horario</span>')}</td>
              <td>${r.is_present ? '<span class="corp-badge corp-badge-present">Sí</span>' : '<span class="corp-badge corp-badge-absent">No</span>'}</td>
              <td>${r.is_late ? '<span class="corp-badge corp-badge-late">Sí</span>' : '<span class="corp-badge corp-badge-present">No</span>'}</td>
              <td>${r.missing_punches ? '<span class="corp-badge corp-badge-late">Sí</span>' : '<span class="corp-badge corp-badge-present">No</span>'}</td>
              <td style="font-weight:600; font-family:'JetBrains Mono',monospace; text-align:center;">${r.total_raw_events}</td>
            </tr>
          `;
        }
      }).join('');

      // Generar paginación limpia
      const pag = document.getElementById('repPagination');
      pag.innerHTML = `
        <span class="pagination-info">${data.total} registros encontrados — Página ${data.page} de ${data.pages}</span>
        <div class="pagination-btns" style="display:flex; gap:8px;">
          <button class="page-btn" ${data.page <= 1 ? 'disabled' : ''} onclick="ReportsPage.loadReportTable(${data.page - 1})" style="display:flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Anterior
          </button>
          <button class="page-btn" ${data.page >= data.pages ? 'disabled' : ''} onclick="ReportsPage.loadReportTable(${data.page + 1})" style="display:flex;align-items:center;gap:6px;">
            Siguiente <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      `;

    } catch (e) {
      console.error(e);
      Toast.show('Error al refrescar tabla de reportes', 'error');
    }
  },

  // Abrir modal de selección de columnas antes de exportar
  openColumnSelector(title, onConfirm) {
    const html = `
      <div style="padding: 10px 15px; text-align: left;">
        <p style="font-weight: 600; font-size: 0.95rem; color: var(--text-1); margin-bottom: 16px; line-height: 1.4;">
          Personaliza tu reporte seleccionando las columnas que deseas incluir:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_period" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>📅 Fecha / Período</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_employee_code" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>🔑 Código de Empleado</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_employee_name" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>👤 Nombre Completo</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_department" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>🏢 Departamento</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_schedule" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>🕒 Horario Asignado</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_punches" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>📟 Marcaciones (Punches)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_status" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>📊 Estado / Asistencia</span>
          </label>
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; gap: 10px; width: 100%;">
        <button class="btn btn-secondary" onclick="Modal.close()" style="flex: 1;">Cancelar</button>
        <button class="btn btn-primary" id="btnConfirmExport" style="flex: 1; font-weight: 600;">Generar Reporte</button>
      </div>
    `;

    Modal.open(title, html, footer);

    document.getElementById('btnConfirmExport').addEventListener('click', () => {
      const selected = [];
      ['period', 'employee_code', 'employee_name', 'department', 'schedule', 'punches', 'status'].forEach(key => {
        if (document.getElementById('col_' + key)?.checked) {
          selected.push(key);
        }
      });

      if (selected.length === 0) {
        Toast.show('Debes seleccionar al menos una columna', 'warning');
        return;
      }

      Modal.close();
      onConfirm(selected.join(','));
    });
  },

  getExportFilename(extension, prefix = 'Reporte') {
    const filterInput = document.getElementById('recFilterEntityInput');
    let namePart = 'Todos';
    if (filterInput && filterInput.value.trim() && !filterInput.value.includes('Todos')) {
      let rawName = filterInput.value.split('(')[0].trim();
      namePart = rawName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').trim().replace(/\s+/g, '_');
    }
    const { date_from, date_to } = this.getDates('recDateRange');
    let datePart = '';
    if (date_from && date_to) {
      datePart = `_${date_from}_a_${date_to}`;
    } else if (date_from) {
      datePart = `_desde_${date_from}`;
    } else {
      datePart = `_${new Date().toISOString().split('T')[0]}`;
    }
    return `${prefix}_${namePart}${datePart}.${extension}`;
  },

  exportReport(format) {
    const title = format === 'excel' ? 'Exportar Excel Detallado' : 'Exportar PDF Imprimible';
    this.openColumnSelector(title, (columns) => {
      this.executeExportReport(format, columns);
    });
  },

  exportConsolidated() {
    this.openColumnSelector('Exportar Consolidado Diario', (columns) => {
      this.executeExportConsolidated(columns);
    });
  },

  // Exportar Excel o PDF Detallado unificado (usa filtros de la pestaña de Registros 'rec')
  executeExportReport(format, columns) {
    const token = API.token();
    const filterVal = document.getElementById('recFilterEntity')?.value || '';
    const repGranularity = document.getElementById('recGranularity').value;
    const { date_from, date_to } = this.getDates('recDateRange');
    
    const params = new URLSearchParams({
      granularity: repGranularity,
      export: format
    });

    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);
    if (columns) params.set('columns', columns);

    if (filterVal) params.set('employee_id', filterVal);
    
    const deptId = document.getElementById('recFilterDepartment')?.value;
    const posId = document.getElementById('recFilterPosition')?.value;
    const schedId = document.getElementById('recFilterSchedule')?.value;
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
          a.download = this.getExportFilename('xlsx', 'Reporte');
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
                      a.download = this.getExportFilename('pdf', 'Reporte');
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

  // Exportar Excel Consolidado unificado (usa filtros de la pestaña de Registros 'rec')
  executeExportConsolidated(columns) {
    const token = API.token();
    const filterVal = document.getElementById('recFilterEntity')?.value || '';
    const { date_from, date_to } = this.getDates('recDateRange');
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);
    if (columns) params.set('columns', columns);

    if (filterVal) params.set('employee_id', filterVal);

    const deptId = document.getElementById('recFilterDepartment')?.value;
    const posId = document.getElementById('recFilterPosition')?.value;
    const schedId = document.getElementById('recFilterSchedule')?.value;
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
        a.href = url; a.download = this.getExportFilename('xlsx', 'Consolidado'); a.click();
        Toast.show('Reporte Consolidado descargado con éxito', 'success');
      })
      .catch(() => Toast.show('Error al generar Excel Consolidado', 'error'));
  },

  async showMetricDetails(type) {
    const titles = {
      punctuality: 'Ranking de Puntualidad en el Período',
      lates: 'Detalle de Tardanzas en el Período',
      avg_entry: 'Promedio de Hora de Entrada en el Período',
      critical_day: 'Tasa de Asistencia por Día de la Semana'
    };

    Toast.show('Cargando detalles de analítica...', 'info');

    try {
      const filterVal = document.getElementById('anFilterEntity')?.value || '';
      const { date_from, date_to } = this.getDates('anDateRange');
      
      const params = new URLSearchParams({ type });
      if (date_from) params.set('date_from', date_from);
      if (date_to) params.set('date_to', date_to);

      if (filterVal) {
        const text = document.getElementById('anFilterEntityInput')?.value || '';
        const match = text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          params.set('search', match[1]);
        }
      }
      
      const deptId = document.getElementById('anFilterDepartment')?.value;
      const posId = document.getElementById('anFilterPosition')?.value;
      const schedId = document.getElementById('anFilterSchedule')?.value;
      if (deptId) params.set('department_id', deptId);
      if (posId) params.set('position_id', posId);
      if (schedId) params.set('schedule_id', schedId);

      const data = await API.get(`/api/reports/analytics/details?${params}`);

      let html = '';
      if (!data || data.length === 0) {
        html = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-3);">
            <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
            <p style="margin: 0; font-size: 0.95rem; font-weight: 500;">No se encontraron registros para mostrar.</p>
          </div>
        `;
      } else {
        html = `
          <div style="max-height: 450px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px;">
            <table style="width: 100%; min-width: auto; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
              <thead>
                <tr style="background: var(--surface-2); border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-1); position: sticky; top: 0; z-index: 10;">
        `;

        if (type === 'punctuality') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px; text-align: center;">Entradas</th>
                  <th style="padding: 12px 16px; text-align: center;">A Tiempo</th>
                  <th style="padding: 12px 16px; text-align: center;">Tardanzas</th>
                  <th style="padding: 12px 16px; text-align: center;">Puntualidad</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(emp => {
                  const rateNum = parseFloat(emp.rate);
                  const rateColor = rateNum >= 90 ? 'var(--success)' : rateNum >= 75 ? 'var(--warning)' : 'var(--danger)';
                  return `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${emp.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${emp.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${emp.department}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--text-1);">${emp.total_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--success); font-weight: 600;">${emp.ontime_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--warning); font-weight: 600;">${emp.late_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: ${rateColor}; font-weight: 700;">${emp.rate}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'lates') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px;">Fecha</th>
                  <th style="padding: 12px 16px;">H. Entrada Prog.</th>
                  <th style="padding: 12px 16px;">H. Entrada Real</th>
                  <th style="padding: 12px 16px;">Retraso</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; color: var(--text-1); font-weight: 500;">${row.date}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.schedule_time}</td>
                    <td style="padding: 12px 16px; color: var(--text-1);">${row.entry_time}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--warning);">${row.delay}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'avg_entry') {
          html += `
                  <th style="padding: 12px 16px;">Código</th>
                  <th style="padding: 12px 16px;">Nombre</th>
                  <th style="padding: 12px 16px;">Departamento</th>
                  <th style="padding: 12px 16px;">Entrada Horario</th>
                  <th style="padding: 12px 16px;">Promedio de Entrada</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-2);">${row.employee_code}</td>
                    <td style="padding: 12px 16px; font-weight: 500; color: var(--text-1);">${row.full_name}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.department}</td>
                    <td style="padding: 12px 16px; color: var(--text-2);">${row.schedule_time}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--accent);">${row.avg_entry}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        } else if (type === 'critical_day') {
          html += `
                  <th style="padding: 12px 16px;">Día</th>
                  <th style="padding: 12px 16px; text-align: center;">Total Entradas</th>
                  <th style="padding: 12px 16px; text-align: center;">A Tiempo</th>
                  <th style="padding: 12px 16px; text-align: center;">Tardanzas</th>
                  <th style="padding: 12px 16px; text-align: center;">Puntualidad</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => {
                  const rateNum = parseFloat(row.rate);
                  const rateColor = rateNum >= 90 ? 'var(--success)' : rateNum >= 75 ? 'var(--warning)' : 'var(--danger)';
                  return `
                  <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-1);">${row.day_name}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--text-1);">${row.total_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--success); font-weight: 600;">${row.ontime_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: var(--warning); font-weight: 600;">${row.late_entries}</td>
                    <td style="padding: 12px 16px; text-align: center; color: ${rateColor}; font-weight: 700;">${row.rate}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          `;
        }
      }

      Modal.open(titles[type], html, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`);
      
      const modalEl = document.querySelector('#modalOverlay .modal');
      if (modalEl) {
        modalEl.style.maxWidth = '780px';
      }
    } catch(err) {
      Toast.show('Error al cargar los detalles: ' + err.message, 'error');
    }
  }
};



window.ReportsPage = ReportsPage;
