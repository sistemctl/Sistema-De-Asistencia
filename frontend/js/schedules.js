/* schedules.js — Gestión de Horarios y Turnos */

const SchedulesPage = {
  async render() {
    document.getElementById('paramContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Horarios y Turnos</div>
        <div class="section-actions">
          ${Auth.canManageEmployees() ? `
            <button class="btn btn-primary" id="btnNewSchedule">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nuevo horario
            </button>
          ` : ''}
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nombre del Horario</th>
              <th>Tipo de Jornada</th>
              <th>Horario de Trabajo</th>
              <th>Fecha de Creación</th>
              <th>Acciones</th>
            </tr></thead>
            <tbody id="scheduleTable">
              ${[1, 2, 3].map(() => `<tr>
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
  },

  async loadTable() {
    try {
      const schedules = await API.get('/api/schedules') || [];
      const tbody = document.getElementById('scheduleTable');
      if (!schedules.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="icon">
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

  async openForm(id = null) {
    let s = null;
    try {
      if (id) s = await API.get(`/api/schedules/${id}`);
      
      const isSplit = s?.shift_type === 'split';

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
    const body = {
      name: document.getElementById('fSchedName').value.trim(),
      shift_type: shiftType,
      work_start_time: document.getElementById('fSchedStart').value,
      work_end_time: document.getElementById('fSchedEnd').value,
      lunch_start_time: shiftType === 'split' ? document.getElementById('fSchedLunchStart').value : null,
      lunch_end_time: shiftType === 'split' ? document.getElementById('fSchedLunchEnd').value : null,
    };
    if (!body.name) { Toast.show('Por favor, ingresa el nombre del horario', 'warning'); return; }
    try {
      if (id) await API.put(`/api/schedules/${id}`, body);
      else await API.post('/api/schedules', body);
      Modal.close();
      Toast.show('Horario guardado con éxito', 'success');
      this.loadTable();
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async deleteSchedule(id, name) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el horario "${name}"? Los empleados que tengan este horario asignado pasarán a usar su horario personalizado.`)) return;
    try {
      await API.delete(`/api/schedules/${id}`);
      Toast.show('Horario eliminado con éxito', 'success');
      this.loadTable();
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  }
};
