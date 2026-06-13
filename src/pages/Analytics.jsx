import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { ANALYTICS_DATA, MOCK_FEED } from '../data/mockData';
import { ReactFlow, Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { Badge } from '../components/ui/Badge';
import { motion } from 'framer-motion';

const flowNodes = [
  { id: '1', position: { x: 50, y: 100 }, data: { label: 'Howrah Junction' }, style: { background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
  { id: '2', position: { x: 250, y: 50 }, data: { label: 'Platform 01' }, style: { background: '#0f172a', color: '#10b981', border: '1px solid #10b981', borderRadius: '8px', padding: '10px' } },
  { id: '3', position: { x: 250, y: 150 }, data: { label: 'Platform 02' }, style: { background: '#0f172a', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px' } },
  { id: '4', position: { x: 450, y: 50 }, data: { label: 'TRN 12045' }, style: { background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
  { id: '5', position: { x: 450, y: 150 }, data: { label: 'TRN 12301' }, style: { background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
];

const flowEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#ef4444' } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#06b6d4' } },
  { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: '#06b6d4' } },
];

export default function Analytics() {
  return (
    <div className="h-full w-full p-4 md:p-6 overflow-y-auto overflow-x-hidden space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Network Analytics & Flow</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Platform Utilization Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Utilization</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ANALYTICS_DATA.platformUtilization}>
                <defs>
                  <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                <Area type="monotone" dataKey="used" stroke="#06b6d4" fillOpacity={1} fill="url(#colorUsed)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Congestion Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Congestion Trend (Weekly)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ANALYTICS_DATA.congestionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delay Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Delay Distribution by Zone</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ANALYTICS_DATA.delayDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="zone" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="delay" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Real-Time Operations Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Real-Time Operations Feed</CardTitle>
          </CardHeader>
          <CardContent className="h-72 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {MOCK_FEED.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-3 text-sm p-3 rounded-lg bg-white/5 border border-white/5"
                >
                  <div className="text-slate-400 font-mono w-16 flex-shrink-0">{item.time}</div>
                  <div className="flex-1 text-slate-200">{item.message}</div>
                  <Badge variant={item.type}>{item.type}</Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Network Flow Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform Allocation Flow (Logical View)</CardTitle>
          </CardHeader>
          <CardContent className="h-96 p-0 border-t border-white/5">
            <ReactFlow 
              nodes={flowNodes} 
              edges={flowEdges} 
              fitView 
              className="bg-[#030712]/50"
            >
              <Background color="#334155" gap={16} />
              <Controls className="bg-slate-900 border-white/10 fill-white" />
            </ReactFlow>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
