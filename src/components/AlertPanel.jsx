import React from 'react';
import { useRailwayStore } from '../store/useRailwayStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { AlertCircle, Train, CheckCircle2, X } from 'lucide-react';
import { Badge } from './ui/Badge';

export function AlertPanel({ onClose }) {
  const { activeTrains } = useRailwayStore();
  const delayedTrains = activeTrains.filter(t => t.delayMinutes > 15);

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 p-4 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          Alert Center
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
        {delayedTrains.length > 0 ? (
          delayedTrains.map(train => (
            <Card key={train.id} className="bg-rose-50 border-rose-100 shadow-none">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Train className="w-4 h-4 text-rose-500" />
                    <span className="font-bold text-slate-900 text-sm">{train.number}</span>
                  </div>
                  <Badge variant="danger">{train.delayMinutes}m delay</Badge>
                </div>
                <p className="text-xs text-slate-600">{train.name}</p>
                <p className="text-xs text-rose-600 mt-2">Waiting due to platform unavailability.</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-50" />
            <p className="text-sm">No critical delays</p>
          </div>
        )}
      </div>
    </div>
  );
}
