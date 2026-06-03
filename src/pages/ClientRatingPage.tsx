import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Heart,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';

import { ApiError, api } from '../services/api';
import '../styles/reservations.css';

const ratingLabels = [
  'Muy mala',
  'Mala',
  'Regular',
  'Buena',
  'Excelente',
];

const ratingTags = [
  'Atención discreta',
  'Habitación limpia',
  'Ingreso rápido',
  'Buena privacidad',
  'Volvería',
];

const formatCheckout = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

function ClientRatingPage() {
  const navigate = useNavigate();
  const { token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();
  const token = tokenParam || searchParams.get('token') || '';

  const [reservationId, setReservationId] = useState(searchParams.get('reserva') || 'Reserva pendiente');
  const [roomName, setRoomName] = useState(searchParams.get('habitacion') || 'Habitación pendiente');
  const [checkoutTime, setCheckoutTime] = useState(searchParams.get('salida') || 'Salida pendiente');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentRatingText = useMemo(() => {
    const activeRating = hoverRating || rating;
    return activeRating ? ratingLabels[activeRating - 1] : 'Selecciona una valoración';
  }, [hoverRating, rating]);

  useEffect(() => {
    if (!token) {
      setMessage('Este enlace de valoración no tiene un token válido.');
      return;
    }

    setIsLoading(true);

    api.obtenerValoracionPorToken(token)
      .then((response) => {
        setReservationId(response.reserva.codigo_reserva);
        setRoomName(response.reserva.habitacion);
        setCheckoutTime(formatCheckout(response.reserva.fecha_salida));

        if (response.respondida) {
          setIsSubmitted(true);
          setMessage('Esta valoración ya fue enviada anteriormente.');
        }
      })
      .catch(() => {
        setMessage('No pudimos cargar la reserva asociada a esta valoración.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setMessage('Este enlace de valoración no tiene un token válido.');
      return;
    }

    if (!rating) {
      setMessage('Selecciona una valoración para enviar tu experiencia.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.enviarValoracion(token, {
        puntuacion: rating,
        etiquetas: selectedTags,
        comentario: comment.trim() || null,
      });

      setIsSubmitted(true);
      setMessage('');
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? Object.values(error.errors ?? {}).flat()[0] ?? error.message
        : 'No se pudo enviar la valoración.';

      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="client-reservation-page client-rating-page">
      <header className="client-reservation-header">
        <div className="client-breadcrumb">
          <button type="button" aria-label="Volver al inicio" onClick={() => navigate('/')}>
            <ArrowLeft size={22} />
          </button>

          <span>Cliente</span>
          <small>/</small>
          <strong>Valoración</strong>
        </div>

        <button type="button" className="client-back-btn" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </header>

      <section className="client-reservation-logo client-rating-logo">
        <h2>DISCRET</h2>
        <p>DISCRECIÓN - CONFORT - PRIVACIDAD</p>
      </section>

      <section className="client-rating-shell">
        <div className="client-rating-copy">
          <p className="client-register-kicker">Valoración post-estadía</p>
          <h1>Cuéntanos cómo fue tu experiencia</h1>
          <p>
            Este enlace puede enviarse automáticamente 30 minutos después de la
            salida del motel, para que el cliente valore su reserva con calma.
          </p>

          <div className="client-rating-reservation">
            <span>
              <ShieldCheck size={18} />
              Reserva {reservationId}
            </span>
            <span>
              <Sparkles size={18} />
              {roomName}
            </span>
            <span>
              <Clock3 size={18} />
              Salida {checkoutTime}
            </span>
          </div>
        </div>

        <form
          className="client-reservation-card client-rating-card"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={isLoading || isSubmitting}
        >
          <div className="client-rating-heading">
            <Heart size={22} />
            <div>
              <h2>Tu opinión nos ayuda a mejorar</h2>
              <p>La valoración es privada y se usa solo para mejorar el servicio.</p>
            </div>
          </div>

          <fieldset className="client-rating-stars" disabled={isLoading || isSubmitting || isSubmitted}>
            <legend>Valoración general</legend>
            <div className="client-rating-star-buttons" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={value <= (hoverRating || rating) ? 'is-active' : ''}
                  aria-label={`${value} de 5 estrellas`}
                  onMouseEnter={() => setHoverRating(value)}
                  onFocus={() => setHoverRating(value)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => {
                    setRating(value);
                    setMessage('');
                  }}
                >
                  <Star size={34} strokeWidth={2.2} />
                </button>
              ))}
            </div>
            <strong>{currentRatingText}</strong>
          </fieldset>

          <fieldset className="client-rating-tags" disabled={isLoading || isSubmitting || isSubmitted}>
            <legend>¿Qué destacarías?</legend>
            <div>
              {ratingTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={selectedTags.includes(tag) ? 'is-active' : ''}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="client-form-group full">
            <span className="client-register-label">
              Comentario opcional
            </span>
            <span className="client-rating-textarea">
              <MessageSquareText size={18} />
              <textarea
                value={comment}
                placeholder="Cuéntanos algún detalle de tu experiencia..."
                disabled={isLoading || isSubmitting || isSubmitted}
                onChange={(event) => setComment(event.target.value)}
              />
            </span>
          </label>

          {message && (
            <p className="client-reservation-message">
              {message}
            </p>
          )}

          <div className="client-rating-actions">
            <button type="button" className="cancel-reservation-btn" onClick={() => navigate('/')}>
              Omitir
            </button>
            <button type="submit" className="save-reservation-btn" disabled={isLoading || isSubmitting || isSubmitted}>
              <Send size={18} />
              {isSubmitting ? 'Enviando...' : 'Enviar valoración'}
            </button>
          </div>
        </form>
      </section>

      {isSubmitted && (
        <section className="client-register-success" role="status" aria-live="polite">
          <div className="client-register-success-card">
            <div className="client-register-success-glow"></div>
            <div className="client-register-success-check">
              <CheckCircle2 size={58} strokeWidth={2.4} />
            </div>

            <div className="client-register-success-logo">
              <h2>DISCRET</h2>
              <p>DISCRECIÓN - CONFORT - PRIVACIDAD</p>
            </div>

            <div className="client-register-success-copy">
              <h3>Valoración enviada</h3>
              <p>Gracias por compartir tu experiencia.</p>
              <strong>Tu opinión ayuda a mejorar cada reserva.</strong>
            </div>

            <div className="client-register-success-info">
              <span>
                <ShieldCheck size={18} />
                Opinión tratada de forma confidencial
              </span>
              <span>
                <Star size={18} />
                {rating ? `${rating} de 5 estrellas` : 'Valoración ya registrada'}
              </span>
            </div>

            <button
              type="button"
              className="save-reservation-btn"
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default ClientRatingPage;
