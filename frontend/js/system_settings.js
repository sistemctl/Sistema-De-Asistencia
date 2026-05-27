/* system_settings.js — Módulo de Ajustes del Sistema */

const SystemSettingsPage = {
  settings: {},

  async render() {
    document.getElementById('paramContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Ajustes del Sistema</div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px;">
        <!-- Card de Información de Marca -->
        <div class="card">
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Personalización de Marca
          </div>
          
          <div class="field" style="margin-bottom: 16px;">
            <label>Nombre del Sistema</label>
            <input id="sysSystemName" type="text" placeholder="Ej. Control de Asistencia" style="width: 100%; box-sizing: border-box;" />
          </div>
          
          <div class="field" style="margin-bottom: 16px;">
            <label>Nombre de la Empresa / Sede</label>
            <input id="sysCompanyName" type="text" placeholder="Ej. Mi Empresa S.A.C." style="width: 100%; box-sizing: border-box;" />
          </div>
          
          <div style="display: flex; gap: 20px; margin-bottom: 20px;">
            <div class="field" style="flex: 1;">
              <label>Color Primario (Tema)</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input id="sysPrimaryColor" type="color" style="width: 40px; height: 40px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 8px;" />
                <span id="sysPrimaryColorHex" style="font-family: monospace; font-size: 0.85rem; color: var(--text-2);">#1E3A5F</span>
              </div>
            </div>
            <div class="field" style="flex: 1;">
              <label>Color de Acento / Realce</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input id="sysAccentColor" type="color" style="width: 40px; height: 40px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 8px;" />
                <span id="sysAccentColorHex" style="font-family: monospace; font-size: 0.85rem; color: var(--text-2);">#00E676</span>
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
        </div>

        <!-- Card de Configuración de Lógica y Parámetros -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Reglas y Formatos de Asistencia
            </div>
            
            <div class="field" style="margin-bottom: 16px;">
              <label>Tolerancia de Entrada General (Minutos de Gracia)</label>
              <input id="sysEntryTolerance" type="number" min="0" max="60" style="width: 100%; box-sizing: border-box;" />
              <div style="font-size: 0.72rem; color: var(--text-3); margin-top: 4px;">Regla para marcar llegadas como "A tiempo" o "Tardanza" en los reportes.</div>
            </div>
            
            <div class="field" style="margin-bottom: 16px;">
              <label>Formato de Visualización de Hora</label>
              <select id="sysTimeFormat" style="width: 100%; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-1); padding: 12px 18px; border-radius: 12px; box-sizing: border-box; cursor: pointer;">
                <option value="24h">24 Horas (Ej. 17:30)</option>
                <option value="12h">12 Horas AM/PM (Ej. 05:30 PM)</option>
              </select>
            </div>
            
            <div class="field" style="margin-bottom: 20px;">
              <label>Días Laborables de la Semana (Cálculo de Ausencias)</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: var(--surface-2); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border);">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; text-transform: none; margin: 0; font-size: 0.85rem;"><input type="checkbox" class="sys-workday-check" value="1" /> Lunes</label>
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; text-transform: none; margin: 0; font-size: 0.85rem;"><input type="checkbox" class="sys-workday-check" value="2" /> Martes</label>
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; text-transform: none; margin: 0; font-size: 0.85rem;"><input type="checkbox" class="sys-workday-check" value="3" /> Miércoles</label>
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; text-transform: none; margin: 0; font-size: 0.85rem;"><input type="checkbox" class="sys-workday-check" value="4" /> Jueves</label>
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; text-transform: none; margin: 0; font-size: 0.85rem;"><input type="checkbox" class="sys-workday-check" value="5" /> Viernes</label>
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; text-transform: none; margin: 0; font-size: 0.85rem;"><input type="checkbox" class="sys-workday-check" value="6" /> Sábado</label>
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer; text-transform: none; margin: 0; font-size: 0.85rem;"><input type="checkbox" class="sys-workday-check" value="7" /> Domingo</label>
              </div>
            </div>
          </div>
          
          <div style="text-align: right; padding-top: 16px; border-top: 1px solid var(--border);">
            <button class="btn btn-primary" id="btnSaveSystemSettings" style="width: 100%; padding: 12px; font-weight: bold;">
              Guardar todos los cambios
            </button>
          </div>
        </div>
      </div>
    `;

    // Asignar listeners de colores hex
    const pColor = document.getElementById('sysPrimaryColor');
    const aColor = document.getElementById('sysAccentColor');
    if (pColor && aColor) {
      pColor.addEventListener('input', (e) => {
        document.getElementById('sysPrimaryColorHex').textContent = e.target.value.toUpperCase();
      });
      aColor.addEventListener('input', (e) => {
        document.getElementById('sysAccentColorHex').textContent = e.target.value.toUpperCase();
      });
    }

    // Listener de subida de logo
    const logoInput = document.getElementById('sysLogoFileInput');
    if (logoInput) {
      logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
    }

    // Listener de guardado
    document.getElementById('btnSaveSystemSettings')?.addEventListener('click', () => this.saveSettings());

    await this.loadSettings();
  },

  async loadSettings() {
    try {
      const data = await API.get('/api/settings');
      this.settings = data;

      document.getElementById('sysSystemName').value = data.system_name || '';
      document.getElementById('sysCompanyName').value = data.company_name || '';
      document.getElementById('sysPrimaryColor').value = data.primary_color || '#1e3a5f';
      document.getElementById('sysPrimaryColorHex').textContent = (data.primary_color || '#1e3a5f').toUpperCase();
      document.getElementById('sysAccentColor').value = data.accent_color || '#00e676';
      document.getElementById('sysAccentColorHex').textContent = (data.accent_color || '#00e676').toUpperCase();
      document.getElementById('sysEntryTolerance').value = data.entry_tolerance_minutes ?? 10;
      document.getElementById('sysTimeFormat').value = data.time_format || '24h';

      // Marcar checkboxes de días laborables
      const wDays = (data.work_days || '1,2,3,4,5').split(',');
      document.querySelectorAll('.sys-workday-check').forEach(chk => {
        chk.checked = wDays.includes(chk.value);
      });

      // Configurar vista del logo
      const svgDef = document.getElementById('sysLogoSvgDefault');
      const imgPrev = document.getElementById('sysLogoImgPreview');
      if (data.logo_path) {
        svgDef.style.display = 'none';
        imgPrev.src = data.logo_path;
        imgPrev.style.display = 'block';
      } else {
        svgDef.style.display = 'block';
        imgPrev.style.display = 'none';
      }
    } catch (e) {
      console.error(e);
      Toast.show('Error al cargar la configuración', 'error');
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
      
      // Actualizar vista previa
      const svgDef = document.getElementById('sysLogoSvgDefault');
      const imgPrev = document.getElementById('sysLogoImgPreview');
      svgDef.style.display = 'none';
      imgPrev.src = data.logo_path;
      imgPrev.style.display = 'block';

      // Refrescar marca del sistema globalmente
      if (window.loadSystemBranding) {
        await window.loadSystemBranding();
      }
    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    }
  },


  async saveSettings() {
    const systemName = document.getElementById('sysSystemName').value.trim();
    const companyName = document.getElementById('sysCompanyName').value.trim();
    const primaryColor = document.getElementById('sysPrimaryColor').value;
    const accentColor = document.getElementById('sysAccentColor').value;
    const entryTolerance = parseInt(document.getElementById('sysEntryTolerance').value) || 10;
    const timeFormat = document.getElementById('sysTimeFormat').value;

    if (!systemName) {
      Toast.show('Por favor, ingresa el nombre del sistema', 'warning');
      return;
    }
    if (!companyName) {
      Toast.show('Por favor, ingresa el nombre de la empresa', 'warning');
      return;
    }

    // Recoger días laborables
    const workDaysArr = [];
    document.querySelectorAll('.sys-workday-check:checked').forEach(chk => {
      workDaysArr.push(chk.value);
    });
    const workDaysStr = workDaysArr.join(',');

    try {
      await API.put('/api/settings', {
        system_name: systemName,
        company_name: companyName,
        primary_color: primaryColor,
        accent_color: accentColor,
        work_days: workDaysStr,
        time_format: timeFormat,
        entry_tolerance_minutes: entryTolerance
      });

      Toast.show('Configuración guardada correctamente', 'success');

      // Recargar branding globalmente
      if (window.loadSystemBranding) {
        await window.loadSystemBranding();
      }
    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    }
  }
};
