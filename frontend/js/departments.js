/* departments.js — Gestión de Departamentos */

const DepartmentsPage = {
  depts: [],

  async render() {
    document.getElementById('paramContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Departamentos</div>
        <div class="section-actions">
          ${Auth.canManageEmployees() ? `
            <button class="btn btn-primary" id="btnNewDept">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nuevo departamento
            </button>
          ` : ''}
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nombre del Departamento</th>
              <th style="width: 100px; text-align: right; padding-right: 24px;">Acciones</th>
            </tr></thead>
            <tbody id="deptTable">
              ${[1, 2, 3].map(() => `<tr>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-25"></div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    if (Auth.canManageEmployees()) {
      document.getElementById('btnNewDept')?.addEventListener('click', () => this.openForm());
    }
    await this.loadTable();
  },

  async loadTable() {
    try {
      const depts = await API.get('/api/employees/departments') || [];
      this.depts = depts;
      const tbody = document.getElementById('deptTable');
      if (!depts.length) {
        tbody.innerHTML = `<tr><td colspan="2"><div class="empty-state"><div class="icon">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
        </div><h3>No hay departamentos creados</h3><p>Registra el primer departamento para organizar a tus empleados.</p></div></td></tr>`;
        return;
      }
      
      tbody.innerHTML = depts.map(d => {
        return `
        <tr>
          <td>
            <div style="font-weight:600;color:var(--text-1)">${d.name}</div>
          </td>
          <td style="text-align: right; padding-right: 24px;">
            <div style="display:flex;gap:6px;justify-content:flex-end">
              ${Auth.canManageEmployees() ? `
                <button class="btn btn-icon btn-sm btn-delete" onclick="DepartmentsPage.deleteDept(${d.id}, '${d.name}')" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              ` : '-'}
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (e) {
      Toast.show('Error cargando departamentos', 'error');
    }
  },

  openForm() {
    Modal.open('Nuevo Departamento', `
      <div class="form-row">
        <div class="field" style="width:100%">
          <label>Nombre del Departamento</label>
          <input id="fNewDeptName" placeholder="Ej. Contabilidad, Ventas, Sistemas" />
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="DepartmentsPage.saveDept()">Guardar</button>`);
  },

  async saveDept() {
    const name = document.getElementById('fNewDeptName').value.trim();
    if (!name) { Toast.show('Por favor, ingresa el nombre del departamento', 'warning'); return; }
    try {
      await API.post('/api/employees/departments', { name });
      Modal.close();
      Toast.show('Departamento creado con éxito', 'success');
      this.loadTable();
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async deleteDept(id, name) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el departamento "${name}"? Los empleados en este departamento quedarán clasificados como "Sin departamento".`)) return;
    try {
      await API.delete(`/api/employees/departments/${id}`);
      Toast.show('Departamento eliminado con éxito', 'success');
      this.loadTable();
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  }
};
