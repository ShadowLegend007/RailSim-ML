import React, { useState } from 'react';
import { useRailwayStore } from '../store/useRailwayStore';
import { X, Train, Clock, PlusCircle } from 'lucide-react';
import { Badge } from './ui/Badge';

export function SpecialTrainScheduler({ onClose }) {
  const { addSpecialTrain } = useRailwayStore();
  const [formData, setFormData] = useState({
    name: '',
    type: 'goods',
    coaches: 40,
    priority: 'Normal'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addSpecialTrain({
      id: `SPL-${Math.floor(Math.random() * 10000)}`,
      name: formData.name,
      number: `SPL-${Math.floor(Math.random() * 1000)}`,
      type: formData.type,
      coaches: formData.coaches,
      priority: formData.priority,
      status: 'Routing',
      isSpecial: true,
      eta: new Date(Date.now() + Math.random() * 3600000).toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Train className="w-5 h-5 text-purple-600" />
            Schedule Special Train
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Train Name / Description</label>
            <input 
              required
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="e.g. Coal Freight RDM"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Train Type</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="goods">Goods / Freight</option>
                <option value="passenger">Special Passenger</option>
                <option value="military">Military</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Priority</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Number of Coaches/Wagons</label>
            <input 
              type="number" 
              min="1"
              max="100"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-purple-500 transition-colors"
              value={formData.coaches}
              onChange={(e) => setFormData({...formData, coaches: parseInt(e.target.value, 10)})}
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add to Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
