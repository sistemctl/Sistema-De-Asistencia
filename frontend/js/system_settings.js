/* system_settings.js — Módulo de Ajustes de Reglas de Asistencia */

const SystemSettingsPage = {
  settings: {},

  async render() {
    document.getElementById('paramContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Reglas de Asistencia</div>
      </div>
      
      <style>
        /* Tables for rules */
        .rules-table th, .rules-table td {
          padding: 10px 8px;
          vertical-align: middle;
          border-bottom: 1px solid var(--border);
          font-size: 0.85rem;
        }
        .rules-table tr:last-child td {
          border-bottom: none;
        }
        
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-top: 16px;
        }
        
        .settings-subgrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 600px) {
          .settings-subgrid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      </style>

      <div class="settings-grid">
        <!-- Card de Configuración de Lógica y Parámetros -->
        <div class="card" style="height: fit-content; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--accent); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Reglas de Control de Asistencia y Tolerancias
            </div>
            
            <!-- Switches Generales de Marcación -->
            <div style="display: flex; gap: 30px; margin-bottom: 24px; background: var(--surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <label class="toggle-switch">
                  <input type="checkbox" id="sysRequireCheckin">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 600; font-size: 0.9rem;">Es necesario registrarse (Check-in)</div>
                  <div style="font-size: 0.72rem; color: var(--text-3); margin-top: 2px;">Si se desactiva, no se exige marcación de entrada.</div>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 12px;">
                <label class="toggle-switch">
                  <input type="checkbox" id="sysRequireCheckout">
                  <span class="slider"></span>
                </label>
                <div>
                  <div style="font-weight: 600; font-size: 0.9rem;">Se requiere realizar el check-out</div>
                  <div style="font-size: 0.72rem; color: var(--text-3); margin-top: 2px;">Si se desactiva, no se exige marcación de salida.</div>
                </div>
              </div>
            </div>

            <!-- Tabla de Reglas (Turno Normal) -->
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent); margin-bottom: 12px;">Turno Normal (Llegadas tarde, Salidas anticipadas y Faltas de marcación)</div>
            <table class="rules-table" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left;">
                  <th style="color: var(--text-3); font-weight: 600; font-size: 0.8rem; text-transform: uppercase;">Regla</th>
                  <th style="color: var(--text-3); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; width: 120px;">Contenido</th>
                  <th style="color: var(--text-3); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; width: 80px; text-align: center;">Habilitar</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Marcar como retrasado (Tardanza) si llega tarde para:</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <input type="number" id="sysMarkLateLimit" min="0" max="600" style="width: 70px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1);" />
                      <span style="font-size: 0.8rem; color: var(--text-3);">Minutos</span>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="sysMarkLateEnable">
                      <span class="slider"></span>
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>Marcar como ausente si llega tarde para (Tardanza Extrema):</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <input type="number" id="sysMarkAbsentIfLateLimit" min="0" max="600" style="width: 70px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1);" />
                      <span style="font-size: 0.8rem; color: var(--text-3);">Minutos</span>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="sysMarkAbsentIfLateEnable">
                      <span class="slider"></span>
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>Marcar como salida anticipada si realiza el check-out antes de tiempo para:</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <input type="number" id="sysMarkEarlyDepartureLimit" min="0" max="600" style="width: 70px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1);" />
                      <span style="font-size: 0.8rem; color: var(--text-3);">Minutos</span>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="sysMarkEarlyDepartureEnable">
                      <span class="slider"></span>
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>Marcar como ausente si realiza el check-out antes de tiempo por:</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <input type="number" id="sysMarkAbsentIfEarlyCheckoutLimit" min="0" max="600" style="width: 70px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1);" />
                      <span style="font-size: 0.8rem; color: var(--text-3);">Minutos</span>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="sysMarkAbsentIfEarlyCheckoutEnable">
                      <span class="slider"></span>
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>Marcar asistencia sin registro de entrada como:</td>
                  <td>
                    <select id="sysNoCheckinStatus" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1); cursor: pointer;">
                      <option value="Absent">Ausente</option>
                      <option value="Present">Presente</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </td>
                  <td style="text-align: center;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="sysNoCheckinEnable">
                      <span class="slider"></span>
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>Marcar asistencia sin salida como:</td>
                  <td>
                    <select id="sysNoCheckoutStatus" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1); cursor: pointer;">
                      <option value="Absent">Ausente</option>
                      <option value="Present">Presente</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </td>
                  <td style="text-align: center;">
                    <label class="toggle-switch">
                      <input type="checkbox" id="sysNoCheckoutEnable">
                      <span class="slider"></span>
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Configuración Turno Flexible y Tolerancias -->
            <div style="display: flex; flex-direction: column; gap: 24px; margin-bottom: 24px;">
              
              <!-- Turno Flexible -->
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                  <label class="toggle-switch" style="transform: scale(0.9);">
                    <input type="checkbox" id="sysFlexibleShiftEnable">
                    <span class="slider"></span>
                  </label>
                  Turno Flexible
                </div>
                <div style="background: var(--surface-2); padding: 20px; border-radius: 12px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.9rem;">Rango de Entrada/Salida predeterminada</div>
                    <div style="font-size: 0.75rem; color: var(--text-3); margin-top: 4px;">Define el rango horario base para empleados con turnos flexibles.</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <label style="font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; font-weight: 600;">Hora Inicial</label>
                      <input type="time" id="sysFlexibleShiftStart" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1); font-family: monospace; font-size: 0.95rem;" />
                    </div>
                    <span style="color: var(--text-3); margin-top: 18px;">—</span>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <label style="font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; font-weight: 600;">Hora Final</label>
                      <input type="time" id="sysFlexibleShiftEnd" style="padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1); font-family: monospace; font-size: 0.95rem;" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tolerancias -->
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                  <label class="toggle-switch" style="transform: scale(0.9);">
                    <input type="checkbox" id="sysToleranceEnable">
                    <span class="slider"></span>
                  </label>
                  Tolerancias de Marcación (Minutos de gracia)
                </div>
                <div style="background: var(--surface-2); padding: 20px; border-radius: 12px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                  <div style="flex: 1; min-width: 200px;">
                    <div style="font-weight: 600; font-size: 0.9rem;">Minutos de gracia permitidos</div>
                    <div style="font-size: 0.75rem; color: var(--text-3); margin-top: 4px;">Tiempo máximo permitido antes de aplicar una penalización por llegada tardía o salida anticipada.</div>
                  </div>
                  <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 4px; width: 110px;">
                      <label style="font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; font-weight: 600;">En Entradas</label>
                      <div style="position: relative;">
                        <input id="sysEntryTolerance" type="number" min="0" max="120" style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1); font-family: monospace; font-size: 0.95rem;" />
                        <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: var(--text-3); pointer-events: none;">min</span>
                      </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; width: 110px;">
                      <label style="font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; font-weight: 600;">En Salidas</label>
                      <div style="position: relative;">
                        <input id="sysExitTolerance" type="number" min="0" max="120" style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-3); color: var(--text-1); font-family: monospace; font-size: 0.95rem;" />
                        <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: var(--text-3); pointer-events: none;">min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            
            <!-- Formatos y Días -->
            <div style="display: flex; flex-direction: column; gap: 24px;">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent); margin-bottom: 12px;">Preferencias Globales y Días Laborables</div>
                <div style="background: var(--surface-2); padding: 20px; border-radius: 12px; border: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                  
                  <!-- Formato de Hora -->
                  <div style="display: flex; flex-direction: column; justify-content: flex-start;">
                    <label style="font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Formato de Visualización de Hora</label>
                    <select id="sysTimeFormat" style="width: 100%; background: var(--surface-3); border: 1px solid var(--border); color: var(--text-1); padding: 12px 16px; border-radius: 8px; box-sizing: border-box; cursor: pointer; font-size: 0.95rem;">
                      <option value="24h">24 Horas (Ej. 17:30)</option>
                      <option value="12h">12 Horas AM/PM (Ej. 05:30 PM)</option>
                    </select>
                    <div style="font-size: 0.75rem; color: var(--text-3); margin-top: 8px;">Este formato se aplicará globalmente en reportes y vistas de calendario.</div>
                  </div>
                  
                  <!-- Días Laborables -->
                  <div>
                    <label style="font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; font-weight: 600; margin-bottom: 8px; display: block;">Días Laborables (Para Cálculo de Ausencias)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--surface-3); padding: 14px; border-radius: 8px; border: 1px solid var(--border);">
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-1);"><input type="checkbox" class="sys-workday-check" value="1" /> Lunes</label>
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-1);"><input type="checkbox" class="sys-workday-check" value="2" /> Martes</label>
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-1);"><input type="checkbox" class="sys-workday-check" value="3" /> Miércoles</label>
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-1);"><input type="checkbox" class="sys-workday-check" value="4" /> Jueves</label>
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-1);"><input type="checkbox" class="sys-workday-check" value="5" /> Viernes</label>
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-1);"><input type="checkbox" class="sys-workday-check" value="6" /> Sábado</label>
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: var(--text-1);"><input type="checkbox" class="sys-workday-check" value="7" /> Domingo</label>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
            
            <div style="text-align: right; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 24px;">
              <button class="btn btn-primary" id="btnSaveSystemSettings" style="width: 100%; padding: 12px; font-weight: bold;">
                Guardar reglas de asistencia
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Listener de guardado
    document.getElementById('btnSaveSystemSettings')?.addEventListener('click', () => this.saveSettings());

    await this.loadSettings();
  },

  async loadSettings() {
    try {
      const data = await API.get('/api/settings');
      this.settings = data;

      document.getElementById('sysRequireCheckin').checked = data.require_checkin ?? true;
      document.getElementById('sysRequireCheckout').checked = data.require_checkout ?? true;
      
      document.getElementById('sysMarkLateEnable').checked = data.mark_late_enable ?? true;
      document.getElementById('sysMarkLateLimit').value = data.mark_late_limit_minutes ?? 0;
      
      document.getElementById('sysMarkAbsentIfLateEnable').checked = data.mark_absent_if_late_enable ?? false;
      document.getElementById('sysMarkAbsentIfLateLimit').value = data.mark_absent_if_late_limit_minutes ?? 60;
      
      document.getElementById('sysMarkEarlyDepartureEnable').checked = data.mark_early_departure_enable ?? true;
      document.getElementById('sysMarkEarlyDepartureLimit').value = data.mark_early_departure_limit_minutes ?? 0;
      
      document.getElementById('sysMarkAbsentIfEarlyCheckoutEnable').checked = data.mark_absent_if_early_checkout_enable ?? false;
      document.getElementById('sysMarkAbsentIfEarlyCheckoutLimit').value = data.mark_absent_if_early_checkout_limit_minutes ?? 60;
      
      document.getElementById('sysNoCheckinEnable').checked = data.no_checkin_enable ?? true;
      document.getElementById('sysNoCheckinStatus').value = data.no_checkin_status || 'Absent';
      
      document.getElementById('sysNoCheckoutEnable').checked = data.no_checkout_enable ?? true;
      document.getElementById('sysNoCheckoutStatus').value = data.no_checkout_status || 'Absent';
      
      document.getElementById('sysEntryTolerance').value = data.entry_tolerance_minutes ?? 10;
      document.getElementById('sysExitTolerance').value = data.exit_tolerance_minutes ?? 10;
      
      document.getElementById('sysTimeFormat').value = data.time_format || '24h';
      
      document.getElementById('sysToleranceEnable').checked = data.tolerance_enable ?? true;
      document.getElementById('sysFlexibleShiftEnable').checked = data.flexible_shift_enable ?? true;
      document.getElementById('sysFlexibleShiftStart').value = data.flexible_shift_start || '09:00:00';
      document.getElementById('sysFlexibleShiftEnd').value = data.flexible_shift_end || '18:00:00';

      // Marcar checkboxes de días laborables
      const wDays = (data.work_days || '1,2,3,4,5').split(',');
      document.querySelectorAll('.sys-workday-check').forEach(chk => {
        chk.checked = wDays.includes(chk.value);
      });
    } catch (e) {
      console.error(e);
      Toast.show('Error al cargar la configuración', 'error');
    }
  },

  async saveSettings() {
    const entryTolerance = parseInt(document.getElementById('sysEntryTolerance').value) || 10;
    const exitTolerance = parseInt(document.getElementById('sysExitTolerance').value) || 10;
    const timeFormat = document.getElementById('sysTimeFormat').value;

    const workDaysArr = [];
    document.querySelectorAll('.sys-workday-check:checked').forEach(chk => {
      workDaysArr.push(chk.value);
    });
    const workDaysStr = workDaysArr.join(',');

    const requireCheckin = document.getElementById('sysRequireCheckin').checked;
    const requireCheckout = document.getElementById('sysRequireCheckout').checked;
    
    const markLateEnable = document.getElementById('sysMarkLateEnable').checked;
    const markLateLimit = parseInt(document.getElementById('sysMarkLateLimit').value) || 0;
    
    const markAbsentIfLateEnable = document.getElementById('sysMarkAbsentIfLateEnable').checked;
    const markAbsentIfLateLimit = parseInt(document.getElementById('sysMarkAbsentIfLateLimit').value) || 0;
    
    const markEarlyDepartureEnable = document.getElementById('sysMarkEarlyDepartureEnable').checked;
    const markEarlyDepartureLimit = parseInt(document.getElementById('sysMarkEarlyDepartureLimit').value) || 0;
    
    const markAbsentIfEarlyCheckoutEnable = document.getElementById('sysMarkAbsentIfEarlyCheckoutEnable').checked;
    const markAbsentIfEarlyCheckoutLimit = parseInt(document.getElementById('sysMarkAbsentIfEarlyCheckoutLimit').value) || 0;
    
    const noCheckinEnable = document.getElementById('sysNoCheckinEnable').checked;
    const noCheckinStatus = document.getElementById('sysNoCheckinStatus').value;
    
    const noCheckoutEnable = document.getElementById('sysNoCheckoutEnable').checked;
    const noCheckoutStatus = document.getElementById('sysNoCheckoutStatus').value;
    
    const flexibleShiftEnable = document.getElementById('sysFlexibleShiftEnable').checked;
    const flexibleShiftStart = document.getElementById('sysFlexibleShiftStart').value || '09:00:00';
    const flexibleShiftEnd = document.getElementById('sysFlexibleShiftEnd').value || '18:00:00';
    
    const toleranceEnable = document.getElementById('sysToleranceEnable').checked;

    try {
      if (!this.settings.system_name) {
        const currentData = await API.get('/api/settings');
        this.settings = currentData;
      }

      await API.put('/api/settings', {
        system_name: this.settings.system_name || 'Control de Asistencia',
        company_name: this.settings.company_name || 'Hikvision DS-K1T323MBWX',
        primary_color: this.settings.primary_color || '#1e3a5f',
        accent_color: this.settings.accent_color || '#00e676',
        bg_base_color: this.settings.bg_base_color || '#f8fafc',
        bg_surface_color: this.settings.bg_surface_color || '#ffffff',
        work_days: workDaysStr,
        time_format: timeFormat,
        tolerance_enable: toleranceEnable,
        entry_tolerance_minutes: entryTolerance,
        exit_tolerance_minutes: exitTolerance,
        require_checkin: requireCheckin,
        require_checkout: requireCheckout,
        mark_late_enable: markLateEnable,
        mark_late_limit_minutes: markLateLimit,
        mark_absent_if_late_enable: markAbsentIfLateEnable,
        mark_absent_if_late_limit_minutes: markAbsentIfLateLimit,
        mark_early_departure_enable: markEarlyDepartureEnable,
        mark_early_departure_limit_minutes: markEarlyDepartureLimit,
        mark_absent_if_early_checkout_enable: markAbsentIfEarlyCheckoutEnable,
        mark_absent_if_early_checkout_limit_minutes: markAbsentIfEarlyCheckoutLimit,
        no_checkin_enable: noCheckinEnable,
        no_checkin_status: noCheckinStatus,
        no_checkout_enable: noCheckoutEnable,
        no_checkout_status: noCheckoutStatus,
        flexible_shift_enable: flexibleShiftEnable,
        flexible_shift_start: flexibleShiftStart,
        flexible_shift_end: flexibleShiftEnd
      });

      Toast.show('Configuración de reglas guardada correctamente', 'success');
      
      // Update memory config
      this.settings.work_days = workDaysStr;
      this.settings.time_format = timeFormat;
      this.settings.entry_tolerance_minutes = entryTolerance;
      this.settings.exit_tolerance_minutes = exitTolerance;
      this.settings.require_checkin = requireCheckin;
      this.settings.require_checkout = requireCheckout;
      this.settings.mark_late_enable = markLateEnable;
      this.settings.mark_late_limit_minutes = markLateLimit;
      this.settings.mark_absent_if_late_enable = markAbsentIfLateEnable;
      this.settings.mark_absent_if_late_limit_minutes = markAbsentIfLateLimit;
      this.settings.mark_early_departure_enable = markEarlyDepartureEnable;
      this.settings.mark_early_departure_limit_minutes = markEarlyDepartureLimit;
      this.settings.mark_absent_if_early_checkout_enable = markAbsentIfEarlyCheckoutEnable;
      this.settings.mark_absent_if_early_checkout_limit_minutes = markAbsentIfEarlyCheckoutLimit;
      this.settings.no_checkin_enable = noCheckinEnable;
      this.settings.no_checkin_status = noCheckinStatus;
      this.settings.no_checkout_enable = noCheckoutEnable;
      this.settings.no_checkout_status = noCheckoutStatus;
      this.settings.flexible_shift_start = flexibleShiftStart;
      this.settings.flexible_shift_end = flexibleShiftEnd;

    } catch (e) {
      console.error(e);
      Toast.show(e.message, 'error');
    }
  }
};
