import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Bot from '@/components/chatbot/ChatBot';
import MobileShortcutBanner from './MobileShortcutBanner';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Security: Add security headers and basic protections
  useEffect(() => {
    // Security: Add meta tags for security
    const addSecurityMeta = () => {
      // Content type sniffing protection
      const contentType = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
      if (!contentType) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'X-Content-Type-Options';
        meta.content = 'nosniff';
        document.head.appendChild(meta);
      }

      // Referrer policy
      const referrer = document.querySelector('meta[name="referrer"]');
      if (!referrer) {
        const meta = document.createElement('meta');
        meta.name = 'referrer';
        meta.content = 'strict-origin-when-cross-origin';
        document.head.appendChild(meta);
      }
    };

    addSecurityMeta();

    // Security: Clear any potential XSS vectors from URL
    const cleanUrl = () => {
      const url = new URL(window.location.href);
      let needsRedirect = false;
      
      // Remove potentially dangerous parameters
      const dangerousParams = ['script', 'javascript', 'vbscript', 'onload', 'onerror'];
      dangerousParams.forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          needsRedirect = true;
        }
      });

      if (needsRedirect) {
        window.history.replaceState({}, '', url.toString());
      }
    };

    cleanUrl();
  }, []);

  // Security: Content Security Policy (basic implementation)
  useEffect(() => {
    // Add basic CSP through meta tag (more comprehensive CSP should be done server-side)
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!csp && import.meta.env.PROD) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.gpteng.co https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: https://www.google.com https://www.gstatic.com; frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com;";
      document.head.appendChild(meta);
    }
  }, []);

  // Manejar el badge de reCAPTCHA para expandir/colapsar al hacer click/touch
  useEffect(() => {
    let badgeElement: HTMLElement | null = null;
    let clickHandler: ((e: Event) => void) | null = null;
    let touchHandler: ((e: TouchEvent) => void) | null = null;

    const setupRecaptchaBadge = () => {
      const badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
      if (badge && badge !== badgeElement) {
        // Limpiar listeners anteriores si existen
        if (badgeElement && clickHandler) {
          badgeElement.removeEventListener('click', clickHandler);
          if (touchHandler) {
            badgeElement.removeEventListener('touchend', touchHandler);
          }
        }

        badgeElement = badge;
        badge.style.cursor = 'pointer';
        badge.style.touchAction = 'manipulation'; // Mejorar respuesta táctil en móviles

        // Handler para click (desktop) y touch (móvil)
        const handleInteraction = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          badge.classList.toggle('expanded');
        };

        clickHandler = handleInteraction;
        touchHandler = (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          badge.classList.toggle('expanded');
        };

        // Agregar listeners para desktop y móvil
        badge.addEventListener('click', clickHandler);
        badge.addEventListener('touchend', touchHandler, { passive: false });
      }
    };

    // Intentar configurar inmediatamente
    setupRecaptchaBadge();

    // También intentar después de delays (por si reCAPTCHA se carga después)
    const timeoutIds = [
      setTimeout(() => setupRecaptchaBadge(), 1000),
      setTimeout(() => setupRecaptchaBadge(), 2000),
      setTimeout(() => setupRecaptchaBadge(), 3000),
    ];

    // Observar cambios en el DOM para detectar cuando se carga el badge
    const observer = new MutationObserver(() => {
      setupRecaptchaBadge();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      observer.disconnect();
      if (badgeElement && clickHandler) {
        badgeElement.removeEventListener('click', clickHandler);
        if (touchHandler) {
          badgeElement.removeEventListener('touchend', touchHandler);
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background-light">
      <Header />
      <MobileShortcutBanner />
      <main className="flex-grow animate-fade-in">
        {children}
      </main>
      <Footer />
      <Bot />
    </div>
  );
};

export default MainLayout;
