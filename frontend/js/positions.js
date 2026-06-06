/* positions.js — Gestión de Cargos */

const PositionsPage = {
  positions: [],
  employees: [],

  async render() {
    document.getElementById('paramContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">Cargos</div>
        <div class="section-actions">
          ${Auth.canManageEmployees() ? `
            <button class="btn btn-primary" id="btnNewPos">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nuevo cargo
            </button>
          ` : ''}
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nombre del Cargo</th>
              <th>Descripción</th>
              <th style="text-align: center; width: 120px;">Empleados</th>
              <th style="width: 120px; text-align: right; padding-right: 24px;">Acciones</th>
            </tr></thead>
            <tbody id="posTable">
              ${[1, 2, 3].map(() => `<tr>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-75"></div></td>
                <td><div class="skeleton sk-text w-25"></div></td>
                <td><div class="skeleton sk-text w-25"></div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    if (Auth.canManageEmployees()) {
      document.getElementById('btnNewPos')?.addEventListener('click', () => this.openForm());
    }
    await this.loadData();
  },

  async loadData() {
    try {
      this.employees = await API.get('/api/employees') || [];
      await this.loadTable();
    } catch (e) {
      console.error(e);
    }
  },

  async loadTable() {
    try {
      const positions = await API.get('/api/employees/positions') || [];
      this.positions = positions;
      const tbody = document.getElementById('posTable');
      if (!positions.length) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="icon">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
        </div><h3>No hay cargos creados</h3><p>Registra el primer cargo para organizar a tus empleados.</p></div></td></tr>`;
        return;
      }
      
      tbody.innerHTML = positions.map(p => {
        const empCount = this.employees.filter(e => e.position_id === p.id).length;
        return `
        <tr>
          <td>
            <div style="font-weight:600;color:var(--text-1)">${p.name}</div>
          </td>
          <td style="color:var(--text-2); font-size:0.85rem;">
            ${p.description || '<span style="color:var(--text-4); font-style:italic;">Sin descripción</span>'}
          </td>
          <td style="text-align: center; font-weight: 600; color: var(--text-1)">
            ${empCount}
          </td>
          <td style="text-align: right; padding-right: 24px;">
            <div style="display:flex;gap:6px;justify-content:flex-end">
              ${Auth.canManageEmployees() ? `
                <button class="btn btn-icon btn-sm btn-edit" onclick="PositionsPage.openForm(${p.id})" title="Editar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn btn-icon btn-sm btn-delete" onclick="PositionsPage.deletePos(${p.id}, '${p.name}')" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              ` : '-'}
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (e) {
      Toast.show('Error cargando cargos', 'error');
    }
  },

  openForm(id = null) {
    const pos = id ? this.positions.find(p => p.id === id) : null;
    const title = pos ? 'Editar Cargo' : 'Nuevo Cargo';

    Modal.open(title, `
      <div class="form-row">
        <div class="field" style="width:100%">
          <label>Nombre del Cargo</label>
          <input id="fPosName" placeholder="Ej. Gerente, Analista, Desarrollador" value="${pos ? pos.name : ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="field" style="width:100%">
          <label>Descripción (Opcional)</label>
          <textarea id="fPosDesc" placeholder="Breve descripción del cargo..." rows="3" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-1); font-family:inherit; resize:vertical;">${pos && pos.description ? pos.description : ''}</textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="PositionsPage.savePos(${id})">Guardar</button>`);
  },

  async savePos(id = null) {
    const name = document.getElementById('fPosName').value.trim();
    const description = document.getElementById('fPosDesc').value.trim() || null;
    if (!name) { Toast.show('Por favor, ingresa el nombre del cargo', 'warning'); return; }
    try {
      if (id) {
        await API.put(`/api/employees/positions/${id}`, { name, description });
        Toast.show('Cargo actualizado con éxito', 'success');
      } else {
        await API.post('/api/employees/positions', { name, description });
        Toast.show('Cargo creado con éxito', 'success');
      }
      Modal.close();
      this.loadData();
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  async deletePos(id, name) {
    Modal.confirm(
      '¿Eliminar Cargo?',
      `¿Estás seguro de que deseas eliminar el cargo <strong>${name}</strong>? Los empleados con este cargo quedarán clasificados como "Sin cargo".`,
      async () => {
        try {
          await API.delete(`/api/employees/positions/${id}`);
          Toast.show('Cargo eliminado con éxito', 'success');
          this.loadData();
        } catch (e) {
          Toast.show(e.message, 'error');
        }
      },
      'danger'
    );
  }
};
