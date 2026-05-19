/* reports.js — Exportación de reportes */

const ReportsPage = {
  async render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="section-header"><div class="section-title">Reportes</div></div>
      <div class="grid-3">

        <div class="card">
          <div class="card-header">
            <div><div class="card-title">📊 Exportar Excel</div><div class="card-sub">Formato .xlsx compatible con Excel</div></div>
          </div>
          <div class="field"><label>Desde</label><input type="date" id="xlFrom" /></div>
          <div class="field"><label>Hasta</label><input type="date" id="xlTo" /></div>
          <div style="margin-top:8px">
            <button class="btn btn-success" style="width:100%" onclick="ReportsPage.exportExcel()">⬇ Descargar Excel</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div><div class="card-title">📄 Exportar PDF</div><div class="card-sub">Reporte en formato PDF imprimible</div></div>
          </div>
          <div class="field"><label>Desde</label><input type="date" id="pdfFrom" /></div>
          <div class="field"><label>Hasta</label><input type="date" id="pdfTo" /></div>
          <div style="margin-top:8px">
            <button class="btn btn-primary" style="width:100%" onclick="ReportsPage.exportPDF()">⬇ Descargar PDF</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div><div class="card-title">📅 Consolidado Diario</div><div class="card-sub">Una sola fila por día (Entrada y Salida)</div></div>
          </div>
          <div class="field"><label>Desde</label><input type="date" id="consFrom" /></div>
          <div class="field"><label>Hasta</label><input type="date" id="consTo" /></div>
          <div style="margin-top:8px">
            <button class="btn btn-success" style="width:100%" onclick="ReportsPage.exportConsolidated()">⬇ Consolidado Excel</button>
          </div>
        </div>

      </div>

      <div class="card" style="margin-top:20px">
        <div class="card-header"><div class="card-title">ℹ️ Información</div></div>
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
    // Usamos fetch para adjuntar el token y luego crear blob
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
