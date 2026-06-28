/* reports_export.js — Reports Export sub-module (Excel, PDF Async, Consolidated, Column Selection) */

const ReportsExport = {
  toggleExportMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('repExportMenu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  },

  closeExportMenu() {
    const menu = document.getElementById('repExportMenu');
    if (menu) {
      menu.style.display = 'none';
    }
  },

  openColumnSelector(title, onConfirm) {
    const html = `
      <div style="padding: 10px 15px; text-align: left;">
        <p style="font-weight: 600; font-size: 0.95rem; color: var(--text-1); margin-bottom: 16px; line-height: 1.4;">
          Personaliza tu reporte seleccionando las columnas que deseas incluir:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_period" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>📅 Fecha / Período</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_employee_code" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>🔑 Código de Empleado</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_employee_name" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>👤 Nombre Completo</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_department" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>🏢 Departamento</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_schedule" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>🕒 Horario Asignado</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_punches" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>📟 Marcaciones (Punches)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-2); cursor: pointer;">
            <input type="checkbox" id="col_status" checked style="width: 18px; height: 18px; accent-color: var(--accent);" />
            <span>📊 Estado / Asistencia</span>
          </label>
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; gap: 10px; width: 100%;">
        <button class="btn btn-secondary" onclick="Modal.close()" style="flex: 1;">Cancelar</button>
        <button class="btn btn-primary" id="btnConfirmExport" style="flex: 1; font-weight: 600;">Generar Reporte</button>
      </div>
    `;

    Modal.open(title, html, footer);

    document.getElementById('btnConfirmExport').addEventListener('click', () => {
      const selected = [];
      ['period', 'employee_code', 'employee_name', 'department', 'schedule', 'punches', 'status'].forEach(key => {
        if (document.getElementById('col_' + key)?.checked) {
          selected.push(key);
        }
      });

      if (selected.length === 0) {
        Toast.show('Debes seleccionar al menos una columna', 'warning');
        return;
      }

      Modal.close();
      onConfirm(selected.join(','));
    });
  },

  getExportFilename(extension, prefix = 'Reporte') {
    const filterInput = document.getElementById('recFilterEntityInput');
    let namePart = 'Todos';
    if (filterInput && filterInput.value.trim() && !filterInput.value.includes('Todos')) {
      let rawName = filterInput.value.split('(')[0].trim();
      namePart = rawName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').trim().replace(/\s+/g, '_');
    }
    const { date_from, date_to } = ReportsPage.getDates('recDateRange');
    let datePart = '';
    if (date_from && date_to) {
      datePart = `_${date_from}_a_${date_to}`;
    } else if (date_from) {
      datePart = `_desde_${date_from}`;
    } else {
      datePart = `_${new Date().toISOString().split('T')[0]}`;
    }
    return `${prefix}_${namePart}${datePart}.${extension}`;
  },

  exportReport(format) {
    let title = 'Exportar PDF Imprimible';
    if (format === 'excel') title = 'Exportar Excel Detallado';
    if (format === 'csv') title = 'Exportar CSV Delimitado';
    
    this.openColumnSelector(title, (columns) => {
      this.executeExportReport(format, columns);
    });
  },

  exportConsolidated() {
    this.openColumnSelector('Exportar Consolidado Diario', (columns) => {
      this.executeExportConsolidated(columns);
    });
  },

  executeExportReport(format, columns) {
    const token = API.token();
    const filterVal = document.getElementById('recFilterEntity')?.value || '';
    const repGranularity = document.getElementById('recGranularity').value;
    const { date_from, date_to } = ReportsPage.getDates('recDateRange');
    
    const params = new URLSearchParams({
      granularity: repGranularity,
      export: format
    });

    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);
    if (columns) params.set('columns', columns);

    if (filterVal) params.set('employee_id', filterVal);
    
    const deptId = document.getElementById('recFilterDepartment')?.value;
    const posId = document.getElementById('recFilterPosition')?.value;
    const schedId = document.getElementById('recFilterSchedule')?.value;
    if (deptId) params.set('department_id', deptId);
    if (posId) params.set('position_id', posId);
    if (schedId) params.set('schedule_id', schedId);

    if (format === 'excel' || format === 'csv') {
      const isCsv = format === 'csv';
      const toastMsg = isCsv ? 'Generando reporte CSV...' : 'Generando reporte EXCEL...';
      const successMsg = isCsv ? 'Reporte CSV descargado con éxito' : 'Reporte EXCEL descargado con éxito';
      const errorMsg = isCsv ? 'Error al generar reporte CSV' : 'Error al generar reporte EXCEL';
      const ext = isCsv ? 'csv' : 'xlsx';

      Toast.show(toastMsg, 'info');
      fetch(`/api/reports/report?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error();
          return r.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.getExportFilename(ext, 'Reporte');
          a.click();
          Toast.show(successMsg, 'success');
        })
        .catch(() => Toast.show(errorMsg, 'error'));
      return;
    }

    // PDF Asíncrono
    Toast.show('Iniciando generación de PDF...', 'info');
    params.delete('export');

    fetch(`/api/reports/report/async?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Error al iniciar generación de reporte');
        return r.json();
      })
      .then(data => {
        const taskId = data.task_id;
        
        Modal.open(
          'Generando Reporte PDF',
          `
          <div style="text-align: center; padding: 15px 10px;">
            <p style="font-weight: 600; font-size: 1rem; color: #1e293b; margin-bottom: 8px;">
              Generando reporte de asistencia con gráficos individuales...
            </p>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 20px;">
              Esto puede demorar unos segundos. Por favor, no cierre esta ventana.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 9999px; height: 10px; width: 100%; overflow: hidden; margin-bottom: 12px; border: 1px solid #e2e8f0;">
              <div id="reportProgressBar" style="background-color: var(--accent, #1a5cff); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <div id="reportProgressPercent" style="font-weight: 700; font-size: 1.1rem; color: #1e293b;">0%</div>
          </div>
          `,
          `
          <button class="btn btn-secondary" id="cancelReportBtn" style="width: 100%; background: #64748b; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">Cancelar</button>
          `
        );

        const closeBtn = document.getElementById('modalClose');
        if (closeBtn) closeBtn.style.display = 'none';

        let isPolling = true;
        const pollInterval = setInterval(() => {
          if (!isPolling) return;

          fetch(`/api/reports/report/status/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(statusData => {
              if (statusData.status === 'processing') {
                const progress = statusData.progress || 0;
                const bar = document.getElementById('reportProgressBar');
                const pct = document.getElementById('reportProgressPercent');
                if (bar) bar.style.width = `${progress}%`;
                if (pct) pct.textContent = `${progress}%`;
              } else if (statusData.status === 'completed') {
                isPolling = false;
                clearInterval(pollInterval);
                
                const bar = document.getElementById('reportProgressBar');
                const pct = document.getElementById('reportProgressPercent');
                if (bar) bar.style.width = '100%';
                if (pct) pct.textContent = '100% - Descargando...';

                setTimeout(() => {
                  fetch(`/api/reports/report/download/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(res => {
                      if (!res.ok) throw new Error();
                      return res.blob();
                    })
                    .then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = this.getExportFilename('pdf', 'Reporte');
                      a.click();
                      
                      if (closeBtn) closeBtn.style.display = 'block';
                      Modal.close();
                      Toast.show('Reporte PDF descargado con éxito', 'success');
                    })
                    .catch(() => {
                      if (closeBtn) closeBtn.style.display = 'block';
                      Modal.close();
                      Toast.show('Error al descargar el archivo PDF', 'error');
                    });
                }, 500);

              } else if (statusData.status === 'failed' || statusData.status === 'not_found') {
                isPolling = false;
                clearInterval(pollInterval);
                if (closeBtn) closeBtn.style.display = 'block';
                Modal.close();
                Toast.show(`Falla al generar reporte: ${statusData.error || 'Desconocido'}`, 'error');
              }
            })
            .catch(() => {
              isPolling = false;
              clearInterval(pollInterval);
              if (closeBtn) closeBtn.style.display = 'block';
              Modal.close();
              Toast.show('Error de conexión al verificar estado del reporte', 'error');
            });
        }, 1500);

        const handleCancel = () => {
          isPolling = false;
          clearInterval(pollInterval);
          if (closeBtn) closeBtn.style.display = 'block';
          Modal.close();
          Toast.show('Generación de reporte cancelada', 'warning');
        };

        const cancelBtn = document.getElementById('cancelReportBtn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', handleCancel);
        }
      })
      .catch(err => {
        Toast.show(err.message || 'Error al solicitar reporte PDF', 'error');
      });
  },

  executeExportConsolidated(columns) {
    const token = API.token();
    const filterVal = document.getElementById('recFilterEntity')?.value || '';
    const { date_from, date_to } = ReportsPage.getDates('recDateRange');
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);
    if (columns) params.set('columns', columns);

    if (filterVal) params.set('employee_id', filterVal);

    const deptId = document.getElementById('recFilterDepartment')?.value;
    const posId = document.getElementById('recFilterPosition')?.value;
    const schedId = document.getElementById('recFilterSchedule')?.value;
    if (deptId) params.set('department_id', deptId);
    if (posId) params.set('position_id', posId);
    if (schedId) params.set('schedule_id', schedId);

    Toast.show('Generando consolidado diario...', 'info');

    fetch(`/api/reports/consolidated?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = this.getExportFilename('xlsx', 'Consolidado'); a.click();
        Toast.show('Reporte Consolidado descargado con éxito', 'success');
      })
      .catch(() => Toast.show('Error al generar Excel Consolidado', 'error'));
  }
};
