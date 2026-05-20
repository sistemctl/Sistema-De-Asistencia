/* employees.js — Gestión de empleados */

const EmployeesPage = {
  page: 1, search: '', depts: [],

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Empleados</div>
        <div class="section-actions">
          <div class="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--text-3);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="empSearch" placeholder="Buscar por nombre o código..." style="width:220px" />
          </div>
          ${Auth.canManageEmployees() ? `
            <button class="btn btn-secondary" id="btnImportFromDevice" style="margin-right:8px">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Importar del Biométrico
            </button>
            <button class="btn btn-primary" id="btnNewEmp">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nuevo empleado
            </button>
          ` : ''}
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Empleado</th><th>Código</th><th>Cargo</th><th>Departamento</th>
              <th>Horario</th><th>Dispositivo</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody id="empTable">
              ${[1,2,3,4].map(() => `<tr>
                <td><div style="display:flex;gap:10px;align-items:center"><div class="skeleton sk-avatar"></div><div style="flex:1"><div class="skeleton sk-text w-50"></div><div class="skeleton sk-text w-75" style="margin:0"></div></div></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-75"></div></td>
                <td><div class="skeleton sk-text w-75"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="pagination" id="empPagination"></div>
      </div>`;

    this.depts = await API.get('/api/employees/departments') || [];

    document.getElementById('empSearch').addEventListener('input', (e) => {
      this.search = e.target.value; this.page = 1; this.loadTable();
    });
    if (Auth.canManageEmployees()) {
      document.getElementById('btnNewEmp')?.addEventListener('click', () => this.openForm());
      document.getElementById('btnImportFromDevice')?.addEventListener('click', () => this.importFromDevice());
    }
    await this.loadTable();
  },

  async loadTable() {
    const params = new URLSearchParams({ skip: (this.page-1)*50, limit: 50 });
    if (this.search) params.set('search', this.search);
    try {
      const emps = await API.get(`/api/employees?${params}`);
      const tbody = document.getElementById('empTable');
      if (!emps?.length) { 
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div><h3>Aún no hay equipo</h3><p>Registra a tu primer empleado o importa desde el dispositivo.</p></div></td></tr>`; 
        return; 
      }
      tbody.innerHTML = emps.map(e => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px">
            <div class="emp-avatar">${e.photo_path ? `<img src="/uploads/${e.photo_path}" alt="">` : e.first_name.charAt(0)}</div>
            <div><div style="font-weight:600">${e.first_name} ${e.last_name}</div><div style="font-size:.75rem;color:var(--text-3)">${e.email||''}</div></div>
          </div></td>
          <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:'JetBrains Mono',monospace;">${e.employee_code}</code></td>
          <td style="color:var(--text-2)">${e.position||'-'}</td>
          <td>${e.department?.name||'-'}</td>
          <td style="font-size:.78rem;color:var(--text-3)">${e.work_start_time} – ${e.work_end_time}</td>
          <td>${e.synced_to_device ? `<span class="badge badge-green">✓ Sync</span>` : `<span class="badge badge-gray">Sin sync</span>`}</td>
          <td>${e.is_active ? `<span class="badge badge-green">Activo</span>` : `<span class="badge badge-red">Inactivo</span>`}</td>
          <td>
            <div style="display:flex;gap:6px">
              ${Auth.canManageEmployees() ? `
                <button class="btn btn-icon btn-sm" onclick="EmployeesPage.openForm(${e.id})" title="Editar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn btn-icon btn-sm" onclick="EmployeesPage.uploadPhoto(${e.id},'${e.employee_code}')" title="Foto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>` : ''}
            </div>
          </td>
        </tr>`).join('');
    } catch(e) { Toast.show('Error cargando empleados', 'error'); }
  },

  async openForm(id = null) {
    let emp = null;
    if (id) emp = await API.get(`/api/employees/${id}`);
    const depOpts = this.depts.map(d => `<option value="${d.id}" ${emp?.department_id==d.id?'selected':''}>${d.name}</option>`).join('');
    Modal.open(id ? 'Editar Empleado' : 'Nuevo Empleado', `
      <div class="form-row">
        <div class="field"><label>Nombre</label><input id="fFirstName" value="${emp?.first_name||''}" placeholder="Nombre" /></div>
        <div class="field"><label>Apellido</label><input id="fLastName" value="${emp?.last_name||''}" placeholder="Apellido" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Código empleado</label><input id="fCode" value="${emp?.employee_code||''}" placeholder="EMP001" ${id?'readonly':''} /></div>
        <div class="field"><label>Cargo</label><input id="fPosition" value="${emp?.position||''}" placeholder="Ej. Analista" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Email</label><input id="fEmail" type="email" value="${emp?.email||''}" placeholder="correo@empresa.com" /></div>
        <div class="field"><label>Teléfono</label><input id="fPhone" value="${emp?.phone||''}" placeholder="+57 300..." /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Departamento</label><select id="fDept"><option value="">Sin departamento</option>${depOpts}</select></div>
        <div class="field"><label>N° Tarjeta M1</label><input id="fCard" value="${emp?.card_number||''}" placeholder="Opcional" /></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Entrada</label><input id="fStart" type="time" value="${emp?.work_start_time||'07:00'}" /></div>
        <div class="field"><label>Salida</label><input id="fEnd" type="time" value="${emp?.work_end_time||'18:00'}" /></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="EmployeesPage.saveEmployee(${id||'null'})">Guardar</button>`);
  },

  async saveEmployee(id) {
    const body = {
      first_name: document.getElementById('fFirstName').value.trim(),
      last_name: document.getElementById('fLastName').value.trim(),
      employee_code: document.getElementById('fCode').value.trim(),
      position: document.getElementById('fPosition').value.trim(),
      email: document.getElementById('fEmail').value.trim() || null,
      phone: document.getElementById('fPhone').value.trim() || null,
      department_id: document.getElementById('fDept').value || null,
      card_number: document.getElementById('fCard').value.trim() || null,
      work_start_time: document.getElementById('fStart').value,
      work_end_time: document.getElementById('fEnd').value,
    };
    try {
      if (id) await API.put(`/api/employees/${id}`, body);
      else await API.post('/api/employees', body);
      Modal.close(); Toast.show('Empleado guardado', 'success'); this.loadTable();
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  uploadPhoto(id, code) {
    Modal.open('Subir Foto', `
      <p style="color:var(--text-2);margin-bottom:14px">Foto del empleado <strong>${code}</strong> (JPG/PNG)</p>
      <input type="file" id="photoFile" accept="image/*" style="color:var(--text-1)" />`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="EmployeesPage.doUploadPhoto(${id})">Subir</button>`);
  },

  async doUploadPhoto(id) {
    const file = document.getElementById('photoFile').files[0];
    if (!file) { Toast.show('Selecciona una imagen', 'warning'); return; }
    const fd = new FormData(); fd.append('file', file);
    try {
      await API.postForm(`/api/employees/${id}/photo`, fd);
      Modal.close(); Toast.show('Foto actualizada', 'success'); this.loadTable();
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  async importFromDevice() {
    if (!confirm("¿Deseas importar todos los empleados registrados en el dispositivo biométrico? Esto agregará a los empleados nuevos y actualizará los existentes.")) return;
    
    Toast.show('Iniciando importación desde el dispositivo...', 'info');
    try {
      const res = await API.post('/api/employees/import-from-device');
      if (res.status === 'success') {
        Toast.show(`Importación finalizada: ${res.imported} creados, ${res.updated} actualizados (Total: ${res.total_device_users} en dispositivo).`, 'success');
        this.loadTable();
      } else {
        Toast.show('Error al importar empleados', 'error');
      }
    } catch(e) {
      Toast.show(e.message || 'Error de conexión', 'error');
    }
  },
};
