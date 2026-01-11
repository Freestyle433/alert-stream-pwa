import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Users, 
  Send, 
  History, 
  Settings,
  Copy,
  Check,
  Loader2,
  Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import UserManagement from '../components/admin/UserManagement';
import SendAlert from '../components/admin/SendAlert';
import AlertCard from '../components/alerts/AlertCard';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('send');
  const [copied, setCopied] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        toast.error('Admin access required');
        window.location.href = '/';
        return;
      }
      setAdmin(user);
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.list('-created_date', 50)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list()
  });

  const openFunctionDashboard = () => {
    window.open('https://dashboard.base44.com', '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'from-cyan-500 to-blue-500' },
    { label: 'Active Users', value: users.filter(u => u.is_active).length, icon: Shield, color: 'from-green-500 to-emerald-500' },
    { label: 'Total Alerts', value: alerts.length, icon: Bell, color: 'from-orange-500 to-red-500' },
    { label: 'Today\'s Alerts', value: alerts.filter(a => new Date(a.created_date).toDateString() === new Date().toDateString()).length, icon: Send, color: 'from-purple-500 to-pink-500' }
  ];

  return (
    <>
      <PWAInstallPrompt />
      <div className="min-h-screen bg-slate-950">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

      <div className="relative max-w-7xl mx-auto p-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">Manage alerts and users</p>
            </div>
          </div>

          <Badge variant="outline" className="border-cyan-500 text-cyan-400">
            {admin?.email}
          </Badge>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-y-6 translate-x-6`} />
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-slate-400 text-sm">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-400" />
              API Webhook Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm mb-4">
              Use this endpoint to send alerts from your external applications
            </p>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm font-semibold mb-2">📍 Get Your Webhook URL:</p>
                <ol className="text-slate-300 text-sm space-y-1 ml-4 list-decimal">
                  <li>Go to Base44 Dashboard</li>
                  <li>Navigate to: <span className="text-cyan-400">Code → Functions → receiveAlert</span></li>
                  <li>Copy the function endpoint URL shown there</li>
                </ol>
                <Button
                  onClick={openFunctionDashboard}
                  className="mt-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
                >
                  Open Dashboard
                </Button>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2">Send POST request with JSON body:</p>
                <code className="block px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 text-sm">
                  {`{ "title": "Alert Title", "message": "Alert message", "priority": "high" }`}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
            <TabsTrigger value="send" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500">
              <Send className="h-4 w-4 mr-2" />
              Send Alert
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500">
              <History className="h-4 w-4 mr-2" />
              Alert History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send">
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Send New Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <SendAlert />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.slice(0, 20).map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      isRead={false}
                      onMarkRead={() => {}}
                    />
                  ))}
                  {alerts.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No alerts yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}