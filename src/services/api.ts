const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api';
const CLIENT_SESSION_KEY = 'discret_cliente';
const ADMIN_SESSION_KEY = 'discret_admin';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, ...fetchOptions } = options;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers,
  };

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, requestOptions);
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? 'No se pudo completar la solicitud.',
      response.status,
      payload?.errors,
    );
  }

  return payload as T;
}

export type Cliente = {
  id: number;
  id_motel?: number | null;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  fecha_nacimiento: string;
  mayor_edad_confirmado: boolean;
  activo: boolean;
};

export type RegistrarClientePayload = {
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  fecha_nacimiento: string;
  password: string;
  password_confirmation: string;
  mayor_edad_confirmado: boolean;
};

export type LoginClientePayload = {
  correo: string;
  password: string;
};

export type LoginClienteResponse = {
  cliente: Cliente;
};

export type ClientesPaginatedResponse = {
  data: Cliente[];
  total: number;
  current_page: number;
  last_page: number;
};

export type CrearClienteAdminPayload = {
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  fecha_nacimiento: string;
  mayor_edad_confirmado: boolean;
};

export type AdminUser = {
  id: number;
  id_motel?: number | null;
  name: string;
  email: string;
};

export type LoginAdminPayload = {
  email: string;
  password: string;
};

export type LoginAdminResponse = {
  admin: AdminUser;
};

export type EstadoHabitacionApi = 'disponible' | 'ocupada' | 'limpieza' | 'mantenimiento' | 'bloqueada';

export type TipoHabitacion = {
  id: number;
  id_motel?: number;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  activo: boolean;
};

export type Habitacion = {
  id: number;
  id_motel?: number;
  tipo_habitacion_id: number;
  numero: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  estado: EstadoHabitacionApi;
  activa: boolean;
  tipo_habitacion?: TipoHabitacion;
};

export type GuardarHabitacionPayload = {
  tipo_habitacion_id: number;
  numero: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  estado: EstadoHabitacionApi;
  activa?: boolean;
};

export type EstadoReservaApi = 'pendiente' | 'confirmada' | 'ocupada' | 'finalizada' | 'cancelada';

export type TipoPagoReservaApi = 'efectivo' | 'transferencia' | 'tarjeta' | 'online';

export type Reserva = {
  id: number;
  codigo_reserva: string;
  id_motel?: number;
  cliente_id: number | null;
  habitacion_id: number;
  nombre_cliente: string | null;
  telefono_cliente: string | null;
  correo_cliente: string | null;
  cantidad_personas: number;
  fecha_entrada: string;
  fecha_salida: string;
  estado: EstadoReservaApi;
  tipo_pago: TipoPagoReservaApi | null;
  comentario: string | null;
  qr_token: string | null;
  cliente?: Cliente | null;
  habitacion?: Habitacion;
  valoracion?: Valoracion | null;
};

export type ReservasPaginatedResponse = {
  data: Reserva[];
  total: number;
  current_page: number;
  last_page: number;
};

export type CrearReservaPayload = {
  cliente_id?: number | null;
  habitacion_id: number;
  nombre_cliente?: string | null;
  telefono_cliente?: string | null;
  correo_cliente?: string | null;
  cantidad_personas: number;
  fecha_entrada: string;
  fecha_salida: string;
  estado?: EstadoReservaApi;
  tipo_pago?: TipoPagoReservaApi | null;
  comentario?: string | null;
};

export type Valoracion = {
  id: number;
  id_motel?: number | null;
  reserva_id: number;
  cliente_id: number | null;
  puntuacion: number | null;
  etiquetas: string[] | null;
  comentario: string | null;
  token: string;
  enviada_at: string | null;
  respondida_at: string | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente | null;
  reserva?: Reserva | null;
};

export type ValoracionesPaginatedResponse = {
  data: Valoracion[];
  total: number;
  current_page: number;
  last_page: number;
};

export type ValoracionTokenResponse = {
  reserva: {
    codigo_reserva: string;
    habitacion: string;
    fecha_salida: string;
  };
  respondida: boolean;
};

export type EnviarValoracionPayload = {
  puntuacion: number;
  etiquetas?: string[];
  comentario?: string | null;
};

export type TipoReporteApi = 'DIARIO' | 'SEMANAL' | 'MENSUAL';

