import { type MouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bed,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import '../styles/clientLanding.css';
import discretLogo from '../assets/images/logo-discret.png';
import whatsappIcon from '../assets/images/icono-whatsapp.png';
import motelLogin from '../assets/images/motel-registro.png';
import { clearClientSession, getClientSession, type Cliente } from '../services/api';

const menuItems = [
  { label: 'Inicio', href: '#inicio' },
  { label: '¿Quiénes somos?', href: '#quienes-somos' },
  { label: 'Beneficios', href: '#beneficios' },
  { label: 'Planes', href: '#planes' },
  { label: 'Contacto', href: '#contacto' },
];

const plans = [
  {
    name: 'Plan Base',
    price: '$49.990 CLP',
    period: '/mes',
    idealFor: 'Moteles pequeños.',
    features: [
      'Reservas',
      'Habitaciones hasta 10',
      'Panel admin',
      'Agenda',
      'WhatsApp',
      'Estados de habitaciones',
    ],
    checkoutUrl:
      'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=7bd7bb4b9d6f4b889257fd5bf2087501',
  },
  {
    name: 'Plan Discret',
    price: '$59.990 CLP',
    period: '/mes',
    idealFor: 'Cadenas de moteles medianos.',
    features: [
      'Reservas',
      'Habitaciones hasta 30',
      'Panel admin',
      'Agenda',
      'WhatsApp',
      'Estado de habitaciones',
    ],
    highlighted: true,
    checkoutUrl:
      'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=7e762e68bee04fedbbef5ab98c3b8cca',
  },
];

function ClientLandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clientSession, setClientSession] = useState<Cliente | null>(() => getClientSession());
  const [planMessage, setPlanMessage] = useState('');
  const reservationUrl = 'https://latasoft.cl/discret/reservas';
  const reservationQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(reservationUrl)}`;
  const whatsappUrl = `https://wa.me/56948882467?text=${encodeURIComponent(
    'Hola, quiero hablar con DISCRET para reservar o recibir ayuda.'
  )}`;

  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>('.client-reveal');

    if (!revealElements.length) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncSession = () => setClientSession(getClientSession());

    window.addEventListener('discret-client-session', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      window.removeEventListener('discret-client-session', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  useEffect(() => {
    const pageElement = document.querySelector<HTMLElement>('.client-landing-page');

    if (!pageElement) {
      return undefined;
    }

    let animationFrame = 0;

    const updateBackgroundFade = () => {
      const maxFadeDistance = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const fadeAmount = Math.min(window.scrollY / maxFadeDistance, 1);

      pageElement.style.setProperty('--client-scroll-fade', fadeAmount.toFixed(3));
      animationFrame = 0;
    };

    const requestFadeUpdate = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateBackgroundFade);
      }
    };

    updateBackgroundFade();
    window.addEventListener('scroll', requestFadeUpdate, { passive: true });
    window.addEventListener('resize', requestFadeUpdate);

    return () => {
      window.removeEventListener('scroll', requestFadeUpdate);
      window.removeEventListener('resize', requestFadeUpdate);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    closeMenu();

    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 116;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });

    window.history.replaceState(null, '', href);
  };

  const goToReservation = () => {
    closeMenu();
    navigate('/reservas');
  };

  const goToRegister = () => {
    closeMenu();
    navigate('/registro');
  };

  const goToLogin = () => {
    closeMenu();
    navigate('/login');
  };

  const logoutClient = () => {
    clearClientSession();
    setClientSession(null);
    setPlanMessage('Sesión cerrada correctamente.');
    closeMenu();
  };

  const handlePlanPurchase = (planName: string, checkoutUrl: string) => {
    closeMenu();

    if (!clientSession) {
      setPlanMessage('Inicia sesión para comprar un plan con Mercado Pago.');
      navigate('/login');
      return;
    }

    setPlanMessage(
      `${clientSession.nombre}, dejé listo el flujo para comprar ${planName} con Mercado Pago.`
    );
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main
      className="client-landing-page"
      style={{
        backgroundImage: `
          linear-gradient(
            90deg,
            rgba(5, 8, 15, 0),
            rgba(5, 8, 15, 0.24)
          ),
          url(${motelLogin})
        `,
      }}
    >
      <div className="client-page-shade">
        <header className="client-navbar">
          <a
            className="client-navbar-logo"
            href="#inicio"
            onClick={(event) => scrollToSection(event, '#inicio')}
          >
            <img src={discretLogo} alt="DISCRET" />
          </a>

          <nav className="client-desktop-nav" aria-label="Navegación principal">
            {menuItems.slice(1).map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(event) => scrollToSection(event, item.href)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="client-navbar-actions">
            {clientSession ? (
              <div className="client-session-pill" aria-label="Sesión de cliente">
                <UserRound size={18} strokeWidth={2.4} />
                <span>Hola, {clientSession.nombre}</span>
                <button type="button" aria-label="Cerrar sesión" onClick={logoutClient}>
                  <LogOut size={17} strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <>
                <button type="button" className="client-auth-btn" onClick={goToLogin}>
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  className="client-auth-btn is-primary"
                  onClick={goToRegister}
                >
                  Registrarse
                </button>
              </>
            )}
            <button
              type="button"
              className="client-menu-btn"
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div className={`client-floating-menu ${isMenuOpen ? 'is-open' : ''}`}>
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(event) => scrollToSection(event, item.href)}
              >
                {item.label}
              </a>
            ))}

            {clientSession ? (
              <>
                <div className="client-floating-session">
                  <UserRound size={18} strokeWidth={2.4} />
                  <span>Hola, {clientSession.nombre}</span>
                </div>
                <button type="button" className="client-floating-secondary-btn" onClick={logoutClient}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button type="button" className="client-floating-secondary-btn" onClick={goToLogin}>
                  Iniciar sesión
                </button>

                <button type="button" onClick={goToRegister}>
                  Registrarse
                </button>
              </>
            )}
          </div>
        </header>

        <section id="inicio" className="client-hero-section client-reveal">
          <div className="client-hero-copy">
            <p className="client-kicker">Gestión moderna para hospitality privado</p>
            <h1>DISCRET</h1>
            <p className="client-tagline">
              DISCRECIÓN • CONFORT • PRIVACIDAD
            </p>

            <div className="client-divider">
              <span></span>
              <strong>♡</strong>
              <span></span>
            </div>

            <h2>Reserva y administra con una experiencia más simple</h2>
            <p className="client-subtitle">
              Una plataforma comercial, privada y eficiente para conectar reservas,
              habitaciones y operación en tiempo real.
            </p>

            <div className="client-hero-actions">
              <button
                type="button"
                className="client-reserve-btn"
                onClick={goToReservation}
              >
                <CalendarDays size={22} strokeWidth={2.4} />
                <span>Reservar ahora</span>
              </button>

              <a
                className="client-ghost-link"
                href="#quienes-somos"
                onClick={(event) => scrollToSection(event, '#quienes-somos')}
              >
                Conocer DISCRET
              </a>
            </div>
          </div>

          <aside className="client-hero-card" aria-label="Resumen de servicios">
            <div className="client-icon">
              <Bed size={46} strokeWidth={2.2} />
            </div>
            <strong>Operación privada en tiempo real</strong>
            <p>
              Controla reservas, disponibilidad y atención desde una interfaz clara,
              rápida y segura.
            </p>
          </aside>
        </section>

        <section id="quienes-somos" className="client-section client-about-section client-reveal">
          <div className="client-section-heading">
            <p className="client-kicker">¿Quiénes Somos?</p>
            <h2>Diseñamos tecnología para modernizar la gestión privada</h2>
          </div>

          <div className="client-about-panel">
            <p>
              En DISCRET desarrollamos tecnología simple, moderna y eficiente para
              la gestión de moteles y espacios de hospitality privado.
            </p>
            <p>
              Nuestra misión es ayudar a modernizar una industria que durante años
              ha operado con procesos manuales, reservas desordenadas y poca
              digitalización, entregando una plataforma intuitiva que permite
              administrar habitaciones, reservas y operaciones en tiempo real desde
              cualquier dispositivo.
            </p>
          </div>
        </section>

        <section id="beneficios" className="client-section client-benefits-grid client-reveal">
          <article className="client-reveal">
            <ShieldCheck size={28} strokeWidth={2.2} />
            <h3>Discreción garantizada</h3>
            <p>Flujos privados y una experiencia pensada para reducir fricción.</p>
          </article>

          <article className="client-reveal">
            <Clock3 size={28} strokeWidth={2.2} />
            <h3>Reservas en minutos</h3>
            <p>Disponibilidad, horarios y confirmación reunidos en un solo lugar.</p>
          </article>

          <article className="client-reveal">
            <LockKeyhole size={28} strokeWidth={2.2} />
            <h3>Operación protegida</h3>
            <p>Datos ordenados, acceso simple y control desde cualquier dispositivo.</p>
          </article>
        </section>

        <section className="client-section client-brand-story-section client-reveal">
          <div className="client-brand-story-panel">
            <p className="client-kicker">Lo que representa DISCRET</p>
            <h2>Reservas privadas, automatización y pagos digitales para la industria motelera</h2>
            <p>
              Discret ®️ es una plataforma tecnológica que moderniza la industria
              motelera mediante reservas online privadas, automatización y pagos
              digitales.
            </p>
            <p>
              Actualmente muchos moteles siguen operando con WhatsApp y procesos
              manuales, generando mala experiencia y poca eficiencia. Nuestra solución
              permite reservas discretas, disponibilidad en tiempo real y gestión
              completa para el motel desde un panel administrativo.
            </p>
          </div>
        </section>

        <section id="planes" className="client-section client-plans-section client-reveal">
          <div className="client-section-heading client-plans-heading">
            <p className="client-kicker">Planes comerciales</p>
            <p>
              Valores mensuales diseñados para digitalizar reservas, habitaciones y
              administración sin complejidad.
            </p>
          </div>

          <div className="client-plans-grid">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`client-plan-card client-reveal ${plan.highlighted ? 'is-featured' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handlePlanPurchase(plan.name, plan.checkoutUrl)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handlePlanPurchase(plan.name, plan.checkoutUrl);
                  }
                }}
              >
                {plan.highlighted && <span className="client-plan-badge">Más completo</span>}

                <div className="client-plan-header">
                  <h3>{plan.name}</h3>
                  <div className="client-plan-price">
                    <strong>{plan.price}</strong>
                    <span>{plan.period}</span>
                  </div>
                </div>

                <p className="client-plan-ideal">
                  <span>Ideal para:</span> {plan.idealFor}
                </p>

                <ul className="client-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={18} strokeWidth={2.6} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <span className="client-plan-btn">
                  {clientSession ? (
                    <>
                      <CreditCard size={18} strokeWidth={2.4} />
                      Comprar con Mercado Pago
                    </>
                  ) : (
                    'Inicia sesión para comprar'
                  )}
                </span>
              </article>
            ))}
          </div>

          {planMessage && (
            <p className="client-plan-session-message" role="status">
              {planMessage}
            </p>
          )}

          <p className="client-plan-note">
            *Cada plan es por 1 recinto motelero.
          </p>
        </section>

        <section id="reservar" className="client-section client-cta-section client-reveal">
          <div>
            <p className="client-kicker">Listo para avanzar</p>
            <h2>Haz que cada reserva sea más rápida, clara y confidencial.</h2>
          </div>

          <button
            type="button"
            className="client-reserve-btn"
            onClick={goToReservation}
          >
            <CalendarDays size={22} strokeWidth={2.4} />
            <span>Ir a reservas</span>
          </button>
        </section>

        <section id="contacto" className="client-section client-contact-section client-reveal">
          <div>
            <p className="client-kicker">Contacto</p>
            <h2>Conversemos</h2>

            <a className="client-contact-qr" href={reservationUrl} aria-label="Reservar escaneando QR">
              <span>QR para reservar</span>
              <img src={reservationQrUrl} alt="QR para reservar en DISCRET" />
            </a>
          </div>

          <div className="client-contact-list">
            <a href="mailto:discretchile@gmail.com">
              <Mail size={22} strokeWidth={2.3} />
              <span>
                <strong>Correo</strong>
                discretchile@gmail.com
              </span>
            </a>

            <a href="tel:+56948882467">
              <Phone size={22} strokeWidth={2.3} />
              <span>
                <strong>Teléfono Soporte</strong>
                +56 9 4888 2467
              </span>
            </a>
          </div>
        </section>

        <footer className="client-footer">
          <span>© 2026 DISCRET</span>
          <strong>© 2026 Sistema de Reservas para Moteles</strong>
          <div className="client-footer-actions" aria-label="Acceso de usuarios">
            {clientSession ? (
              <div className="client-footer-session">
                <span>Sesión iniciada como {clientSession.nombre}</span>
                <button type="button" onClick={logoutClient}>
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <>
                <button type="button" onClick={goToLogin}>
                  Iniciar sesión
                </button>
                <button type="button" className="client-footer-primary-btn" onClick={goToRegister}>
                  Registrarse
                </button>
              </>
            )}
          </div>
        </footer>

        <a
          className="client-whatsapp-float"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Hablar por WhatsApp con DISCRET"
        >
          <img src={whatsappIcon} alt="" aria-hidden="true" />
        </a>
      </div>
    </main>
  );
}

export default ClientLandingPage;
