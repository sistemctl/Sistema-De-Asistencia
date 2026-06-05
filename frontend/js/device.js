/* device.js — Estado y configuración del dispositivo */

const DevicePage = {
  currentTab: 'device_status',
  settings: {},
  pollInterval: null,

  async render(tab = 'device_status') {
    this.currentTab = tab;

    if (tab === 'branding' || tab === 'audit' || tab === 'email_settings' || tab === 'backup_settings' || tab === 'maintenance') {
      document.getElementById('pageContent').innerHTML = `
        <div class="tabs-container" style="margin-bottom: 24px; border-bottom: 1px solid var(--border); display: flex; gap: 24px;">
          <button class="tab-btn active" data-tab="branding" onclick="DevicePage.switchTab('branding')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
            Personalización de Marca
          </button>
          <button class="tab-btn" data-tab="email_settings" onclick="DevicePage.switchTab('email_settings')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
            Configuración de Correo
          </button>
          <button class="tab-btn" data-tab="backup_settings" onclick="DevicePage.switchTab('backup_settings')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
            Copias de Seguridad
          </button>
          <button class="tab-btn" data-tab="maintenance" onclick="DevicePage.switchTab('maintenance')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
            Mantenimiento de Datos
          </button>
          <button class="tab-btn" data-tab="audit" onclick="DevicePage.switchTab('audit')" style="background: none; border: none; color: var(--text-2); padding: 12px 0; font-weight: 600; font-size: 0.95rem; cursor: pointer; position: relative; transition: color 0.2s;">
            Historial de Auditoría
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
    if (tab === 'branding' || tab === 'audit' || tab === 'email_settings' || tab === 'backup_settings' || tab === 'maintenance') {
      const targetHash = `#system/${tab}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = `system/${tab}`;
        return;
      }
    } else {
      const targetHash = tab === 'device_status' ? '#device' : `#device/${tab}`;
      if (window.location.hash !== '#device' && window.location.hash !== targetHash) {
        window.location.hash = tab === 'device_status' ? 'device' : `device/${tab}`;
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

        ${Auth.isAdmin() ? `
        <div class="card" style="margin-bottom:24px;">
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Panel de Control Remoto
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <button class="btn btn-secondary" onclick="DevicePage.remoteOpenDoor()" style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; height: auto;">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--accent)" stroke-width="2" fill="none"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"></path><path d="M2 20h20"></path><path d="M14 12v.01"></path></svg>
              <span>Abrir Puerta</span>
            </button>
            <button class="btn btn-secondary" onclick="DevicePage.remoteSyncTime()" style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; height: auto;">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="#00b0ff" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>Sincronizar Hora</span>
            </button>
            <button class="btn btn-secondary" onclick="DevicePage.remoteReboot()" style="display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 12px; height: auto; border-color: rgba(255,59,48,0.3);">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--danger)" stroke-width="2" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
              <span style="color: var(--danger)">Reiniciar Biométrico</span>
            </button>
          </div>
        </div>
        
        <div class="card" style="margin-bottom:24px;">
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Configuraciones de Seguridad
          </div>
          <div class="grid-2">
            <div style="background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-2); margin-bottom: 8px; display: block;">Nivel de Verificación Global</label>
              <select id="secVerifyMode" class="form-control" style="width: 100%; margin-bottom: 12px;">
                <option value="faceOnly">Solo Rostro</option>
                <option value="faceAndCard">Rostro + Tarjeta</option>
                <option value="faceOrCard">Rostro o Tarjeta</option>
                <option value="faceOrFp">Rostro o Huella</option>
              </select>
              <button class="btn btn-secondary" onclick="DevicePage.setVerifyMode()" style="width: 100%;">Aplicar Nivel</button>
            </div>
            
            <div style="background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-2); margin-bottom: 8px; display: block;">Volumen del Dispositivo</label>
              <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                <input type="range" id="secVolumeRange" min="0" max="100" value="50" style="flex: 1;" oninput="document.getElementById('secVolumeText').textContent = this.value + '%'">
                <span id="secVolumeText" style="font-size: 0.85rem; width: 40px; text-align: right; font-weight: 600;">50%</span>
              </div>
              <button class="btn btn-secondary" onclick="DevicePage.setVolume()" style="width: 100%;">Ajustar Volumen</button>
            </div>
          </div>
        </div>
        ` : ''}
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
    } else if (tab === 'audit') {
      if (typeof AuditPage !== 'undefined') {
        AuditPage.render('deviceTabContent');
      } else {
        contentEl.innerHTML = '<p>Cargando módulo de auditoría...</p>';
      }
    } else if (tab === 'email_settings') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Configuración de Alertas por Correo</div>
        </div>
        
        <div style="max-width: 600px; margin-top: 16px;">
          <div class="card">
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Servidor SMTP y Notificaciones
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
              <label class="switch">
                <input type="checkbox" id="sysEmailNotificationsEnabled">
                <span class="slider"></span>
              </label>
              <div>
                <div style="font-weight: 600; font-size: 0.9rem;">Habilitar Notificaciones (Maestro)</div>
                <div style="font-size: 0.72rem; color: var(--text-3); margin-top: 2px;">Interruptor principal. Si se apaga, no se enviará ningún correo.</div>
              </div>
            </div>

            <div style="margin-bottom: 24px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-1);">
              <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 12px; color: var(--text-1);">Tipos de Alertas a Enviar</div>
              
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <label class="switch">
                  <input type="checkbox" id="sysAlertDeviceOffline">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 500; font-size: 0.85rem;">Notificar si el biométrico se desconecta</div>
                  <div style="font-size: 0.7rem; color: var(--text-3);">Se envía de inmediato al soporte técnico.</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <label class="switch">
                  <input type="checkbox" id="sysAlertEmployeeLateness">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 500; font-size: 0.85rem;">Notificar llegadas tardías (retardos) a empleados</div>
                  <div style="font-size: 0.7rem; color: var(--text-3);">Envía un correo automático al empleado recomendando puntualidad.</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 12px;">
                <label class="switch">
                  <input type="checkbox" id="sysAlertAdminDailyReport">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 500; font-size: 0.85rem;">Enviar reporte diario (18:00) a administradores</div>
                  <div style="font-size: 0.7rem; color: var(--text-3);">Resumen consolidado de asistencias, faltas y retardos del día.</div>
                </div>
              </div>
            </div>

            <div class="field" style="margin-bottom: 16px;">
              <label>Servidor SMTP (Host)</label>
              <input id="sysSmtpHost" type="text" placeholder="Ej. smtp.gmail.com" style="width: 100%; box-sizing: border-box;" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div class="field">
                <label>Puerto SMTP</label>
                <input id="sysSmtpPort" type="number" placeholder="Ej. 587" style="width: 100%; box-sizing: border-box;" />
              </div>
              <div class="field" style="display: flex; align-items: center; gap: 12px; margin-top: 20px;">
                <label class="switch">
                  <input type="checkbox" id="sysSmtpUseTls">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 600; font-size: 0.9rem;">Usar TLS</div>
                  <div style="font-size: 0.72rem; color: var(--text-3);">STARTTLS. Si está desactivado, usará SSL.</div>
                </div>
              </div>
            </div>

            <div class="field" style="margin-bottom: 16px;">
              <label>Usuario SMTP (Correo Electrónico)</label>
              <input id="sysSmtpUsername" type="email" placeholder="Ej. tu_correo@gmail.com" style="width: 100%; box-sizing: border-box;" />
            </div>

            <div class="field" style="margin-bottom: 16px;">
              <label>Contraseña SMTP</label>
              <input id="sysSmtpPassword" type="password" placeholder="••••••••" style="width: 100%; box-sizing: border-box;" />
            </div>

            <div class="field" style="margin-bottom: 16px;">
              <label>Destinatarios de Alertas (correos separados por comas)</label>
              <input id="sysEmailAlertsRecipients" type="text" placeholder="admin1@empresa.com, admin2@empresa.com" style="width: 100%; box-sizing: border-box;" />
            </div>

            <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 24px;">
              <button class="btn btn-secondary" id="btnTestEmail" style="flex: 1; padding: 12px; font-weight: bold;">
                Probar Conexión
              </button>
              <button class="btn btn-primary" id="btnSaveEmailSettings" style="flex: 1; padding: 12px; font-weight: bold;">
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('btnTestEmail')?.addEventListener('click', () => this.testEmail());
      document.getElementById('btnSaveEmailSettings')?.addEventListener('click', () => this.saveEmailSettings());
      await this.loadEmailSettings();
    } else if (tab === 'backup_settings') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Copias de Seguridad (Backup & Restore)</div>
        </div>
        
        <div style="max-width: 600px; margin-top: 16px;">
          <div class="card" style="margin-bottom: 24px;">
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar Copia de Seguridad
            </div>
            <p style="font-size: 0.85rem; color: var(--text-2); line-height: 1.5; margin-bottom: 20px;">
              Descarga un archivo comprimido que contiene la base de datos PostgreSQL y todas las imágenes del sistema (logotipo y fotos de empleados).
            </p>
            <button class="btn btn-primary" id="btnExportBackup" style="width: 100%; padding: 12px; font-weight: bold;">
              Generar y Descargar Backup (.zip)
            </button>
            <div id="exportProgress" style="display:none; margin-top:16px;">
              <div style="font-size:0.85rem; color:var(--text-3); margin-bottom:8px;">Generando y descargando archivo, por favor espera...</div>
              <div style="width: 100%; height: 4px; background-color: var(--surface-3); border-radius: 99px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background-color: var(--accent); animation: progressIndeterminate 1.5s infinite linear; transform-origin: left; border-radius: 99px;"></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--danger); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Restaurar Copia de Seguridad
            </div>
            <p style="font-size: 0.85rem; color: var(--text-2); line-height: 1.5; margin-bottom: 20px;">
              Selecciona un archivo de copia de seguridad para restaurar. Si es un archivo .zip, se restaurarán también las imágenes.
              <br><strong style="color: var(--danger);">ADVERTENCIA: Esto sobrescribirá todos los datos actuales.</strong>
            </p>
            
            <div style="display: flex; gap: 16px; align-items: center; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px dashed var(--border);">
              <input id="restoreFileInput" type="file" accept=".zip,.sql,.backup" style="display: none;" />
              <button class="btn btn-secondary" onclick="document.getElementById('restoreFileInput').click()">Seleccionar archivo</button>
              <span id="restoreFileName" style="font-size: 0.85rem; color: var(--text-3);">Ningún archivo seleccionado</span>
            </div>

            <button class="btn btn-primary" id="btnRestoreBackup" style="width: 100%; padding: 12px; font-weight: bold; margin-top: 20px; background: var(--danger); border-color: var(--danger);">
              Restaurar Base de Datos
            </button>
            <div id="restoreProgress" style="display:none; margin-top:16px;">
              <div style="font-size:0.85rem; color:var(--text-3); margin-bottom:8px;">Subiendo y restaurando datos, por favor espera...</div>
              <div style="width: 100%; height: 4px; background-color: var(--surface-3); border-radius: 99px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background-color: var(--danger); animation: progressIndeterminate 1.5s infinite linear; transform-origin: left; border-radius: 99px;"></div>
              </div>
            </div>
            </div>
          </div>
        </div>
      `;
      const fInput = document.getElementById('restoreFileInput');
      if (fInput) {
        fInput.addEventListener('change', (e) => {
          const fn = e.target.files[0]?.name || 'Ningún archivo seleccionado';
          document.getElementById('restoreFileName').textContent = fn;
        });
      }
      document.getElementById('btnExportBackup')?.addEventListener('click', () => this.exportBackup());
      document.getElementById('btnRestoreBackup')?.addEventListener('click', () => this.restoreBackup());
    } else if (tab === 'maintenance') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Mantenimiento y Retención de Datos</div>
        </div>
        
        <div style="max-width: 600px; margin-top: 16px;">
          <div class="card">
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
              Retención y Limpieza
            </div>
            <p style="font-size: 0.85rem; color: var(--text-2); line-height: 1.5; margin-bottom: 20px;">
              Configura la limpieza automática para evitar que la base de datos crezca infinitamente. 
            </p>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
              <label class="switch">
                <input type="checkbox" id="sysCleanupEnabled">
                <span class="slider"></span>
              </label>
              <div style="flex:1">
                <div style="font-weight: 600; font-size: 0.9rem;">Habilitar Limpieza Automática</div>
                <div style="font-size: 0.72rem; color: var(--text-3); margin-top: 2px;">Si se activa, el sistema borrará información antigua de forma automática.</div>
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-3); display: block; margin-bottom: 4px;">Hora (HH:MM)</label>
                <input type="time" id="sysCleanupTime" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-1); color: var(--text-1);">
              </div>
            </div>

            <div style="display: grid; gap: 16px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <input type="checkbox" id="sysCleanupAttendanceEnabled">
                  <label for="sysCleanupAttendanceEnabled" style="font-size: 0.85rem;">Asistencias y Faltas</label>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-3);">Conservar por</span>
                  <input type="number" id="sysRetAttendance" min="1" style="width: 70px; padding: 4px 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-3);">días</span>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <input type="checkbox" id="sysCleanupAuditEnabled">
                  <label for="sysCleanupAuditEnabled" style="font-size: 0.85rem;">Logs de Auditoría (Admin)</label>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-3);">Conservar por</span>
                  <input type="number" id="sysRetAudit" min="1" style="width: 70px; padding: 4px 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-3);">días</span>
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <input type="checkbox" id="sysCleanupSyncEnabled">
                  <label for="sysCleanupSyncEnabled" style="font-size: 0.85rem;">Logs Técnicos (Biométrico)</label>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-3);">Conservar por</span>
                  <input type="number" id="sysRetSync" min="1" style="width: 70px; padding: 4px 8px;">
                  <span style="font-size: 0.8rem; color: var(--text-3);">días</span>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 12px; border-top: 1px solid var(--border); padding-top: 16px;">
              <button class="btn btn-secondary" id="btnSaveCleanup" style="flex: 1; padding: 12px; font-weight: bold;">
                Guardar Config. de Limpieza
              </button>
              <button class="btn" id="btnManualCleanup" style="flex: 1; padding: 12px; font-weight: bold; background: rgba(255,59,48,0.1); color: var(--danger); border: 1px solid rgba(255,59,48,0.3);">
                Ejecutar Limpieza Manual Ahora
              </button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('btnSaveCleanup')?.addEventListener('click', () => this.saveCleanupSettings());
      document.getElementById('btnManualCleanup')?.addEventListener('click', () => this.runManualCleanup());
      await this.loadCleanupSettings();
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

  async loadEmailSettings() {
    try {
      const data = await API.get('/api/settings');
      this.settings = data;

      document.getElementById('sysEmailNotificationsEnabled').checked = data.email_notifications_enabled ?? false;
      document.getElementById('sysSmtpHost').value = data.smtp_host || 'smtp.gmail.com';
      document.getElementById('sysSmtpPort').value = data.smtp_port ?? 587;
      document.getElementById('sysSmtpUseTls').checked = data.smtp_use_tls ?? true;
      document.getElementById('sysSmtpUsername').value = data.smtp_username || '';
      document.getElementById('sysSmtpPassword').value = data.smtp_password ? '••••••••' : '';
      document.getElementById('sysEmailAlertsRecipients').value = data.email_alerts_recipients || '';
      
      document.getElementById('sysAlertDeviceOffline').checked = data.alert_device_offline ?? true;
      document.getElementById('sysAlertEmployeeLateness').checked = data.alert_employee_lateness ?? true;
      document.getElementById('sysAlertAdminDailyReport').checked = data.alert_admin_daily_report ?? true;
    } catch (e) {
      console.error(e);
      Toast.show('Error al cargar la configuración de correo', 'error');
    }
  },

  async saveEmailSettings() {
    const enabled = document.getElementById('sysEmailNotificationsEnabled').checked;
    const host = document.getElementById('sysSmtpHost').value.trim();
    const port = parseInt(document.getElementById('sysSmtpPort').value) || 587;
    const username = document.getElementById('sysSmtpUsername').value.trim();
    const password = document.getElementById('sysSmtpPassword').value;
    const useTls = document.getElementById('sysSmtpUseTls').checked;
    const recipients = document.getElementById('sysEmailAlertsRecipients').value.trim();
    const alertDeviceOffline = document.getElementById('sysAlertDeviceOffline').checked;
    const alertEmployeeLateness = document.getElementById('sysAlertEmployeeLateness').checked;
    const alertAdminDailyReport = document.getElementById('sysAlertAdminDailyReport').checked;

    try {
      if (!this.settings.work_days) {
        const currentData = await API.get('/api/settings');
        this.settings = currentData;
      }

      await API.put('/api/settings', {
        ...this.settings,
        smtp_host: host,
        smtp_port: port,
        smtp_username: username,
        smtp_password: password,
        smtp_use_tls: useTls,
        email_notifications_enabled: enabled,
        email_alerts_recipients: recipients,
        alert_device_offline: alertDeviceOffline,
        alert_employee_lateness: alertEmployeeLateness,
        alert_admin_daily_report: alertAdminDailyReport
      });

      Toast.show('Configuración de correo guardada correctamente', 'success');
      
      this.settings.smtp_host = host;
      this.settings.smtp_port = port;
      this.settings.smtp_username = username;
      if (password && password !== '••••••••') this.settings.smtp_password = password;
      this.settings.smtp_use_tls = useTls;
      this.settings.email_notifications_enabled = enabled;
      this.settings.email_alerts_recipients = recipients;
      this.settings.alert_device_offline = alertDeviceOffline;
      this.settings.alert_employee_lateness = alertEmployeeLateness;
      this.settings.alert_admin_daily_report = alertAdminDailyReport;
    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    }
  },

  async testEmail() {
    const recipient = prompt("Introduce el correo de destino para la prueba:");
    if (!recipient) return;

    Toast.show('Enviando correo de prueba...', 'info');
    try {
      const response = await API.post('/api/settings/test-email', { recipient: recipient });
      Toast.show(response.message || '¡Correo de prueba enviado con éxito!', 'success');
    } catch (e) {
      console.error(e);
      Toast.show('Error al enviar correo de prueba: ' + e.message, 'error');
    }
  },

  async exportBackup() {
    const btn = document.getElementById('btnExportBackup');
    const progress = document.getElementById('exportProgress');
    if (btn) btn.disabled = true;
    if (progress) progress.style.display = 'block';
    
    Toast.show('Generando copia de seguridad...', 'info');
    try {
      const token = API.token();
      const response = await fetch('/api/backup/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error al generar la copia de seguridad.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      Toast.show('Copia de seguridad descargada.', 'success');
    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (progress) progress.style.display = 'none';
    }
  },

  async restoreBackup() {
    const fileInput = document.getElementById('restoreFileInput');
    const file = fileInput.files[0];
    if (!file) {
      Toast.show('Selecciona un archivo de copia de seguridad (.zip, .sql o .backup).', 'warning');
      return;
    }

    Modal.confirm(
      '¿Restaurar Base de Datos e Imágenes?',
      '¿Estás seguro de restaurar? Todos los datos actuales del sistema y las fotos de los empleados serán sobrescritos por el respaldo. El servidor podría reiniciarse.',
      async () => {
        const btn = document.getElementById('btnRestoreBackup');
        const progress = document.getElementById('restoreProgress');
        if (btn) btn.disabled = true;
        if (progress) progress.style.display = 'block';

        Toast.show('Restaurando base de datos, por favor espera...', 'info');
        const formData = new FormData();
        formData.append('file', file);

        try {
          const token = API.token();
          const response = await fetch('/api/backup/restore', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.detail || 'Fallo al restaurar.');
          Toast.show('Base de datos restaurada correctamente. Recargando la aplicación...', 'success');
          setTimeout(() => window.location.reload(), 2000);
        } catch (e) {
          console.error(e);
          Toast.show(e.message || 'Error al restaurar base de datos.', 'error');
          if (btn) btn.disabled = false;
          if (progress) progress.style.display = 'none';
        }
      },
      'danger'
    );
  },
  
  async loadCleanupSettings() {
    try {
      const data = await API.get('/api/settings');
      this.settings = data;
      
      document.getElementById('sysCleanupEnabled').checked = data.cleanup_enabled ?? false;
      document.getElementById('sysCleanupTime').value = data.cleanup_time || '02:00';
      
      document.getElementById('sysCleanupAttendanceEnabled').checked = data.cleanup_attendance_enabled ?? true;
      document.getElementById('sysRetAttendance').value = data.retention_attendance_days || 1825;
      
      document.getElementById('sysCleanupAuditEnabled').checked = data.cleanup_audit_enabled ?? true;
      document.getElementById('sysRetAudit').value = data.retention_audit_logs_days || 365;
      
      document.getElementById('sysCleanupSyncEnabled').checked = data.cleanup_sync_enabled ?? true;
      document.getElementById('sysRetSync').value = data.retention_sync_logs_days || 30;
      
    } catch(e) {
      console.error(e);
      Toast.show('Error al cargar la configuración de limpieza', 'error');
    }
  },

  async saveCleanupSettings() {
    const enabled = document.getElementById('sysCleanupEnabled').checked;
    const time = document.getElementById('sysCleanupTime').value || '02:00';
    
    const attEnabled = document.getElementById('sysCleanupAttendanceEnabled').checked;
    const attDays = parseInt(document.getElementById('sysRetAttendance').value) || 1825;
    
    const auditEnabled = document.getElementById('sysCleanupAuditEnabled').checked;
    const auditDays = parseInt(document.getElementById('sysRetAudit').value) || 365;
    
    const syncEnabled = document.getElementById('sysCleanupSyncEnabled').checked;
    const syncDays = parseInt(document.getElementById('sysRetSync').value) || 30;

    try {
      if (!this.settings.work_days) {
        this.settings = await API.get('/api/settings');
      }

      await API.put('/api/settings', {
        ...this.settings,
        cleanup_enabled: enabled,
        cleanup_time: time,
        cleanup_attendance_enabled: attEnabled,
        retention_attendance_days: attDays,
        cleanup_audit_enabled: auditEnabled,
        retention_audit_logs_days: auditDays,
        cleanup_sync_enabled: syncEnabled,
        retention_sync_logs_days: syncDays
      });

      Toast.show('Configuración de mantenimiento guardada correctamente', 'success');
      
      this.settings.cleanup_enabled = enabled;
      this.settings.cleanup_time = time;
      this.settings.cleanup_attendance_enabled = attEnabled;
      this.settings.retention_attendance_days = attDays;
      this.settings.cleanup_audit_enabled = auditEnabled;
      this.settings.retention_audit_logs_days = auditDays;
      this.settings.cleanup_sync_enabled = syncEnabled;
      this.settings.retention_sync_logs_days = syncDays;
      
    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    }
  },

  async runManualCleanup() {
    Modal.confirm(
      '⚠️ Ejecutar Limpieza Manual',
      '¿Estás seguro? Estás a punto de borrar definitivamente todos los registros y logs anteriores a las fechas configuradas. Esta acción NO se puede deshacer y los registros desaparecerán de los reportes.',
      async () => {
        const btn = document.getElementById('btnManualCleanup');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;display:inline-block;border-width:2px;margin-right:6px"></span> Limpiando...';
        }
        
        try {
          const response = await API.post('/api/settings/manual-cleanup', {});
          const msg = `Limpieza finalizada.\\nAsistencias borradas: ${response.stats.attendance}\\nLogs de sincronización: ${response.stats.sync_logs}\\nLogs de auditoría: ${response.stats.audit_logs}`;
          Toast.show('¡Mantenimiento exitoso!', 'success');
          alert(msg); // Usar alert nativo para mostrar el detalle claramente
        } catch (e) {
          console.error(e);
          Toast.show(e.message || 'Error al ejecutar la limpieza', 'error');
        } finally {
          if (btn) {
              btn.disabled = false;
              btn.innerHTML = 'Ejecutar Limpieza Manual Ahora';
          }
        }
      },
      'danger'
    );
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
