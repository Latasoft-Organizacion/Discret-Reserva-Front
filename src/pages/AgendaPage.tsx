import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Search, Sparkles, X } from 'lucide-react';

import AdminBreadcrumb from '../components/AdminBreadcrumb';
import { AdminSkeleton } from '../components/AdminLoading';
import AdminToast from '../components/AdminToast';
import AdminSidebar from '../components/AdminSidebar';
import { api, type Reserva } from '../services/api';

import '../styles/adminSidebar.css';
import '../styles/agenda.css';

type AgendaFilter = 'Hoy' | 'Reservas' | 'Limpieza' | 'Pendientes';

type AgendaItem = {
  id: string;
  reservaId?: number;
  date: string;
  hour: string;
  type: 'Reserva' | 'Limpieza';
  room: string;
  client: string;
  status: 'Confirmada' | 'Ocupada' | 'Pendiente' | 'Finalizada' | 'Cancelada';
  note?: string;
};

const agendaFilters: AgendaFilter[] = ['Hoy', 'Reservas', 'Limpieza', 'Pendientes'];

const statusLabels: Record<Reserva['estado'], AgendaItem['status']> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  ocupada: 'Ocupada',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

const toDateKey = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatHour = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const getClientName = (reservation: Reserva) => (
  reservation.nombre_cliente
  ?? (reservation.cliente ? `${reservation.cliente.nombre} ${reservation.cliente.apellido}`.trim() : null)
  ?? 'Cliente sin nombre'
);

const getRoomLabel = (reservation: Reserva) => {
  const roomNumber = reservation.habitacion?.numero ?? String(reservation.habitacion_id);
  const roomType = reservation.habitacion?.tipo_habitacion?.nombre ?? reservation.habitacion?.nombre;

  return roomType ? `${roomType} · Hab. ${roomNumber}` : `Hab. ${roomNumber}`;
};

