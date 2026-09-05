import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationsApi } from '../services/api';
import { Quotation } from '../types';
import { Plus, ArrowRight, DollarSign, Filter, RefreshCw, Layers } from 'lucide-react';

const COLUMNS = [
  { id: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'pending_approval', label: 'Pending Approval', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'negotiation', label: 'Under Negotiation', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  { id: 'confirmed', label: 'Confirmed / Fulfillment', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
];

export const PipelineKanban: React.FC = () => {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await quotationsApi.list();
      setQuotes(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Layers className="h-6 w-6 text-sky-600" />
            <span>Deal Pipeline (Kanban Board)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stage tracking with auto-approval risk badges and margin visibility.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchQuotes}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm transition"
            title="Refresh Board"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/quote/new')}
            className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Quote</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colQuotes = quotes.filter((q) => q.status === col.id);
          const colTotal = colQuotes.reduce((sum, q) => sum + q.total_amount, 0);

          return (
            <div key={col.id} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 min-h-[500px] flex flex-col space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500">({colQuotes.length})</span>
                </div>
                <span className="text-[11px] font-bold text-slate-700">${colTotal.toLocaleString()}</span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 custom-scrollbar flex-1">
                {colQuotes.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    No deals in {col.label.toLowerCase()}
                  </div>
                ) : (
                  colQuotes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => navigate(`/quote/${q.id}`)}
                      className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 transition cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900">{q.quote_number}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          q.blended_risk === 'HIGH' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          q.blended_risk === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {q.blended_risk}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-800 truncate">{q.customer_name}</h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                            {q.customer_tier} Tier
                          </span>
                          <span className="text-[10px] text-slate-400">by {q.rep_name}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">${q.total_amount.toLocaleString()}</span>
                        <span className="font-bold text-emerald-600 text-[11px]">{q.total_margin_pct}% margin</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
