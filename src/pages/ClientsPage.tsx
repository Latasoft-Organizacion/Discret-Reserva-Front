import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Star,
  BadgePlus,
  PhoneCall,
  Search,
  UserRoundPlus,
  X,
} from 'lucide-react';

import AdminBreadcrumb from '../components/AdminBreadcrumb';
import { AdminSkeleton } from '../components/AdminLoading';
import AdminToast from '../components/AdminToast';
import AdminSidebar from '../components/AdminSidebar';
import { ApiError, api, type Cliente, type Reserva } from '../services/api';

import '../styles/adminSidebar.css';
import '../styles/clients.css';

interface ClientView {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  frequentRoom: string;
  visits: number;
  lastVisit: string;
  status: 'Frecuente' | 'Nuevo';
  active: boolean;
}

type ClientFilter = 'Todos' | 'Frecuentes' | 'Nuevos' | 'Activos';

type ClientFormState = {
  name: string;
  phone: string;
  email: string;
  frequentRoom: string;
  status: ClientView['status'];
};

const emptyClientForm: ClientFormState = {
  name: '',
  phone: '',
  email: '',
  frequentRoom: '',
  status: 'Nuevo',
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? '';

  return {
    firstName,
    lastName: parts.join(' ') || 'Sin apellido',
  };
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Sin visitas';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin visitas';
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getRoomLabel = (reservation: Reserva) => {
  const roomNumber = reservation.habitacion?.numero ?? String(reservation.habitacion_id);
  const roomType = reservation.habitacion?.tipo_habitacion?.nombre ?? reservation.habitacion?.nombre;

  return roomType ? `${roomType} · Hab. ${roomNumber}` : `Hab. ${roomNumber}`;
};

const mapClient = (client: Cliente, reservations: Reserva[]): ClientView => {
  const clientReservations = reservations.filter((reservation) => (
    reservation.cliente_id === client.id
    || reservation.correo_cliente?.toLowerCase() === client.correo.toLowerCase()
    || reservation.telefono_cliente === client.telefono
  ));
  const sortedReservations = [...clientReservations].sort((a, b) => (
    new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime()
  ));
  const roomFrequency = clientReservations.reduce<Record<string, number>>((acc, reservation) => {
    const room = getRoomLabel(reservation);
    acc[room] = (acc[room] ?? 0) + 1;
    return acc;
  }, {});
  const frequentRoom = Object.entries(roomFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin reservas';
  const visits = clientReservations.length;

  return {
    id: client.id,
    name: `${client.nombre} ${client.apellido}`.trim(),
    firstName: client.nombre,
    lastName: client.apellido,
    phone: client.telefono,
    email: client.correo,
    birthDate: client.fecha_nacimiento?.slice(0, 10) ?? '1990-01-01',
    frequentRoom,
    visits,
    lastVisit: formatDate(sortedReservations[0]?.fecha_entrada),
    status: visits >= 3 ? 'Frecuente' : 'Nuevo',
    active: client.activo,
  };
};

function ClientsPage() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<ClientFilter>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState<ClientFormState>(emptyClientForm);
  const [editingClient, setEditingClient] = useState<ClientView | null>(null);
  const [detailClient, setDetailClient] = useState<ClientView | null>(null);

  const clientsPerPage = 10;
  const clientFilters: ClientFilter[] = ['Todos', 'Frecuentes', 'Nuevos', 'Activos'];

  const loadClients = () => {
    setIsLoading(true);

    Promise.all([
      api.listarClientes(),
      api.listarReservas(),
    ])
      .then(([clientResponse, reservationResponse]) => {
        setClients(clientResponse.data);
        setReservations(reservationResponse.data);
      })
      .catch(() => {
        setToastMessage('No se pudieron cargar los clientes registrados.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, []);

  const clientViews = useMemo(
    () => clients.map((client) => mapClient(client, reservations)),
    [clients, reservations],
  );

  const filteredClients = clientViews.filter((client) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch
      || client.name.toLowerCase().includes(normalizedSearch)
      || client.phone.toLowerCase().includes(normalizedSearch)
      || client.email.toLowerCase().includes(normalizedSearch)
      || client.frequentRoom.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (activeFilter === 'Todos') {
      return true;
    }

    if (activeFilter === 'Frecuentes') {
      return client.status === 'Frecuente';
    }

    if (activeFilter === 'Nuevos') {
      return client.status === 'Nuevo';
    }

    return client.active;
  });

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newClient.name || !newClient.phone || !newClient.email) {
      setModalMessage('Completa nombre, teléfono y correo para crear el cliente.');
      return;
    }

    const { firstName, lastName } = splitFullName(newClient.name);

    try {
      const createdClient = await api.crearCliente({
        nombre: firstName,
        apellido: lastName,
        telefono: newClient.phone,
        correo: newClient.email,
        fecha_nacimiento: '1990-01-01',
        mayor_edad_confirmado: true,
      });

      setClients((currentClients) => [createdClient, ...currentClients]);
      setNewClient(emptyClientForm);
      setModalMessage('');
      setCurrentPage(1);
      setShowClientModal(false);
      setToastMessage(`Cliente ${createdClient.nombre} creado correctamente.`);
    } catch (error) {
      const message = error instanceof ApiError
        ? Object.values(error.errors ?? {}).flat()[0] ?? error.message
        : 'No se pudo crear el cliente.';

      setModalMessage(message);
    }
  };

  const handleUpdateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingClient) {
      return;
    }

    if (!editingClient.name || !editingClient.phone || !editingClient.email) {
      setModalMessage('Completa nombre, teléfono y correo.');
      return;
    }

    const { firstName, lastName } = splitFullName(editingClient.name);

    try {
      const updatedClient = await api.actualizarCliente(editingClient.id, {
        nombre: firstName,
        apellido: lastName,
        telefono: editingClient.phone,
        correo: editingClient.email,
        fecha_nacimiento: editingClient.birthDate,
      });

      setClients((currentClients) =>
        currentClients.map((client) => (
          client.id === updatedClient.id ? updatedClient : client
        ))
      );
      setEditingClient(null);
      setModalMessage('');
      setToastMessage(`Cliente ${updatedClient.nombre} actualizado correctamente.`);
    } catch (error) {
      const message = error instanceof ApiError
        ? Object.values(error.errors ?? {}).flat()[0] ?? error.message
        : 'No se pudo actualizar el cliente.';

      setModalMessage(message);
    }
  };

  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const visibleClients = filteredClients.slice(startIndex, endIndex);

  return (
    <>
      <AdminSidebar active="clientes" />
      <main className="clients-page">
        <header className="clients-top">
          <div>
            <AdminBreadcrumb current="Clientes" />
            <h1>Clientes</h1>
            <p>Gestión de contactos y clientes frecuentes</p>
          </div>

          <div className="clients-top-actions">
            <div className="clients-search">
              <Search size={18} strokeWidth={2.4} />

              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <button type="button" onClick={() => setShowClientModal(true)}>
              <UserRoundPlus size={18} strokeWidth={2.4} />
              <span>Nuevo cliente</span>
            </button>
          </div>
        </header>

        {isLoading ? (
          <AdminSkeleton variant="summary" count={4} label="Cargando resumen de clientes" />
        ) : (
          <section className="clients-summary">
            <article>
              <div className="clients-summary-icon">
                <Users size={26} strokeWidth={2.2} />
              </div>
              <div>
                <strong>{clientViews.length}</strong>
                <p>Total clientes</p>
              </div>
            </article>

            <article>
              <div className="clients-summary-icon">
                <Star size={26} strokeWidth={2.2} />
              </div>
              <div>
                <strong>{clientViews.filter((client) => client.status === 'Frecuente').length}</strong>
                <p>Frecuentes</p>
              </div>
            </article>

            <article>
              <div className="clients-summary-icon">
                <BadgePlus size={26} strokeWidth={2.2} />
              </div>
              <div>
                <strong>{clientViews.filter((client) => client.status === 'Nuevo').length}</strong>
                <p>Nuevos</p>
              </div>
            </article>

            <article>
              <div className="clients-summary-icon">
                <PhoneCall size={26} strokeWidth={2.2} />
              </div>
              <div>
                <strong>{clientViews.filter((client) => client.active).length}</strong>
                <p>Contactos activos</p>
              </div>
            </article>
          </section>
        )}

        <section className="clients-filters">
          {clientFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={activeFilter === filter ? 'active' : ''}
              onClick={() => {
                setActiveFilter(filter);
                setCurrentPage(1);
              }}
            >
              {filter}
            </button>
          ))}
        </section>

        <section className="clients-list" aria-busy={isLoading}>
          {isLoading && (
            <AdminSkeleton variant="card" count={4} label="Cargando clientes" />
          )}

          {!isLoading && visibleClients.map((client) => (
            <article
              className={`client-card ${client.status.toLowerCase()}`}
              key={client.id}
            >
              <div className="client-avatar">
                {client.name.charAt(0)}
              </div>

              <div className="client-info">
                <h2>{client.name}</h2>
                <p>{client.phone}</p>
                <p>{client.email}</p>
              </div>

              <div>
                <strong>{client.visits}</strong>
                <p>Visitas</p>
              </div>

              <div>
                <strong>{client.frequentRoom}</strong>
                <p>Hab. frecuente</p>
              </div>

              <div>
                <strong>{client.lastVisit}</strong>
                <p>Última visita</p>
              </div>

              <span className={`client-status ${client.status.toLowerCase()}`}>
                {client.status}
              </span>

              <div className="client-actions">
                <button type="button" onClick={() => setEditingClient(client)}>
                  Editar
                </button>
                <button type="button" onClick={() => setDetailClient(client)}>
                  Detalle
                </button>
              </div>
            </article>
          ))}

          {!isLoading && visibleClients.length === 0 && (
            <div className="admin-empty-state">
              <div>
                <strong>No hay clientes para mostrar</strong>
                <p>Cuando un cliente se registre, aparecerá en esta sección.</p>
              </div>
            </div>
          )}

        </section>

        <section className="clients-pagination">
          <p>
            Mostrando {filteredClients.length === 0 ? 0 : startIndex + 1}
            -
            {Math.min(endIndex, filteredClients.length)} de {filteredClients.length} clientes
          </p>

          <div>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Anterior
            </button>

            <span>
              Página {currentPage} de {totalPages || 1}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Siguiente
            </button>
          </div>
        </section>

        {showClientModal && (
          <div className="client-modal-overlay">
            <div className="client-modal">
              <div className="client-modal-header">
                <div>
                  <h2>Nuevo cliente</h2>
                  <p>Registra un cliente para el panel administrativo.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalMessage('');
                    setShowClientModal(false);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form className="client-modal-form" onSubmit={handleCreateClient}>
                {modalMessage && <p className="admin-modal-message">{modalMessage}</p>}

                <label>
                  Nombre completo
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={newClient.name}
                    onChange={(event) =>
                      setNewClient((client) => ({
                        ...client,
                        name: event.target.value,
                      }))}
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    type="text"
                    placeholder="+56 9 1234 5678"
                    value={newClient.phone}
                    onChange={(event) =>
                      setNewClient((client) => ({
                        ...client,
                        phone: event.target.value,
                      }))}
                  />
                </label>

                <label>
                  Correo
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={newClient.email}
                    onChange={(event) =>
                      setNewClient((client) => ({
                        ...client,
                        email: event.target.value,
                      }))}
                  />
                </label>

                <label>
                  Habitación frecuente
                  <input
                    type="text"
                    placeholder="Se calcula con reservas"
                    value={newClient.frequentRoom}
                    onChange={(event) =>
                      setNewClient((client) => ({
                        ...client,
                        frequentRoom: event.target.value,
                      }))}
                  />
                </label>

                <div className="client-modal-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMessage('');
                      setShowClientModal(false);
                    }}
                  >
                    Cancelar
                  </button>

                  <button type="submit">
                    Crear cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingClient && (
          <div className="client-modal-overlay">
            <div className="client-modal">
              <div className="client-modal-header">
                <div>
                  <h2>Editar cliente</h2>
                  <p>Actualiza los datos registrados del cliente.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalMessage('');
                    setEditingClient(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form className="client-modal-form" onSubmit={handleUpdateClient}>
                {modalMessage && <p className="admin-modal-message">{modalMessage}</p>}

                <label>
                  Nombre completo
                  <input
                    type="text"
                    value={editingClient.name}
                    onChange={(event) =>
                      setEditingClient((client) =>
                        client ? { ...client, name: event.target.value } : client
                      )}
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    type="text"
                    value={editingClient.phone}
                    onChange={(event) =>
                      setEditingClient((client) =>
                        client ? { ...client, phone: event.target.value } : client
                      )}
                  />
                </label>

                <label>
                  Correo
                  <input
                    type="email"
                    value={editingClient.email}
                    onChange={(event) =>
                      setEditingClient((client) =>
                        client ? { ...client, email: event.target.value } : client
                      )}
                  />
                </label>

                <label>
                  Fecha de nacimiento
                  <input
                    type="date"
                    value={editingClient.birthDate}
                    onChange={(event) =>
                      setEditingClient((client) =>
                        client ? { ...client, birthDate: event.target.value } : client
                      )}
                  />
                </label>

                <div className="client-modal-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMessage('');
                      setEditingClient(null);
                    }}
                  >
                    Cancelar
                  </button>

                  <button type="submit">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {detailClient && (
          <div className="client-modal-overlay">
            <div className="client-modal">
              <div className="client-modal-header">
                <div>
                  <h2>Detalle cliente</h2>
                  <p>Información completa del cliente seleccionado.</p>
                </div>

                <button type="button" onClick={() => setDetailClient(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="client-detail-grid">
                <div>
                  <span>Nombre</span>
                  <strong>{detailClient.name}</strong>
                </div>

                <div>
                  <span>Teléfono</span>
                  <strong>{detailClient.phone}</strong>
                </div>

                <div>
                  <span>Correo</span>
                  <strong>{detailClient.email}</strong>
                </div>

                <div>
                  <span>Habitación frecuente</span>
                  <strong>{detailClient.frequentRoom}</strong>
                </div>

                <div>
                  <span>Visitas</span>
                  <strong>{detailClient.visits}</strong>
                </div>

                <div>
                  <span>Última visita</span>
                  <strong>{detailClient.lastVisit}</strong>
                </div>

                <div>
                  <span>Estado</span>
                  <strong>{detailClient.status}</strong>
                </div>
              </div>
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

export default ClientsPage;
