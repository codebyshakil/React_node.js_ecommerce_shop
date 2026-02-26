import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

interface ReCaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

const loadScript = (callback: () => void) => {
  if (scriptLoaded && window.grecaptcha) {
    callback();
    return;
  }
  loadCallbacks.push(callback);
  if (scriptLoading) return;
  scriptLoading = true;
  window.onRecaptchaLoad = () => {
    scriptLoaded = true;
    scriptLoading = false;
    loadCallbacks.forEach(cb => cb());
    loadCallbacks.length = 0;
  };
  const script = document.createElement('script');
  script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
};

const ReCaptcha = ({ siteKey, onVerify, onExpire }: ReCaptchaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.grecaptcha?.render) return;
    if (widgetIdRef.current !== null) {
      try { window.grecaptcha.reset(widgetIdRef.current); } catch {}
      return;
    }
    widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
    });
  }, [siteKey, onVerify, onExpire]);

  useEffect(() => {
    loadScript(renderWidget);
  }, [renderWidget]);

  return <div ref={containerRef} className="my-3" />;
};

export default ReCaptcha;
