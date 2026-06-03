import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Download, Eye, FileSpreadsheet, FileText, Printer, Search, Star, WalletCards } from 'lucide-react';

import AdminBreadcrumb from '../components/AdminBreadcrumb';
import { AdminSkeleton } from '../components/AdminLoading';
import AdminToast from '../components/AdminToast';
import AdminSidebar from '../components/AdminSidebar';
import discretLogo from '../assets/images/logo-discret.png';
import { ApiError, api, type Reporte, type Reserva, type TipoReporteApi, type Valoracion } from '../services/api';

import '../styles/adminSidebar.css';
import '../styles/reports.css';

type Report = {
  id: number;
  title: string;
  date: string;
  amount: string;
  reservations: number;
  occupancy: string;
  status: string;
};

type ReportFormat = 'pdf' | 'excel';

type RatingView = {
  id: number;
  rating: number;
  comment: string;
  reservation: string;
  room: string;
  checkout: string;
  sentAfter: string;
};

const reportFilters = ['Todos', 'Diarios', 'Semanales', 'Mensuales'];

const typeLabels: Record<TipoReporteApi, string> = {
  DIARIO: 'Reporte diario',
  SEMANAL: 'Reporte semanal',
  MENSUAL: 'Reporte mensual',
};

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(value);

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CL').format(date);
};

const getReservationIncome = (reservation: Reserva) => Number(reservation.habitacion?.precio ?? 0);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const mapReporte = (reporte: Reporte): Report => ({
  id: reporte.id_reporte,
  title: typeLabels[reporte.tipo],
  date: `${formatDate(reporte.fecha_inicio)} al ${formatDate(reporte.fecha_fin)}`,
  amount: formatCurrency(Number(reporte.total_ingresos)),
  reservations: reporte.total_reservas,
  occupancy: `${Number(reporte.ocupacion_promedio).toFixed(0)}%`,
  status: reporte.estado === 'GENERADO' ? 'Generado' : reporte.estado === 'PENDIENTE' ? 'Pendiente' : 'Error',
});

