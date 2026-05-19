/* device.js — Estado y configuración del dispositivo */

const DevicePage = {
  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Dispositivo</div>
        <div class="section-actions">
          <button class="btn btn-secondary" onclick="DevicePage.checkConnection()">🔍 Verificar conexión</button>
          ${Auth.isAdmin() ? `<button class="btn btn-primary" onclick="DevicePage.manualSync()" id="btnManualSync">⟳ Sync manual</button>
                              <button class="btn btn-primary" style="background-color: var(--primary);" onclick="DevicePage.historicSync()" id="btnHistoricSync">📥 Importar Histórico</button>` : ''}
        </div>
      </div>
      
      <div id="syncProgressBar" style="display:none; margin-bottom: 20px; background: var(--surface-2); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <strong style="color:var(--accent-1);">Sincronizando con el biométrico...</strong>
          <span style="font-size:0.85rem; color:var(--text-2);" id="syncProgressText">Procesando datos en segundo plano</span>
        </div>
        <div style="width: 100%; height: 8px; background-color: var(--surface-3); border-radius: 4px; overflow: hidden;">
          <div style="width: 100%; height: 100%; background-color: var(--accent-1); animation: progressIndeterminate 1.5s infinite linear; transform-origin: left;"></div>
        </div>
        <style>
          @keyframes progressIndeterminate {
            0% { transform: scaleX(0); opacity: 1; }
            50% { transform: scaleX(0.5); opacity: 0.8; }
            100% { transform: scaleX(1); opacity: 0; }
          }
        </style>
      </div>

      <div class="grid-2" style="margin-bottom:20px">
        <div class="card" id="deviceStatusCard"><div class="loading-overlay"><div class="spinner"></div></div></div>
        ${Auth.isAdmin() ? `<div class="card" id="deviceConfigCard"><div class="loading-overlay"><div class="spinner"></div></div></div>` : '<div></div>'}
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">📜 Historial de sincronización</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Fecha/Hora</th><th>Estado</th><th>Eventos obtenidos</th><th>Eventos nuevos</th><th>Modo</th><th>Detalle</th></tr></thead>
            <tbody id="logsTable"><tr><td colspan="6"><div class="loading-overlay"><div class="spinner"></div></div></td></tr></tbody>
          </table>
        </div>
      </div>`;

    await Promise.all([this.loadStatus(), this.loadConfig(), this.loadLogs()]);
  },

  async loadStatus() {
    try {
      const s = await API.get('/api/device/status');
      const card = document.getElementById('deviceStatusCard');
      card.innerHTML = `
        <div class="card-header"><div class="card-title">📡 Estado del dispositivo</div></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2)">Estado</span>
            <span class="${s.is_online ? 'badge badge-green' : 'badge badge-red'}">${s.is_online ? '✓ En línea' : '✕ Fuera de línea'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2)">Dirección IP</span>
            <code style="background:var(--surface-3);padding:2px 10px;border-radius:6px">${s.ip_address}</code>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2)">Modo</span>
            <span class="${s.is_mock_mode ? 'badge badge-yellow' : 'badge badge-green'}">${s.is_mock_mode ? '🔵 Simulado' : '🟢 Real'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2)">Última sync exitosa</span>
            <span style="color:var(--text-1);font-size:.8rem">${s.last_successful_sync ? new Date(s.last_successful_sync).toLocaleString('es') : 'Nunca'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--text-2)">Total eventos sincronizados</span>
            <strong>${s.total_events_synced}</strong>
          </div>
          ${s.is_mock_mode ? `<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:10px;font-size:.8rem;color:var(--warning)">
            ⚠ Dispositivo no disponible en la red. El sistema genera datos simulados automáticamente. Cuando el dispositivo esté en línea en <strong>${s.ip_address}</strong>, la sincronización real comenzará automáticamente.</div>` : ''}
        </div>`;
    } catch(e) { document.getElementById('deviceStatusCard').innerHTML = `<p style="color:var(--danger)">Error cargando estado</p>`; }
  },

  async loadConfig() {
    if (!Auth.isAdmin()) return;
    try {
      const c = await API.get('/api/device/config');
      document.getElementById('deviceConfigCard').innerHTML = `
        <div class="card-header"><div class="card-title">⚙️ Configuración</div></div>
        <div class="field"><label>Dirección IP</label><input id="cfgIp" value="${c.ip_address}" /></div>
        <div class="form-row">
          <div class="field"><label>Puerto</label><input id="cfgPort" type="number" value="${c.port}" /></div>
          <div class="field"><label>Intervalo sync (min)</label><input id="cfgInterval" type="number" value="${c.sync_interval_minutes}" min="1" max="60" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Tolerancia Entrada (min)</label><input id="cfgEntryTol" type="number" value="${c.entry_tolerance_minutes}" min="0" max="120" title="Minutos adicionales antes de marcar llegada tarde" /></div>
          <div class="field"><label>Tolerancia Salida (min)</label><input id="cfgExitTol" type="number" value="${c.exit_tolerance_minutes}" min="0" max="120" title="Minutos permitidos antes de marcar salida temprana" /></div>
        </div>
        <div class="field"><label>Usuario dispositivo</label><input id="cfgUser" value="${c.username}" /></div>
        <div class="field"><label>Contraseña dispositivo</label><input id="cfgPass" type="password" placeholder="••••••••" /></div>
        <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="DevicePage.saveConfig()">Guardar configuración</button>`;
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
      if (!logs?.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">📜</div><p>Sin historial aún</p></div></td></tr>`; return; }
      
      let isRunning = false;
      tbody.innerHTML = logs.map(l => {
        const badges = { success:'badge-green', error:'badge-red', running:'badge-blue', offline:'badge-yellow' };
        const labels = { success:'✓ Exitosa', error:'✕ Error', running:'⟳ En curso', offline:'📴 Offline' };
        if (l.status === 'running') isRunning = true;
        return `<tr>
          <td style="font-size:.8rem">${new Date(l.started_at).toLocaleString('es')}</td>
          <td><span class="badge ${badges[l.status]||'badge-gray'}">${labels[l.status]||l.status}</span></td>
          <td style="text-align:center">${l.events_fetched}</td>
          <td style="text-align:center;color:var(--accent-3)">${l.events_new}</td>
          <td>${l.is_mock ? '<span class="badge badge-yellow">Simulado</span>' : '<span class="badge badge-green">Real</span>'}</td>
          <td style="font-size:.75rem;color:var(--danger)">${l.error_message||''}</td>
        </tr>`;
      }).join('');
      
      this.toggleProgress(isRunning);
      if (isRunning && !this.pollInterval) {
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
      setTimeout(() => this.loadLogs(), 1000);
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  async historicSync() {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const body = `
      <div class="field">
        <label>Fecha de inicio</label>
        <input type="date" id="syncStartDate" value="${firstDay}" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:4px;">
      </div>
      <div class="field" style="margin-top:10px">
        <label>Fecha de fin</label>
        <input type="date" id="syncEndDate" value="${today}" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:4px;">
      </div>
      <p style="margin-top:15px; font-size:0.85rem; color:var(--text-2);">
        Descargará todos los eventos en este rango, omitiendo personas desconocidas y aplicando las reglas de tolerancia.
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

    document.getElementById('modalCloseBtn').onclick = () => {
      document.getElementById('modalOverlay').classList.remove('open');
    };
    
    document.getElementById('confirmSyncBtn').onclick = async () => {
      const start = document.getElementById('syncStartDate').value;
      const end = document.getElementById('syncEndDate').value;
      if(!start || !end) return Toast.show("Selecciona ambas fechas", "warning");
      
      document.getElementById('modalOverlay').classList.remove('open');
      
      try {
        await API.post('/api/device/sync-historic', { start_date: start, end_date: end });
        Toast.show('Importación histórica iniciada', 'info');
        setTimeout(() => DevicePage.loadLogs(), 1000);
      } catch(e) { Toast.show(e.message, 'error'); }
    };
  },
  
  // Limpieza al desmontar la vista
  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
};
