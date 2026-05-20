/* reports.js — Exportación de reportes */

const ReportsPage = {
  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header"><div class="section-title">Reportes</div></div>
      <div class="grid-3">

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--success)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Exportar Excel
              </div>
              <div class="card-sub">Formato .xlsx compatible con Excel</div>
            </div>
          </div>
          <div class="field"><label>Desde</label><input type="date" id="xlFrom" /></div>
          <div class="field"><label>Hasta</label><input type="date" id="xlTo" /></div>
          <div style="margin-top:12px">
            <button class="btn btn-success" style="width:100%" onclick="ReportsPage.exportExcel()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Descargar Excel
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--accent)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Exportar PDF
              </div>
              <div class="card-sub">Reporte en formato PDF imprimible</div>
            </div>
          </div>
          <div class="field"><label>Desde</label><input type="date" id="pdfFrom" /></div>
          <div class="field"><label>Hasta</label><input type="date" id="pdfTo" /></div>
          <div style="margin-top:12px">
            <button class="btn btn-primary" style="width:100%" onclick="ReportsPage.exportPDF()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Descargar PDF
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--success)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Consolidado Diario
              </div>
              <div class="card-sub">Una sola fila por día (Entrada y Salida)</div>
            </div>
          </div>
          <div class="field"><label>Desde</label><input type="date" id="consFrom" /></div>
          <div class="field"><label>Hasta</label><input type="date" id="consTo" /></div>
          <div style="margin-top:12px">
            <button class="btn btn-success" style="width:100%" onclick="ReportsPage.exportConsolidated()">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Consolidado Excel
            </button>
          </div>
        </div>

      </div>

      <div class="card" style="margin-top:24px">
        <div class="card-header">
          <div class="card-title">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Información
          </div>
        </div>
        <p style="color:var(--text-2);font-size:.875rem;line-height:1.7">
          Los reportes incluyen todos los registros de asistencia dentro del rango de fechas seleccionado.<br>
          Si no seleccionas fechas, se exportarán <strong>todos los registros</strong>.<br>
          El archivo se descargará automáticamente.
        </p>
      </div>`;

    // Fecha por defecto: primer día del mes actual hasta hoy
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    ['xlFrom','pdfFrom','consFrom'].forEach(id => document.getElementById(id).value = firstDay);
    ['xlTo','pdfTo','consTo'].forEach(id => document.getElementById(id).value = todayStr);
  },

  download(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.click();
  },

  buildParams(fromId, toId) {
    const p = new URLSearchParams();
    const f = document.getElementById(fromId).value;
    const t = document.getElementById(toId).value;
    if (f) p.set('date_from', f);
    if (t) p.set('date_to', t);
    return p.toString() ? `?${p}` : '';
  },

  exportExcel() {
    const token = API.token();
    const params = this.buildParams('xlFrom', 'xlTo');
    fetch(`/api/reports/excel${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `asistencia_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
        Toast.show('Excel descargado', 'success');
      })
      .catch(() => Toast.show('Error generando Excel', 'error'));
  },

  exportPDF() {
    const token = API.token();
    const params = this.buildParams('pdfFrom', 'pdfTo');
    fetch(`/api/reports/pdf${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `asistencia_${new Date().toISOString().split('T')[0]}.pdf`; a.click();
        Toast.show('PDF descargado', 'success');
      })
      .catch(() => Toast.show('Error generando PDF', 'error'));
  },

  exportConsolidated() {
    const token = API.token();
    const params = this.buildParams('consFrom', 'consTo');
    fetch(`/api/reports/consolidated${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `consolidado_asistencia_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
        Toast.show('Consolidado descargado', 'success');
      })
      .catch(() => Toast.show('Error generando Consolidado', 'error'));
  },
};
