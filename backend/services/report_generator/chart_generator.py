"""
Generador de gráficos estadísticos con Matplotlib para reportes de asistencia.
"""
import io
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from datetime import datetime
from typing import Optional

def _get_system_config() -> dict:
    """Obtiene la configuración de marca del sistema desde la base de datos."""
    from backend.database import SessionLocal
    from backend.models import SystemConfig
    db = SessionLocal()
    try:
        cfg = db.query(SystemConfig).first()
        if cfg:
            return {
                "system_name": cfg.system_name,
                "company_name": cfg.company_name,
                "logo_path": cfg.logo_path,
                "primary_color": cfg.primary_color,
                "accent_color": cfg.accent_color,
                "work_days": cfg.work_days,
                "time_format": cfg.time_format,
                "entry_tolerance_minutes": cfg.entry_tolerance_minutes
            }
    except Exception:
        pass
    finally:
        db.close()
    
    return {
        "system_name": "Control de Asistencia",
        "company_name": "Hikvision DS-K1T323MBWX",
        "logo_path": None,
        "primary_color": "#1e3a5f",
        "accent_color": "#00e676",
        "work_days": "1,2,3,4,5",
        "time_format": "24h",
        "entry_tolerance_minutes": 10
    }

def _generate_matplotlib_charts(summaries: list, granularity: str) -> tuple:
    """Genera gráficos de distribución y tendencia utilizando matplotlib y los retorna como BytesIO."""
    cfg = _get_system_config()
    primary_color = cfg.get("primary_color") or "#1e3a5f"

    # Executive pastel colors
    color_ontime = "#4ade80"      # soft green
    color_late = "#fbbf24"        # soft orange/yellow
    color_incomplete = "#f97316"  # soft orange
    color_absent = "#f87171"      # soft red

    # 1. Gráfico Doughnut (Distribución de asistencia)
    ontime = 0
    late = 0
    absent = 0
    incomplete = 0
    for s in summaries:
        if not s.get("is_present", False):
            absent += 1
        elif s.get("missing_punches", False):
            incomplete += 1
        elif s.get("is_late", False):
            late += 1
        else:
            ontime += 1

    labels = []
    sizes = []
    colors_list = []
    if ontime > 0:
        labels.append(f"A tiempo ({ontime})")
        sizes.append(ontime)
        colors_list.append(color_ontime)
    if late > 0:
        labels.append(f"Tardanza ({late})")
        sizes.append(late)
        colors_list.append(color_late)
    if incomplete > 0:
        labels.append(f"Incompleto ({incomplete})")
        sizes.append(incomplete)
        colors_list.append(color_incomplete)
    if absent > 0:
        labels.append(f"Ausente ({absent})")
        sizes.append(absent)
        colors_list.append(color_absent)

    if not sizes:
        labels.append("Sin registros")
        sizes.append(1)
        colors_list.append("#e2e8f0")

    fig, ax = plt.subplots(figsize=(1.8, 1.8), dpi=150)
    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels, autopct='%1.0f%%', startangle=90,
        colors=colors_list, textprops=dict(color="#1e293b", size=5.0, weight="bold"),
        wedgeprops=dict(width=0.35, edgecolor='white', linewidth=0.7)
    )
    plt.setp(autotexts, size=4.5, weight="bold", color="white")
    ax.set_title("Distribución de Estados", fontsize=6.5, weight="bold", color=primary_color, pad=8)
    fig.tight_layout()
    
    img_buf_1 = io.BytesIO()
    fig.savefig(img_buf_1, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig)
    img_buf_1.seek(0)

    # 2. Gráfico de Tendencia (Horas de entrada)
    dates = []
    entry_minutes = []
    
    sorted_summaries = sorted(summaries, key=lambda x: x.get("date", ""))
    
    for s in sorted_summaries:
        if s.get("is_present", False) and s.get("punches") and s["punches"].get("entry_1"):
            try:
                dt_obj = datetime.fromisoformat(s["punches"]["entry_1"])
                min_past_midnight = dt_obj.hour * 60 + dt_obj.minute
                d_str = dt_obj.strftime("%d/%m")
                dates.append(d_str)
                entry_minutes.append(min_past_midnight)
            except Exception:
                pass

    dates = dates[-12:]
    entry_minutes = entry_minutes[-12:]

    fig2, ax2 = plt.subplots(figsize=(3.2, 1.8), dpi=150)
    if entry_minutes and granularity == "daily":
        ax2.plot(dates, entry_minutes, marker='o', color=primary_color, linewidth=1.2, markersize=2.5, label='Entrada')
        ax2.fill_between(dates, entry_minutes, color=primary_color, alpha=0.06)
        
        def format_min_to_hm(x, pos):
            h = int(x // 60)
            m = int(x % 60)
            return f"{h:02d}:{m:02d}"
        
        from matplotlib.ticker import FuncFormatter
        ax2.yaxis.set_major_formatter(FuncFormatter(format_min_to_hm))
        ax2.axhline(y=480, color=color_absent, linestyle='--', linewidth=0.75, alpha=0.8, label='Límite (08:00)')
        ax2.legend(fontsize=5.0, loc='upper right', framealpha=0.9, edgecolor='#cbd5e1')
    else:
        msg = 'Tendencia disponible en vista Diaria' if granularity != "daily" else 'Sin entradas registradas'
        ax2.text(0.5, 0.5, msg, horizontalalignment='center', verticalalignment='center', transform=ax2.transAxes, color="#64748b", fontsize=6.5)

    ax2.set_title("Puntualidad en Entradas (Últimos 12 Días)", fontsize=6.5, weight="bold", color=primary_color, pad=8)
    ax2.tick_params(axis='both', which='major', labelsize=5.5, labelcolor="#475569")
    for label in ax2.get_xticklabels():
        label.set_rotation(30)
    ax2.grid(True, linestyle='--', alpha=0.4, color="#e2e8f0")
    for spine in ['top', 'right']:
        ax2.spines[spine].set_visible(False)
    ax2.spines['left'].set_color('#e2e8f0')
    ax2.spines['bottom'].set_color('#e2e8f0')
    
    fig2.tight_layout()

    img_buf_2 = io.BytesIO()
    fig2.savefig(img_buf_2, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig2)
    img_buf_2.seek(0)
    
    return img_buf_1, img_buf_2
