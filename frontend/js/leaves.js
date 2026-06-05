/* leaves.js — Gestión de Novedades (Vacaciones, Incapacidades, Licencias, Suspensiones) */

const LeavesPage = {
  leaves: [],
  employees: [],

  async render() {
    const container = document.getElementById('pageContent');
    if (!container) return;

    const canEdit = Auth.canManageEmployees();

    container.innerHTML = `
      <div class="section-header">
        <div>
          <div class="section-title">Gestión de Novedades</div>
          <div style="color: var(--text-3); font-size: 0.85rem; margin-top: 4px;">Registra y administra vacaciones, incapacidades médicas, licencias y suspensiones del personal</div>
        </div>
        <div class="section-actions">
          ${canEdit ? `
            <button class="btn btn-primary" id="btnNewLeave">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Registrar Novedad
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Filtros -->
      <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: flex-end;">
          <div class="field" style="margin: 0;">
            <label style="margin-bottom: 6px; font-weight: 600; font-size: 0.8rem; color: var(--text-2);">Buscar Empleado</label>
            <input type="text" id="filterSearch" placeholder="Nombre o código..." style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); width: 100%; font-size: 0.85rem;" />
          </div>
          <div class="field" style="margin: 0;">
            <label style="margin-bottom: 6px; font-weight: 600; font-size: 0.8rem; color: var(--text-2);">Tipo de Novedad</label>
            <select id="filterType" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); width: 100%; font-size: 0.85rem;">
              <option value="">Todos los tipos</option>
              <option value="vacation">Vacaciones</option>
              <option value="medical">Incapacidad Médica</option>
              <option value="paid_leave">Licencia Remunerada</option>
              <option value="unpaid_leave">Licencia No Remunerada</option>
              <option value="suspension">Suspensión</option>
            </select>
          </div>
          <div style="display: flex; gap: 12px; grid-column: span 2;">
            <div class="field" style="margin: 0; flex: 1;">
              <label style="margin-bottom: 6px; font-weight: 600; font-size: 0.8rem; color: var(--text-2);">Desde</label>
              <input type="date" id="filterFrom" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); width: 100%; font-size: 0.85rem;" />
            </div>
            <div class="field" style="margin: 0; flex: 1;">
              <label style="margin-bottom: 6px; font-weight: 600; font-size: 0.8rem; color: var(--text-2);">Hasta</label>
              <input type="date" id="filterTo" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); width: 100%; font-size: 0.85rem;" />
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" id="btnResetFilters" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; flex: 1; height: 38px;">
              Limpiar
            </button>
            <button class="btn btn-primary" id="btnApplyFilters" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; flex: 1; height: 38px;">
              Filtrar
            </button>
          </div>
        </div>
      </div>

      <!-- Tabla de Novedades -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Tipo de Novedad</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th style="width: 100px; text-align: center;">Duración</th>
                <th>Descripción / Observaciones</th>
                ${canEdit ? `<th style="width: 100px; text-align: center;">Acciones</th>` : ''}
              </tr>
            </thead>
            <tbody id="leavesTableBody">
              <tr>
                <td colspan="${canEdit ? 7 : 6}"><div class="skeleton sk-text w-100"></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event listeners para los filtros
    let searchTimeout = null;
    document.getElementById('filterSearch').addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.loadTable();
      }, 300);
    });

    document.getElementById('filterType').addEventListener('change', () => this.loadTable());
    document.getElementById('filterFrom').addEventListener('change', () => this.loadTable());
    document.getElementById('filterTo').addEventListener('change', () => this.loadTable());

    document.getElementById('btnApplyFilters').addEventListener('click', () => this.loadTable());
    document.getElementById('btnResetFilters').addEventListener('click', () => {
      document.getElementById('filterSearch').value = '';
      document.getElementById('filterType').value = '';
      document.getElementById('filterFrom').value = '';
      document.getElementById('filterTo').value = '';
      this.loadTable();
    });

    if (canEdit) {
      document.getElementById('btnNewLeave')?.addEventListener('click', () => this.openForm());
    }

    // Cargar empleados y tabla
    await this.loadEmployees();
    await this.loadTable();
  },

  async loadEmployees() {
    try {
      this.employees = await API.get('/api/employees') || [];
    } catch (e) {
      console.error("Error loading employees", e);
    }
  },

  async loadTable() {
    try {
      const search = document.getElementById('filterSearch').value.trim();
      const type = document.getElementById('filterType').value;
      const from = document.getElementById('filterFrom').value;
      const to = document.getElementById('filterTo').value;

      let query = '';
      const params = [];
      if (type) params.push(`leave_type=${type}`);
      if (from) params.push(`date_from=${from}`);
      if (to) params.push(`date_to=${to}`);
      if (params.length) query = '?' + params.join('&');

      let leaves = await API.get(`/api/leaves${query}`) || [];
      this.leaves = leaves;

      // Filtrar en frontend por búsqueda (nombre o código de empleado)
      if (search) {
        const sLower = search.toLowerCase();
        leaves = leaves.filter(l => {
          const emp = this.employees.find(e => e.id === l.employee_id);
          if (!emp) return false;
          const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
          return fullName.includes(sLower) || emp.employee_code.toLowerCase().includes(sLower);
        });
      }

      const tbody = document.getElementById('leavesTableBody');
      if (!tbody) return;

      const canEdit = Auth.canManageEmployees();

      if (!leaves || leaves.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${canEdit ? 7 : 6}"><div class="empty-state"><h3>No hay novedades registradas</h3><p>Usa el botón superior para registrar vacaciones o incapacidades.</p></div></td></tr>`;
        return;
      }

      const typeLabels = {
        vacation: { text: "Vacaciones", class: "badge-teal", color: "#0f766e" },
        medical: { text: "Incapacidad Médica", class: "badge-purple", color: "#7c3aed" },
        paid_leave: { text: "Licencia Remunerada", class: "badge-blue", color: "#2563eb" },
        unpaid_leave: { text: "Licencia No Remunerada", class: "badge-indigo", color: "#4f46e5" },
        suspension: { text: "Suspensión", class: "badge-danger", color: "#b91c1c" }
      };

      tbody.innerHTML = leaves.map(l => {
        const emp = this.employees.find(e => e.id === l.employee_id);
        const empName = emp ? `${emp.first_name} ${emp.last_name}` : `Empleado #${l.employee_id}`;
        const empCode = emp ? emp.employee_code : '-';
        const empPhoto = emp && emp.photo_path ? emp.photo_path : null;

        const info = typeLabels[l.leave_type] || { text: l.leave_type, class: "badge-gray", color: "#64748b" };

        const start = new Date(l.start_date + 'T00:00:00');
        const end = new Date(l.end_date + 'T00:00:00');
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const deleteButton = `
          <button class="btn btn-icon btn-sm btn-danger" onclick="LeavesPage.deleteLeave(${l.id}, '${empName}', '${info.text}')" title="Eliminar Novedad">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--danger);"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        `;

        const avatarMarkup = empPhoto 
          ? `<div class="emp-avatar"><img src="/uploads/${empPhoto}?t=${new Date().getTime()}" alt=""></div>`
          : avatarHtml(empName);

        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="LeavesPage.showEmployeeLeaveSummary(${emp ? emp.id : l.employee_id}, '${empName.replace(/'/g, "\\'")}')" title="Ver historial de novedades de ${empName}">
                ${avatarMarkup}
                <div>
                  <div style="font-weight: 600; color: var(--text-1); text-decoration: underline; text-decoration-color: var(--border); text-underline-offset: 3px;">${empName}</div>
                  <div style="font-size: 0.75rem; color: var(--text-3);">Cód: ${empCode}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="badge" style="background: ${info.color}15; color: ${info.color}; border: 1px solid ${info.color}30; font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 0.78rem;">
                ${info.text}
              </span>
            </td>
            <td style="font-weight: 500;">${l.start_date}</td>
            <td style="font-weight: 500;">${l.end_date}</td>
            <td style="text-align: center;"><strong style="color: var(--text-1);">${diffDays}</strong> <span style="font-size: 0.78rem; color: var(--text-3);">${diffDays === 1 ? 'día' : 'días'}</span></td>
            <td style="color: var(--text-2); font-size: 0.82rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${l.description || ''}">
              ${l.description || '<span style="color: var(--text-4); font-style: italic;">Sin observaciones</span>'}
            </td>
            ${canEdit ? `<td style="text-align: center;">${deleteButton}</td>` : ''}
          </tr>
        `;
      }).join('');

    } catch (e) {
      Toast.show('Error al cargar la lista de novedades', 'error');
    }
  },

  openForm() {
    const employeeOptions = this.employees
      .map(e => `<option value="${e.id}">${e.first_name} ${e.last_name} (${e.employee_code})</option>`)
      .join('');

    Modal.open('Registrar Novedad de Personal', `
      <div class="field">
        <label style="font-weight: 600; font-size: 0.82rem;">Seleccionar Empleado</label>
        <select id="leaveEmpId" style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1);">
          <option value="">Selecciona un empleado...</option>
          ${employeeOptions}
        </select>
      </div>
      <div class="field">
        <label style="font-weight: 600; font-size: 0.82rem;">Tipo de Novedad</label>
        <select id="leaveType" style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1);">
          <option value="vacation">Vacaciones</option>
          <option value="medical">Incapacidad Médica</option>
          <option value="paid_leave">Licencia Remunerada</option>
          <option value="unpaid_leave">Licencia No Remunerada</option>
          <option value="suspension">Suspensión</option>
        </select>
      </div>
      <div style="display: flex; gap: 16px;">
        <div class="field" style="flex: 1;">
          <label style="font-weight: 600; font-size: 0.82rem;">Fecha de Inicio</label>
          <input id="leaveStart" type="date" style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1);" />
        </div>
        <div class="field" style="flex: 1;">
          <label style="font-weight: 600; font-size: 0.82rem;">Fecha de Fin (Inclusive)</label>
          <input id="leaveEnd" type="date" style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1);" />
        </div>
      </div>
      <div class="field">
        <label style="font-weight: 600; font-size: 0.82rem;">Descripción / Justificación</label>
        <textarea id="leaveDesc" rows="3" placeholder="Observaciones adicionales, detalles médicos, etc..." style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); font-family: inherit; resize: vertical;"></textarea>
      </div>
    `,
    `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
     <button class="btn btn-primary" onclick="LeavesPage.saveLeave()">Guardar</button>`);

    // Establecer fechas iniciales a hoy
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('leaveStart').value = todayStr;
    document.getElementById('leaveEnd').value = todayStr;
  },

  async saveLeave() {
    const employee_id = document.getElementById('leaveEmpId').value;
    const leave_type = document.getElementById('leaveType').value;
    const start_date = document.getElementById('leaveStart').value;
    const end_date = document.getElementById('leaveEnd').value;
    const description = document.getElementById('leaveDesc').value.trim();

    if (!employee_id) { Toast.show('Debe seleccionar un empleado', 'warning'); return; }
    if (!start_date) { Toast.show('Debe ingresar la fecha de inicio', 'warning'); return; }
    if (!end_date) { Toast.show('Debe ingresar la fecha de fin', 'warning'); return; }

    if (new Date(end_date) < new Date(start_date)) {
      Toast.show('La fecha de fin debe ser igual o posterior a la fecha de inicio', 'warning');
      return;
    }

    try {
      await API.post('/api/leaves', {
        employee_id: parseInt(employee_id),
        leave_type,
        start_date,
        end_date,
        description: description || null
      });
      Toast.show('Novedad registrada con éxito', 'success');
      Modal.close();
      this.loadTable();
    } catch (e) {
      Toast.show(e.message || 'Error al registrar novedad', 'error');
    }
  },

  deleteLeave(id, empName, leaveTypeText) {
    Modal.confirm(
      '¿Eliminar Novedad?',
      `¿Estás seguro de que deseas eliminar la novedad de tipo <strong>${leaveTypeText}</strong> para <strong>${empName}</strong>? Esta acción recalculará la asistencia normal para ese periodo.`,
      async () => {
        try {
          await API.delete(`/api/leaves/${id}`);
          Toast.show('Novedad eliminada con éxito', 'success');
          this.loadTable();
        } catch (e) {
          Toast.show(e.message || 'Error al eliminar novedad', 'error');
        }
      },
      'danger'
    );
  },

  showEmployeeLeaveSummary(employeeId, employeeName) {
    const empLeaves = (this.leaves || []).filter(l => l.employee_id === employeeId);
    
    // Calcular estadísticas
    const currentYear = new Date().getFullYear();
    let vacationDays = 0;
    let medicalDays = 0;
    let otherDays = 0;
    
    empLeaves.forEach(l => {
      const start = new Date(l.start_date + 'T00:00:00');
      const end = new Date(l.end_date + 'T00:00:00');
      const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      const year = start.getFullYear();
      if (year === currentYear) {
        if (l.leave_type === 'vacation') vacationDays += days;
        else if (l.leave_type === 'medical') medicalDays += days;
        else otherDays += days;
      }
    });
    
    // Ordenar de forma descendente por fecha de inicio
    const sortedLeaves = [...empLeaves].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    const typeLabels = {
      vacation: "Vacaciones",
      medical: "Incapacidad Médica",
      paid_leave: "Licencia Remunerada",
      unpaid_leave: "Licencia No Remunerada",
      suspension: "Suspensión"
    };

    let historyRowsHtml = '';
    if (sortedLeaves.length === 0) {
      historyRowsHtml = `<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:16px;">Sin historial de novedades</td></tr>`;
    } else {
      historyRowsHtml = sortedLeaves.map(l => {
        const start = new Date(l.start_date + 'T00:00:00');
        const end = new Date(l.end_date + 'T00:00:00');
        const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        return `
          <tr>
            <td style="font-weight:600;color:var(--text-1);">${typeLabels[l.leave_type] || l.leave_type}</td>
            <td>${l.start_date} al ${l.end_date}</td>
            <td style="text-align:center;font-weight:600;color:var(--text-1);">${days} ${days === 1 ? 'día' : 'días'}</td>
            <td style="color:var(--text-2);font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.description || ''}">${l.description || '-'}</td>
          </tr>
        `;
      }).join('');
    }

    const modalBody = `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background:var(--surface-2); padding: 12px; border-radius: 8px; border: 1px solid var(--border); text-align:center;">
          <div style="font-size:0.75rem; color:var(--text-3); font-weight:600; text-transform:uppercase; margin-bottom:4px;">Vacaciones (${currentYear})</div>
          <div style="font-size:1.4rem; font-weight:800; color:#0f766e;">${vacationDays} <span style="font-size:0.8rem; font-weight:500;">días</span></div>
        </div>
        <div style="background:var(--surface-2); padding: 12px; border-radius: 8px; border: 1px solid var(--border); text-align:center;">
          <div style="font-size:0.75rem; color:var(--text-3); font-weight:600; text-transform:uppercase; margin-bottom:4px;">Incapacidades (${currentYear})</div>
          <div style="font-size:1.4rem; font-weight:800; color:#7c3aed;">${medicalDays} <span style="font-size:0.8rem; font-weight:500;">días</span></div>
        </div>
        <div style="background:var(--surface-2); padding: 12px; border-radius: 8px; border: 1px solid var(--border); text-align:center;">
          <div style="font-size:0.75rem; color:var(--text-3); font-weight:600; text-transform:uppercase; margin-bottom:4px;">Otras Licencias (${currentYear})</div>
          <div style="font-size:1.4rem; font-weight:800; color:#2563eb;">${otherDays} <span style="font-size:0.8rem; font-weight:500;">días</span></div>
        </div>
      </div>
      
      <div style="font-weight:700; font-size:0.85rem; color:var(--text-1); margin-bottom:10px;">Historial de Novedades del Colaborador</div>
      <div class="table-wrap" style="max-height: 250px; overflow-y:auto; border: 1px solid var(--border); border-radius:8px;">
        <table style="font-size:0.82rem;width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:10px;text-align:left;">Tipo</th>
              <th style="padding:10px;text-align:left;">Periodo</th>
              <th style="padding:10px;width: 80px; text-align:center;">Días</th>
              <th style="padding:10px;text-align:left;">Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${historyRowsHtml}
          </tbody>
        </table>
      </div>
    `;

    Modal.open(`Historial de Novedades: ${employeeName}`, modalBody, `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`);
  }
};


window.LeavesPage = LeavesPage;
