import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Bell, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-cyan-500 to-purple-500 mb-8"
        >
          <Bell className="h-12 w-12 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold text-white mb-4"
        >
          Alert Center
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-lg mb-12"
        >
          Real-time notifications delivered instantly to your customers
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <Link to={createPageUrl('CustomerAlerts')}>
            <Button className="w-full h-14 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 rounded-xl text-lg font-medium">
              <Bell className="h-5 w-5 mr-3" />
              View Alerts
              <ArrowRight className="h-5 w-5 ml-3" />
            </Button>
          </Link>

          {user?.role === 'admin' && (
            <Link to={createPageUrl('AdminDashboard')}>
              <Button 
                variant="outline" 
                className="w-full h-14 border-slate-700 text-slate-300 hover:bg-slate-800/50 rounded-xl text-lg"
              >
                <Shield className="h-5 w-5 mr-3" />
                Admin Dashboard
              </Button>
            </Link>
          )}

          {!user && (
            <Button 
              variant="ghost"
              onClick={() => base44.auth.redirectToLogin()}
              className="w-full text-slate-400 hover:text-white"
            >
              Admin Login
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}