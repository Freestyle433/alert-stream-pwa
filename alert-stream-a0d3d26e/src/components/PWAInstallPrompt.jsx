import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if prompt was dismissed recently
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    if (iOS) {
      // Show iOS instructions after a delay
      setTimeout(() => setShowPrompt(true), 3000);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-slate-800 border border-cyan-500/30 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500">
              {isIOS ? <Share className="h-5 w-5 text-white" /> : <Download className="h-5 w-5 text-white" />}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Install App</h3>
              {isIOS ? (
                <div className="text-slate-400 text-sm mb-3">
                  <p className="mb-2">Tap <Share className="inline h-4 w-4 mx-1" /> in Safari then select "Add to Home Screen"</p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm mb-3">
                  Install Alert Center for quick access and offline support
                </p>
              )}
              <div className="flex gap-2">
                {!isIOS && deferredPrompt && (
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
                  >
                    Install
                  </Button>
                )}
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-slate-400"
                >
                  {isIOS ? 'Got it' : 'Not now'}
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}