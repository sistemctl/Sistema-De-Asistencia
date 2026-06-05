/* holidays.js — Gestión de Días Festivos Colombianos y Personalizados */

const HolidaysPage = {
  currentYear: new Date().getFullYear(),

  async render() {
    const container = document.getElementById('paramContent');
    if (!container) return;

    const canEdit = Auth.isAdmin() || !!Auth.user()?.perm_manage_settings;

    container.innerHTML = `
      <div class="card" style="padding: 0; display: flex; flex-direction: column; overflow: hidden; margin: 0;">
        <!-- Cabecera -->
        <div style="padding: 16px 20px; background: var(--surface-1); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Días Festivos de Colombia
            </div>
            <div style="color: var(--text-3); font-size: 0.78rem; margin-top: 4px;">Configura los descansos oficiales del año calendario y crea días festivos empresariales</div>
          </div>
          
          <div style="display: flex; gap: 12px; align-items: center;">
            <select id="hYearSelect" style="padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1);">
              ${[2025, 2026, 2027, 2028].map(y => `<option value="${y}" ${y === this.currentYear ? 'selected' : ''}>Año ${y}</option>`).join('')}
            </select>
            ${canEdit ? `
            <button class="btn btn-primary" id="btnNewHoliday" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.82rem;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nuevo Festivo
            </button>
            ` : ''}
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 150px;">Fecha</th>
                <th>Festividad / Nombre</th>
                <th style="width: 150px; text-align: center;">Origen</th>
                <th style="width: 150px; text-align: center;">¿Es día libre?</th>
                ${canEdit ? `<th style="width: 100px; text-align: center;">Acciones</th>` : ''}
              </tr>
            </thead>
            <tbody id="holidaysTable">
              <tr>
                <td colspan="${canEdit ? 5 : 4}"><div class="skeleton sk-text w-100"></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('hYearSelect')?.addEventListener('change', (e) => {
      this.currentYear = parseInt(e.target.value);
      this.loadTable();
    });

    if (canEdit) {
      document.getElementById('btnNewHoliday')?.addEventListener('click', () => this.openForm());
    }

    await this.loadTable();
  },

  async loadTable() {
    try {
      const holidays = await API.get(`/api/holidays?year=${this.currentYear}`);
      const tbody = document.getElementById('holidaysTable');
      if (!tbody) return;

      const canEdit = Auth.isAdmin() || !!Auth.user()?.perm_manage_settings;

      if (!holidays || holidays.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${canEdit ? 5 : 4}"><div class="empty-state"><h3>Sin días festivos registrados</h3></div></td></tr>`;
        return;
      }

      tbody.innerHTML = holidays.map(h => {
        const formattedDate = new Date(h.date + 'T00:00:00').toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });

        const originBadge = h.is_custom 
          ? '<span class="badge badge-yellow">Personalizado</span>' 
          : '<span class="badge badge-gray">Nacional (Colombia)</span>';

        const toggleSwitch = `
          <label class="switch-container" style="display: inline-flex; align-items: center; justify-content: center; cursor: ${canEdit ? 'pointer' : 'not-allowed'};">
            <input type="checkbox" class="h-active-toggle" data-id="${h.id}" ${h.is_active ? 'checked' : ''} ${canEdit ? '' : 'disabled'} style="display:none;" />
            <div class="switch-slider ${h.is_active ? 'active' : ''}" style="width:34px; height:20px; background:${h.is_active ? 'var(--accent)' : 'var(--border)'}; border-radius:10px; position:relative; transition: background 0.2s;">
              <div class="switch-dot" style="width:14px; height:14px; background:#fff; border-radius:50%; position:absolute; top:3px; left:${h.is_active ? '17px' : '3px'}; transition: left 0.2s;"></div>
            </div>
          </label>
        `;

        const deleteButton = h.is_custom
          ? `<button class="btn btn-icon btn-sm btn-danger" onclick="HolidaysPage.deleteHoliday(${h.id}, '${h.name}')" title="Eliminar Festivo Personalizado">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--danger);"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
             </button>`
          : '-';

        return `
          <tr>
            <td style="font-weight: 600; text-transform: capitalize;">${formattedDate}</td>
            <td>
              <div style="font-weight:600; color:var(--text-1);">${h.name}</div>
              <div style="font-size:0.75rem; color:var(--text-3); margin-top:2px;">${h.date}</div>
            </td>
            <td style="text-align: center;">${originBadge}</td>
            <td style="text-align: center;">${toggleSwitch}</td>
            ${canEdit ? `<td style="text-align: center;">${deleteButton}</td>` : ''}
          </tr>
        `;
      }).join('');

      // Agregar eventos a los toggles
      if (canEdit) {
        document.querySelectorAll('.h-active-toggle').forEach(checkbox => {
          checkbox.closest('.switch-container').addEventListener('click', async (e) => {
            e.preventDefault();
            const id = checkbox.dataset.id;
            const newStatus = !checkbox.checked;
            try {
              await API.put(`/api/holidays/${id}`, { is_active: newStatus });
              Toast.show('Estado de festivo actualizado con éxito', 'success');
              this.loadTable();
            } catch(err) {
              Toast.show(err.message, 'error');
            }
          });
        });
      }

    } catch(e) {
      Toast.show('Error al cargar la tabla de días festivos', 'error');
    }
  },

  openForm() {
    Modal.open('Nuevo Día Festivo Personalizado', `
      <div class="field">
        <label>Nombre del Festivo / Evento</label>
        <input id="hName" placeholder="Ej. Aniversario de la Empresa" />
      </div>
      <div class="field">
        <label>Fecha</label>
        <input id="hDate" type="date" value="${this.currentYear}-01-01" />
      </div>
    `,
    `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
     <button class="btn btn-primary" onclick="HolidaysPage.saveHoliday()">Guardar</button>`);
  },

  async saveHoliday() {
    const name = document.getElementById('hName').value.trim();
    const dateVal = document.getElementById('hDate').value;

    if (!name) { Toast.show('Ingrese el nombre del festivo', 'warning'); return; }
    if (!dateVal) { Toast.show('Ingrese la fecha', 'warning'); return; }

    try {
      await API.post('/api/holidays', {
        date: dateVal,
        name: name,
        is_active: true
      });
      Toast.show('Día festivo personalizado creado con éxito', 'success');
      Modal.close();
      this.loadTable();
    } catch(e) {
      Toast.show(e.message, 'error');
    }
  },

  deleteHoliday(id, name) {
    Modal.confirm(
      '¿Eliminar Festivo Personalizado?',
      `¿Estás seguro de que deseas eliminar el día festivo <strong>${name}</strong>? Esta acción quitará la regla de descanso para esa fecha y restablecerá los cálculos normales de asistencia.`,
      async () => {
        try {
          await API.delete(`/api/holidays/${id}`);
          Toast.show('Día festivo personalizado eliminado con éxito', 'success');
          this.loadTable();
        } catch(e) {
          Toast.show(e.message || 'Error al eliminar festivo', 'error');
        }
      },
      'danger'
    );
  }
};


window.HolidaysPage = HolidaysPage;
