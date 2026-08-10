'use client';

import React, { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  siteKey?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onVerify, siteKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const effectiveSiteKey =
    siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    // If running in development or testing without live script, trigger fallback token automatically
    if (effectiveSiteKey.startsWith('1x0000')) {
      onVerify('mock_turnstile_verified_token_12345');
      return;
    }

    // Load Cloudflare Turnstile script dynamically if not present
    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        if (window.turnstile && containerRef.current) {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: effectiveSiteKey,
            callback: onVerify,
            theme: 'light',
          });
        }
      };
    } else if (window.turnstile && containerRef.current) {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: effectiveSiteKey,
        callback: onVerify,
        theme: 'light',
      });
    }
  }, [effectiveSiteKey, onVerify]);

  return (
    <div className="py-2 flex justify-center">
      <div ref={containerRef} id="turnstile-container"></div>
    </div>
  );
};
