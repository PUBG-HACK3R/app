'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function AddToHomePopup() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if user is on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if user has already dismissed the popup
    const hasSeenPopup = localStorage.getItem('weearn-pwa-popup-dismissed');
    
    if (hasSeenPopup || standalone) {
      return;
    }

    // Listen for the beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show popup after a short delay for better UX
      setTimeout(() => {
        setShowPopup(true);
      }, 3000);
    };

    // For iOS Safari, show popup after delay since there's no beforeinstallprompt
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPopup(true);
      }, 5000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPopup(false);
    } else if (isIOS) {
      // iOS Safari - just close popup since we can't programmatically install
      setShowPopup(false);
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    localStorage.setItem('weearn-pwa-popup-dismissed', 'true');
  };

  if (!showPopup || isStandalone) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          showPopup ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleDismiss}
      />
      
      {/* Popup */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
          showPopup ? 'translate-y-0' : 'translate-y-full'
        } md:bottom-8 md:left-8 md:right-auto md:max-w-sm md:rounded-2xl`}
      >
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-yellow-500/20 shadow-2xl shadow-yellow-500/10">
          {/* Mobile: Bottom sheet style */}
          <div className="md:hidden">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mt-3 mb-4"></div>
          </div>
          
          {/* Desktop: Rounded corners */}
          <div className="hidden md:block absolute -top-1 -left-1 -right-1 -bottom-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl -z-10 opacity-20"></div>
          
          <div className="p-6 md:p-8">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/25">
                {isIOS ? (
                  <Smartphone className="w-8 h-8 text-black" />
                ) : (
                  <Download className="w-8 h-8 text-black" />
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Install WeEarn
            </h3>

            {/* Message */}
            <p className="text-gray-300 text-center mb-6 leading-relaxed">
              Add WeEarn to your home screen for quick access to your crypto investments and earnings.
            </p>

            {/* iOS specific instructions */}
            {isIOS && (
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
                <p className="text-sm text-gray-300 text-center">
                  Tap the <span className="text-blue-400">Share</span> button in Safari, then select <span className="text-yellow-400">"Add to Home Screen"</span>
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40"
              >
                {isIOS ? 'Got it!' : 'Install Now'}
              </button>
              
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 border border-gray-600 hover:border-gray-500"
              >
                Maybe Later
              </button>
            </div>

            {/* Benefits */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Faster Access</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Offline Support</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Native Feel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
