import React, { useState, useEffect } from 'react';
import { fulfillmentApi, warehouseApi, quotationsApi } from '../services/api';
import {
  FulfillmentOrder, Warehouse, StockItem, Quotation,
  FulfillmentSuggestion
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Truck, PackageCheck, AlertCircle, RefreshCw, CheckCircle2,
  Box, Split, ArrowRight, ShieldAlert, Plus
} from 'lucide-react';

export const FulfillmentView: React.FC = () => {
  const { currentRole } = useAuth();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [approvedQuotes, setApprovedQuotes] = useState<Quotation[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [activeSuggestion, setActiveSuggestion] = useState<FulfillmentSuggestion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Manual override state
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordRes, whRes, stRes, qRes] = await Promise.all([
        fulfillmentApi.listOrders(),
        warehouseApi.list(),
        warehouseApi.getStocks(),
        quotationsApi.list('approved')
      ]);
      setOrders(ordRes.data);
      setWarehouses(whRes.data);
      setStocks(stRes.data);
      setApprovedQuotes(qRes.data);

      if (qRes.data.length > 0 && !selectedQuoteId) {
        setSelectedQuoteId(qRes.data[0].id);
        fetchSuggestion(qRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestion = async (quoteId: string) => {
    try {
      const res = await fulfillmentApi.getSuggestion(quoteId);
      setActiveSuggestion(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    fetchSuggestion(quoteId);
  };

  const handleAcceptSplit = async () => {
    if (!selectedQuoteId) return;
    setActionLoading(true);
    try {
      await fulfillmentApi.acceptSplit(selectedQuoteId);
      alert('Split plan accepted! Inventory reserved across warehouses.');
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to accept split');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fulfillmentApi.shipOrder(orderId);
      alert(`Order marked as shipped! Generated shipment invoice: ${res.data.invoice_number}`);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to ship order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsolidate = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fulfillmentApi.consolidateBackorders(orderId);
      alert(res.data.message);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to consolidate backorders');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Truck className="h-6 w-6 text-sky-600" />
            <span>Fulfillment & Multi-Warehouse Split Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Greedy cost-weighted allocation: Minimizes shipments, auto-detects split requirements and handles backorders.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
          title="Refresh Fulfillment State"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Screen 7: Active Split Suggestion Card for Approved Deals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Split className="h-4 w-4 text-sky-600" />
              <span>Recommended Warehouse Split Allocation</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an approved quotation to evaluate real-time stock allocation across active depots.
            </p>
          </div>

          {approvedQuotes.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Quotation:</label>
              <select
                value={selectedQuoteId}
                onChange={(e) => handleSelectQuote(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
              >
                {approvedQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quote_number} — {q.customer_name} (${q.total_amount.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {activeSuggestion ? (
          <div className="space-y-4">
            {/* Split Strategy Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 font-medium">Split Status:</span>
                <p className="font-extrabold text-slate-900 mt-0.5">
                  {activeSuggestion.is_split ? (
                    <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-black">
                      MULTI-WAREHOUSE SPLIT
                    </span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">
                      SINGLE WAREHOUSE
                    </span>
                  )}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Total Shipments:</span>
                <p className="font-extrabold text-slate-900 mt-0.5">{activeSuggestion.total_shipments} Shipment(s)</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Estimated Freight Cost:</span>
                <p className="font-extrabold text-sky-600 mt-0.5">${activeSuggestion.estimated_shipping_cost}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Fulfillment Capability:</span>
                <p className="font-extrabold text-slate-900 mt-0.5">
                  {activeSuggestion.can_fulfill_completely ? (
                    <span className="text-emerald-600 font-bold">100% In Stock</span>
                  ) : (
                    <span className="text-rose-600 font-bold">Partial Stock (Backorder)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Split Allocations Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Planned Dispatches by Depot</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Origin Warehouse</th>
                      <th className="py-2.5 px-3">Shipping Cost Weight</th>
                      <th className="py-2.5 px-3 font-bold">Allocated Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSuggestion.allocations.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{a.product_name}</td>
                        <td className="py-2.5 px-3 font-semibold text-sky-700">{a.warehouse_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{a.shipping_cost_weight}x baseline</td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">{a.qty_allocated} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Backorders if any */}
            {activeSuggestion.backorders.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <h4 className="text-xs font-bold text-rose-800 flex items-center space-x-1.5">
                  <AlertCircle className="h-4 w-4" />
                  <span>Items Pending Backorder Replenishment</span>
                </h4>
                <div className="mt-2 space-y-1 text-xs text-rose-700">
                  {activeSuggestion.backorders.map((b, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{b.product_name}</span>
                      <span className="font-bold">{b.qty_backordered} backordered</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions for suggestion */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={handleAcceptSplit}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Accept Suggested Split</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No approved orders currently awaiting fulfillment splitting.
          </div>
        )}
      </div>

      {/* Screen 8: Active Fulfillment Orders & Backorder Consolidation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Box className="h-4 w-4 text-sky-600" />
            <span>Active Fulfillment Shipments & Per-Shipment Invoicing</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Invoices generated automatically upon shipment execution
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Order #</th>
                <th className="py-2.5 px-3">Quotation</th>
                <th className="py-2.5 px-3">Shipments</th>
                <th className="py-2.5 px-3">Shipping Cost</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Backorders</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No active fulfillment orders yet. Accept a suggested split above to create one.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">{o.order_number}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{o.quote_number}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{o.total_shipments} depot(s)</td>
                    <td className="py-3 px-3 font-semibold text-sky-600">${o.total_shipping_cost}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        o.status === 'shipped' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {o.backorders.length > 0 ? (
                        <span className="text-rose-600 font-bold">{o.backorders.length} pending</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      {o.status !== 'shipped' && (
                        <button
                          onClick={() => handleShipOrder(o.id)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] transition shadow-sm"
                        >
                          Dispatch & Invoice
                        </button>
                      )}
                      {o.backorders.some(b => !b.is_consolidated) && (
                        <button
                          onClick={() => handleConsolidate(o.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] transition shadow-sm"
                        >
                          Consolidate Backorders
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
