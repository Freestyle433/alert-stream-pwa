import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, ExternalLink, Navigation } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const priorityConfig = {
  critical: { 
    icon: AlertTriangle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10 border-red-500/30',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30'
  },
  high: { 
    icon: AlertCircle, 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/10 border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  },
  medium: { 
    icon: Bell, 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  },
  low: { 
    icon: Info, 
    color: 'text-green-400', 
    bg: 'bg-green-500/10 border-green-500/30',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30'
  }
};

export default function AlertCard({ alert, isRead, onMarkRead }) {
  const config = priorityConfig[alert.priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "relative rounded-2xl border p-5 transition-all duration-300 cursor-pointer group",
        config.bg,
        isRead ? "opacity-60" : "opacity-100"
      )}
      onClick={onMarkRead}
    >
      {!isRead && (
        <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
      )}
      
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-xl",
          config.bg
        )}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white truncate">{alert.title}</h3>
            <Badge variant="outline" className={cn("text-xs", config.badge)}>
              {alert.priority}
            </Badge>
          </div>
          
          <p className="text-slate-400 text-sm leading-relaxed mb-3" style={{ whiteSpace: 'pre-wrap' }}>
            {alert.message.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
              /^https?:\/\//.test(part) ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                  {part}
                </a>
              ) : part
            )}
          </p>

          {(alert.link || alert.waze_location) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {alert.link && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(alert.link, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Open Link
                </Button>
              )}
              {alert.waze_location && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    const wazeUrl = alert.waze_location.includes(',') 
                      ? `https://waze.com/ul?ll=${alert.waze_location}&navigate=yes`
                      : `https://waze.com/ul?q=${encodeURIComponent(alert.waze_location)}&navigate=yes`;
                    window.open(wazeUrl, '_blank');
                  }}
                >
                  <Navigation className="h-3 w-3 mr-2" />
                  Waze
                </Button>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{format(new Date(alert.created_date), 'MMM d, h:mm a')}</span>
            {alert.source && (
              <span className="px-2 py-0.5 rounded-full bg-slate-700/50">
                {alert.source}
              </span>
            )}
            {isRead && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Read
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}