export type EstadoReporteApi = 'GENERADO' | 'PENDIENTE' | 'ERROR';

export type Reporte = {
  id_reporte: number;
  id_motel: number;
  user_id: number;
  tipo: TipoReporteApi;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoReporteApi;
  total_ingresos: string | number;
  total_reservas: number;
  ocupacion_promedio: string | number;
  archivo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportesPaginatedResponse = {
  data: Reporte[];
  total: number;
  current_page: number;
  last_page: number;
};

export type CrearReportePayload = {
  tipo: TipoReporteApi;
  fecha_inicio: string;
  fecha_fin: string;
};

export function saveClientSession(cliente: Cliente) {
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(cliente));
  window.dispatchEvent(new Event('discret-client-session'));
}

export function getClientSession(): Cliente | null {
  const rawSession = localStorage.getItem(CLIENT_SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as Cliente;
  } catch {
    localStorage.removeItem(CLIENT_SESSION_KEY);
    return null;
  }
}

export function clearClientSession() {
  localStorage.removeItem(CLIENT_SESSION_KEY);
  window.dispatchEvent(new Event('discret-client-session'));
}

export function saveAdminSession(admin: AdminUser) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
  window.dispatchEvent(new Event('discret-admin-session'));
}

export function getAdminSession(): AdminUser | null {
  const rawSession = localStorage.getItem(ADMIN_SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AdminUser;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new Event('discret-admin-session'));
}

export const api = {
  registrarCliente(payload: RegistrarClientePayload) {
    return apiRequest<Cliente>('/clientes', {
      method: 'POST',
      body: payload,
    });
  },

  listarClientes() {
    return apiRequest<ClientesPaginatedResponse>('/clientes');
  },

  crearCliente(payload: CrearClienteAdminPayload) {
    return apiRequest<Cliente>('/clientes', {
      method: 'POST',
      body: payload,
    });
  },

  actualizarCliente(id: number, payload: Partial<CrearClienteAdminPayload> & { activo?: boolean }) {
    return apiRequest<Cliente>(`/clientes/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  loginCliente(payload: LoginClientePayload) {
    return apiRequest<LoginClienteResponse>('/clientes/login', {
      method: 'POST',
      body: payload,
    });
  },

  loginAdmin(payload: LoginAdminPayload) {
    return apiRequest<LoginAdminResponse>('/admin/login', {
      method: 'POST',
      body: payload,
    });
  },

  listarHabitaciones() {
    return apiRequest<Habitacion[]>('/habitaciones');
  },

  listarTiposHabitacion() {
    return apiRequest<TipoHabitacion[]>('/tipos-habitacion');
  },

  crearHabitacion(payload: GuardarHabitacionPayload) {
    return apiRequest<Habitacion>('/habitaciones', {
      method: 'POST',
      body: payload,
    });
  },

  actualizarHabitacion(id: number, payload: Partial<GuardarHabitacionPayload>) {
    return apiRequest<Habitacion>(`/habitaciones/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  crearReserva(payload: CrearReservaPayload) {
    return apiRequest<Reserva>('/reservas', {
      method: 'POST',
      body: payload,
    });
  },

  listarReservas() {
    return apiRequest<ReservasPaginatedResponse>('/reservas');
  },

  actualizarReserva(id: number, payload: Partial<CrearReservaPayload>) {
    return apiRequest<Reserva>(`/reservas/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  eliminarReserva(id: number) {
    return apiRequest<void>(`/reservas/${id}`, {
      method: 'DELETE',
    });
  },

  listarValoraciones() {
    return apiRequest<ValoracionesPaginatedResponse>('/valoraciones');
  },

  obtenerValoracionPorToken(token: string) {
    return apiRequest<ValoracionTokenResponse>(`/valoraciones/${token}`);
  },

  enviarValoracion(token: string, payload: EnviarValoracionPayload) {
    return apiRequest<Valoracion>(`/valoraciones/${token}`, {
      method: 'POST',
      body: payload,
    });
  },

  listarReportes() {
    return apiRequest<ReportesPaginatedResponse>('/reportes');
  },

  crearReporte(payload: CrearReportePayload) {
    return apiRequest<Reporte>('/reportes', {
      method: 'POST',
      body: payload,
    });
  },
};
