import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Bell, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SendAlert() {
  const [alert, setAlert] = useState({
    title: '',
    message: '',
    source: 'Admin Dashboard',
    target_users: [],
    link: '',
    waze_location: ''
  });
  const [sendToAll, setSendToAll] = useState(true);

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list()
  });

  const mutation = useMutation({
    mutationFn: async (alertData) => {
      const newAlert = await base44.entities.Alert.create({
        ...alertData,
        target_users: sendToAll ? [] : alertData.target_users,
        read_by: []
      });

      await base44.functions.invoke('sendPushNotification', {
        alert: newAlert,
        target_users: sendToAll ? [] : alertData.target_users
      });

      return newAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setAlert({
        title: '',
        message: '',
        source: 'Admin Dashboard',
        target_users: [],
        link: '',
        waze_location: ''
      });
      toast.success('Alert sent successfully!');
    }
  });

  const handleUserToggle = (phone) => {
    setAlert(prev => ({
      ...prev,
      target_users: prev.target_users.includes(phone)
        ? prev.target_users.filter(p => p !== phone)
        : [...prev.target_users, phone]
    }));
  };

  const sendTestAlert = () => {
    mutation.mutate({
      title: 'Test Alert',
      message: 'This is a test alert sent at ' + new Date().toLocaleTimeString(),
      source: 'Admin Test',
      target_users: []
    });
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={sendTestAlert}
        disabled={mutation.isPending}
        variant="outline"
        className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
      >
        <Zap className="h-4 w-4 mr-2" />
        Send Test Alert
      </Button>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Alert Title</Label>
          <Input
            placeholder="Enter alert title..."
            value={alert.title}
            onChange={(e) => setAlert({...alert, title: e.target.value})}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Message</Label>
          <Textarea
            placeholder="Enter alert message..."
            value={alert.message}
            onChange={(e) => setAlert({...alert, message: e.target.value})}
            className="bg-slate-800/50 border-slate-700 text-white min-h-[120px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Source</Label>
          <Input
            placeholder="Alert source..."
            value={alert.source}
            onChange={(e) => setAlert({...alert, source: e.target.value})}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Link (Optional)</Label>
          <Input
            placeholder="https://example.com"
            value={alert.link}
            onChange={(e) => setAlert({...alert, link: e.target.value})}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Waze Location (Optional)</Label>
          <Input
            placeholder="32.0853,34.7818 or Address"
            value={alert.waze_location}
            onChange={(e) => setAlert({...alert, waze_location: e.target.value})}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        <div className="space-y-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-400" />
            <Label className="text-slate-300">Target Users</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sendToAll"
              checked={sendToAll}
              onCheckedChange={setSendToAll}
            />
            <Label htmlFor="sendToAll" className="text-slate-400 cursor-pointer">
              Send to all users
            </Label>
          </div>

          {!sendToAll && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.filter(u => u.is_active).map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <Checkbox
                    id={user.id}
                    checked={alert.target_users.includes(user.phone_number)}
                    onCheckedChange={() => handleUserToggle(user.phone_number)}
                  />
                  <Label htmlFor={user.id} className="text-slate-400 cursor-pointer">
                    {user.name} ({user.phone_number})
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={() => mutation.mutate(alert)}
        disabled={!alert.title || !alert.message || mutation.isPending}
        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
      >
        <Send className="h-4 w-4 mr-2" />
        {mutation.isPending ? 'Sending...' : 'Send Alert'}
      </Button>
    </div>
  );
}