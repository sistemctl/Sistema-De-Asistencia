const AuditPage = {
    render: function(containerId = "pageContent") {
    const content = document.getElementById(containerId);
    if (!content) return;
    const isSubTab = containerId !== "pageContent";

    content.innerHTML = `
        ${!isSubTab ? `
        <div class="page-header">
            <div class="header-left">
                <h2>Auditoría del Sistema</h2>
                <p class="subtitle">Historial de acciones y cambios realizados por administradores.</p>
            </div>
            <div class="header-actions" style="display:flex; gap:10px;">
                <button class="btn btn-outline" id="btnExportAudit">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Exportar CSV
                </button>
                <button class="btn btn-outline" id="btnRefreshAudit">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Actualizar
                </button>
            </div>
        </div>
        ` : `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; margin-top: 10px;">
            <div style="font-weight: 700; font-size: 1.05rem; color: var(--accent);">Historial de Cambios y Seguridad</div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" id="btnExportAudit">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Exportar
                </button>
                <button class="btn btn-outline btn-sm" id="btnRefreshAudit">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="vertical-align:middle; margin-right:4px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Actualizar
                </button>
            </div>
        </div>
        `}

        <div class="card" style="margin-bottom: 24px; padding: 16px 20px;">
            <div class="filters-row" style="display:flex; gap:16px; align-items:flex-end;">
                <div class="field" style="margin-bottom: 0;">
                    <label style="margin-bottom: 6px; font-weight: 600; font-size: 0.8rem; color: var(--text-2);">Filtrar por Acción</label>
                    <select id="filterAuditAction" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); font-size: 0.85rem; width: 200px;">
                        <option value="">Todas</option>
                        <option value="CREATE">Creaciones (CREATE)</option>
                        <option value="UPDATE">Actualizaciones (UPDATE)</option>
                        <option value="DELETE">Eliminaciones (DELETE)</option>
                    </select>
                </div>
                <div class="field" style="margin-bottom: 0;">
                    <label style="margin-bottom: 6px; font-weight: 600; font-size: 0.8rem; color: var(--text-2);">Módulo</label>
                    <select id="filterAuditEntity" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-1); font-size: 0.85rem; width: 200px;">
                        <option value="">Todos</option>
                        <option value="Employee">Empleados</option>
                        <option value="SystemConfig">Configuración</option>
                        <option value="Schedule">Horarios</option>
                        <option value="Department">Departamentos</option>
                        <option value="Position">Cargos</option>
                    </select>
                </div>
                <button class="btn btn-primary" id="btnApplyAuditFilters" style="height:38px;">Filtrar</button>
            </div>
        </div>

        <div class="card" style="padding:0; overflow:hidden;">
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha y Hora</th>
                            <th>Usuario (Admin)</th>
                            <th>Acción</th>
                            <th>Módulo / Entidad</th>
                            <th>Detalles</th>
                        </tr>
                    </thead>
                    <tbody id="auditTableBody">
                        <tr><td colspan="5" class="empty-state">Cargando registros...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Paginación -->
            <div class="pagination" id="auditPagination" style="padding: 16px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: none;">
                <span class="pagination-info" id="auditPageInfo">Mostrando 0 - 0 de 0</span>
                <div class="pagination-btns" style="display: flex; gap: 8px;">
                    <button class="page-btn" id="btnAuditPrev" disabled>Anterior</button>
                    <button class="page-btn" id="btnAuditNext" disabled>Siguiente</button>
                </div>
            </div>
        </div>
    `;

    let currentPage = 1;

    async function loadAuditLogs(page = 1) {
        const tbody = document.getElementById("auditTableBody");
        const action = document.getElementById("filterAuditAction").value;
        const entity = document.getElementById("filterAuditEntity").value;
        
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="spinner"></div></td></tr>`;
        
        try {
            let url = `/api/audit?page=${page}&limit=20`;
            if (action) url += `&action=${action}`;
            if (entity) url += `&entity=${entity}`;

            const data = await API.get(url);
            
            if (!data.items || data.items.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state">
                            <div class="empty-illustration">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                            <p>No se encontraron registros de auditoría</p>
                        </td>
                    </tr>
                `;
                document.getElementById("auditPageInfo").textContent = "Mostrando 0 registros";
                document.getElementById("btnAuditPrev").disabled = true;
                document.getElementById("btnAuditNext").disabled = true;
                return;
            }

            tbody.innerHTML = "";
            data.items.forEach(log => {
                const tr = document.createElement("tr");
                
                // Formatear Fecha
                const dateObj = new Date(log.created_at);
                const dateStr = dateObj.toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" });
                const timeStr = dateObj.toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });

                // Badge Color for Action
                let actionColor = "var(--text-2)";
                let actionBg = "var(--surface-2)";
                if (log.action.includes("CREATE")) { actionColor = "#059669"; actionBg = "#d1fae5"; }
                if (log.action.includes("UPDATE")) { actionColor = "#0284c7"; actionBg = "#e0f2fe"; }
                if (log.action.includes("DELETE")) { actionColor = "#dc2626"; actionBg = "#fee2e2"; }

                tr.innerHTML = `
                    <td style="white-space: nowrap;">
                        <div style="font-weight: 500;">${dateStr}</div>
                        <div style="font-size: 0.8em; color: var(--text-2);">${timeStr}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${log.user ? log.user.full_name : 'Sistema'}</div>
                    </td>
                    <td>
                        <span style="display:inline-block; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: ${actionColor}; background: ${actionBg};">
                            ${log.action}
                        </span>
                    </td>
                    <td><span style="font-family: monospace; font-size: 0.85em; background: var(--bg-body); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">${log.entity}</span></td>
                    <td style="max-width: 300px;">
                        <div style="font-size: 0.9em; white-space: normal; line-height: 1.4; color: var(--text-1);">
                            ${log.details || '-'}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Pagination update
            currentPage = data.page;
            document.getElementById("auditPageInfo").textContent = `Mostrando página ${data.page} de ${data.pages} (Total: ${data.total})`;
            document.getElementById("btnAuditPrev").disabled = data.page <= 1;
            document.getElementById("btnAuditNext").disabled = data.page >= data.pages;

        } catch (error) {
            console.error("Error cargando auditoría:", error);
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:var(--error);">Error al cargar los registros.</td></tr>`;
        }
    }

    // Event Listeners
    document.getElementById("btnRefreshAudit").addEventListener("click", () => loadAuditLogs(currentPage));
    document.getElementById("btnApplyAuditFilters").addEventListener("click", () => loadAuditLogs(1));
    
    document.getElementById("btnExportAudit").addEventListener("click", () => {
        const action = document.getElementById("filterAuditAction").value;
        const entity = document.getElementById("filterAuditEntity").value;
        let url = `/api/audit/export?`;
        const params = [];
        if (action) params.push(`action=${action}`);
        if (entity) params.push(`entity=${entity}`);
        
        window.open(url + params.join('&'), '_blank');
    });

    document.getElementById("btnAuditPrev").addEventListener("click", () => {
        if (currentPage > 1) loadAuditLogs(currentPage - 1);
    });
    
    document.getElementById("btnAuditNext").addEventListener("click", () => {
        loadAuditLogs(currentPage + 1);
    });

    // Carga inicial
    loadAuditLogs(1);
    }
};
