/* employees.js — Gestión de empleados */

const EmployeesPage = {
  page: 1, search: '', depts: [],

  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Empleados</div>
        <div class="section-actions">
          <div class="search-bar">
            <span class="icon">🔍</span>
            <input type="text" id="empSearch" placeholder="Buscar por nombre o código..." style="width:220px" />
          </div>
          ${Auth.isAdmin() ? `<button class="btn btn-primary" id="btnNewEmp">+ Nuevo empleado</button>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Empleado</th><th>Código</th><th>Cargo</th><th>Departamento</th>
              <th>Horario</th><th>Dispositivo</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody id="empTable"><tr><td colspan="8"><div class="loading-overlay"><div class="spinner"></div></div></td></tr></tbody>
          </table>
        </div>
        <div class="pagination" id="empPagination"></div>
      </div>`;

    this.depts = await API.get('/api/employees/departments') || [];

    document.getElementById('empSearch').addEventListener('input', (e) => {
      this.search = e.target.value; this.page = 1; this.loadTable();
    });
    if (Auth.isAdmin()) document.getElementById('btnNewEmp')?.addEventListener('click', () => this.openForm());
    await this.loadTable();
  },

  async loadTable() {
    const params = new URLSearchParams({ skip: (this.page-1)*50, limit: 50 });
    if (this.search) params.set('search', this.search);
    try {
      const emps = await API.get(`/api/employees?${params}`);
      const tbody = document.getElementById('empTable');
      if (!emps?.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">👥</div><h3>Sin empleados</h3><p>Agrega el primer empleado</p></div></td></tr>`; return; }
      tbody.innerHTML = emps.map(e => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px">
            <div class="emp-avatar">${e.photo_path ? `<img src="/uploads/${e.photo_path}" alt="">` : e.first_name.charAt(0)}</div>
            <div><div style="font-weight:600">${e.first_name} ${e.last_name}</div><div style="font-size:.75rem;color:var(--text-3)">${e.email||''}</div></div>
          </div></td>
          <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.78rem">${e.employee_code}</code></td>
          <td style="color:var(--text-2)">${e.position||'-'}</td>
          <td>${e.department?.name||'-'}</td>
          <td style="font-size:.78rem;color:var(--text-3)">${e.work_start_time} – ${e.work_end_time}</td>
          <td>${e.synced_to_device ? `<span class="badge badge-green">✓ Sync</span>` : `<span class="badge badge-gray">Sin sync</span>`}</td>
          <td>${e.is_active ? `<span class="badge badge-green">Activo</span>` : `<span class="badge badge-red">Inactivo</span>`}</td>
          <td>
            <div style="display:flex;gap:6px">
              ${Auth.isAdmin() ? `<button class="btn btn-icon btn-sm" onclick="EmployeesPage.openForm(${e.id})" title="Editar">✏️</button>
              <button class="btn btn-icon btn-sm" onclick="EmployeesPage.uploadPhoto(${e.id},'${e.employee_code}')" title="Foto">📷</button>` : ''}
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
        <div class="field"><label>Entrada</label><input id="fStart" type="time" value="${emp?.work_start_time||'08:00'}" /></div>
        <div class="field"><label>Salida</label><input id="fEnd" type="time" value="${emp?.work_end_time||'17:00'}" /></div>
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
};