const buildAgendaFromReservations = (reservations: Reserva[]): AgendaItem[] => (
  reservations.flatMap((reservation) => {
    const room = getRoomLabel(reservation);
    const client = getClientName(reservation);

    const items: AgendaItem[] = [
      {
        id: `reserva-${reservation.id}`,
        reservaId: reservation.id,
        date: toDateKey(reservation.fecha_entrada),
        hour: formatHour(reservation.fecha_entrada),
        type: 'Reserva',
        room,
        client,
        status: statusLabels[reservation.estado],
        note: reservation.comentario ?? undefined,
      },
      {
        id: `limpieza-${reservation.id}`,
        reservaId: reservation.id,
        date: toDateKey(reservation.fecha_salida),
        hour: formatHour(reservation.fecha_salida),
        type: 'Limpieza',
        room,
        client: 'Personal limpieza',
        status: reservation.estado === 'finalizada' ? 'Pendiente' : statusLabels[reservation.estado],
        note: 'Limpieza posterior a reserva',
      },
    ];

    return items;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.hour.localeCompare(b.hour))
);

function AgendaPage() {
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AgendaFilter>('Hoy');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [manualEvents, setManualEvents] = useState<AgendaItem[]>([]);

  const todayKey = toDateKey(new Date().toISOString());

  const loadAgenda = () => {
    setIsLoading(true);

    api.listarReservas()
      .then((response) => {
        setReservations(response.data);
      })
      .catch(() => {
        setToastMessage('No se pudo cargar la agenda desde las reservas.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAgenda();
  }, []);

  const agenda = useMemo(
    () => [...buildAgendaFromReservations(reservations), ...manualEvents]
      .sort((a, b) => a.date.localeCompare(b.date) || a.hour.localeCompare(b.hour)),
    [manualEvents, reservations],
  );

  const filteredAgenda = agenda.filter((item) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch
      || item.room.toLowerCase().includes(normalizedSearch)
      || item.client.toLowerCase().includes(normalizedSearch)
      || item.status.toLowerCase().includes(normalizedSearch)
      || item.type.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (activeFilter === 'Hoy') {
      return item.date === todayKey;
    }

    if (activeFilter === 'Reservas') {
      return item.type === 'Reserva';
    }

    if (activeFilter === 'Limpieza') {
      return item.type === 'Limpieza';
    }

    return item.status === 'Pendiente';
  });

  const todayCount = agenda.filter((item) => item.date === todayKey).length;
  const confirmedCount = agenda.filter((item) => item.status === 'Confirmada').length;
  const cleaningCount = agenda.filter((item) => item.type === 'Limpieza').length;
  const pendingCount = agenda.filter((item) => item.status === 'Pendiente').length;

  const handleSaveEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const hour = String(form.get('hour') ?? '');
    const type = String(form.get('type') ?? 'Reserva') as AgendaItem['type'];
    const room = String(form.get('room') ?? '');
    const client = String(form.get('client') ?? '');
    const status = String(form.get('status') ?? 'Pendiente') as AgendaItem['status'];
    const note = String(form.get('note') ?? '');

    if (!hour || !room || !client) {
      setToastMessage('Completa hora, habitación y responsable para crear el evento.');
      return;
    }

    setManualEvents((events) => [
      ...events,
      {
        id: `manual-${Date.now()}`,
        date: todayKey,
        hour,
        type,
        room,
        client,
        status,
        note,
      },
    ]);
    setShowModal(false);
    setToastMessage('Evento agregado a la agenda.');
  };

  return (
    <>
      <AdminSidebar active="agenda" />
      <main className="agenda-page">
        <header className="agenda-top">
          <div>
            <AdminBreadcrumb current="Agenda" />
            <h1>Agenda</h1>
            <p>Programación diaria de reservas y actividades</p>
          </div>

          <div className="agenda-top-actions">
            <div className="agenda-search">
              <Search size={18} strokeWidth={2.4} />

              <input
                type="text"
                placeholder="Buscar en agenda..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <button type="button" onClick={() => setShowModal(true)}>
              + Nuevo evento
            </button>
          </div>
        </header>

        {isLoading ? (
          <AdminSkeleton variant="summary" count={4} label="Cargando resumen de agenda" />
        ) : (
          <>
            <section className="agenda-summary">
              <article>
                <span className="agenda-summary-icon pink">
                  <CalendarDays size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{todayCount}</strong>
                  <p>Eventos hoy</p>
                </div>
              </article>

              <article>
                <span className="agenda-summary-icon green">
                  <CheckCircle2 size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{confirmedCount}</strong>
                  <p>Confirmados</p>
                </div>
              </article>

              <article>
                <span className="agenda-summary-icon soft">
                  <Sparkles size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{cleaningCount}</strong>
                  <p>Limpieza</p>
                </div>
              </article>

              <article>
                <span className="agenda-summary-icon blue">
                  <Clock3 size={22} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>{pendingCount}</strong>
                  <p>Pendientes</p>
                </div>
              </article>
            </section>

            <section className="agenda-filters">
              {agendaFilters.map((filter) => (
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

        <section className="agenda-list" aria-busy={isLoading}>
          {isLoading && (
            <AdminSkeleton variant="card" count={4} label="Cargando agenda" />
          )}

          {!isLoading && filteredAgenda.map((item) => (
            <article
              className={`agenda-card ${item.status.toLowerCase()}`}
              key={item.id}
            >
              <div className="agenda-hour">
                <strong>{item.hour}</strong>
                <p>{item.type}</p>
              </div>

              <div className="agenda-info">
                <h2>{item.room}</h2>
                <p>{item.client}</p>
                {item.note && <small>{item.note}</small>}
              </div>

              <span className={`agenda-status ${item.status.toLowerCase()}`}>
                {item.status}
              </span>

              <div className="agenda-actions">
                <button type="button" onClick={() => setToastMessage('La edición directa se hará desde Reservas.')}>
                  Editar
                </button>
                <button type="button" onClick={() => setToastMessage(item.reservaId ? `Reserva #${item.reservaId}` : 'Evento manual')}>
                  Detalle
                </button>
              </div>
            </article>
          ))}

          {!isLoading && filteredAgenda.length === 0 && (
            <div className="admin-empty-state">
              <div>
                <strong>No hay eventos para mostrar</strong>
                <p>Cuando existan reservas, aparecerán automáticamente en esta agenda.</p>
              </div>
            </div>
          )}
        </section>

        {showModal && (
          <div className="agenda-modal-overlay">
            <div className="agenda-modal">
              <div className="agenda-modal-header">
                <div>
                  <h2>Nuevo evento</h2>
                  <p>Registra una reserva, limpieza o actividad diaria.</p>
                </div>

                <button type="button" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <form className="agenda-modal-form" onSubmit={handleSaveEvent}>
                <label>
                  Hora
                  <input name="hour" type="time" />
                </label>

                <label>
                  Tipo de evento
                  <select name="type" defaultValue="Reserva">
                    <option>Reserva</option>
                    <option>Limpieza</option>
                  </select>
                </label>

                <label>
                  Habitación
                  <input name="room" type="text" placeholder="Ej: Hab. 105" />
                </label>

                <label>
                  Cliente / Responsable
                  <input name="client" type="text" placeholder="Ej: Juan Pérez" />
                </label>

                <label>
                  Estado
                  <select name="status" defaultValue="Pendiente">
                    <option>Pendiente</option>
                    <option>Confirmada</option>
                    <option>Ocupada</option>
                    <option>Finalizada</option>
                    <option>Cancelada</option>
                  </select>
                </label>

                <label>
                  Observación
                  <input name="note" type="text" placeholder="Observación opcional" />
                </label>

                <div className="agenda-modal-actions">
                  <button type="button" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>

                  <button type="submit">
                    Guardar evento
                  </button>
                </div>
              </form>
            </div>
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

export default AgendaPage;
