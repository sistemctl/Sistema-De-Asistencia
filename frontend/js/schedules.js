/* schedules.js — Gestión de Horarios y Turnos */

const SchedulesPage = {
  currentSubTab: 'catalog',

  formatWorkDays(str) {
    if (!str) return '<span style="color:var(--text-3)">No especificado</span>';
    const days = str.split(',').map(Number).sort((a,b) => a - b);
    if (days.length === 0) return '<span style="color:var(--text-3)">Ninguno</span>';
    if (days.length === 7) return '<span style="color:var(--text-1);font-weight:600;">Todos los días</span>';
    
    const dayNamesShort = {
      1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom'
    };
    
    // Check if consecutive range
    let isConsecutive = true;
    for (let i = 1; i < days.length; i++) {
      if (days[i] !== days[i-1] + 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive && days.length > 2) {
      return `<span style="font-weight:500;color:var(--text-2)">${dayNamesShort[days[0]]} a ${dayNamesShort[days[days.length-1]]}</span>`;
    }
    
    return `<span style="font-weight:500;color:var(--text-2)">${days.map(d => dayNamesShort[d]).join(', ')}</span>`;
  },

  async render(subTab = 'catalog') {
    this.currentSubTab = subTab;
    document.getElementById('paramContent').innerHTML = `
      <div class="section-header" style="margin-bottom:16px;">
        <div class="section-title">Horarios y Turnos</div>
      </div>
      
      <!-- Sub-pestañas internas -->
      <div class="subtabs-container" style="margin-bottom:20px; border-bottom:1px solid var(--border); display:flex; gap:24px;">
        <button class="sched-tab-btn ${subTab==='catalog'?'active':''}" onclick="SchedulesPage.switchSubTab('catalog')" style="background:none;border:none;color:var(--text-2);padding:12px 0;font-weight:600;font-size:0.92rem;cursor:pointer;position:relative;transition:color 0.2s;">
          Catálogo de Horarios
        </button>
        <button class="sched-tab-btn ${subTab==='matrix'?'active':''}" onclick="SchedulesPage.switchSubTab('matrix')" style="background:none;border:none;color:var(--text-2);padding:12px 0;font-weight:600;font-size:0.92rem;cursor:pointer;position:relative;transition:color 0.2s;">
          Calendario Semanal
        </button>
      </div>
      <style>
        .sched-tab-btn.active { color: var(--accent) !important; }
        .sched-tab-btn::after { content:''; position:absolute; bottom:-1px; left:0; width:100%; height:2px; background:var(--accent); transform:scaleX(0); transition:transform 0.2s ease; }
        .sched-tab-btn.active::after { transform:scaleX(1); }
        .sched-tab-btn:hover { color:var(--text-1) !important; }
      </style>
      
      <div id="schedSubContent"></div>
    `;

    await this.switchSubTab(subTab);
  },

  async switchSubTab(subTab) {
    this.currentSubTab = subTab;
    document.querySelectorAll('.sched-tab-btn').forEach(btn => {
      const isCatalog = btn.textContent.includes('Catálogo');
      btn.classList.toggle('active', (isCatalog && subTab === 'catalog') || (!isCatalog && subTab === 'matrix'));
    });

    const container = document.getElementById('schedSubContent');
    if (!container) return;

    if (subTab === 'catalog') {
      container.innerHTML = `
        <div class="section-actions" style="margin-bottom:20px; display:flex; justify-content:flex-end;">
          ${Auth.canManageEmployees() ? `
            <button class="btn btn-primary btn-sm" id="btnNewSchedule">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nuevo horario
            </button>
          ` : ''}
        </div>
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Nombre del Horario</th>
                <th>Días Laborales</th>
                <th>Tipo de Jornada</th>
                <th>Horario de Trabajo</th>
                <th>Fecha de Creación</th>
                <th>Acciones</th>
              </tr></thead>
              <tbody id="scheduleTable">
                ${[1, 2, 3].map(() => `<tr>
                  <td><div class="skeleton sk-text w-50"></div></td>
                  <td><div class="skeleton sk-text w-50"></div></td>
                  <td><div class="skeleton sk-text w-25"></div></td>
                  <td><div class="skeleton sk-text w-50"></div></td>
                  <td><div class="skeleton sk-text w-25"></div></td>
                  <td><div class="skeleton sk-text w-25"></div></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;

      if (Auth.canManageEmployees()) {
        document.getElementById('btnNewSchedule')?.addEventListener('click', () => this.openForm());
      }
      await this.loadTable();
    } else if (subTab === 'matrix') {
      await this.renderWeeklyMatrix(container);
    }
  },

  async loadTable() {
    try {
      const schedules = await API.get('/api/schedules') || [];
      const tbody = document.getElementById('scheduleTable');
      if (!tbody) return;
      if (!schedules.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div><h3>No hay horarios creados</h3><p>Registra el primer turno u horario para asignarlo a tus empleados.</p></div></td></tr>`;
        return;
      }
      
      tbody.innerHTML = schedules.map(s => {
        const createdDate = new Date(s.created_at).toLocaleDateString('es-ES', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const isSplit = s.shift_type === 'split';
        const typeBadge = isSplit 
          ? '<span class="badge badge-yellow">Jornada Partida</span>' 
          : '<span class="badge badge-green">Jornada Continua</span>';
        
        let timesHtml = '';
        if (isSplit) {
          timesHtml = `
            <div style="font-size:0.8rem; line-height:1.4; color:var(--text-2);">
              <div>🌅 <strong>Entrada:</strong> <code style="background:var(--surface-3);padding:1px 6px;border-radius:4px;">${s.work_start_time}</code></div>
              <div>🥪 <strong>Almuerzo:</strong> <code style="background:var(--surface-3);padding:1px 6px;border-radius:4px;">${s.lunch_start_time}</code> a <code style="background:var(--surface-3);padding:1px 6px;border-radius:4px;">${s.lunch_end_time}</code></div>
              <div>🌇 <strong>Salida:</strong> <code style="background:var(--surface-3);padding:1px 6px;border-radius:4px;">${s.work_end_time}</code></div>
            </div>`;
        } else {
          timesHtml = `<code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:'JetBrains Mono',monospace;">${s.work_start_time} – ${s.work_end_time}</code>`;
        }

        return `
        <tr>
          <td>
            <div style="font-weight:600;color:var(--text-1)">${s.name}</div>
          </td>
          <td>${this.formatWorkDays(s.work_days)}</td>
          <td>${typeBadge}</td>
          <td>${timesHtml}</td>
          <td style="color:var(--text-3)">${createdDate}</td>
          <td>
            <div style="display:flex;gap:6px">
              ${Auth.canManageEmployees() ? `
                <button class="btn btn-icon btn-sm" onclick="SchedulesPage.openForm(${s.id})" title="Editar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn btn-icon btn-sm btn-delete" onclick="SchedulesPage.deleteSchedule(${s.id}, '${s.name}')" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              ` : '-'}
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (e) {
      Toast.show('Error cargando horarios', 'error');
    }
  },

  getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0,0,0,0);
    return mon;
  },

  async renderWeeklyMatrix(container) {
    if (!this.currentWeekStart) {
      this.currentWeekStart = this.getMonday(new Date());
    }

    const datesOfWeek = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(this.currentWeekStart);
      next.setDate(this.currentWeekStart.getDate() + i);
      datesOfWeek.push(next);
    }

    const start_date_str = datesOfWeek[0].toISOString().split('T')[0];
    const end_date_str = datesOfWeek[6].toISOString().split('T')[0];

    const formatDateIndicator = (start, end) => {
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      return `${start.toLocaleDateString('es-ES', options)} - ${end.toLocaleDateString('es-ES', options)}`;
    };

    container.innerHTML = `
      <div class="matrix-controls" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="SchedulesPage.prevWeek()" style="padding: 6px 12px; font-weight:600;">
            ← Anterior
          </button>
          <span style="font-weight:600; font-size:0.92rem; color:var(--text-1); min-width: 260px; text-align: center;" id="weekIndicator">
            ${formatDateIndicator(datesOfWeek[0], datesOfWeek[6])}
          </span>
          <button class="btn btn-secondary btn-sm" onclick="SchedulesPage.nextWeek()" style="padding: 6px 12px; font-weight:600;">
            Siguiente →
          </button>
          <button class="btn btn-secondary btn-sm" onclick="SchedulesPage.goToCurrentWeek()" style="padding: 6px 12px; margin-left: 8px;">
            Hoy
          </button>
        </div>

        <!-- Buscador instantáneo de Colaborador -->
        <div style="flex-grow:1; max-width:320px; position:relative;">
          <input type="text" id="matrixSearchInput" placeholder="Buscar colaborador..." oninput="SchedulesPage.filterMatrix()" style="width:100%; padding: 7px 12px 7px 32px; font-size: 0.82rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card); color: var(--text-1); box-sizing: border-box;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>

        <div>
          ${Auth.canManageEmployees() ? `
            <button class="btn btn-primary btn-sm" onclick="SchedulesPage.openRotationalGeneratorModal()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Generar Turnos Rotativos
            </button>
          ` : ''}
        </div>
      </div>

      <style>
        .matrix-table-container {
          max-height: 550px;
          overflow-y: auto;
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--border);
          position: relative;
        }
        .matrix-table {
          min-width: 1100px;
          border-collapse: collapse;
          width: 100%;
        }
        .matrix-table thead th {
          position: sticky;
          top: 0;
          background: var(--bg-card, #1e293b);
          z-index: 10;
          box-shadow: inset 0 -1px 0 var(--border);
        }
      </style>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="matrix-table-container">
          <table class="matrix-table">
            <thead><tr>
              <th style="width:250px; text-align: left; padding: 12px 16px;">Colaborador</th>
              ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, idx) => {
                const d = datesOfWeek[idx];
                const dateLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                return `<th style="text-align:center; padding: 12px 6px;">${day}<br><span style="font-size:0.72rem;font-weight:normal;color:var(--text-3);">${dateLabel}</span></th>`;
              }).join('')}
            </tr></thead>
            <tbody id="matrixTable">
              <tr><td colspan="8" style="text-align:center;padding:32px;"><div class="spinner" style="margin:auto;"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const [employees, schedules, dailySchedules] = await Promise.all([
        API.get('/api/employees?limit=200'),
        API.get('/api/schedules'),
        API.get(`/api/employees/daily-schedules?start_date=${start_date_str}&end_date=${end_date_str}`)
      ]);

      this.cachedEmployees = employees || [];
      this.cachedSchedules = schedules || [];
      this.cachedDailySchedules = dailySchedules || [];
      this.datesOfWeek = datesOfWeek;

      this.displayMatrixRows();
    } catch(err) {
      console.error(err);
      const tbody = document.getElementById('matrixTable');
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:24px;">Error al cargar el calendario semanal.</td></tr>`;
    }
  },

  filterMatrix() {
    const query = document.getElementById('matrixSearchInput')?.value || '';
    this.displayMatrixRows(query);
  },

  displayMatrixRows(searchQuery = '') {
    const tbody = document.getElementById('matrixTable');
    if (!tbody) return;

    const filtered = this.cachedEmployees.filter(e => {
      const fullName = (e.full_name || '').toLowerCase();
      const posName = (e.position?.name || e.position_legacy || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || posName.includes(query);
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-3);">No se encontraron colaboradores</td></tr>`;
      return;
    }

    const dailyMap = {};
    this.cachedDailySchedules.forEach(ds => {
      dailyMap[`${ds.employee_id}_${ds.date}`] = ds;
    });

    tbody.innerHTML = filtered.map(e => {
      const empSchedule = this.cachedSchedules.find(s => s.id === e.schedule_id);
      const workDaysList = empSchedule ? empSchedule.work_days.split(',') : [];

      const daysHtml = this.datesOfWeek.map((d, idx) => {
        const dateStr = d.toISOString().split('T')[0];
        const override = dailyMap[`${e.id}_${dateStr}`];
        const weekdayNum = idx + 1; // 1-7

        let badgeHtml = '';
        let isOverride = false;
        let scheduleName = '';

        if (override) {
          isOverride = true;
          if (override.is_off) {
            badgeHtml = `<span class="badge" style="font-size:0.72rem;padding:5px 10px;background:rgba(148,163,184,0.1);color:var(--text-3);border:1px dashed var(--border);border-radius:6px;display:inline-block;cursor:pointer;" title="Descanso Asignado por Rotación (Clic para modificar)">Libre (R)</span>`;
          } else if (override.schedule) {
            scheduleName = override.schedule.name;
            const timeRange = `${override.schedule.work_start_time}-${override.schedule.work_end_time}`;
            badgeHtml = `<span class="badge" style="font-size:0.72rem;padding:5px 10px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);border-radius:6px;font-family:monospace;display:inline-block;cursor:pointer;" title="Turno Rotativo: ${scheduleName} (Clic para modificar)">${timeRange} (R)</span>`;
          } else {
            badgeHtml = `<span class="badge badge-gray" style="font-size:0.72rem;padding:5px 10px;border-radius:6px;display:inline-block;cursor:pointer;" title="Clic para modificar">Por Defecto</span>`;
          }
        } else {
          // Static default weekly schedule logic
          if (!empSchedule) {
            badgeHtml = `<span class="badge" style="font-size:0.72rem;padding:5px 10px;background:rgba(100,116,139,0.06);color:var(--text-3);border-radius:6px;display:inline-block;cursor:pointer;opacity:0.6;" title="Sin Horario Semanal (Clic para modificar)">Sin Turno</span>`;
          } else if (workDaysList.includes(String(weekdayNum))) {
            scheduleName = empSchedule.name;
            const timeRange = `${empSchedule.work_start_time}-${empSchedule.work_end_time}`;
            badgeHtml = `<span class="badge badge-green" style="font-size:0.72rem;padding:5px 10px;border-radius:6px;font-family:monospace;display:inline-block;cursor:pointer;" title="Horario Fijo: ${scheduleName} (Clic para modificar)">${timeRange}</span>`;
          } else {
            badgeHtml = `<span class="badge badge-gray" style="font-size:0.72rem;padding:5px 10px;background:rgba(100,116,139,0.04);color:var(--text-3);border-radius:6px;display:inline-block;cursor:pointer;" title="Descanso Semanal Fijo (Clic para modificar)">Libre</span>`;
          }
        }

        const currentScheduleId = override ? override.schedule_id : (empSchedule ? empSchedule.id : null);
        const currentIsOff = override ? override.is_off : (!empSchedule || !workDaysList.includes(String(weekdayNum)));

        return `
          <td style="text-align:center;padding:12px 6px;vertical-align:middle;" onclick="event.stopPropagation(); SchedulesPage.changeEmployeeDailySchedule(${e.id}, '${e.full_name.replace(/'/g, "\\'")}', '${dateStr}', ${currentScheduleId || 'null'}, ${currentIsOff})">
            ${badgeHtml}
          </td>`;
      }).join('');

      const avatar = e.photo_path 
        ? `<div class="emp-avatar"><img src="/uploads/${e.photo_path}?t=${new Date().getTime()}" alt=""></div>`
        : avatarHtml(e.full_name);

      return `
        <tr>
          <td style="padding:10px 14px; vertical-align:middle;">
            <div style="display:flex;align-items:center;gap:10px;">
              ${avatar}
              <div style="line-height:1.3;">
                <div class="emp-name-link" style="cursor:pointer;" onclick="SchedulesPage.changeEmployeeSchedule(${e.id}, '${e.full_name.replace(/'/g, "\\'")}', ${e.schedule_id || 'null'})" title="Cambiar Horario Base">${e.full_name}</div>
                <div style="font-size:0.7rem;color:var(--text-3);font-weight:600;">${e.position?.name || e.position_legacy || '-'}</div>
              </div>
            </div>
          </td>
          ${daysHtml}
        </tr>
      `;
    }).join('');
  },

  prevWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.renderWeeklyMatrix(document.getElementById('schedSubContent'));
  },

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.renderWeeklyMatrix(document.getElementById('schedSubContent'));
  },

  goToCurrentWeek() {
    this.currentWeekStart = this.getMonday(new Date());
    this.renderWeeklyMatrix(document.getElementById('schedSubContent'));
  },

  async changeEmployeeDailySchedule(employeeId, employeeName, dateStr, currentScheduleId, currentIsOff) {
    if (!Auth.canManageEmployees()) {
      Toast.show('No tienes permisos para modificar turnos diarios', 'warning');
      return;
    }

    try {
      const schedules = await API.get('/api/schedules') || [];
      const optionsHtml = schedules.map(s => 
        `<option value="${s.id}" ${(!currentIsOff && currentScheduleId === s.id) ? 'selected' : ''}>${s.name} (${s.work_start_time} - ${s.work_end_time})</option>`
      ).join('');

      Modal.open(`Turno de ${employeeName} (${dateStr})`, `
        <div style="padding: 10px 15px; text-align: left;">
          <p style="font-weight:600;font-size:0.92rem;margin-bottom:12px;color:var(--text-1);">
            Selecciona el turno para este día específico:
          </p>
          <div class="field" style="margin-bottom:14px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:normal;">
              <input type="radio" name="dailySchedType" value="default" ${(!currentScheduleId && !currentIsOff) ? 'checked' : ''} onchange="document.getElementById('dailyCustomSchedDiv').style.display='none'">
              Heredar Horario Semanal por Defecto
            </label>
          </div>
          <div class="field" style="margin-bottom:14px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:normal;">
              <input type="radio" name="dailySchedType" value="off" ${(currentIsOff && !currentScheduleId) ? 'checked' : ''} onchange="document.getElementById('dailyCustomSchedDiv').style.display='none'">
              Día Libre (Descanso)
            </label>
          </div>
          <div class="field" style="margin-bottom:14px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:normal;">
              <input type="radio" name="dailySchedType" value="custom" ${(currentScheduleId) ? 'checked' : ''} onchange="document.getElementById('dailyCustomSchedDiv').style.display='block'">
              Asignar Turno Específico del Catálogo
            </label>
          </div>
          <div id="dailyCustomSchedDiv" style="margin-left: 24px; margin-top: 8px; display: ${currentScheduleId ? 'block' : 'none'};">
            <select id="fDailyScheduleId" style="width:100%;">
              ${optionsHtml}
            </select>
          </div>
        </div>
      `, `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="SchedulesPage.saveEmployeeDailySchedule(${employeeId}, '${dateStr}')">Guardar Asignación</button>
      `);
    } catch (e) {
      Toast.show('Error al abrir asignación diaria', 'error');
    }
  },

  async saveEmployeeDailySchedule(employeeId, dateStr) {
    const selectedType = document.querySelector('input[name="dailySchedType"]:checked').value;
    let schedule_id = null;
    let is_off = false;

    if (selectedType === 'off') {
      is_off = true;
    } else if (selectedType === 'custom') {
      schedule_id = parseInt(document.getElementById('fDailyScheduleId').value);
    }

    try {
      await API.post('/api/employees/daily-schedules/assign', {
        employee_id: employeeId,
        date: dateStr,
        schedule_id: schedule_id,
        is_off: is_off
      });
      Modal.close();
      Toast.show('Turno diario modificado con éxito', 'success');
      this.renderWeeklyMatrix(document.getElementById('schedSubContent'));
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  filterGenEmployees(val) {
    const q = val.toLowerCase();
    document.querySelectorAll('.gen-emp-label').forEach(label => {
      const text = label.textContent.toLowerCase();
      if (text.includes(q)) {
        label.style.setProperty('display', 'flex', 'important');
      } else {
        label.style.setProperty('display', 'none', 'important');
      }
    });
  },

  async openRotationalGeneratorModal() {
    try {
      const [employees, schedules] = await Promise.all([
        API.get('/api/employees?limit=1000&is_active=true'),
        API.get('/api/schedules')
      ]);

      const empList = employees || [];
      const schedList = schedules || [];

      const empCheckboxesHtml = empList.map(e => `
        <label class="gen-emp-label" style="display:flex; align-items:center; gap:8px; padding:6px 0; font-size:0.88rem; cursor:pointer; color:var(--text-2);">
          <input type="checkbox" class="gen-emp-checkbox" value="${e.id}">
          ${e.full_name} (${e.employee_code})
        </label>
      `).join('');

      const schedOptionsHtml = schedList.map(s => 
        `<option value="${s.id}">${s.name} (${s.work_start_time} - ${s.work_end_time})</option>`
      ).join('');

      Modal.open('Generador de Turnos Rotativos', `
        <div style="max-height: 480px; overflow-y: auto; padding: 10px 15px; text-align: left;">
          <p style="font-size:0.85rem; color:var(--text-3); margin-bottom:14px;">
            Define un patrón cíclico de turnos (ej. 4 días de día, 4 de noche, 4 de descanso) y aplícalo a múltiples colaboradores en un rango de fechas.
          </p>
          
          <div class="field" style="margin-bottom:14px;">
            <label style="font-weight:600; display:block; margin-bottom:6px;">1. Seleccionar Colaboradores</label>
            <div style="margin-bottom:8px;">
              <input type="text" id="fGenSearchEmp" placeholder="🔍 Buscar por nombre o código..." oninput="SchedulesPage.filterGenEmployees(this.value)" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:rgba(255,255,255,0.03); color:var(--text-1); outline:none; font-size:0.88rem;">
            </div>
            <div style="margin-bottom:6px;">
              <label style="font-size:0.85rem; display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" onchange="document.querySelectorAll('.gen-emp-checkbox').forEach(cb => { if(cb.closest('label').style.display !== 'none') cb.checked = this.checked })">
                <strong>Seleccionar Visibles</strong>
              </label>
            </div>
            <div style="max-height: 180px; overflow-y: auto; border:1px solid var(--border); padding:8px; border-radius:6px; background:rgba(0,0,0,0.1);">
              ${empCheckboxesHtml}
            </div>
          </div>

          <div class="form-row" style="display:flex; gap:12px; margin-bottom:14px;">
            <div class="field" style="flex:1;">
              <label style="font-weight:600;">Fecha de Inicio</label>
              <input type="date" id="fGenStartDate" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="field" style="flex:1;">
              <label style="font-weight:600;">Fecha de Fin</label>
              <input type="date" id="fGenEndDate" value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
            </div>
          </div>

          <label style="font-weight:600; display:block; margin-bottom:6px;">2. Definición del Ciclo Rotativo</label>
          
          <div class="form-row" style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
            <div class="field" style="width:70px;"><input type="number" id="fGenDaysWork" min="0" value="4" style="text-align:center;"></div>
            <div style="font-size:0.88rem; color:var(--text-2);">días de <strong>Día</strong> con turno:</div>
            <div class="field" style="flex:1;">
              <select id="fGenDaySchedId">
                <option value="">-- Sin Turno (No aplica) --</option>
                ${schedOptionsHtml}
              </select>
            </div>
          </div>

          <div class="form-row" style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
            <div class="field" style="width:70px;"><input type="number" id="fGenNightsWork" min="0" value="4" style="text-align:center;"></div>
            <div style="font-size:0.88rem; color:var(--text-2);">días de <strong>Noche</strong> con turno:</div>
            <div class="field" style="flex:1;">
              <select id="fGenNightSchedId">
                <option value="">-- Sin Turno (No aplica) --</option>
                ${schedOptionsHtml}
              </select>
            </div>
          </div>

          <div class="form-row" style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
            <div class="field" style="width:70px;"><input type="number" id="fGenDaysOff" min="0" value="4" style="text-align:center;"></div>
            <div style="font-size:0.88rem; color:var(--text-2); flex:1;">días de <strong>Descanso</strong> (Libres) consecutivas</div>
          </div>
        </div>
      `, `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="SchedulesPage.saveRotationalCycles()">Generar Patrón</button>
      `);
    } catch(e) {
      Toast.show('Error al cargar formulario rotativo', 'error');
    }
  },

  async saveRotationalCycles() {
    const empCbs = document.querySelectorAll('.gen-emp-checkbox:checked');
    const employeeIds = Array.from(empCbs).map(cb => parseInt(cb.value));

    if (!employeeIds.length) {
      Toast.show('Por favor, selecciona al menos un colaborador', 'warning');
      return;
    }

    const start_date = document.getElementById('fGenStartDate').value;
    const end_date = document.getElementById('fGenEndDate').value;
    const cycle_days_work = parseInt(document.getElementById('fGenDaysWork').value) || 0;
    const cycle_nights_work = parseInt(document.getElementById('fGenNightsWork').value) || 0;
    const cycle_days_off = parseInt(document.getElementById('fGenDaysOff').value) || 0;
    
    const daySchedVal = document.getElementById('fGenDaySchedId').value;
    const nightSchedVal = document.getElementById('fGenNightSchedId').value;
    const day_schedule_id = daySchedVal ? parseInt(daySchedVal) : null;
    const night_schedule_id = nightSchedVal ? parseInt(nightSchedVal) : null;

    if (!start_date || !end_date) {
      Toast.show('Por favor, ingresa las fechas de inicio y fin', 'warning');
      return;
    }

    if (new Date(start_date) > new Date(end_date)) {
      Toast.show('La fecha de inicio no puede ser posterior a la fecha de fin', 'warning');
      return;
    }

    if ((cycle_days_work + cycle_nights_work + cycle_days_off) <= 0) {
      Toast.show('La suma de días del ciclo debe ser mayor a 0', 'warning');
      return;
    }

    try {
      const response = await API.post('/api/employees/daily-schedules/generate', {
        employee_ids: employeeIds,
        start_date: start_date,
        end_date: end_date,
        cycle_days_work: cycle_days_work,
        cycle_nights_work: cycle_nights_work,
        cycle_days_off: cycle_days_off,
        day_schedule_id: day_schedule_id,
        night_schedule_id: night_schedule_id
      });
      Modal.close();
      Toast.show(`¡Horarios rotativos generados! (${response.total_records || 0} registros)`, 'success');
      this.renderWeeklyMatrix(document.getElementById('schedSubContent'));
    } catch(e) {
      Toast.show(e.message, 'error');
    }
  },

  async changeEmployeeSchedule(employeeId, employeeName, currentScheduleId) {
    if (!Auth.canManageEmployees()) {
      Toast.show('No tienes permisos para modificar horarios', 'warning');
      return;
    }
    
    try {
      const schedules = await API.get('/api/schedules') || [];
      const optionsHtml = [
        `<option value="" ${currentScheduleId === null ? 'selected' : ''}>Sin Horario / Configuración Personalizada</option>`,
        ...schedules.map(s => `<option value="${s.id}" ${currentScheduleId === s.id ? 'selected' : ''}>${s.name} (${s.work_start_time} - ${s.work_end_time})</option>`)
      ].join('');

      Modal.open('Reasignar Horario', `
        <div style="padding: 10px 15px; text-align: left;">
          <p style="font-weight:600;font-size:0.95rem;margin-bottom:12px;color:var(--text-1);">
            Selecciona el horario a asignar para <strong>${employeeName}</strong>:
          </p>
          <div class="field">
            <select id="fQuickAssignScheduleId" style="width:100%;">
              ${optionsHtml}
            </select>
          </div>
        </div>
      `, `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="SchedulesPage.saveEmployeeSchedule(${employeeId})">Asignar Horario</button>
      `);
    } catch(e) {
      Toast.show('Error al abrir reasignación', 'error');
    }
  },

  async saveEmployeeSchedule(employeeId) {
    const schedIdVal = document.getElementById('fQuickAssignScheduleId').value;
    const schedId = schedIdVal ? parseInt(schedIdVal) : null;

    try {
      await API.put(`/api/employees/${employeeId}`, { schedule_id: schedId });
      Modal.close();
      Toast.show('Horario asignado con éxito', 'success');
      this.renderWeeklyMatrix(document.getElementById('schedSubContent'));
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async openForm(id = null) {
    let s = null;
    try {
      if (id) s = await API.get(`/api/schedules/${id}`);
      
      const isSplit = s?.shift_type === 'split';
      const workDaysList = (s?.work_days || '1,2,3,4,5').split(',');

      Modal.open(id ? 'Editar Horario' : 'Nuevo Horario', `
        <div class="form-row">
          <div class="field" style="width:100%"><label>Nombre del Horario / Turno</label><input id="fSchedName" value="${s?.name||''}" placeholder="Ej. Turno Mañana, Administrativo, Nocturno" /></div>
        </div>
        <div class="form-row">
          <div class="field" style="width:100%">
            <label>Tipo de Jornada</label>
            <select id="fSchedType" onchange="SchedulesPage.onShiftTypeChange(this)">
              <option value="continuous" ${s?.shift_type!=='split'?'selected':''}>Jornada Continua (Horario Corrido)</option>
              <option value="split" ${s?.shift_type==='split'?'selected':''}>Jornada Partida (Horario Cortado / Con Almuerzo)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field" style="width:100%">
            <label>Días Laborales / Activos</label>
            <div class="day-pill-container">
              ${[
                { id: 1, label: 'L' },
                { id: 2, label: 'M' },
                { id: 3, label: 'M' },
                { id: 4, label: 'J' },
                { id: 5, label: 'V' },
                { id: 6, label: 'S' },
                { id: 7, label: 'D' }
              ].map(day => {
                const isActive = workDaysList.includes(String(day.id));
                return `
                  <button type="button" class="day-pill ${isActive ? 'active' : ''}" data-day="${day.id}" onclick="this.classList.toggle('active')">${day.label}</button>
                `;
              }).join('')}
            </div>
            <style>
              .day-pill-container {
                display: flex;
                gap: 8px;
                margin-top: 6px;
              }
              .day-pill {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 1px solid var(--border, #2a2e3d);
                background: rgba(255, 255, 255, 0.03);
                color: var(--text-3, #94a3b8);
                font-weight: 700;
                font-size: 0.85rem;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
              }
              .day-pill:hover {
                border-color: var(--text-2, #cbd5e1);
                color: var(--text-2, #cbd5e1);
              }
              .day-pill.active {
                background: var(--accent, #00e676) !important;
                border-color: var(--accent, #00e676) !important;
                color: #000 !important;
                box-shadow: 0 0 10px var(--accent-glow, rgba(0, 230, 118, 0.25)) !important;
              }
            </style>
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label>Hora de Entrada</label><input id="fSchedStart" type="time" value="${s?.work_start_time||'07:00'}" /></div>
          <div class="field"><label>Hora de Salida</label><input id="fSchedEnd" type="time" value="${s?.work_end_time||'18:00'}" /></div>
        </div>
        <div id="splitShiftFields" style="${isSplit ? 'display:flex; gap:12px; width:100%; flex-direction:row;' : 'display:none; gap:12px; width:100%; flex-direction:row;'}">
          <div class="field"><label>Salida Almuerzo</label><input id="fSchedLunchStart" type="time" value="${s?.lunch_start_time||'12:00'}" /></div>
          <div class="field"><label>Regreso Almuerzo</label><input id="fSchedLunchEnd" type="time" value="${s?.lunch_end_time||'14:00'}" /></div>
        </div>`,
        `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
         <button class="btn btn-primary" onclick="SchedulesPage.saveSchedule(${id||'null'})">Guardar</button>`);
    } catch (e) {
      Toast.show('Error al abrir formulario', 'error');
    }
  },

  onShiftTypeChange(selectEl) {
    const splitFields = document.getElementById('splitShiftFields');
    if (selectEl.value === 'split') {
      splitFields.style.display = 'flex';
    } else {
      splitFields.style.display = 'none';
    }
  },

  async saveSchedule(id) {
    const shiftType = document.getElementById('fSchedType').value;
    
    // Recopilar dias seleccionados
    const dayButtons = document.querySelectorAll('.day-pill.active');
    const selectedDays = Array.from(dayButtons).map(btn => btn.getAttribute('data-day')).map(Number).sort((a, b) => a - b);
    const workDaysStr = selectedDays.join(',');
    
    const body = {
      name: document.getElementById('fSchedName').value.trim(),
      shift_type: shiftType,
      work_start_time: document.getElementById('fSchedStart').value,
      work_end_time: document.getElementById('fSchedEnd').value,
      lunch_start_time: shiftType === 'split' ? document.getElementById('fSchedLunchStart').value : null,
      lunch_end_time: shiftType === 'split' ? document.getElementById('fSchedLunchEnd').value : null,
      work_days: workDaysStr
    };
    
    if (!body.name) { Toast.show('Por favor, ingresa el nombre del horario', 'warning'); return; }
    if (!body.work_days) { Toast.show('Por favor, selecciona al menos un día laboral', 'warning'); return; }
    
    try {
      if (id) await API.put(`/api/schedules/${id}`, body);
      else await API.post('/api/schedules', body);
      Modal.close();
      Toast.show('Horario guardado con éxito', 'success');
      this.switchSubTab(this.currentSubTab);
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async deleteSchedule(id, name) {
    Modal.confirm(
      '¿Eliminar Horario?',
      `¿Estás seguro de que deseas eliminar el horario <strong>${name}</strong>? Los empleados que tengan este horario asignado pasarán a usar su horario personalizado.`,
      async () => {
        try {
          await API.delete(`/api/schedules/${id}`);
          Toast.show('Horario eliminado con éxito', 'success');
          this.switchSubTab(this.currentSubTab);
        } catch (e) {
          Toast.show(e.message, 'error');
        }
      },
      'danger'
    );
  }
};