function ReportsPage() {
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewFormat, setPreviewFormat] = useState<ReportFormat>('pdf');
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<Reporte[]>([]);
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [ratings, setRatings] = useState<Valoracion[]>([]);

  const [reportType, setReportType] = useState('');
  const [reportFormat, setReportFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReports = () => {
    setIsLoading(true);

    Promise.all([
      api.listarReportes(),
      api.listarReservas(),
      api.listarValoraciones(),
    ])
      .then(([reportResponse, reservationResponse, ratingsResponse]) => {
        setReports(reportResponse.data);
        setReservations(reservationResponse.data);
        setRatings(ratingsResponse.data);
      })
      .catch(() => {
        setToastMessage('No se pudieron cargar los reportes.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const reportViews = useMemo(() => reports.map(mapReporte), [reports]);
  const totalIncome = reservations.reduce((total, reservation) => total + getReservationIncome(reservation), 0);
  const totalReservations = reservations.length;
  const occupiedRooms = reservations.filter((reservation) => ['confirmada', 'ocupada', 'finalizada'].includes(reservation.estado)).length;
  const occupancy = totalReservations > 0 ? Math.round((occupiedRooms / totalReservations) * 100) : 0;
  const clientRatings = useMemo<RatingView[]>(() => ratings
    .filter((ratingItem) => ratingItem.puntuacion)
    .map((ratingItem) => ({
      id: ratingItem.id,
      rating: ratingItem.puntuacion ?? 0,
      comment: ratingItem.comentario || 'Sin comentario adicional.',
      reservation: ratingItem.reserva?.codigo_reserva ?? `Reserva ${ratingItem.reserva_id}`,
      room: ratingItem.reserva?.habitacion?.nombre ?? ratingItem.reserva?.habitacion?.numero ?? 'Habitacion sin detalle',
      checkout: formatDateTime(ratingItem.reserva?.fecha_salida),
      sentAfter: ratingItem.respondida_at ? `Respondida ${formatDateTime(ratingItem.respondida_at)}` : 'Pendiente',
    })), [ratings]);
  const averageRating = clientRatings.length > 0
    ? (clientRatings.reduce((total, ratingItem) => total + ratingItem.rating, 0) / clientRatings.length).toFixed(1)
    : '0.0';

  const filteredReports = reportViews.filter((report) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch
      || report.title.toLowerCase().includes(normalizedSearch)
      || report.date.toLowerCase().includes(normalizedSearch)
      || report.amount.toLowerCase().includes(normalizedSearch)
      || report.status.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (activeFilter === 'Todos') {
      return true;
    }

    return report.title.toLowerCase().includes(activeFilter.slice(0, -1).toLowerCase());
  });

  const resetForm = () => {
    setReportType('');
    setReportFormat('');
    setStartDate('');
    setEndDate('');
    setModalMessage('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openReportPreview = (report: Report, format: ReportFormat = 'pdf') => {
    setPreviewReport(report);
    setPreviewFormat(format);
  };

  const getReportRows = (report: Report) => [
    ['Tipo de reporte', report.title],
    ['Periodo', report.date],
    ['Ingresos', report.amount],
    ['Reservas', String(report.reservations)],
    ['Ocupación promedio', report.occupancy],
    ['Valoración promedio', averageRating],
    ['Estado', report.status],
  ];

  const getReportLogoUrl = () => new URL(discretLogo, window.location.origin).href;

  const buildReportHtml = (report: Report, autoPrint = false) => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${report.title} - DISCRET</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
          header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ec4899; padding-bottom: 18px; margin-bottom: 24px; }
          img { width: 150px; height: auto; }
          h1 { margin: 0; font-size: 26px; color: #111827; }
          p { margin: 6px 0 0; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #dbe2ea; padding: 12px; text-align: left; font-size: 14px; }
          th { background: #111827; color: #fff; }
          .pink { color: #db2777; font-weight: 700; }
          .footer { margin-top: 26px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>${report.title}</h1>
            <p>Sistema de Reservas para Moteles</p>
          </div>
          <img src="${getReportLogoUrl()}" alt="DISCRET" />
        </header>

        <table>
          <tbody>
            ${getReportRows(report).map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}
          </tbody>
        </table>

        ${clientRatings.length > 0 ? `
          <h2 style="font-size: 18px; margin-top: 26px;">Valoraciones recientes</h2>
          <table>
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Habitacion</th>
                <th>Nota</th>
                <th>Comentario</th>
                <th>Salida</th>
              </tr>
            </thead>
            <tbody>
              ${clientRatings.slice(0, 8).map((item) => `
                <tr>
                  <td>${item.reservation}</td>
                  <td>${item.room}</td>
                  <td>${item.rating}/5</td>
                  <td>${item.comment}</td>
                  <td>${item.checkout}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">© 2026 Sistema de Reservas para Moteles · DISCRET</div>
        ${autoPrint ? `
          <script>
            window.addEventListener("load", async () => {
              const images = Array.from(document.images);
              await Promise.all(images.map((image) => {
                if (image.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  image.onload = resolve;
                  image.onerror = resolve;
                });
              }));
              setTimeout(() => window.print(), 350);
            });
          </script>
        ` : ''}
      </body>
    </html>
  `;

  const downloadExcelReport = (report: Report) => {
    const blob = new Blob([buildReportHtml(report)], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}-discret.xls`;
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage('Reporte Excel descargado correctamente.');
  };

  const downloadPdfReport = (report: Report) => {
    const blob = new Blob([buildReportHtml(report, true)], {
      type: 'text/html;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      URL.revokeObjectURL(url);
      setToastMessage('Permite ventanas emergentes para generar el PDF.');
      return;
    }

    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setToastMessage('Vista PDF abierta. En la ventana de impresión elige Guardar como PDF.');
  };

  const downloadPreviewReport = () => {
    if (!previewReport) {
      return;
    }

    if (previewFormat === 'excel') {
      downloadExcelReport(previewReport);
      return;
    }

    downloadPdfReport(previewReport);
  };

  const handleGenerateReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reportType || !reportFormat || !startDate || !endDate) {
      setModalMessage('Completa tipo, fechas y formato antes de continuar.');
      return;
    }

    try {
      const createdReport = await api.crearReporte({
        tipo: reportType as TipoReporteApi,
        fecha_inicio: startDate,
        fecha_fin: endDate,
      });
      const reportView = mapReporte(createdReport);

      setReports((currentReports) => [createdReport, ...currentReports]);
      setModalMessage('');
      setShowModal(false);
      openReportPreview(reportView, reportFormat as ReportFormat);
      resetForm();
      setToastMessage('Reporte generado y guardado correctamente.');
    } catch (error) {
      const message = error instanceof ApiError
        ? Object.values(error.errors ?? {}).flat()[0] ?? error.message
        : 'No se pudo generar el reporte.';

      setModalMessage(message);
    }
  };

  return (
    <>
      <AdminSidebar active="reportes" />
      <main className="reports-page">
        <header className="reports-top">
          <div>
            <AdminBreadcrumb current="Reportes" />
            <h1>Reportes</h1>
            <p>Resumen de ingresos, reservas y actividad del motel</p>
          </div>

          <div className="reports-top-actions">
            <div className="reports-search">
              <Search size={18} strokeWidth={2.4} />
              <input
                type="text"
                placeholder="Buscar reporte..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setModalMessage('');
                setShowModal(true);
              }}
            >
              + Generar reporte
            </button>
          </div>
        </header>

        {isLoading ? (
          <AdminSkeleton variant="summary" count={5} label="Cargando resumen de reportes" />
        ) : (
          <>
            <section className="reports-summary">
              <article>
                <span className="reports-summary-icon pink">
                  <WalletCards size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{formatCurrency(totalIncome)}</strong>
                  <p>Ingresos del mes</p>
                </div>
              </article>

              <article>
                <span className="reports-summary-icon blue">
                  <CalendarDays size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{totalReservations}</strong>
                  <p>Reservas del mes</p>
                </div>
              </article>

              <article>
                <span className="reports-summary-icon soft">
                  <BarChart3 size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{occupancy}%</strong>
                  <p>Ocupación promedio</p>
                </div>
              </article>

              <article>
                <span className="reports-summary-icon green">
                  <FileText size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{reports.length}</strong>
                  <p>Reportes generados</p>
                </div>
              </article>

              <article>
                <span className="reports-summary-icon pink">
                  <Star size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{averageRating}</strong>
                  <p>Valoración promedio</p>
                </div>
              </article>
            </section>

            <section className="reports-filters">
              {reportFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={activeFilter === filter ? 'active' : ''}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </section>
          </>
        )}

        <section className="reports-list" aria-busy={isLoading}>
          {isLoading && (
            <AdminSkeleton variant="card" count={3} label="Cargando reportes" />
          )}

          {!isLoading && filteredReports.map((report) => (
            <article
              className={`report-card ${report.status.toLowerCase()}`}
              key={report.id}
            >
              <div className="report-icon">
                <FileText size={22} strokeWidth={2.4} />
              </div>

              <div className="report-info">
                <h2>{report.title}</h2>
                <p>Fecha: {report.date}</p>
              </div>

              <div>
                <strong>{report.amount}</strong>
                <p>Ingresos</p>
              </div>

              <div>
                <strong>{report.reservations}</strong>
                <p>Reservas</p>
              </div>

              <span className={`report-status ${report.status.toLowerCase()}`}>
                {report.status}
              </span>

              <div className="report-actions">
                <button type="button" onClick={() => openReportPreview(report, 'pdf')}>
                  <Eye size={15} />
                  Ver
                </button>
                <button type="button" onClick={() => openReportPreview(report, 'excel')}>
                  <Download size={15} />
                  Descargar
                </button>
              </div>
            </article>
          ))}

          {!isLoading && filteredReports.length === 0 && (
            <div className="admin-empty-state">
              <div>
                <strong>No hay reportes para mostrar</strong>
                <p>Genera un reporte para guardar el resumen en la base de datos.</p>
              </div>
            </div>
          )}
        </section>

        {!isLoading && (
          <section className="reports-ratings-section">
            <div className="reports-ratings-heading">
              <div>
                <p>Valoraciones clientes</p>
                <h2>Opiniones post-salida</h2>
              </div>
              <span>Envío automático 30 minutos después de la salida</span>
            </div>

            {clientRatings.length > 0 ? (
              <div className="reports-ratings-grid">
                {clientRatings.slice(0, 6).map((ratingItem) => (
                  <article key={ratingItem.id} className="reports-rating-card">
                    <div className="reports-rating-stars" aria-label={`${ratingItem.rating} de 5 estrellas`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          strokeWidth={2.4}
                          className={star <= ratingItem.rating ? 'is-active' : ''}
                        />
                      ))}
                    </div>

                    <p>{ratingItem.comment}</p>

                    <div className="reports-rating-meta">
                      <span>{ratingItem.reservation}</span>
                      <span>{ratingItem.room}</span>
                      <span>Salida {ratingItem.checkout}</span>
                      <span>{ratingItem.sentAfter}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">
                <div>
                  <strong>Aún no hay valoraciones respondidas</strong>
                  <p>Cuando un cliente responda el enlace post-salida, aparecerá aquí y en el reporte.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {showModal && (
          <div className="report-modal-overlay">
            <div className="report-modal">
              <button
                type="button"
                className="report-modal-close"
                onClick={handleCloseModal}
              >
                ×
              </button>

              <h2>Generar reporte</h2>
              <p>Selecciona los datos para crear un nuevo reporte.</p>

              <form onSubmit={handleGenerateReport}>
                {modalMessage && (
                  <p className="admin-modal-message">
                    {modalMessage}
                  </p>
                )}

                <label>
                  Tipo de reporte
                  <select
                    required
                    value={reportType}
                    onChange={(event) => setReportType(event.target.value)}
                  >
                    <option value="" disabled>
                      Seleccionar tipo de reporte
                    </option>
                    <option value="DIARIO">Reporte diario</option>
                    <option value="SEMANAL">Reporte semanal</option>
                    <option value="MENSUAL">Reporte mensual</option>
                  </select>
                </label>

                <label>
                  Fecha de inicio
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>

                <label>
                  Fecha de término
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>

                <label>
                  Formato
                  <select
                    required
                    value={reportFormat}
                    onChange={(event) => setReportFormat(event.target.value)}
                  >
                    <option value="" disabled>
                      Seleccionar formato
                    </option>
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                  </select>
                </label>

                <div className="report-modal-actions">
                  <button type="button" onClick={handleCloseModal}>
                    Cancelar
                  </button>

                  <button type="submit">
                    Generar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {previewReport && (
          <div className="report-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
            <section className="report-preview-modal">
              <div className="report-preview-header">
                <div>
                  <p>Vista previa</p>
                  <h2 id="report-preview-title">{previewReport.title}</h2>
                </div>

                <button type="button" aria-label="Cerrar vista previa" onClick={() => setPreviewReport(null)}>
                  ×
                </button>
              </div>

              <div className="report-preview-format" aria-label="Formato de descarga">
                <button
                  type="button"
                  className={previewFormat === 'pdf' ? 'active' : ''}
                  onClick={() => setPreviewFormat('pdf')}
                >
                  <Printer size={16} />
                  PDF
                </button>
                <button
                  type="button"
                  className={previewFormat === 'excel' ? 'active' : ''}
                  onClick={() => setPreviewFormat('excel')}
                >
                  <FileSpreadsheet size={16} />
                  Excel
                </button>
              </div>

              <article className="report-preview-sheet">
                <header>
                  <div>
                    <h3>{previewReport.title}</h3>
                    <p>Sistema de Reservas para Moteles</p>
                  </div>
                  <img src={discretLogo} alt="DISCRET" />
                </header>

                <div className="report-preview-summary">
                  {getReportRows(previewReport).map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                {clientRatings.length > 0 && (
                  <div className="report-preview-table">
                    <h4>Valoraciones recientes</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Reserva</th>
                          <th>Habitación</th>
                          <th>Nota</th>
                          <th>Comentario</th>
                          <th>Salida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientRatings.slice(0, 8).map((item) => (
                          <tr key={item.id}>
                            <td>{item.reservation}</td>
                            <td>{item.room}</td>
                            <td>{item.rating}/5</td>
                            <td>{item.comment}</td>
                            <td>{item.checkout}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <div className="report-preview-actions">
                <button type="button" onClick={() => setPreviewReport(null)}>
                  Cancelar
                </button>
                <button type="button" onClick={downloadPreviewReport}>
                  {previewFormat === 'excel' ? <FileSpreadsheet size={17} /> : <Printer size={17} />}
                  {previewFormat === 'excel' ? 'Descargar Excel' : 'Emitir PDF'}
                </button>
              </div>
            </section>
          </div>
        )}

        <AdminToast
          message={toastMessage}
          onClose={() => setToastMessage('')}
        />
      </main>
    </>
  );
}

export default ReportsPage;
