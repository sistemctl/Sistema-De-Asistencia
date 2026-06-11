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
        .trend-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          margin-left: 6px;
        }
        .trend-badge.trend-up {
          background: rgba(0, 230, 118, 0.12);
          color: #00c853;
        }
        .trend-badge.trend-down {
          background: rgba(255, 61, 0, 0.12);
          color: #d50000;
        }
        .trend-badge.trend-neutral {
          background: var(--surface-3);
          color: var(--text-3);
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
            <div class="field" style="margin: 0; flex: 1.5; min-width: 200px; max-width: 320px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Rango de Fechas</label>
              <input type="text" id="anDateRange" placeholder="Seleccionar rango de fechas..." style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);" />
            </div>

            <!-- Selector Rápido de Presets -->
            <div class="field" style="margin: 0; flex: 1; min-width: 150px; max-width: 180px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Rango Rápido</label>
              <select id="anDatePresets" onchange="ReportsPage.applyDatePreset('an', this.value)" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-1);">
                <option value="">Personalizado</option>
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="last7">Últimos 7 días</option>
                <option value="last30" selected>Últimos 30 días</option>
                <option value="thisMonth">Este mes</option>
                <option value="lastMonth">Mes pasado</option>
              </select>
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
                  <option value="">Todos los departamentos</option>
                </select>
                <select id="anFilterPosition" onchange="ReportsPage.onDropdownFilterChange('an')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">Todos los cargos</option>
                </select>
                <select id="anFilterSchedule" onchange="ReportsPage.onDropdownFilterChange('an')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">Todos los horarios</option>
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
          <div style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('punctuality')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Puntualidad General</span>
              <div style="display: flex; align-items: baseline; justify-content: center;">
                <span class="corp-display-lg" id="anTasaAsistencia">-</span>
                <span id="anTasaAsistenciaTrend" class="trend-badge">-</span>
              </div>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--text-3);">Entradas sin tardanza</span>
            </div>
            
            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('lates')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Total Tardanzas</span>
              <div style="display: flex; align-items: baseline; justify-content: center;">
                <span class="corp-display-lg" id="anTotalTardanzas" style="color: var(--warning);">-</span>
                <span id="anTotalTardanzasTrend" class="trend-badge">-</span>
              </div>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--text-3);">Registros con retraso</span>
            </div>

            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('critical_day')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Día Crítico</span>
              <span class="corp-display-lg" id="anDiaCritico" style="color: var(--accent);">-</span>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--text-3);">Día con más tardanzas</span>
            </div>

            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('absences')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Tasa de Ausencia</span>
              <div style="display: flex; align-items: baseline; justify-content: center;">
                <span class="corp-display-lg" id="anTasaAusencia" style="color: var(--danger);">-</span>
                <span id="anTasaAusenciaTrend" class="trend-badge">-</span>
              </div>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--text-3);">Inasistencias injustificadas</span>
            </div>

            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('hours_worked')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Horas Trabajadas</span>
              <div style="display: flex; align-items: baseline; justify-content: center;">
                <span class="corp-display-lg" id="anHorasTrabajadas" style="color: var(--success);">-</span>
                <span id="anHorasTrabajadasTrend" class="trend-badge">-</span>
              </div>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--text-3);">Tiempo total laborado</span>
            </div>

            <div class="corp-card" style="cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;" onclick="ReportsPage.showMetricDetails('early_exits')">
              <span class="corp-label-caps" style="margin-bottom: 8px; display: block;">Salidas Tempranas</span>
              <div style="display: flex; align-items: baseline; justify-content: center;">
                <span class="corp-display-lg" id="anSalidasTempranas" style="color: var(--warning);">-</span>
                <span id="anSalidasTempranasTrend" class="trend-badge">-</span>
              </div>
              <span class="corp-body-sm" style="margin-top: 8px; display: block; color: var(--text-3);">Salidas antes de hora</span>
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
                Configure el rango de fechas, filtre colaboradores y exporte el reporte en Excel, PDF o CSV
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
                <a href="#" onclick="ReportsPage.exportReport('csv'); ReportsPage.closeExportMenu(); return false;" class="export-menu-item" style="border-top: 1px solid var(--border);">
                  <span style="font-size: 1.1rem; width: 20px;">📝</span> CSV Delimitado
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
            <div class="field" style="margin: 0; flex: 1.5; min-width: 200px; max-width: 320px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Rango de Fechas</label>
              <input type="text" id="recDateRange" placeholder="Seleccionar rango de fechas..." style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);" />
            </div>

            <!-- Selector Rápido de Presets -->
            <div class="field" style="margin: 0; flex: 1; min-width: 150px; max-width: 180px;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-3); margin-bottom: 6px; display: block;">Rango Rápido</label>
              <select id="recDatePresets" onchange="ReportsPage.applyDatePreset('rec', this.value)" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-1);">
                <option value="">Personalizado</option>
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="last7">Últimos 7 días</option>
                <option value="last30" selected>Últimos 30 días</option>
                <option value="thisMonth">Este mes</option>
                <option value="lastMonth">Mes pasado</option>
              </select>
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
                  <option value="">Todos los departamentos</option>
                </select>
                <select id="recFilterPosition" onchange="ReportsPage.onDropdownFilterChange('rec')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">Todos los cargos</option>
                </select>
                <select id="recFilterSchedule" onchange="ReportsPage.onDropdownFilterChange('rec')" style="width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; background: var(--surface-2); border-color: var(--border);">
                  <option value="">Todos los horarios</option>
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
      const depts = await API.get('/api/employees/departments', true) || [];
      ['an', 'rec'].forEach(prefix => {
        const deptSel = document.getElementById(`${prefix}FilterDepartment`);
        if (deptSel) {
          deptSel.innerHTML = '<option value="">Todos los departamentos</option>' + 
            depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }
      });

      // 2. Cargar Cargos
      const positions = await API.get('/api/employees/positions', true) || [];
      ['an', 'rec'].forEach(prefix => {
        const posSel = document.getElementById(`${prefix}FilterPosition`);
        if (posSel) {
          posSel.innerHTML = '<option value="">Todos los cargos</option>' + 
            positions.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
      });

      // 3. Cargar Horarios
      const schedules = await API.get('/api/schedules', true) || [];
      ['an', 'rec'].forEach(prefix => {
        const schedSel = document.getElementById(`${prefix}FilterSchedule`);
        if (schedSel) {
          schedSel.innerHTML = '<option value="">Todos los horarios</option>' + 
            schedules.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
      });

      // 4. Cargar Empleados para buscador dinámico
      const emps = await API.get('/api/employees?limit=5000', true) || [];
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
    return ReportsAnalytics.loadComparativeAnalytics();
  },

  getDates(inputId) {
    const el = document.getElementById(inputId);
    const range = el ? el.value : '';
    const res = { date_from: '', date_to: '' };
    if (range) {
      const dates = range.split(range.includes(' a ') ? ' a ' : ' to ');
      if (dates.length > 0 && dates[0]) res.date_from = dates[0].trim();
      if (dates.length > 1 && dates[1]) res.date_to = dates[1].trim();
      else res.date_to = res.date_from;
    }
    return res;
  },

  async onFilterChange(prefix) {
    if (prefix === 'an') {
      const filterVal = document.getElementById('anFilterEntity')?.value || '';
      const dashboard = document.getElementById('repAnalyticsDashboard');
      const compTable = document.getElementById('repAnalyticsTableContainer');

      if (filterVal === '') {
        if (dashboard) dashboard.style.display = 'block';
        if (compTable) compTable.style.display = 'block';
        await Promise.all([
          ReportsAnalytics.loadAnalytics(),
          ReportsAnalytics.loadComparativeAnalytics()
        ]);
      } else {
        if (dashboard) dashboard.style.display = 'block';
        if (compTable) compTable.style.display = 'none';
        await ReportsAnalytics.loadAnalytics();
      }
    } else if (prefix === 'rec') {
      await ReportsTable.loadReportTable(1);
    }
  },

  async onGranularityChange() {
    await ReportsTable.loadReportTable(1);
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
    ReportsExport.toggleExportMenu(event);
  },

  closeExportMenu() {
    ReportsExport.closeExportMenu();
  },

  switchReportTab(tabName) {
    const btnAnalytics = document.getElementById('repTabBtnAnalytics');
    const btnRecords = document.getElementById('repTabBtnRecords');
    const contentAnalytics = document.getElementById('repTabContentAnalytics');
    const contentRecords = document.getElementById('repTabContentRecords');
    
    const isAnalyticsActive = btnAnalytics?.classList.contains('active');
    const isRecordsActive = btnRecords?.classList.contains('active');
    
    if (tabName === 'analytics') {
      if (isAnalyticsActive && this.loadedTabs.analytics) return;
      btnAnalytics?.classList.add('active');
      btnRecords?.classList.remove('active');
      if (contentAnalytics) contentAnalytics.style.display = 'block';
      if (contentRecords) contentRecords.style.display = 'none';
      if (window.location.hash.startsWith('#reports')) {
        window.location.hash = 'reports/analytics';
      }
      if (!this.loadedTabs.analytics) {
        this.loadedTabs.analytics = true;
        this.onFilterChange('an');
      }
    } else {
      if (isRecordsActive && this.loadedTabs.records) return;
      btnAnalytics?.classList.remove('active');
      btnRecords?.classList.add('active');
      if (contentAnalytics) contentAnalytics.style.display = 'none';
      if (contentRecords) contentRecords.style.display = 'block';
      if (window.location.hash.startsWith('#reports')) {
        window.location.hash = 'reports/records';
      }
      if (!this.loadedTabs.records) {
        this.loadedTabs.records = true;
        ReportsTable.loadReportTable(1);
      }
    }
  },

  async loadAnalytics() {
    return ReportsAnalytics.loadAnalytics();
  },

  async loadReportTable(page = 1) {
    return ReportsTable.loadReportTable(page);
  },

  exportReport(format) {
    ReportsExport.exportReport(format);
  },

  exportConsolidated() {
    ReportsExport.exportConsolidated();
  },

  async showMetricDetails(type) {
    return ReportsAnalytics.showMetricDetails(type);
  },

  applyDatePreset(prefix, val) {
    const fp = document.getElementById(`${prefix}DateRange`)?._flatpickr;
    if (!fp) return;
    
    const today = new Date();
    let start, end;
    
    switch (val) {
      case 'today':
        start = end = today;
        break;
      case 'yesterday':
        start = end = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last7':
        start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        end = today;
        break;
      case 'last30':
        start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        end = today;
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return; // Manual input
    }
    
    fp.setDate([start, end]);
    this.onFilterChange(prefix);
  }
};

