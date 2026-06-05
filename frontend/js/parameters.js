/* parameters.js — Módulo de Parámetros Generales */

const ParametersPage = {
  currentTab: 'departments',

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="tabs-container" style="margin-bottom: 24px; border-bottom: 1px solid var(--border); display: flex; gap: 24px;">
        <button class="tab-btn active" data-tab="departments" onclick="ParametersPage.switchTab('departments')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Departamentos
        </button>
        <button class="tab-btn" data-tab="positions" onclick="ParametersPage.switchTab('positions')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Cargos
        </button>
        <button class="tab-btn" data-tab="schedules" onclick="ParametersPage.switchTab('schedules')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Horarios
        </button>
        <button class="tab-btn" data-tab="holidays" onclick="ParametersPage.switchTab('holidays')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Festivos
        </button>
        ${Auth.isAdmin() || Auth.user()?.perm_manage_settings ? `
        <button class="tab-btn" data-tab="settings" onclick="ParametersPage.switchTab('settings')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Reglas de Asistencia
        </button>
        ` : ''}
      </div>
      <style>
        .tab-btn.active { color: var(--accent) !important; }
        .tab-btn::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: var(--accent); transform: scaleX(0); transition: transform 0.2s ease; }
        .tab-btn.active::after { transform: scaleX(1); }
        .tab-btn:hover { color: var(--text-1) !important; }
      </style>
      <div id="paramContent">
        <!-- Contenido dinámico (Departamentos, Cargos, Horarios, Configuración, Festivos) -->
      </div>
    `;

    // Renderizar la pestaña actual por defecto
    this.switchTab(this.currentTab);
  },

  async switchTab(tab) {
    this.currentTab = tab;
    
    // Actualizar UI de las pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Cargar el módulo correspondiente
    if (tab === 'departments') {
      if (typeof DepartmentsPage !== 'undefined') await DepartmentsPage.render();
    } else if (tab === 'positions') {
      if (typeof PositionsPage !== 'undefined') await PositionsPage.render();
    } else if (tab === 'schedules') {
      if (typeof SchedulesPage !== 'undefined') await SchedulesPage.render();
    } else if (tab === 'holidays') {
      if (typeof HolidaysPage !== 'undefined') await HolidaysPage.render();
    } else if (tab === 'settings') {
      if (typeof SystemSettingsPage !== 'undefined') await SystemSettingsPage.render('settings');
    }
  }
};






window.ParametersPage = ParametersPage;
