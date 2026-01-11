import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Lock, Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerLogin({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    
    if (!phone || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      const users = await base44.entities.AppUser.filter({ 
        phone_number: phone 
      });

      if (users.length === 0) {
        toast.error('Invalid phone number or password');
        setLoading(false);
        return;
      }

      const user = users[0];

      if (!user.is_active) {
        toast.error('Your account has been deactivated');
        setLoading(false);
        return;
      }

      if (atob(user.password_hash) !== password) {
        toast.error('Invalid phone number or password');
        setLoading(false);
        return;
      }

      await base44.entities.AppUser.update(user.id, { 
        last_login: new Date().toISOString() 
      });

      localStorage.setItem('customer_user', JSON.stringify(user));
      onLogin(user);
      toast.success('Welcome back!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '25%', left: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '9999px', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '25%', right: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '9999px', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: '448px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)', marginBottom: '16px' }}>
            <Bell style={{ height: '32px', width: '32px', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Alert Center</h1>
          <p style={{ color: '#94a3b8' }}>Sign in to view your alerts</p>
        </div>

        <form onSubmit={handleLogin} style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(24px)', border: '1px solid #1e293b', borderRadius: '24px', padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <Label className="text-slate-300" style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1' }}>Phone Number</Label>
            <div style={{ position: 'relative' }}>
              <Phone style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', height: '20px', width: '20px', color: '#94a3b8', pointerEvents: 'none' }} />
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '48px', height: '56px', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', color: 'white', borderRadius: '12px', width: '100%', fontSize: '16px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Label className="text-slate-300" style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1' }}>Password</Label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', height: '20px', width: '20px', color: '#94a3b8', pointerEvents: 'none' }} />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '48px', height: '56px', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', color: 'white', borderRadius: '12px', width: '100%', fontSize: '16px' }}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            style={{ width: '100%', height: '56px', background: 'linear-gradient(90deg, #06b6d4 0%, #a855f7 100%)', borderRadius: '12px', fontSize: '18px', fontWeight: '500', border: 'none', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' }}>
          Contact your administrator if you need access
        </p>
      </div>
    </div>
  );
}