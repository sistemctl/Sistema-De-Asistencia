/* users.js — Gestión de usuarios del sistema y roles */

const UsersPage = {
  async render() {
    const user = Auth.user();
    const isSuper = Auth.isAdmin();

    if (!isSuper) {
      document.getElementById('pageContent').innerHTML = `
        <div class="empty-state">
          <div class="icon">🔒</div>
          <h3>Acceso Denegado</h3>
          <p>Solo los Super Administradores pueden gestionar los usuarios del sistema.</p>
        </div>`;
      return;
    }

    document.getElementById('pageContent').innerHTML = `
      <div class="card" style="padding: 0; display: flex; flex-direction: column; overflow: hidden;">
        
        <!-- Cabecera de la Tarjeta con Título y Acciones -->
        <div style="padding: 16px 20px; background: var(--surface-1); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Usuarios Registrados
            </div>
            <div style="color: var(--text-3); font-size: 0.78rem; margin-top: 4px;">Administradores del software y sus respectivos roles de acceso</div>
          </div>
          <button class="btn btn-primary" id="btnNewUser" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nuevo Usuario
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre del Administrador</th>
                <th>Nombre de Usuario</th>
                <th>Rol Asignado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="usersTable">
              ${[1,2,3].map(() => `<tr>
                <td><div style="display:flex;gap:10px;align-items:center"><div class="skeleton sk-avatar"></div><div class="skeleton sk-text w-75" style="margin:0"></div></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-75"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
                <td><div class="skeleton sk-text w-50"></div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btnNewUser').addEventListener('click', () => this.openForm());
    await this.loadTable();
  },

  async loadTable() {
    try {
      const users = await API.get('/api/auth/users');
      const tbody = document.getElementById('usersTable');
      if (!tbody) return;

      if (!users?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><h3>Sin usuarios</h3></div></td></tr>`;
        return;
      }

      tbody.innerHTML = users.map(u => {
        const roleBadges = {
          admin: '<span class="badge badge-red"><span class="status-dot"></span> Super Admin</span>',
          hr_admin: '<span class="badge badge-yellow"><span class="status-dot"></span> Gestor RRHH</span>',
          viewer: '<span class="badge badge-gray"><span class="status-dot"></span> Auditor</span>'
        };

        const roleLabel = roleBadges[u.role] || `<span class="badge badge-gray">${u.role}</span>`;

        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                ${avatarHtml(u.full_name)}
                <span style="font-weight:600">${u.full_name}</span>
              </div>
            </td>
            <td><code style="background:var(--surface-3);padding:2px 8px;border-radius:5px;font-size:.78rem;font-family:'JetBrains Mono',monospace;">${u.username}</code></td>
            <td>${roleLabel}</td>
            <td>
              ${u.is_active 
                ? '<span class="badge badge-green"><span class="status-dot"></span> Activo</span>' 
                : '<span class="badge badge-red"><span class="status-dot"></span> Suspendido</span>'}
            </td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-icon btn-sm" onclick="UsersPage.openForm(${u.id})" title="Editar Perfil / Rol">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn btn-icon btn-sm" onclick="UsersPage.openChangePassword(${u.id}, '${u.username}')" title="Cambiar Contraseña">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </button>
                <button class="btn btn-icon btn-sm btn-danger" onclick="UsersPage.deleteUser(${u.id}, '${u.username}')" title="Eliminar Usuario">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--danger);"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');
    } catch(e) { Toast.show('Error cargando usuarios del sistema', 'error'); }
  },

  async openForm(id = null) {
    let u = null;
    if (id) {
      const users = await API.get('/api/auth/users');
      u = users.find(x => x.id === id);
    }

    const modalTitle = id ? 'Editar Usuario del Sistema' : 'Nuevo Usuario del Sistema';
    const pwdField = id ? '' : `
      <div class="field">
        <label>Contraseña inicial</label>
        <input id="uPassword" type="password" placeholder="••••••••" />
      </div>`;

    const statusField = id ? `
      <div class="field">
        <label>Estado de Cuenta</label>
        <select id="uIsActive">
          <option value="true" ${u.is_active ? 'selected' : ''}>🟢 Activo / Habilitado</option>
          <option value="false" ${!u.is_active ? 'selected' : ''}>🔴 Suspendido / Deshabilitado</option>
        </select>
      </div>` : '';

    Modal.open(modalTitle, `
      <div class="field">
        <label>Nombre Completo</label>
        <input id="uFullName" value="${u?.full_name||''}" placeholder="Nombre y Apellido" />
      </div>
      <div class="field">
        <label>Nombre de Usuario</label>
        <input id="uUsername" value="${u?.username||''}" placeholder="ej. cesarsemejal" ${id ? 'readonly style="background:var(--surface-3);cursor:not-allowed;"' : ''} />
      </div>
      ${pwdField}
      <div class="field">
        <label>Rol del Sistema</label>
        <select id="uRole">
          <option value="viewer" ${u?.role==='viewer' ? 'selected' : ''}>🟢 Auditor / Solo Lectura</option>
          <option value="hr_admin" ${u?.role==='hr_admin' ? 'selected' : ''}>🟡 Gestor de RRHH</option>
          <option value="admin" ${u?.role==='admin' ? 'selected' : ''}>🔴 Super Administrador</option>
        </select>
      </div>
      ${statusField}
    `,
    `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
     <button class="btn btn-primary" onclick="UsersPage.saveUser(${id||'null'})">Guardar</button>`);
  },

  async saveUser(id) {
    const fullName = document.getElementById('uFullName').value.trim();
    const role = document.getElementById('uRole').value;

    if (!fullName) { Toast.show('Ingrese el nombre completo', 'warning'); return; }

    try {
      if (id) {
        // Actualización
        const isActive = document.getElementById('uIsActive').value === 'true';
        await API.put(`/api/auth/users/${id}`, {
          full_name: fullName,
          role: role,
          is_active: isActive
        });
        Toast.show('Usuario actualizado con éxito', 'success');
      } else {
        // Creación
        const username = document.getElementById('uUsername').value.trim();
        const password = document.getElementById('uPassword').value;
        if (!username) { Toast.show('Ingrese un nombre de usuario', 'warning'); return; }
        if (!password || password.length < 4) { Toast.show('La contraseña debe tener al menos 4 caracteres', 'warning'); return; }

        await API.post('/api/auth/users', {
          username: username,
          password: password,
          full_name: fullName,
          role: role
        });
        Toast.show('Usuario creado con éxito', 'success');
      }
      Modal.close();
      this.loadTable();
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  openChangePassword(id, username) {
    Modal.open(`Cambiar Contraseña - ${username}`, `
      <p style="color:var(--text-2);font-size:.875rem;margin-bottom:14px">Ingrese la nueva contraseña para la cuenta del sistema <strong>${username}</strong>.</p>
      <div class="field">
        <label>Nueva Contraseña</label>
        <input id="newPassword" type="password" placeholder="Mínimo 4 caracteres" />
      </div>
    `,
    `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
     <button class="btn btn-primary" onclick="UsersPage.savePassword(${id})">Cambiar Contraseña</button>`);
  },

  async savePassword(id) {
    const password = document.getElementById('newPassword').value;
    if (!password || password.length < 4) { Toast.show('La contraseña debe tener al menos 4 caracteres', 'warning'); return; }

    try {
      await API.put(`/api/auth/users/${id}`, { password: password });
      Toast.show('Contraseña actualizada correctamente', 'success');
      Modal.close();
    } catch(e) { Toast.show(e.message, 'error'); }
  },

  async deleteUser(id, username) {
    const currentUser = Auth.user();
    if (currentUser && currentUser.id === id) {
      Toast.show('No puedes eliminar tu propia cuenta de usuario', 'warning');
      return;
    }

    Modal.confirm(
      '¿Eliminar Usuario?',
      `¿Estás seguro de que deseas eliminar la cuenta de usuario <strong>${username}</strong>? Esta acción es irreversible y el usuario perderá el acceso de forma inmediata.`,
      async () => {
        try {
          await API.delete(`/api/auth/users/${id}`);
          Toast.show('Usuario del sistema eliminado con éxito', 'success');
          this.loadTable();
        } catch(e) {
          Toast.show(e.message || 'Error al eliminar usuario', 'error');
        }
      },
      'danger'
    );
  }
};
