/* device.js — Estado y configuración del dispositivo */

const DevicePage = {
  currentTab: 'device_status',
  settings: {},
  pollInterval: null,

  async render(tab = 'device_status') {
    this.currentTab = tab;

    document.getElementById('pageContent').innerHTML = `
      <div class="tabs-container" style="margin-bottom: 24px; border-bottom: 1px solid var(--border); display: flex; gap: 24px; flex-wrap: wrap;">
        <button class="tab-btn active" data-tab="device_status" onclick="DevicePage.switchTab('device_status')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Red y Conexión
        </button>
        ${Auth.isAdmin() ? `
        <button class="tab-btn" data-tab="remote_control" onclick="DevicePage.switchTab('remote_control')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Control Remoto
        </button>
        <button class="tab-btn" data-tab="device_settings" onclick="DevicePage.switchTab('device_settings')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
          Ajustes de Seguridad
        </button>
        ` : ''}
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

    await this.switchTab(tab);
  },

  async switchTab(tab) {
    this.currentTab = tab;
    
    // Sincronizar hash de la SPA según la pestaña activa
    const targetHash = tab === 'device_status' ? '#device' : `#device/${tab}`;
    if (window.location.hash !== '#device' && window.location.hash !== targetHash) {
      window.location.hash = tab === 'device_status' ? 'device' : `device/${tab}`;
      return;
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
    if (!contentEl) return;

    if (tab === 'device_status') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Red y Conexión</div>
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

        <!-- KPI Status Row -->
        <div id="deviceKpisRow" style="margin-top: 16px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="card" style="padding: 16px; display: flex; align-items: center; justify-content: center; height: 76px;"><div class="loading-overlay" style="position:static; height:auto;"><div class="spinner"></div></div></div>
          </div>
        </div>

        <div id="deviceOfflineAlertContainer" style="margin-bottom: 20px;"></div>

        <!-- Configuration Grid -->
        ${Auth.isAdmin() ? `
        <div class="grid-2" style="margin-bottom:24px;">
          <div class="card" id="connectionConfigCard">
            <div class="loading-overlay"><div class="spinner"></div></div>
          </div>
          <div class="card" id="syncConfigCard">
            <div class="loading-overlay"><div class="spinner"></div></div>
          </div>
        </div>
        
        <div style="text-align: right; margin-bottom: 24px; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" style="padding: 12px 24px; font-weight: bold; width: 100%; max-width: 250px;" onclick="DevicePage.saveConfig()">
            Guardar Configuración
          </button>
        </div>
        ` : ''}
      `;
      await Promise.all([this.loadStatus(), this.loadConfig()]);

    } else if (tab === 'remote_control') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Control Remoto</div>
        </div>
        
        <div class="card" style="margin-top: 16px;">
          <p style="font-size: 0.85rem; color: var(--text-2); margin-bottom: 20px;">
            Acciones físicas y operaciones directas sobre el biométrico Hikvision.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <button class="btn btn-secondary" onclick="DevicePage.remoteOpenDoor()" style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; height: auto;">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--accent)" stroke-width="2" fill="none"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"></path><path d="M2 20h20"></path><path d="M14 12v.01"></path></svg>
              <strong>Abrir Puerta</strong>
              <span style="font-size: 0.75rem; color: var(--text-3); text-align: center; margin-top: 4px;">Accionar relé de salida para apertura temporal</span>
            </button>
            <button class="btn btn-secondary" onclick="DevicePage.remoteSyncTime()" style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; height: auto;">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="#00b0ff" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <strong>Sincronizar Hora</strong>
              <span style="font-size: 0.75rem; color: var(--text-3); text-align: center; margin-top: 4px;">Ajustar reloj del biométrico con la hora del servidor</span>
            </button>
            <button class="btn btn-secondary" onclick="DevicePage.remoteReboot()" style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; height: auto; border-color: rgba(255,59,48,0.3);">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--danger)" stroke-width="2" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
              <strong style="color: var(--danger)">Reiniciar Equipo</strong>
              <span style="font-size: 0.75rem; color: var(--text-3); text-align: center; margin-top: 4px;">Forzar reinicio por software de la terminal</span>
            </button>
          </div>
        </div>
      `;

    } else if (tab === 'device_settings') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Ajustes de Seguridad y Volumen</div>
        </div>
        
        <div class="grid-2" style="margin-top: 16px;">
          <div class="card">
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Nivel de Verificación Global
            </div>
            <div style="background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-2); margin-bottom: 8px; display: block;">Modo de autenticación en hardware</label>
              <select id="secVerifyMode" class="form-control" style="width: 100%; margin-bottom: 12px; padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-1); color: var(--text-1);">
                <option value="faceOnly">Solo Rostro</option>
                <option value="faceAndCard">Rostro + Tarjeta</option>
                <option value="faceOrCard">Rostro o Tarjeta</option>
                <option value="faceOrFp">Rostro o Huella</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="DevicePage.setVerifyMode()" style="width: 100%;">Aplicar Nivel de Seguridad</button>
          </div>
          
          <div class="card">
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              Volumen de la Terminal
            </div>
            <div style="background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-2); margin-bottom: 8px; display: block;">Volumen de avisos de voz</label>
              <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                <input type="range" id="secVolumeRange" min="0" max="100" value="50" style="flex: 1;" oninput="document.getElementById('secVolumeText').textContent = this.value + '%'">
                <span id="secVolumeText" style="font-size: 0.85rem; width: 40px; text-align: right; font-weight: 600;">50%</span>
              </div>
            </div>
            <button class="btn btn-primary" onclick="DevicePage.setVolume()" style="width: 100%;">Ajustar Volumen</button>
          </div>
        </div>
      `;

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
      // Empezar a sondear cada 5 segundos si estamos en la pestaña de historial
      this.pollInterval = setInterval(() => this.loadLogs(), 5000);
    }
  },

  toggleSyncOptions() {
    const autoSync = document.getElementById('cfgAutoSync').checked;
    const optContainer = document.getElementById('syncOptionsContainer');
    if (optContainer) optContainer.style.display = autoSync ? 'block' : 'none';
  },

  toggleSyncMode() {
    const mode = document.getElementById('cfgSyncMode').value;
    const intervalField = document.getElementById('syncIntervalField');
    if (intervalField) intervalField.style.display = mode === 'interval' ? 'block' : 'none';
  },

  async loadStatus() {
    try {
      const s = await API.get('/api/device/status');
      
      // Actualizar KPI Status Row
      const kpisRow = document.getElementById('deviceKpisRow');
      if (kpisRow) {
        kpisRow.innerHTML = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; background: var(--surface-1); border: 1px solid var(--border); margin-bottom: 0;">
              <div style="width: 42px; height: 42px; border-radius: 10px; background: ${s.is_online ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 59, 48, 0.1)'}; display: flex; align-items: center; justify-content: center; color: ${s.is_online ? 'var(--accent)' : 'var(--danger)'};">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-3); font-weight: bold; letter-spacing: 0.5px;">Estado Físico</div>
                <div style="font-size: 1rem; font-weight: 700; color: ${s.is_online ? 'var(--accent)' : 'var(--danger)'};">${s.is_online ? 'En Línea' : 'Fuera de Línea'}</div>
              </div>
            </div>

            <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; background: var(--surface-1); border: 1px solid var(--border); margin-bottom: 0;">
              <div style="width: 42px; height: 42px; border-radius: 10px; background: ${s.is_mock_mode ? 'rgba(255, 179, 0, 0.1)' : 'rgba(0, 230, 118, 0.1)'}; display: flex; align-items: center; justify-content: center; color: ${s.is_mock_mode ? 'var(--warning)' : 'var(--accent)'};">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-3); font-weight: bold; letter-spacing: 0.5px;">Modo Operativo</div>
                <div style="font-size: 1rem; font-weight: 700; color: ${s.is_mock_mode ? 'var(--warning)' : 'var(--accent)'};">${s.is_mock_mode ? 'Simulado' : 'Real'}</div>
              </div>
            </div>

            <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; background: var(--surface-1); border: 1px solid var(--border); margin-bottom: 0;">
              <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(0, 176, 255, 0.1); display: flex; align-items: center; justify-content: center; color: #00b0ff;">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-3); font-weight: bold; letter-spacing: 0.5px;">Última Sync Exitosa</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-1); font-family: 'JetBrains Mono', monospace;">${s.last_successful_sync ? new Date(s.last_successful_sync).toLocaleString('es') : 'Nunca'}</div>
              </div>
            </div>

            <div class="card" style="padding: 16px; display: flex; align-items: center; gap: 14px; background: var(--surface-1); border: 1px solid var(--border); margin-bottom: 0;">
              <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(124, 77, 255, 0.1); display: flex; align-items: center; justify-content: center; color: var(--accent-2);">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-3); font-weight: bold; letter-spacing: 0.5px;">Eventos Obtenidos</div>
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-1); font-family: 'JetBrains Mono', monospace;">${s.total_events_synced}</div>
              </div>
            </div>
          </div>
        `;
      }

      // Actualizar offline alert
      const alertContainer = document.getElementById('deviceOfflineAlertContainer');
      if (alertContainer) {
        if (s.is_mock_mode) {
          alertContainer.innerHTML = `
            <div style="background: rgba(255,179,0,.08); border: 1px solid rgba(255,179,0,.2); border-radius: 12px; padding: 16px; font-size: 0.85rem; color: var(--warning); line-height: 1.6; display: flex; gap: 12px; align-items: flex-start;">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <div>
                <strong>Biométrico fuera de línea:</strong> El dispositivo no está disponible en la red en la dirección <code>${s.ip_address}</code>. 
                El sistema está generando datos simulados automáticamente para pruebas. La sincronización real con el hardware se reanudará en cuanto el biométrico responda.
              </div>
            </div>
          `;
        } else {
          alertContainer.innerHTML = '';
        }
      }
    } catch(e) { 
      const kpisRow = document.getElementById('deviceKpisRow');
      if (kpisRow) kpisRow.innerHTML = `<p style="color:var(--danger)">Error cargando estado del dispositivo</p>`; 
    }
  },

  async loadConfig() {
    if (!Auth.isAdmin()) return;
    try {
      const c = await API.get('/api/device/config');
      this.settings = c;
      
      const connCard = document.getElementById('connectionConfigCard');
      if (connCard) {
        connCard.innerHTML = `
          <div class="card-header">
            <div class="card-title">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
              Conexión Física (Red)
            </div>
          </div>
          <div class="field" style="margin-bottom: 16px;">
            <label>Dirección IP</label>
            <input id="cfgIp" value="${c.ip_address}" style="font-family:'JetBrains Mono',monospace; width: 100%; box-sizing: border-box;" />
          </div>
          <div class="field" style="margin-bottom: 16px;">
            <label>Puerto</label>
            <input id="cfgPort" type="number" value="${c.port}" style="font-family:'JetBrains Mono',monospace; width: 100%; box-sizing: border-box;" />
          </div>
          <div class="field" style="margin-bottom: 16px;">
            <label>Usuario Dispositivo</label>
            <input id="cfgUser" value="${c.username}" style="width: 100%; box-sizing: border-box;" />
          </div>
          <div class="field" style="margin-bottom: 0;">
            <label>Contraseña Dispositivo</label>
            <input id="cfgPass" type="password" placeholder="••••••••" style="width: 100%; box-sizing: border-box;" />
          </div>
        `;
      }

      const syncCard = document.getElementById('syncConfigCard');
      if (syncCard) {
        syncCard.innerHTML = `
          <div class="card-header">
            <div class="card-title">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Sincronización Automática
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
            <label class="toggle-switch">
              <input type="checkbox" id="cfgAutoSync" ${c.automatic_sync_enabled ? 'checked' : ''} onchange="DevicePage.toggleSyncOptions()">
              <span class="slider"></span>
            </label>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">Sincronización Automática Activa</div>
              <div style="font-size: 0.72rem; color: var(--text-3); margin-top: 2px;">Consultar periódicamente eventos de asistencia del hardware.</div>
            </div>
          </div>

          <div id="syncOptionsContainer" style="display: ${c.automatic_sync_enabled ? 'block' : 'none'}; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
            <div class="field" style="margin-bottom: 12px;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-2); margin-bottom: 6px; display: block;">Frecuencia de Sincronización</label>
              <select id="cfgSyncMode" onchange="DevicePage.toggleSyncMode()" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-1); color: var(--text-1);">
                <option value="realtime" ${c.sync_interval_minutes === 1 ? 'selected' : ''}>Tiempo Real (Cada 1 minuto)</option>
                <option value="interval" ${c.sync_interval_minutes > 1 ? 'selected' : ''}>Intervalo Personalizado</option>
              </select>
            </div>
            <div class="field" id="syncIntervalField" style="display: ${c.sync_interval_minutes > 1 ? 'block' : 'none'};">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-2); margin-bottom: 6px; display: block;">Intervalo de sincronización (minutos)</label>
              <input id="cfgInterval" type="number" value="${c.sync_interval_minutes > 1 ? c.sync_interval_minutes : 5}" min="2" max="60" style="width: 100%; box-sizing: border-box;" />
            </div>
          </div>
        `;
      }
    } catch(e) {
      console.warn(e);
    }
  },

  async saveConfig() {
    const autoSync = document.getElementById('cfgAutoSync').checked;
    const syncMode = document.getElementById('cfgSyncMode').value;
    let syncInterval = 1;
    if (syncMode === 'interval') {
      syncInterval = parseInt(document.getElementById('cfgInterval').value, 10) || 5;
      if (syncInterval < 2) syncInterval = 2;
      if (syncInterval > 60) syncInterval = 60;
    }

    const body = {
      ip_address: document.getElementById('cfgIp').value.trim(),
      port: parseInt(document.getElementById('cfgPort').value, 10) || 80,
      sync_interval_minutes: syncInterval,
      automatic_sync_enabled: autoSync,
      username: document.getElementById('cfgUser').value.trim(),
    };
    const pass = document.getElementById('cfgPass').value;
    if (pass) body.password = pass;
    
    try {
      await API.put('/api/device/config', body);
      Toast.show('Configuración guardada correctamente', 'success');
      await Promise.all([this.loadStatus(), this.loadConfig()]);
    } catch(e) { 
      Toast.show(e.message || 'Error guardando configuración', 'error'); 
    }
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
    } catch(e) { console.warn(e); }
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
        DevicePage.switchTab('sync_history');
      } catch(e) { Toast.show(e.message, 'error'); }
    };
  },

  async remoteOpenDoor() {
    Toast.show('Enviando comando de apertura...', 'info');
    try {
      const res = await API.post('/api/device/open-door');
      Toast.show(res.message || 'Puerta abierta', 'success');
    } catch (e) {
      console.error(e);
      Toast.show(e.message || 'Error abriendo puerta', 'error');
    }
  },

  async remoteSyncTime() {
    Toast.show('Sincronizando hora...', 'info');
    try {
      const res = await API.post('/api/device/sync-time');
      Toast.show(res.message || 'Hora sincronizada', 'success');
    } catch (e) {
      console.error(e);
      Toast.show(e.message || 'Error sincronizando hora', 'error');
    }
  },

  async remoteReboot() {
    Modal.confirm(
      '⚠️ Reiniciar Dispositivo',
      '¿Estás seguro de que deseas enviar la orden de reinicio? El biométrico se apagará y tardará 1-2 minutos en volver a conectar.',
      async () => {
        Toast.show('Reiniciando dispositivo...', 'info');
        try {
          const res = await API.post('/api/device/reboot');
          Toast.show(res.message || 'Dispositivo reiniciando', 'success');
        } catch (e) {
          console.error(e);
          Toast.show(e.message || 'Error reiniciando dispositivo', 'error');
        }
      },
      'danger'
    );
  },

  async setVerifyMode() {
    const mode = document.getElementById('secVerifyMode').value;
    Toast.show('Aplicando modo de verificación...', 'info');
    try {
      const res = await API.post('/api/device/security/verify-mode', { mode });
      Toast.show(res.message || 'Modo aplicado correctamente', 'success');
    } catch (e) {
      console.error(e);
      Toast.show(e.message || 'Error aplicando modo', 'error');
    }
  },

  async setVolume() {
    const volume = parseInt(document.getElementById('secVolumeRange').value, 10);
    Toast.show('Ajustando volumen...', 'info');
    try {
      const res = await API.post('/api/device/security/volume', { volume });
      Toast.show(res.message || 'Volumen ajustado correctamente', 'success');
    } catch (e) {
      console.error(e);
      Toast.show(e.message || 'Error ajustando volumen', 'error');
    }
  },

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
};
