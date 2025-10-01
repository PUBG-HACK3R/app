"use client";

import { useEffect } from 'react';

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

export function TawkToChat() {
  useEffect(() => {
    // Initialize Tawk.to
    if (typeof window !== 'undefined') {
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://embed.tawk.to/68dd11969c002c194a968eca/1j6fopdk8';
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      }
    }
  }, []);

  return null; // This component doesn't render anything visible
}

// Function to open Tawk.to chat programmatically
export function openTawkToChat() {
  if (typeof window !== 'undefined' && window.Tawk_API) {
    window.Tawk_API.maximize();
  }
}

// Function to minimize Tawk.to chat
export function minimizeTawkToChat() {
  if (typeof window !== 'undefined' && window.Tawk_API) {
    window.Tawk_API.minimize();
  }
}

// Function to check if Tawk.to is loaded
export function isTawkToLoaded() {
  return typeof window !== 'undefined' && window.Tawk_API;
}
