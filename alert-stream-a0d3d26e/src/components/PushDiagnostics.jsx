import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function PushDiagnostics({ userPhone }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results = {};

    try {
      // Check notification support
      results.notificationSupported = 'Notification' in window;
      results.notificationPermission = Notification?.permission || 'not available';

      // Check PWA mode
      results.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;

      // Check service worker
      results.swSupported = 'serviceWorker' in navigator;
      
      if (results.swSupported) {
        try {
          // Give service worker time to register if it just started
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 5000))
          ]);
          
          results.swRegistered = !!reg;
          results.swScope = reg?.scope || 'none';
          results.swControlling = !!navigator.serviceWorker.controller;
          
          // Check push subscription
          const sub = await reg.pushManager.getSubscription();
          results.hasPushSubscription = !!sub;
          results.endpoint = sub?.endpoint || 'none';
          results.isAppleEndpoint = sub?.endpoint?.includes('web.push.apple.com') || false;
        } catch (err) {
          results.swRegistered = false;
          results.swError = err.message;
        }
      }

      // Check push manager
      results.pushSupported = 'PushManager' in window;

      // Device info
      results.userAgent = navigator.userAgent;
      results.isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    } catch (err) {
      results.error = err.message;
    }

    setDiagnostics(results);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusIcon = ({ value }) => {
    if (value === true) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (value === false) return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  if (!diagnostics) {
    return (
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Push Notification Diagnostics
          <Button size="sm" onClick={runDiagnostics} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
          <span className="text-slate-300">Device is iOS</span>
          <StatusIcon value={diagnostics.isIOS} />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
          <span className="text-slate-300">Installed as PWA</span>
          <StatusIcon value={diagnostics.isStandalone} />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
          <span className="text-slate-300">Notification Permission</span>
          <span className={`text-sm font-semibold ${
            diagnostics.notificationPermission === 'granted' ? 'text-green-500' :
            diagnostics.notificationPermission === 'denied' ? 'text-red-500' : 'text-yellow-500'
          }`}>
            {diagnostics.notificationPermission}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
          <span className="text-slate-300">Service Worker Registered</span>
          <StatusIcon value={diagnostics.swRegistered} />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
          <span className="text-slate-300">Service Worker Controlling</span>
          <StatusIcon value={diagnostics.swControlling} />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
          <span className="text-slate-300">Push Subscription Active</span>
          <StatusIcon value={diagnostics.hasPushSubscription} />
        </div>

        {diagnostics.endpoint && diagnostics.endpoint !== 'none' && (
          <>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-300">Using Apple Push</span>
              <StatusIcon value={diagnostics.isAppleEndpoint} />
            </div>

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Push Endpoint:</p>
              <p className="text-xs text-cyan-400 break-all">{diagnostics.endpoint}</p>
            </div>
          </>
        )}

        {diagnostics.swScope && (
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Service Worker Scope:</p>
            <p className="text-xs text-cyan-400">{diagnostics.swScope}</p>
          </div>
        )}

        <div className="p-3 bg-slate-900/50 rounded-lg">
          <p className="text-xs text-slate-400 mb-1">User Agent:</p>
          <p className="text-xs text-slate-300 break-all">{diagnostics.userAgent}</p>
        </div>

        {diagnostics.error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-xs text-red-400">{diagnostics.error}</p>
          </div>
        )}

        {!diagnostics.isStandalone && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
            <p className="text-sm text-yellow-400 font-semibold mb-2">⚠️ Not Installed as PWA</p>
            <p className="text-xs text-yellow-300">
              For background notifications on iOS:
              <br/>1. Tap Share button in Safari
              <br/>2. Select "Add to Home Screen"
              <br/>3. Open app from home screen icon
            </p>
          </div>
        )}

        {diagnostics.notificationPermission !== 'granted' && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400 font-semibold mb-2">❌ Notifications Not Allowed</p>
            <p className="text-xs text-red-300">
              Go to: Settings → Notifications → Alert Center
              <br/>Enable "Allow Notifications"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}