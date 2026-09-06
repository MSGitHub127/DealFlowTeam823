import React, { useState, useEffect } from 'react';
import { configApi, productsApi, warehouseApi } from '../services/api';
import {
  DiscountTierConfig, CategoryDiscountConfig, ApprovalRule, UpsellRule,
  Product, Warehouse
} from '../types';
import {
  Settings, Sliders, ShieldCheck, Tag, Box,
  Plus, Save, RefreshCw, Check
} from 'lucide-react';

export const AdminConfigView: React.FC = () => {
  const [tiers, setTiers] = useState<DiscountTierConfig[]>([]);
  const [categories, setCategories] = useState<CategoryDiscountConfig[]>([]);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [upsellRules, setUpsellRules] = useState<UpsellRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeTab, setActiveTab] = useState<'discounts' | 'approvals' | 'upsells' | 'products'>('discounts');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // New product form state
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdSku, setNewProdSku] = useState<string>('');
  const [newProdCat, setNewProdCat] = useState<'Hardware' | 'Services' | 'Subscriptions'>('Hardware');
  const [newProdPrice, setNewProdPrice] = useState<number>(100);
  const [newProdCost, setNewProdCost] = useState<number>(60);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, aRes, uRes, pRes, wRes] = await Promise.all([
        configApi.getDiscountTiers(),
        configApi.getCategoryCeilings(),
        configApi.getApprovalRules(),
        configApi.getUpsellRules(),
        productsApi.list(),
        warehouseApi.list()
      ]);
      setTiers(tRes.data);
      setCategories(cRes.data);
      setApprovalRules(aRes.data);
      setUpsellRules(uRes.data);
      setProducts(pRes.data);
      setWarehouses(wRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateTierCeiling = async (tierName: string, val: number) => {
    try {
      await configApi.saveDiscountTier({ tier: tierName, max_discount_pct: val });
      setTiers(prev => prev.map(t => t.tier === tierName ? { ...t, max_discount_pct: val } : t));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCategoryCeiling = async (catName: string, val: number) => {
    try {
      await configApi.saveCategoryCeiling({ category: catName, max_discount_pct: val });
      setCategories(prev => prev.map(c => c.category === catName ? { ...c, max_discount_pct: val } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProdName || !newProdSku) return;
    setSaving(true);
    try {
      await productsApi.create({
        name: newProdName,
        sku: newProdSku,
        category: newProdCat,
        base_price: newProdPrice,
        cost_price: newProdCost,
        unit: newProdCat === 'Subscriptions' ? 'User/Month' : 'Units',
        is_subscription: newProdCat === 'Subscriptions'
      });
      setNewProdName('');
      setNewProdSku('');
      alert('Product created successfully!');
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Settings className="h-6 w-6 text-sky-600" />
            <span>Sales-Ops Governance & Dynamic Rules Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin configuration for discount ceilings, approval thresholds, upsell pairings, and products (Screen 16-18).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'discounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Discount Ceilings (Tier & Cat)
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'approvals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Approval Bands
          </button>
          <button
            onClick={() => setActiveTab('upsells')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'upsells' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Upsell Rules
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Products & Pricing
          </button>
        </div>
      </div>

      {/* Screen 18 Part 1: Discount Ceilings */}
      {activeTab === 'discounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Tier Ceilings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Customer Tier Discount Ceilings</h3>
                <p className="text-xs text-slate-500">Maximum permitted discretionary discount per account level</p>
              </div>
              <Sliders className="h-4 w-4 text-sky-600" />
            </div>

            <div className="space-y-4">
              {tiers.map((t) => (
                <div key={t.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 text-sm">{t.tier} Tier</span>
                    <span className="font-black text-sky-600 text-sm">{t.max_discount_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="0.5"
                    value={t.max_discount_pct}
                    onChange={(e) => handleUpdateTierCeiling(t.tier, parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0% (Strict)</span>
                    <span>20%</span>
                    <span>40% (Permissive)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Ceilings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Category Specific Ceilings</h3>
                <p className="text-xs text-slate-500">Stricter category limits override generous customer tiers</p>
              </div>
              <Sliders className="h-4 w-4 text-amber-600" />
            </div>

            <div className="space-y-4">
              {categories.map((c) => (
                <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 text-sm">{c.category}</span>
                    <span className="font-black text-amber-600 text-sm">{c.max_discount_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={c.max_discount_pct}
                    onChange={(e) => handleUpdateCategoryCeiling(c.category, parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0% (Low Margin)</span>
                    <span>15%</span>
                    <span>30% (High Margin)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screen 18 Part 2: Approval Chain Rules */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Approval Chain Thresholds & Multi-Step Routing</h3>
              <p className="text-xs text-slate-500">
                Maps single-line excess and total quote excess to approval risk bands (NONE, MEDIUM, HIGH)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Rule Name</th>
                  <th className="py-2.5 px-3">Risk Band</th>
                  <th className="py-2.5 px-3">Single Line Excess</th>
                  <th className="py-2.5 px-3">Total Aggregate Excess</th>
                  <th className="py-2.5 px-3">Approver Roles Required</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvalRules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-800">{r.name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        r.risk_band === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                        r.risk_band === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.risk_band}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {r.min_excess}% to {r.max_excess}%
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      &ge; {r.min_total_excess}%
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {r.approvers.join(' → ')}
                    </td>
                    <td className="py-3 px-3 text-slate-500 italic">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screen 4 Setup Part: Upsell Rules */}
      {activeTab === 'upsells' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm">Product Upsell & Cross-Sell Pairings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Primary Trigger Product</th>
                  <th className="py-2.5 px-3">Suggested Add-On</th>
                  <th className="py-2.5 px-3">Co-Purchase Velocity</th>
                  <th className="py-2.5 px-3">Promoted</th>
                  <th className="py-2.5 px-3">Min Margin Floor</th>
                  <th className="py-2.5 px-3">Recommendation Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upsellRules.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-800">{u.primary_product_name}</td>
                    <td className="py-3 px-3 font-bold text-sky-700">{u.suggested_product_name}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{Math.round(u.co_purchase_score * 100)}% attach rate</td>
                    <td className="py-3 px-3">
                      {u.is_promoted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">
                          PROMOTED
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-600">&ge; {u.min_margin_pct}%</td>
                    <td className="py-3 px-3 text-slate-500 italic">{u.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screens 16 & 17: Product Catalog & Price Lists */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Create Product Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Add New Product to Catalog</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Server Rack Mount 48U"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">SKU</label>
                <input
                  type="text"
                  placeholder="HW-RCK-48"
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Category</label>
                <select
                  value={newProdCat}
                  onChange={(e) => setNewProdCat(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="Hardware">Hardware</option>
                  <option value="Services">Services</option>
                  <option value="Subscriptions">Subscriptions</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Base Price ($)</label>
                <input
                  type="number"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-5 flex justify-end">
                <button
                  onClick={handleCreateProduct}
                  disabled={saving}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow transition"
                >
                  {saving ? 'Saving...' : '+ Save New Product'}
                </button>
              </div>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Product Catalog</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Base Price</th>
                    <th className="py-2.5 px-3">Cost Price</th>
                    <th className="py-2.5 px-3">Standard Margin</th>
                    <th className="py-2.5 px-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const margin = p.base_price - p.cost_price;
                    const marginPct = p.base_price > 0 ? (margin / p.base_price * 100).toFixed(1) : '0';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-800">{p.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{p.sku}</td>
                        <td className="py-3 px-3">{p.category}</td>
                        <td className="py-3 px-3 font-black text-slate-900">${p.base_price.toFixed(2)}</td>
                        <td className="py-3 px-3 text-slate-600">${p.cost_price.toFixed(2)}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">${margin.toFixed(2)} ({marginPct}%)</td>
                        <td className="py-3 px-3">
                          {p.is_subscription ? (
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              Recurring SaaS
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                              One-Time
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};