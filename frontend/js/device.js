/* device.js — Estado y configuración del dispositivo */

const DevicePage = {
  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Dispositivo</div>
        <div class="section-actions">
          <button class="btn btn-secondary" onclick="DevicePage.checkConnection()">🔍 Verificar conexión</button>
          ${Auth.isAdmin() ? `<button class="btn btn-primary" onclick="DevicePage.manualSync()">⟳ Sync manual</button>` : ''}
        </div>
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
      tbody.innerHTML = logs.map(l => {
        const badges = { success:'badge-green', error:'badge-red', running:'badge-blue', offline:'badge-yellow' };
        const labels = { success:'✓ Exitosa', error:'✕ Error', running:'⟳ En curso', offline:'📴 Offline' };
        return `<tr>
          <td style="font-size:.8rem">${new Date(l.started_at).toLocaleString('es')}</td>
          <td><span class="badge ${badges[l.status]||'badge-gray'}">${labels[l.status]||l.status}</span></td>
          <td style="text-align:center">${l.events_fetched}</td>
          <td style="text-align:center;color:var(--accent-3)">${l.events_new}</td>
          <td>${l.is_mock ? '<span class="badge badge-yellow">Simulado</span>' : '<span class="badge badge-green">Real</span>'}</td>
          <td style="font-size:.75rem;color:var(--danger)">${l.error_message||''}</td>
        </tr>`;
      }).join('');
    } catch(e) {}
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
      Toast.show('Sincronización iniciada en segundo plano', 'info');
      setTimeout(() => this.loadLogs(), 3000);
    } catch(e) { Toast.show(e.message, 'error'); }
  },
};
