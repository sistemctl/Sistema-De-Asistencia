/* system_config.js — Configuración del Sistema (Branding, Email, Backup, Mantenimiento) */

const SystemConfigPage = {
  currentTab: 'branding',
  settings: {},

  async render(tab = 'branding') {
    this.currentTab = tab;

    document.getElementById('pageContent').innerHTML = `
      <div class="tabs-container">
        <button class="tab-btn active" data-tab="branding" onclick="SystemConfigPage.switchTab('branding')">
          Personalización de Marca
        </button>
        <button class="tab-btn" data-tab="email_settings" onclick="SystemConfigPage.switchTab('email_settings')">
          Configuración de Correo
        </button>
        <button class="tab-btn" data-tab="backup_settings" onclick="SystemConfigPage.switchTab('backup_settings')">
          Copias de Seguridad
        </button>
        <button class="tab-btn" data-tab="maintenance" onclick="SystemConfigPage.switchTab('maintenance')">
          Mantenimiento de Datos
        </button>
        <button class="tab-btn" data-tab="scheduler_settings" onclick="SystemConfigPage.switchTab('scheduler_settings')">
          Programador de Tareas
        </button>
        <button class="tab-btn" data-tab="audit" onclick="SystemConfigPage.switchTab('audit')">
          Historial de Auditoría
        </button>
        <button class="tab-btn" data-tab="users" onclick="SystemConfigPage.switchTab('users')">
          Gestión de Usuarios
        </button>
      </div>
      <div id="systemTabContent">
      </div>
    `;

    await this.switchTab(tab);
  },

  async switchTab(tab) {
    try {
      this.currentTab = tab;

      // Sincronizar hash de la SPA según la pestaña activa
      const targetHash = `#system/${tab}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = `system/${tab}`;
        return;
      }

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });

      const contentEl = document.getElementById('systemTabContent');
      if (!contentEl) {
        console.error("systemTabContent element not found!");
        return;
      }

      if (tab === 'users') {
        UsersPage.targetElId = 'systemTabContent';
        await UsersPage.render('list');
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
              <label class="toggle-switch">
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
                <label class="toggle-switch">
                  <input type="checkbox" id="sysAlertDeviceOffline">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 500; font-size: 0.85rem;">Notificar si el biométrico se desconecta</div>
                  <div style="font-size: 0.7rem; color: var(--text-3);">Se envía de inmediato al soporte técnico.</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <label class="toggle-switch">
                  <input type="checkbox" id="sysAlertEmployeeLateness">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 500; font-size: 0.85rem;">Notificar llegadas tardías (retardos) a empleados</div>
                  <div style="font-size: 0.7rem; color: var(--text-3);">Envía un correo automático al empleado recomendando puntualidad.</div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 12px;">
                <label class="toggle-switch">
                  <input type="checkbox" id="sysAlertAdminDailyReport">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 500; font-size: 0.85rem;">Enviar reporte diario (19:00) a administradores</div>
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
                <label class="toggle-switch">
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
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-top: 16px; max-width: 1000px;">
          <!-- Columna de Operaciones Manuales -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="card">
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
              
              <div style="display: flex; gap: 16px; align-items: center; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px dashed var(--border); margin-bottom: 16px;">
                <input id="restoreFileInput" type="file" accept=".zip,.sql,.backup" style="display: none;" />
                <button class="btn btn-secondary" onclick="document.getElementById('restoreFileInput').click()" style="white-space: nowrap;">Seleccionar archivo</button>
                <span id="restoreFileName" style="font-size: 0.85rem; color: var(--text-3); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">Ningún archivo seleccionado</span>
              </div>

              <button class="btn btn-primary" id="btnRestoreBackup" style="width: 100%; padding: 12px; font-weight: bold; background: var(--danger); border-color: var(--danger);">
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

          <!-- Columna de Configuración Automática -->
          <div style="display: flex; flex-direction: column;">
            <div class="card" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  Configuración de Backups Automáticos
                </div>
                <p style="font-size: 0.85rem; color: var(--text-2); line-height: 1.5; margin-bottom: 20px;">
                  Configura la carpeta de destino local y el tiempo de retención para las copias automáticas diarias (ejecutadas a las 04:00 AM).
                  <br><strong style="color: var(--accent);">Tip:</strong> Si configuras una ruta sincronizada con Google Drive (ej. <code>C:/GoogleDrive/Backups</code>), las copias de seguridad se subirán automáticamente a la nube.
                </p>
                
                <div class="field" style="margin-bottom: 16px;">
                  <label>Carpeta de Destino (Ruta física o nombre de carpeta)</label>
                  <div style="display: flex; gap: 8px;">
                    <input id="sysBackupDir" type="text" placeholder="Ej. backups" style="flex: 1; box-sizing: border-box;" />
                    <button class="btn btn-secondary" id="btnBrowseBackupDir" style="padding: 0 16px; font-weight: bold; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                      Seleccionar
                    </button>
                  </div>
                </div>

                <div class="field" style="margin-bottom: 20px;">
                  <label>Días de Retención (Plan de rotación de backups)</label>
                  <input id="sysBackupRetentionDays" type="number" placeholder="Ej. 7" style="width: 100%; box-sizing: border-box;" min="1" max="365" />
                </div>
              </div>

              <button class="btn btn-primary" id="btnSaveBackupSettings" style="width: 100%; padding: 12px; font-weight: bold; margin-top: auto;">
                Guardar Configuración de Backups
              </button>
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
      document.getElementById('btnBrowseBackupDir')?.addEventListener('click', () => this.selectBackupDirectory());
      document.getElementById('btnSaveBackupSettings')?.addEventListener('click', () => this.saveBackupSettings());
      await this.loadBackupSettings();



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
              <label class="toggle-switch">
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

    } else if (tab === 'scheduler_settings') {
      contentEl.innerHTML = `
        <div class="section-header" style="margin-top: 10px;">
          <div class="section-title">Programador de Tareas en Segundo Plano</div>
        </div>
        
        <div style="max-width: 700px; margin-top: 16px; display: grid; gap: 20px;">
          
          <!-- TAREA 1: Revisión de Ausencias -->
          <div class="card">
            <div style="display: flex; align-items: start; gap: 16px;">
              <div style="background: rgba(0, 176, 255, 0.1); padding: 12px; border-radius: 12px; border: 1px solid rgba(0, 176, 255, 0.2); color: #00b0ff;">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-1); margin-bottom: 4px;">Revisión de Ausencias (check_daily_absences)</div>
                <div style="font-size: 0.8rem; color: var(--text-3); margin-bottom: 16px; line-height: 1.4;">
                  Escanea diariamente a la hora configurada buscando empleados que debían asistir y no tienen ningún registro de entrada. Envía una notificación de alerta al administrador.
                </div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="schedAbsencesEnabled">
                      <span class="slider"></span>
                    </label>
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-2);">Habilitar Revisión</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-3);">Hora de revisión</span>
                    <input type="time" id="schedAbsencesTime" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-1); color: var(--text-1); font-family: 'JetBrains Mono', monospace;">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAREA 3: Reporte Diario -->
          <div class="card">
            <div style="display: flex; align-items: start; gap: 16px;">
              <div style="background: rgba(124, 58, 237, 0.1); padding: 12px; border-radius: 12px; border: 1px solid rgba(124, 58, 237, 0.2); color: var(--accent-2);">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-1); margin-bottom: 4px;">Envío de Reporte Diario (send_daily_report)</div>
                <div style="font-size: 0.8rem; color: var(--text-3); margin-bottom: 16px; line-height: 1.4;">
                  Compila un reporte consolidado con las estadísticas de asistencia del día (asistencias, retardos, ausencias y justificaciones) y lo envía a los correos de administración.
                </div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="schedReportEnabled">
                      <span class="slider"></span>
                    </label>
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-2);">Habilitar Envío</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-3);">Hora de envío</span>
                    <input type="time" id="schedReportTime" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-1); color: var(--text-1); font-family: 'JetBrains Mono', monospace;">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAREA 4: Limpieza Automática -->
          <div class="card">
            <div style="display: flex; align-items: start; gap: 16px;">
              <div style="background: rgba(255, 59, 48, 0.1); padding: 12px; border-radius: 12px; border: 1px solid rgba(255, 59, 48, 0.2); color: var(--danger);">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-1); margin-bottom: 4px;">Limpieza de Datos (run_daily_cleanup)</div>
                <div style="font-size: 0.8rem; color: var(--text-3); margin-bottom: 16px; line-height: 1.4;">
                  Elimina los registros antiguos de asistencia, logs de auditoría y logs técnicos del biométrico que superen los límites de días de retención configurados para liberar espacio.
                </div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="schedCleanupEnabled">
                      <span class="slider"></span>
                    </label>
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-2);">Habilitar Limpieza</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.8rem; color: var(--text-3);">Hora de limpieza</span>
                    <input type="time" id="schedCleanupTime" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-1); color: var(--text-1); font-family: 'JetBrains Mono', monospace;">
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div style="text-align: right; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 10px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary" id="btnSaveSchedulerSettings" style="width: 100%; max-width: 300px; padding: 12px; font-weight: bold;">
              Guardar Configuración de Tareas
            </button>
          </div>

        </div>
      `;
      document.getElementById('btnSaveSchedulerSettings')?.addEventListener('click', () => this.saveSchedulerSettings());
      await this.loadSchedulerSettings();

    } else if (tab === 'audit') {
        if (typeof AuditPage !== 'undefined') {
          AuditPage.render('systemTabContent');
        } else {
          contentEl.innerHTML = '<p>Cargando módulo de auditoría...</p>';
        }
      }
    } catch (err) {
      console.error("Error in switchTab:", err);
      Toast.show("Error al cargar la pestaña: " + err.message, "error");
    }
  },

  // ── Branding ─────────────────────────────────────────────────────────────────

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

      document.getElementById('sysBgBaseColor').value = data.bg_base_color || '#f3f5fa';
      document.getElementById('sysBgBaseColorHex').textContent = (data.bg_base_color || '#f3f5fa').toUpperCase();
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

  // ── Email/SMTP ───────────────────────────────────────────────────────────────

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
    const defaultEmail = this.settings.smtp_username || '';
    const html = `
      <div style="padding: 10px 0;">
        <p style="font-size: 0.85rem; color: var(--text-2); margin-bottom: 16px; line-height: 1.4;">
          Introduce la dirección de correo electrónico a la que deseas enviar el mensaje de prueba:
        </p>
        <div class="field">
          <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-1);">Correo de Destino</label>
          <input type="email" id="testEmailRecipient" placeholder="ejemplo@correo.com" value="${defaultEmail}" style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-1); color: var(--text-1);" />
        </div>
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="Modal.close()" style="margin-right: 8px;">Cancelar</button>
      <button class="btn btn-primary" id="btnSendTestEmailSubmit">Enviar Prueba</button>
    `;
    Modal.open("Enviar Correo de Prueba", html, footer);

    document.getElementById('btnSendTestEmailSubmit')?.addEventListener('click', async () => {
      const recipient = document.getElementById('testEmailRecipient').value.trim();
      if (!recipient) {
        Toast.show('Introduce un correo electrónico válido', 'warning');
        return;
      }
      Modal.close();
      Toast.show('Enviando correo de prueba...', 'info');
      try {
        const response = await API.post('/api/settings/test-email', { recipient: recipient });
        Toast.show(response.message || '¡Correo de prueba enviado con éxito!', 'success');
      } catch (e) {
        console.error(e);
        Toast.show('Error al enviar correo de prueba: ' + e.message, 'error');
      }
    });
  },

  // ── Backup & Restore ────────────────────────────────────────────────────────

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

  async loadBackupSettings() {
    try {
      const data = await API.get('/api/settings');
      this.settings = data;
      
      document.getElementById('sysBackupDir').value = data.backup_dir || 'backups';
      document.getElementById('sysBackupRetentionDays').value = data.backup_retention_days ?? 7;
    } catch(e) {
      console.error(e);
      Toast.show('Error al cargar la configuración de backups automáticos', 'error');
    }
  },

  async saveBackupSettings() {
    const backupDir = document.getElementById('sysBackupDir').value.trim();
    const retentionDays = parseInt(document.getElementById('sysBackupRetentionDays').value) || 7;
    
    try {
      if (!this.settings || !this.settings.work_days) {
        const currentData = await API.get('/api/settings');
        this.settings = currentData;
      }
      
      await API.put('/api/settings', {
        ...this.settings,
        backup_dir: backupDir,
        backup_retention_days: retentionDays
      });
      
      Toast.show('Configuración de copias de seguridad guardada correctamente', 'success');
      this.settings.backup_dir = backupDir;
      this.settings.backup_retention_days = retentionDays;
    } catch(e) {
      console.error(e);
      Toast.show('Error al guardar la configuración de backups: ' + e.message, 'error');
    }
  },

  async selectBackupDirectory() {
    const inputVal = document.getElementById('sysBackupDir').value.trim() || '/';
    
    // Función para renderizar el explorador de carpetas en el modal
    const renderBrowser = async (targetPath) => {
      const modalBody = document.getElementById('dirBrowserBody');
      if (!modalBody) return;
      
      modalBody.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; padding: 20px; color: var(--text-2); gap: 10px;">
          <div class="spinner"></div> Cargando directorios...
        </div>
      `;
      
      try {
        let url = '/api/backup/browse-directories';
        if (targetPath) {
          url += `?path=${encodeURIComponent(targetPath)}`;
        }
        
        const token = API.token();
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Error al listar carpetas');
        }
        
        const data = await response.json();
        const currentPath = data.current_path;
        const parentPath = data.parent_path;
        const subdirs = data.subdirectories || [];
        
        // Guardar la ruta actual en un atributo para recuperarla al confirmar
        modalBody.dataset.currentPath = currentPath;
        
        // Actualizar la barra de dirección en la UI del modal
        const pathInput = document.getElementById('dirBrowserPath');
        if (pathInput) pathInput.value = currentPath;
        
        let htmlList = '';
        
        // Mostrar botón de retroceso si no estamos en la raíz absoluta
        if (parentPath) {
          htmlList += `
            <div class="dir-item" data-path="${parentPath}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; background: var(--surface-2); margin-bottom: 8px; border: 1px dashed var(--border); transition: all 0.2s;" onmouseover="this.style.background='var(--surface-3)'" onmouseout="this.style.background='var(--surface-2)'">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span style="font-weight: bold; font-size: 0.85rem; color: var(--text-1);">.. (Subir un nivel)</span>
            </div>
          `;
        }
        
        if (subdirs.length === 0) {
          htmlList += `
            <div style="text-align: center; color: var(--text-3); padding: 30px; font-size: 0.85rem;">
              No hay subcarpetas en este directorio.
            </div>
          `;
        } else {
          htmlList += `<div style="max-height: 250px; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 4px;">`;
          subdirs.forEach(dir => {
            const isDrive = dir.name.endsWith(':\\') || dir.name.endsWith(':/') || (dir.name.length === 3 && dir.name.includes(':'));
            const iconSvg = isDrive 
              ? `<svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2" fill="none"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`
              : `<svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
            
            htmlList += `
              <div class="dir-item" data-path="${dir.path}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s;" onmouseover="this.style.background='var(--surface-3)'; this.style.borderColor='var(--border)'" onmouseout="this.style.background='transparent'; this.style.borderColor='transparent'">
                ${iconSvg}
                <span style="font-size: 0.85rem; color: var(--text-2); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dir.name}</span>
              </div>
            `;
          });
          htmlList += `</div>`;
        }
        
        modalBody.innerHTML = htmlList;
        
        // Asignar los eventos de click a los elementos de la lista
        modalBody.querySelectorAll('.dir-item').forEach(el => {
          el.addEventListener('click', () => {
            const newPath = el.getAttribute('data-path');
            renderBrowser(newPath);
          });
        });
        
      } catch (err) {
        modalBody.innerHTML = `
          <div style="text-align: center; color: var(--danger); padding: 25px; font-size: 0.85rem; font-weight: bold;">
            Error: ${err.message}
          </div>
        `;
      }
    };
    
    // Contenido del modal
    const html = `
      <div style="padding: 5px 0;">
        <p style="font-size: 0.85rem; color: var(--text-2); margin-bottom: 12px; line-height: 1.4;">
          Navega por las carpetas del servidor y selecciona dónde se almacenarán los backups.
        </p>
        <div class="field" style="margin-bottom: 12px;">
          <label style="font-weight: 600; font-size: 0.8rem; color: var(--text-1);">Ruta Seleccionada</label>
          <input type="text" id="dirBrowserPath" readonly style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); font-family: monospace; font-size: 0.8rem;" />
        </div>
        <div id="dirBrowserBody" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 12px; min-height: 200px;">
        </div>
      </div>
    `;
    
    const footer = `
      <button class="btn btn-secondary" onclick="Modal.close()" style="margin-right: 8px;">Cancelar</button>
      <button class="btn btn-primary" id="btnSelectDirSubmit" style="font-weight: bold;">Seleccionar Esta Carpeta</button>
    `;
    
    Modal.open("Seleccionar Carpeta", html, footer);
    
    // Cargar explorador
    renderBrowser(inputVal);
    
    document.getElementById('btnSelectDirSubmit')?.addEventListener('click', () => {
      const modalBody = document.getElementById('dirBrowserBody');
      const selectedPath = modalBody?.dataset.currentPath;
      if (selectedPath) {
        document.getElementById('sysBackupDir').value = selectedPath;
        Modal.close();
      }
    });
  },

  // ── Maintenance/Cleanup ──────────────────────────────────────────────────────

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
          Toast.show('¡Mantenimiento exitoso!', 'success');
          
          const detailsHtml = `
            <div style="padding: 10px 0; text-align: left;">
              <div style="font-size: 0.95rem; color: var(--success); font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Limpieza de base de datos completada
              </div>
              <p style="font-size: 0.85rem; color: var(--text-2); line-height: 1.4; margin-bottom: 16px;">
                Se han depurado los registros históricos obsoletos del sistema:
              </p>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 10px 8px; color: var(--text-2);">Asistencias y Faltas:</td>
                  <td style="padding: 10px 8px; font-weight: 700; text-align: right; color: var(--text-1);">${response.stats.attendance} registros</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 10px 8px; color: var(--text-2);">Logs de Biométrico:</td>
                  <td style="padding: 10px 8px; font-weight: 700; text-align: right; color: var(--text-1);">${response.stats.sync_logs} registros</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 10px 8px; color: var(--text-2);">Logs de Auditoría:</td>
                  <td style="padding: 10px 8px; font-weight: 700; text-align: right; color: var(--text-1);">${response.stats.audit_logs} registros</td>
                </tr>
              </table>
            </div>
          `;
          Modal.open('Resultado de Limpieza', detailsHtml, `<button class="btn btn-primary" onclick="Modal.close()" style="width:100%; padding:12px;">Aceptar</button>`);
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

  async loadSchedulerSettings() {
    try {
      const sysData = await API.get('/api/settings');
      this.settings = sysData;
      
      // Revisión de Ausencias (email_notifications_enabled y email_alerts_recipients de SystemConfig)
      document.getElementById('schedAbsencesEnabled').checked = (sysData.email_notifications_enabled && sysData.email_alerts_recipients) ? true : false;
      document.getElementById('schedAbsencesTime').value = (sysData.absences_check_time && sysData.absences_check_time.length >= 5) ? sysData.absences_check_time.slice(0, 5) : '11:00';
      
      // Envío de Reporte Diario (alert_admin_daily_report)
      document.getElementById('schedReportEnabled').checked = (sysData.email_notifications_enabled && sysData.alert_admin_daily_report) ? true : false;
      document.getElementById('schedReportTime').value = (sysData.daily_report_time && sysData.daily_report_time.length >= 5) ? sysData.daily_report_time.slice(0, 5) : '19:00';
      
      // Limpieza de datos
      document.getElementById('schedCleanupEnabled').checked = sysData.cleanup_enabled ?? false;
      document.getElementById('schedCleanupTime').value = (sysData.cleanup_time && sysData.cleanup_time.length >= 5) ? sysData.cleanup_time.slice(0, 5) : '02:00';
      
    } catch(e) {
      console.error(e);
      Toast.show('Error al cargar la configuración de tareas: ' + e.message, 'error');
    }
  },

  async saveSchedulerSettings() {
    try {
      const absencesEnabled = document.getElementById('schedAbsencesEnabled').checked;
      const absencesTime = document.getElementById('schedAbsencesTime').value || '11:00';
      
      const reportEnabled = document.getElementById('schedReportEnabled').checked;
      const reportTime = document.getElementById('schedReportTime').value || '19:00';
      
      const cleanupEnabled = document.getElementById('schedCleanupEnabled').checked;
      const cleanupTime = document.getElementById('schedCleanupTime').value || '02:00';
      
      // Si no tenemos cargada la configuración, la obtenemos para no pisar otros campos
      if (!this.settings.work_days) {
        this.settings = await API.get('/api/settings');
      }
      
      // Actualizar el correo global maestro de notificaciones a True si cualquiera de las alertas se activa
      let emailGlobalEnabled = this.settings.email_notifications_enabled;
      if (absencesEnabled || reportEnabled) {
        emailGlobalEnabled = true;
      }
      
      await API.put('/api/settings', {
        ...this.settings,
        email_notifications_enabled: emailGlobalEnabled,
        alert_admin_daily_report: reportEnabled,
        absences_check_time: absencesTime,
        daily_report_time: reportTime,
        cleanup_enabled: cleanupEnabled,
        cleanup_time: cleanupTime
      });
      
      // Actualizar variables en memoria
      this.settings.email_notifications_enabled = emailGlobalEnabled;
      this.settings.alert_admin_daily_report = reportEnabled;
      this.settings.absences_check_time = absencesTime;
      this.settings.daily_report_time = reportTime;
      this.settings.cleanup_enabled = cleanupEnabled;
      this.settings.cleanup_time = cleanupTime;
      
      Toast.show('Programación de tareas guardada correctamente.', 'success');
      
    } catch(e) {
      console.error(e);
      Toast.show('Error al guardar la configuración de tareas: ' + e.message, 'error');
    }
  }
};
