import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import PushDiagnostics from '../components/PushDiagnostics';

export default function CustomerAlerts() {
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [keepAwake, setKeepAwake] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const alertIdsRef = useRef(new Set());
  const startY = useRef(0);
  const audioContextRef = useRef(null);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    try {
      // Add manifest link
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/.netlify/functions/manifest';
      document.head.appendChild(manifestLink);

      const stored = localStorage.getItem('customer_user');
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
        loadAlerts(userData, true);
        requestNotificationPermission(userData);
      }
      const awakeStored = localStorage.getItem('keep_awake');
      if (awakeStored === 'true') {
        setKeepAwake(true);
      }
    } catch (err) {
      console.error('Init error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && keepAwake) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake lock active');
        }
      } catch (err) {
        console.error('Wake lock error:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('Wake lock released');
        } catch (err) {
          console.error('Wake lock release error:', err);
        }
      }
    };

    if (keepAwake) {
      requestWakeLock();
      const handleVisibility = () => {
        if (!document.hidden && keepAwake) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        releaseWakeLock();
      };
    } else {
      releaseWakeLock();
    }
  }, [keepAwake]);

  useEffect(() => {
    if (!user) return;

    // Poll every 3 seconds when app is open
    const interval = setInterval(() => {
      loadAlerts(user, false);
    }, 3000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAlerts(user, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const requestNotificationPermission = async (userData) => {
    if (!('Notification' in window)) {
      alert('❌ Notifications not supported on this browser');
      return;
    }

    try {
      console.log('📱 Device info:', navigator.userAgent);
      console.log('🔔 Requesting notification permission...');
      
      const permission = await Notification.requestPermission();
      console.log('✅ Permission result:', permission);
      
      if (permission !== 'granted') {
        alert('❌ Notification permission denied. Please enable in Settings.');
        return;
      }

      // Check if running as installed PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true;
      
      console.log('📲 Running as PWA:', isStandalone);
      
      if (!isStandalone) {
        alert('⚠️ For background notifications:\n\n1. Tap Share button\n2. Select "Add to Home Screen"\n3. Open app from home screen\n4. Enable notifications again');
        return;
      }

      // Check if service worker and push are supported
      if (!('serviceWorker' in navigator)) {
        alert('❌ Service workers not supported on this device');
        return;
      }

      if (!('PushManager' in window)) {
        alert('❌ Push notifications not supported on this device');
        return;
      }

      try {
        // Register service worker
        console.log('📝 Registering service worker...');
        const swUrl = '/.netlify/functions/sw';

        const registration = await navigator.serviceWorker.register(swUrl, { 
          scope: '/',
          updateViaCache: 'none'
        });
        console.log('✅ Service worker registered at scope:', registration.scope);

        const readyReg = await navigator.serviceWorker.ready;
        console.log('✅ Service worker ready at scope:', readyReg.scope);

        // Get VAPID key
        console.log('🔑 Getting VAPID key...');
        const { data: vapidData } = await base44.functions.invoke('getVapidPublicKey');
        const vapidPublicKey = vapidData.publicKey;
        console.log('✅ VAPID key received');

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          console.log('📬 Creating new push subscription...');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey
          });
          console.log('✅ Push subscription created:', subscription.endpoint);
        } else {
          console.log('✅ Using existing subscription:', subscription.endpoint);
        }

        // Save to database
        const existingSubs = await base44.entities.PushSubscription.filter({
          user_phone: userData.phone_number
        });

        const subscriptionJSON = subscription.toJSON();
        const alreadySaved = existingSubs.some(sub => 
          sub.subscription?.endpoint === subscriptionJSON.endpoint
        );

        if (!alreadySaved) {
          await base44.entities.PushSubscription.create({
            user_phone: userData.phone_number,
            subscription: subscriptionJSON,
            user_agent: navigator.userAgent
          });
          console.log('💾 Subscription saved to database');
        }

        alert('✅ Push notifications enabled!\n\nYou will receive alerts even when the app is closed.\n\nTest: Close the app and send an alert from admin dashboard.');

      } catch (err) {
        console.error('❌ Push setup error:', err);
        alert('❌ Setup failed: ' + err.message + '\n\nCheck console for details.');
      }
    } catch (err) {
      console.error('❌ Permission error:', err);
      alert('❌ Permission error: ' + err.message);
    }
  };

  const playSound = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      console.log('Ding played');
    } catch (err) {
      console.error('Audio error:', err);
    }
  };

  const showNotification = (alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(alert.title, {
        body: alert.message,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: alert.id,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500]
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const loadAlerts = async (userData, isInitial) => {
    try {
      const allAlerts = await base44.entities.Alert.list('-created_date');
      const filtered = allAlerts.filter(alert => 
        !alert.target_users?.length || alert.target_users.includes(userData.phone_number)
      );
      
      if (!isInitial) {
        const newAlerts = filtered.filter(alert => !alertIdsRef.current.has(alert.id));
        if (newAlerts.length > 0) {
          console.log('New alert detected:', newAlerts.length);
          playSound();
          newAlerts.forEach(alert => showNotification(alert));
        }
      }
      
      alertIdsRef.current = new Set(filtered.map(a => a.id));
      setAlerts(filtered);
    } catch (err) {
      console.error('Load alerts error:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!phone || !password) {
      setError('Please fill all fields');
      return;
    }

    try {
      const users = await base44.entities.AppUser.filter({ phone_number: phone });
      
      if (users.length === 0) {
        setError('Invalid credentials');
        return;
      }

      const userData = users[0];

      if (!userData.is_active) {
        setError('Account deactivated');
        return;
      }

      if (atob(userData.password_hash) !== password) {
        setError('Invalid credentials');
        return;
      }

      localStorage.setItem('customer_user', JSON.stringify(userData));
      setUser(userData);
      loadAlerts(userData, true);
      requestNotificationPermission(userData);
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_user');
    setUser(null);
    setAlerts([]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAlerts(user, false);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e) => {
    const y = e.touches[0].pageY;
    if (y - startY.current > 100 && window.scrollY === 0) {
      handleRefresh();
    }
  };

  const enableSound = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      await audioContextRef.current.resume();
      setSoundEnabled(true);
      playSound();
      localStorage.setItem('sound_enabled', 'true');
    } catch (err) {
      console.error('Enable sound error:', err);
    }
  };

  const toggleKeepAwake = () => {
    const newValue = !keepAwake;
    setKeepAwake(newValue);
    localStorage.setItem('keep_awake', newValue.toString());
  };

  const testLocalNotification = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      console.log('Test using SW at scope:', reg.scope);

      await reg.showNotification('Test Notification', {
        body: 'If you see this, local notifications work!',
        icon: 'https://via.placeholder.com/192x192/06b6d4/ffffff?text=A',
        badge: 'https://via.placeholder.com/72x72/06b6d4/ffffff?text=A',
        vibrate: [200, 100, 200],
        tag: 'test-' + Date.now()
      });

      alert('✅ Test notification sent! Check if it appeared.');
    } catch (err) {
      alert('❌ Test failed: ' + err.message);
      console.error('Test notification error:', err);
    }
  };

  const testScope = async () => {
    try {
      // First test if endpoint returns JS
      const response = await fetch('/.netlify/functions/sw');
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      console.log('SW endpoint response:', { 
        status: response.status, 
        contentType,
        textPreview: text.substring(0, 100)
      });

      if (!contentType?.includes('javascript')) {
        alert('❌ Endpoint returns:\n' + contentType + '\n\nNot serving as JavaScript!\n\nFirst 100 chars:\n' + text.substring(0, 100));
        return;
      }

      // Now try registration
      const reg = await navigator.serviceWorker.register('/.netlify/functions/sw');
      alert('🔍 Service Worker Scope:\n\n' + reg.scope + '\n\n' + 
            (reg.scope.includes('/.netlify/functions/') ? 
            '❌ WRONG: Scope limited to /functions/\nCannot control root pages!' : 
            '✅ CORRECT: Can control all pages'));
    } catch (err) {
      alert('❌ Error:\n' + err.message);
      console.error('Test error:', err);
    }
  };



  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020617',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <h1 style={{ color: 'white', fontSize: '28px', marginBottom: '30px', textAlign: 'center' }}>
            Alert Center
          </h1>
          
          <form onSubmit={handleLogin} style={{ background: '#1e293b', padding: '30px', borderRadius: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
            </div>

            {error && (
              <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '14px' }}>{error}</div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(90deg, #06b6d4, #a855f7)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <PWAInstallPrompt />
      <div 
        style={{ minHeight: '100vh', background: '#020617', padding: '20px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <style>{`
        @keyframes flashLights {
          0%, 48% { background: #dc2626; box-shadow: 0 0 20px #dc2626; }
          50%, 98% { background: #2563eb; box-shadow: 0 0 20px #2563eb; }
        }
      `}</style>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '24px', marginBottom: '5px' }}>Alert Center</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Welcome, {user.name}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              style={{
                padding: '10px 20px',
                background: showDiagnostics ? '#7c3aed' : '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔍 Debug
            </button>
            <button
              onClick={testLocalNotification}
              style={{
                padding: '10px 20px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔔 Test
            </button>
            <button
              onClick={testScope}
              style={{
                padding: '10px 20px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔍 Scope
            </button>
            <button
              onClick={toggleKeepAwake}
              style={{
                padding: '10px 20px',
                background: keepAwake ? '#0f766e' : '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {keepAwake ? '☀️ On' : '🌙 Off'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                padding: '10px 20px',
                background: refreshing ? '#334155' : '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {refreshing ? '↻' : '⟳'}
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {showDiagnostics && (
          <div style={{ marginBottom: '20px' }}>
            <PushDiagnostics userPhone={user.phone_number} />
          </div>
        )}



        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                position: 'relative',
                padding: '20px',
                background: '#1e293b',
                border: '2px solid #991b1b',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                animation: 'flashLights 1s infinite'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                  {alert.title}
                </h3>
                <span style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                  {format(new Date(alert.created_date), 'MMM d, h:mm a')}
                </span>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {alert.message.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                  /^https?:\/\//.test(part) ? (
                    <a 
                      key={i} 
                      href={part} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        color: '#06b6d4', 
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        display: 'inline-block',
                        padding: '2px 0'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {part}
                    </a>
                  ) : part
                )}
              </p>
              {(alert.link || alert.waze_location) && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                  {alert.link && (
                    <a
                      href={alert.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.5)',
                        borderRadius: '8px',
                        color: '#06b6d4',
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🔗 Open Link
                    </a>
                  )}
                  {alert.waze_location && (
                    <a
                      href={alert.waze_location.includes(',') 
                        ? `https://waze.com/ul?ll=${alert.waze_location}&navigate=yes`
                        : `https://waze.com/ul?q=${encodeURIComponent(alert.waze_location)}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.5)',
                        borderRadius: '8px',
                        color: '#a855f7',
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🧭 Waze
                    </a>
                  )}
                </div>
              )}
              </div>
              ))}

              {alerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              No alerts yet
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}