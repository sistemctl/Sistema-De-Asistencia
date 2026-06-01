/* device.js — Estado y configuración del dispositivo */

const DevicePage = {
  currentTab: 'device_status',
  settings: {},
  pollInterval: null,

  async render(tab = 'device_status') {
    this.currentTab = tab;

    if (tab === 'branding') {
      document.getElementById('pageContent').innerHTML = `
        <div id="deviceTabContent">
        </div>
      `;
    } else {
      document.getElementById('pageContent').innerHTML = `
        <div class="tabs-container" style="margin-bottom: 24px; border-bottom: 1px solid var(--border); display: flex; gap: 24px;">
          <button class="tab-btn active" data-tab="device_status" onclick="DevicePage.switchTab('device_status')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
            Biométrico / Conexión
          </button>
          <button class="tab-btn" data-tab="sync_history" onclick="DevicePage.switchTab('sync_history')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
            Historial de Sincronización
          </button>
        </div>
        <style>
          .tab-btn.active { color: var(--accent) !important; }
          .tab-btn::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: var(--accent); transform: scaleX(0); transition: transform 0.2s ease; }
          .tab-btn.active::after { transform: scaleX(1); }
          .tab-btn:hover { color: var(--text-1) !important; }
        </style>
        <div id="deviceTabContent">
        </div>
      `;
    }

    await this.switchTab(tab);
  },

  async switchTab(tab) {
    this.currentTab = tab;
    
    // Sincronizar hash de la SPA según la pestaña activa
    if (tab === 'branding') {
      if (window.location.hash !== '#system') {
        window.location.hash = 'system';
        return;
      }
    } else {
      if (window.location.hash !== '#device') {
        window.location.hash = 'device';
        return;
      }
    }
    
    // Cleanup any running poll interval from history tab if we switch
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const contentEl = document.getElementById('deviceTabContent');
    if (tab === 'device_status') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Dispositivo</div>
          <div class="section-actions">
            <button class="btn btn-secondary" onclick="DevicePage.checkConnection()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Verificar conexión
            </button>
            ${Auth.isAdmin() ? `
              <button class="btn btn-primary" onclick="DevicePage.manualSync()" id="btnManualSync">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                Sync manual
              </button>
              <button class="btn btn-primary" style="background: linear-gradient(135deg, var(--accent-3), #00b0ff); color:#000; box-shadow: 0 4px 15px rgba(0, 230, 118, 0.25);" onclick="DevicePage.historicSync()" id="btnHistoricSync">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Importar Histórico
              </button>` : ''}
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:24px; margin-top: 16px;">
          <div class="card" id="deviceStatusCard"><div class="loading-overlay"><div class="spinner"></div></div></div>
          ${Auth.isAdmin() ? `<div class="card" id="deviceConfigCard"><div class="loading-overlay"><div class="spinner"></div></div></div>` : '<div></div>'}
        </div>
      `;
      await Promise.all([this.loadStatus(), this.loadConfig()]);
    } else if (tab === 'sync_history') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Historial de Sincronización</div>
        </div>
        
        <div id="syncProgressBar" style="display:none; margin-bottom: 24px; background: var(--surface-2); padding: 18px; border-radius: 12px; border: 1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong style="color:var(--accent); font-size:0.9rem;">Sincronizando con el biométrico...</strong>
            <span style="font-size:0.8rem; color:var(--text-3); font-weight:500;" id="syncProgressText">Procesando datos en segundo plano</span>
          </div>
          <div style="width: 100%; height: 6px; background-color: var(--surface-3); border-radius: 99px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background-color: var(--accent); animation: progressIndeterminate 1.5s infinite linear; transform-origin: left; border-radius: 99px;"></div>
          </div>
          <style>
            @keyframes progressIndeterminate {
              0% { transform: scaleX(0); opacity: 1; }
              50% { transform: scaleX(0.5); opacity: 0.8; }
              100% { transform: scaleX(1); opacity: 0; }
            }
          </style>
        </div>

        <div class="card" style="margin-top: 16px;">
          <div class="card-header">
            <div class="card-title">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M12 8v4l3 3M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline></svg>
              Logs de Comunicación
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Fecha/Hora</th><th>Estado</th><th>Eventos obtenidos</th><th>Eventos nuevos</th><th>Modo</th><th>Detalle</th></tr></thead>
              <tbody id="logsTable"><tr><td colspan="6"><div class="loading-overlay"><div class="spinner"></div></div></td></tr></tbody>
            </table>
          </div>
        </div>
      `;
      await this.loadLogs();
    } else if (tab === 'branding') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Personalización de Marca y Temas</div>
        </div>
        
        <div style="max-width: 600px; margin-top: 16px;">
          <div class="card">
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Branding e Identidad del Sistema
            </div>
            
            <div class="field" style="margin-bottom: 16px;">
              <label>Nombre del Sistema</label>
              <input id="sysSystemName" type="text" placeholder="Ej. Control de Asistencia" style="width: 100%; box-sizing: border-box;" />
            </div>
            
            <div class="field" style="margin-bottom: 16px;">
              <label>Nombre de la Empresa / Sede</label>
              <input id="sysCompanyName" type="text" placeholder="Ej. Mi Empresa S.A.C." style="width: 100%; box-sizing: border-box;" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div class="field">
                <label>Color Primario (Tema)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input id="sysPrimaryColor" type="color" style="width: 40px; height: 40px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 8px;" />
                  <span id="sysPrimaryColorHex" style="font-family: monospace; font-size: 0.85rem; color: var(--text-2);">#1E3A5F</span>
                </div>
              </div>
              <div class="field">
                <label>Color de Acento / Realce</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input id="sysAccentColor" type="color" style="width: 40px; height: 40px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 8px;" />
                  <span id="sysAccentColorHex" style="font-family: monospace; font-size: 0.85rem; color: var(--text-2);">#00E676</span>
                </div>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div class="field">
                <label>Color de Fondo (Afuera)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input id="sysBgBaseColor" type="color" style="width: 40px; height: 40px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 8px;" />
                  <span id="sysBgBaseColorHex" style="font-family: monospace; font-size: 0.85rem; color: var(--text-2);">#F8FAFC</span>
                </div>
              </div>
              <div class="field">
                <label>Color de Tarjeta (Fondo)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input id="sysBgSurfaceColor" type="color" style="width: 40px; height: 40px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 8px;" />
                  <span id="sysBgSurfaceColorHex" style="font-family: monospace; font-size: 0.85rem; color: var(--text-2);">#FFFFFF</span>
                </div>
              </div>
            </div>

            <div class="field" style="margin-bottom: 16px;">
              <label>Logotipo del Sistema (PNG, JPG o SVG)</label>
              <div style="display: flex; gap: 16px; align-items: center; background: var(--surface-2); padding: 12px; border-radius: 12px; border: 1px dashed var(--border);">
                <div id="sysLogoPreviewContainer" style="width: 60px; height: 60px; border-radius: 8px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--border);">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" id="sysLogoSvgDefault"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><circle cx="12" cy="7" r="2"></circle></svg>
                  <img id="sysLogoImgPreview" style="display: none; width: 100%; height: 100%; object-fit: contain;" />
                </div>
                <div style="flex: 1;">
                  <input id="sysLogoFileInput" type="file" accept=".png,.jpg,.jpeg,.svg" style="display: none;" />
                  <button class="btn btn-secondary btn-sm" onclick="document.getElementById('sysLogoFileInput').click()" style="margin-bottom: 4px;">Seleccionar archivo</button>
                  <div style="font-size: 0.72rem; color: var(--text-3);">Formato recomendado: PNG transparente o SVG. Máx. 2MB</div>
                </div>
              </div>
            </div>

            <div style="text-align: right; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 24px;">
              <button class="btn btn-primary" id="btnSaveBranding" style="width: 100%; padding: 12px; font-weight: bold;">
                Guardar cambios de personalización
              </button>
            </div>
          </div>
        </div>
      `;

      // Setup color picker sync
      const pColor = document.getElementById('sysPrimaryColor');
      const aColor = document.getElementById('sysAccentColor');
      const bColor = document.getElementById('sysBgBaseColor');
      const sColor = document.getElementById('sysBgSurfaceColor');
      if (pColor && aColor && bColor && sColor) {
        const updatePreview = () => {
          if (typeof window.applyThemeColors === 'function') {
            window.applyThemeColors(pColor.value, aColor.value, bColor.value, sColor.value);
          }
        };

        pColor.addEventListener('input', (e) => {
          document.getElementById('sysPrimaryColorHex').textContent = e.target.value.toUpperCase();
          updatePreview();
        });
        aColor.addEventListener('input', (e) => {
          document.getElementById('sysAccentColorHex').textContent = e.target.value.toUpperCase();
          updatePreview();
        });
        bColor.addEventListener('input', (e) => {
          document.getElementById('sysBgBaseColorHex').textContent = e.target.value.toUpperCase();
          updatePreview();
        });
        sColor.addEventListener('input', (e) => {
          document.getElementById('sysBgSurfaceColorHex').textContent = e.target.value.toUpperCase();
          updatePreview();
        });
      }

      // Setup file upload listener
      const logoInput = document.getElementById('sysLogoFileInput');
      if (logoInput) {
        logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
      }

      document.getElementById('btnSaveBranding')?.addEventListener('click', () => this.saveBranding());
      
      await this.loadBranding();
    }
  },

  async loadStatus() {
    try {
      const s = await API.get('/api/device/status');
      const card = document.getElementById('deviceStatusCard');
      if (!card) return;
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            Estado del dispositivo
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2);font-weight:500;">Estado</span>
            <span class="${s.is_online ? 'badge badge-green' : 'badge badge-red'}">${s.is_online ? '✓ En línea' : '✕ Fuera de línea'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2);font-weight:500;">Dirección IP</span>
            <code style="background:var(--surface-3);padding:3px 10px;border-radius:6px;font-family:'JetBrains Mono',monospace;">${s.ip_address}</code>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2);font-weight:500;">Modo</span>
            <span class="${s.is_mock_mode ? 'badge badge-yellow' : 'badge badge-green'}">${s.is_mock_mode ? '🔵 Simulado' : '🟢 Real'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2);font-weight:500;">Última sync exitosa</span>
            <span style="color:var(--text-1);font-size:.8rem;font-weight:600;font-family:'JetBrains Mono',monospace;">${s.last_successful_sync ? new Date(s.last_successful_sync).toLocaleString('es') : 'Nunca'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2);font-weight:500;">Total eventos sincronizados</span>
            <strong style="font-family:'JetBrains Mono',monospace;">${s.total_events_synced}</strong>
          </div>
          ${s.is_mock_mode ? `<div style="background:rgba(255,179,0,.08);border:1px solid rgba(255,179,0,.2);border-radius:10px;padding:12px;font-size:.8rem;color:var(--warning);line-height:1.5;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Dispositivo no disponible en la red. El sistema genera datos simulados automáticamente. Cuando el dispositivo esté en línea en <strong>${s.ip_address}</strong>, la sincronización real comenzará automáticamente.</div>` : ''}
        </div>`;
    } catch(e) { 
      const card = document.getElementById('deviceStatusCard');
      if (card) card.innerHTML = `<p style="color:var(--danger)">Error cargando estado</p>`; 
    }
  },

  async loadConfig() {
    if (!Auth.isAdmin()) return;
    try {
      const c = await API.get('/api/device/config');
      const card = document.getElementById('deviceConfigCard');
      if (!card) return;
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Configuración
          </div>
        </div>
        <div class="field"><label>Dirección IP</label><input id="cfgIp" value="${c.ip_address}" style="font-family:'JetBrains Mono',monospace;" /></div>
        <div class="form-row">
          <div class="field"><label>Puerto</label><input id="cfgPort" type="number" value="${c.port}" style="font-family:'JetBrains Mono',monospace;" /></div>
          <div class="field"><label>Intervalo sync (min)</label><input id="cfgInterval" type="number" value="${c.sync_interval_minutes}" min="1" max="60" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Tolerancia Entrada (min)</label><input id="cfgEntryTol" type="number" value="${c.entry_tolerance_minutes}" min="0" max="120" title="Minutos adicionales antes de marcar llegada tarde" /></div>
          <div class="field"><label>Tolerancia Salida (min)</label><input id="cfgExitTol" type="number" value="${c.exit_tolerance_minutes}" min="0" max="120" title="Minutos permitidos antes de marcar salida temprana" /></div>
        </div>
        <div class="field"><label>Usuario dispositivo</label><input id="cfgUser" value="${c.username}" /></div>
        <div class="field"><label>Contraseña dispositivo</label><input id="cfgPass" type="password" placeholder="••••••••" /></div>
        <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="DevicePage.saveConfig()">Guardar configuración</button>`;
    } catch(e) {}
  },

  async saveConfig() {
    const body = {
      ip_address: document.getElementById('cfgIp').value.trim(),
      port: parseInt(document.getElementById('cfgPort').value),
      sync_interval_minutes: parseInt(document.getElementById('cfgInterval').value),
      entry_tolerance_minutes: parseInt(document.getElementById('cfgEntryTol').value),
      exit_tolerance_minutes: parseInt(document.getElementById('cfgExitTol').value),
      username: document.getElementById('cfgUser').value.trim(),
    };
    const pass = document.getElementById('cfgPass').value;
    if (pass) body.password = pass;
    try {
      await API.put('/api/device/config', body);
      Toast.show('Configuración guardada', 'success');
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  async loadLogs() {
    try {
      const logs = await API.get('/api/device/logs?limit=20');
      const tbody = document.getElementById('logsTable');
      if (!tbody) return;
      if (!logs?.length) { 
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div><p>Sin historial aún</p></div></td></tr>`; 
        return; 
      }
      
      let isRunning = false;
      tbody.innerHTML = logs.map(l => {
        const badges = { success:'badge-green', error:'badge-red', running:'badge-blue', offline:'badge-yellow' };
        const labels = { success:'✓ Exitosa', error:'✕ Error', running:'⟳ En curso', offline:'📴 Offline' };
        if (l.status === 'running') isRunning = true;
        return `<tr>
          <td style="font-size:.8rem;font-family:'JetBrains Mono',monospace;">${new Date(l.started_at).toLocaleString('es')}</td>
          <td><span class="badge ${badges[l.status]||'badge-gray'}">${labels[l.status]||l.status}</span></td>
          <td style="text-align:center;font-family:'JetBrains Mono',monospace;">${l.events_fetched}</td>
          <td style="text-align:center;color:var(--accent);font-family:'JetBrains Mono',monospace;font-weight:600;">${l.events_new}</td>
          <td>${l.is_mock ? '<span class="badge badge-yellow">Simulado</span>' : '<span class="badge badge-green">Real</span>'}</td>
          <td style="font-size:.75rem;color:var(--danger);font-weight:500;">${l.error_message||''}</td>
        </tr>`;
      }).join('');
      
      this.toggleProgress(isRunning);
      if (isRunning && this.currentTab === 'sync_history' && !this.pollInterval) {
        this.pollInterval = setInterval(() => this.loadLogs(), 4000);
      } else if (!isRunning && this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
        this.loadStatus();
      }
    } catch(e) {}
  },
  
  toggleProgress(show) {
    const bar = document.getElementById('syncProgressBar');
    const btn1 = document.getElementById('btnManualSync');
    const btn2 = document.getElementById('btnHistoricSync');
    if (bar) bar.style.display = show ? 'block' : 'none';
    if (btn1) btn1.disabled = show;
    if (btn2) btn2.disabled = show;
  },

  async checkConnection() {
    try {
      const r = await API.post('/api/device/check-connection', {});
      Toast.show(r.is_online ? `✓ Dispositivo en línea (${r.ip_address})` : `✕ Dispositivo no responde en ${r.ip_address}`, r.is_online ? 'success' : 'warning');
      this.loadStatus();
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  async manualSync() {
    try {
      await API.post('/api/device/sync', {});
      Toast.show('Sincronización iniciada', 'info');
      // Switch automatically to history tab to track progress
      this.switchTab('sync_history');
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  async historicSync() {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const body = `
      <div class="field">
        <label>Rango de Fechas</label>
        <input type="text" id="syncDateRange" placeholder="Selecciona el rango..." />
      </div>
      <p style="margin-top:16px; font-size:0.85rem; color:var(--text-2); line-height:1.5;">
        Descargará todos los eventos en este rango, omitiendo personas desconocidas y aplicando las reglas de tolerancia del horario laboral.
      </p>
    `;

    document.getElementById('modalTitle').textContent = 'Sincronización por Fechas';
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary" id="modalCloseBtn">Cancelar</button>
      <button class="btn btn-primary" id="confirmSyncBtn">Iniciar Descarga</button>
    `;
    
    document.getElementById('modalBox').className = 'modal modal-sm';
    document.getElementById('modalOverlay').classList.add('open');

    // Inicializar Flatpickr
    flatpickr("#syncDateRange", { 
      mode: "range", 
      locale: "es", 
      showMonths: 2,
      dateFormat: "Y-m-d", 
      altInput: true, 
      altFormat: "d M Y", 
      defaultDate: [firstDay, today] 
    });

    document.getElementById('modalCloseBtn').onclick = () => {
      document.getElementById('modalOverlay').classList.remove('open');
    };
    
    document.getElementById('confirmSyncBtn').onclick = async () => {
      const rangeVal = document.getElementById('syncDateRange').value;
      if(!rangeVal) return Toast.show("Selecciona el rango de fechas", "warning");
      const dates = rangeVal.split(rangeVal.includes(' a ') ? ' a ' : ' to ');
      const start = dates[0];
      const end = dates.length > 1 ? dates[1] : dates[0];
      
      document.getElementById('modalOverlay').classList.remove('open');
      
      try {
        await API.post('/api/device/sync-historic', { start_date: start, end_date: end });
        Toast.show('Importación histórica iniciada', 'info');
        // Switch automatically to history tab to track progress
        DevicePage.switchTab('sync_history');
      } catch(e) { Toast.show(e.message, 'error'); }
    };
  },

  async loadBranding() {
    try {
      const data = await API.get('/api/settings');
      this.settings = data;

      document.getElementById('sysSystemName').value = data.system_name || '';
      document.getElementById('sysCompanyName').value = data.company_name || '';
      document.getElementById('sysPrimaryColor').value = data.primary_color || '#1e3a5f';
      document.getElementById('sysPrimaryColorHex').textContent = (data.primary_color || '#1e3a5f').toUpperCase();
      document.getElementById('sysAccentColor').value = data.accent_color || '#00e676';
      document.getElementById('sysAccentColorHex').textContent = (data.accent_color || '#00e676').toUpperCase();

      document.getElementById('sysBgBaseColor').value = data.bg_base_color || '#f8fafc';
      document.getElementById('sysBgBaseColorHex').textContent = (data.bg_base_color || '#f8fafc').toUpperCase();
      document.getElementById('sysBgSurfaceColor').value = data.bg_surface_color || '#ffffff';
      document.getElementById('sysBgSurfaceColorHex').textContent = (data.bg_surface_color || '#ffffff').toUpperCase();

      const svgDef = document.getElementById('sysLogoSvgDefault');
      const imgPrev = document.getElementById('sysLogoImgPreview');
      const prevContainer = document.getElementById('sysLogoPreviewContainer');
      if (data.logo_path) {
        svgDef.style.display = 'none';
        imgPrev.src = data.logo_path;
        imgPrev.style.display = 'block';
        if (prevContainer) {
          prevContainer.style.background = 'none';
          prevContainer.style.border = 'none';
          prevContainer.style.width = '64px';
          prevContainer.style.height = '64px';
          prevContainer.style.borderRadius = '50%';
          prevContainer.style.overflow = 'hidden';
          imgPrev.style.width = '100%';
          imgPrev.style.height = '100%';
          imgPrev.style.objectFit = 'cover';
          imgPrev.style.maxWidth = '';
        }
      } else {
        svgDef.style.display = 'block';
        imgPrev.style.display = 'none';
        if (prevContainer) {
          prevContainer.style.background = '';
          prevContainer.style.width = '';
          prevContainer.style.height = '';
          prevContainer.style.border = '';
          prevContainer.style.borderRadius = '';
          prevContainer.style.overflow = '';
        }
      }
    } catch (e) {
      console.error(e);
      Toast.show('Error al cargar la personalización de marca', 'error');
    }
  },

  async handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    Toast.show('Subiendo logotipo...', 'info');

    try {
      const data = await API.postForm('/api/settings/logo', formData);
      Toast.show('Logotipo actualizado con éxito', 'success');
      
      const svgDef = document.getElementById('sysLogoSvgDefault');
      const imgPrev = document.getElementById('sysLogoImgPreview');
      const prevContainer = document.getElementById('sysLogoPreviewContainer');
      svgDef.style.display = 'none';
      imgPrev.src = data.logo_path;
      imgPrev.style.display = 'block';
      if (prevContainer) {
        prevContainer.style.background = 'none';
        prevContainer.style.border = 'none';
        prevContainer.style.width = '64px';
        prevContainer.style.height = '64px';
        prevContainer.style.borderRadius = '50%';
        prevContainer.style.overflow = 'hidden';
        imgPrev.style.width = '100%';
        imgPrev.style.height = '100%';
        imgPrev.style.objectFit = 'cover';
        imgPrev.style.maxWidth = '';
      }

      if (window.loadSystemBranding) {
        await window.loadSystemBranding();
      }
    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    }
  },

  async saveBranding() {
    const systemName = document.getElementById('sysSystemName').value.trim();
    const companyName = document.getElementById('sysCompanyName').value.trim();
    const primaryColor = document.getElementById('sysPrimaryColor').value;
    const accentColor = document.getElementById('sysAccentColor').value;
    const bgBaseColor = document.getElementById('sysBgBaseColor').value;
    const bgSurfaceColor = document.getElementById('sysBgSurfaceColor').value;

    if (!systemName) {
      Toast.show('Por favor, ingresa el nombre del sistema', 'warning');
      return;
    }
    if (!companyName) {
      Toast.show('Por favor, ingresa el nombre de la empresa', 'warning');
      return;
    }

    try {
      if (!this.settings.work_days) {
        const currentData = await API.get('/api/settings');
        this.settings = currentData;
      }

      await API.put('/api/settings', {
        system_name: systemName,
        company_name: companyName,
        primary_color: primaryColor,
        accent_color: accentColor,
        bg_base_color: bgBaseColor,
        bg_surface_color: bgSurfaceColor,
        work_days: this.settings.work_days || '1,2,3,4,5',
        time_format: this.settings.time_format || '24h',
        entry_tolerance_minutes: this.settings.entry_tolerance_minutes ?? 10,
        exit_tolerance_minutes: this.settings.exit_tolerance_minutes ?? 10,
        require_checkin: this.settings.require_checkin ?? true,
        require_checkout: this.settings.require_checkout ?? true,
        mark_late_enable: this.settings.mark_late_enable ?? true,
        mark_late_limit_minutes: this.settings.mark_late_limit_minutes ?? 0,
        mark_absent_if_late_enable: this.settings.mark_absent_if_late_enable ?? false,
        mark_absent_if_late_limit_minutes: this.settings.mark_absent_if_late_limit_minutes ?? 60,
        mark_early_departure_enable: this.settings.mark_early_departure_enable ?? true,
        mark_early_departure_limit_minutes: this.settings.mark_early_departure_limit_minutes ?? 0,
        mark_absent_if_early_checkout_enable: this.settings.mark_absent_if_early_checkout_enable ?? false,
        mark_absent_if_early_checkout_limit_minutes: this.settings.mark_absent_if_early_checkout_limit_minutes ?? 60,
        no_checkin_enable: this.settings.no_checkin_enable ?? true,
        no_checkin_status: this.settings.no_checkin_status || 'Absent',
        no_checkout_enable: this.settings.no_checkout_enable ?? true,
        no_checkout_status: this.settings.no_checkout_status || 'Absent',
        flexible_shift_start: this.settings.flexible_shift_start || '09:00:00',
        flexible_shift_end: this.settings.flexible_shift_end || '18:00:00'
      });

      Toast.show('Personalización de marca y colores guardada correctamente', 'success');

      if (window.loadSystemBranding) {
        await window.loadSystemBranding();
      }
    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    }
  },
  
  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
};
