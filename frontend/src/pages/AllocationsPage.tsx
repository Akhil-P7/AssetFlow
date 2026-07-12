import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowRight, AlertTriangle, Search, Clock, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge, AssetStatusBadge, TransferStatusBadge } from '@/components/ui/Badge';
import { TabBar } from '@/components/ui/TabBar';
import { PageLoader, EmptyState } from '@/components/ui/LoadingSpinner';
import { mockApi } from '@/lib/mock-api';
import type { Allocation, TransferRequest, Asset, Employee } from '@/types';
import { AllocationStatus, AssetStatus } from '@/types';

export function AllocationsPage() {
  const [activeTab, setActiveTab] = useState('allocate');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [showConflict, setShowConflict] = useState(false);

  useEffect(() => {
    (async () => {
      const [allocs, trans, assetData, empData] = await Promise.all([
        mockApi.getAllocations(),
        mockApi.getTransfers(),
        mockApi.getAssets(),
        mockApi.getEmployees(),
      ]);
      setAllocations(allocs);
      setTransfers(trans);
      setAssets(assetData);
      setEmployees(empData);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const activeAllocation = selectedAsset ? allocations.find(a => a.assetId === selectedAssetId && a.status === AllocationStatus.ACTIVE) : null;

  const handleAllocate = () => {
    if (activeAllocation) {
      setShowConflict(true);
    }
  };

  const tabs = [
    { key: 'allocate', label: 'Allocate', },
    { key: 'active', label: 'Active Allocations', count: allocations.filter(a => a.status === AllocationStatus.ACTIVE).length },
    { key: 'transfers', label: 'Transfers', count: transfers.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Allocation & Transfer"
        subtitle="Manage asset allocations and transfer requests."
      />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'allocate' && (
        <div className="space-y-6 animate-fade-in">

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Select Asset to Allocate</h3>
            <Select
              label="Asset"
              placeholder="Choose an asset..."
              options={assets.map(a => ({ value: a.id, label: `${a.assetTag} — ${a.name}` }))}
              value={selectedAssetId}
              onChange={(e) => { setSelectedAssetId(e.target.value); setShowConflict(false); }}
            />

            {selectedAsset && (
              <div className="mt-4 p-4 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 animate-fade-in">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedAsset.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedAsset.category?.name} • {selectedAsset.location}</p>
                </div>
                <AssetStatusBadge status={selectedAsset.status} />
              </div>
            )}
          </div>

          {selectedAsset && activeAllocation && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Allocation Conflict</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    This asset is currently allocated to <span className="font-medium text-slate-900 dark:text-slate-100">{activeAllocation.employee?.name || 'Unknown'}</span>.
                    Direct allocation is blocked — submit a <strong>Transfer Request</strong> below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedAsset && !activeAllocation && selectedAsset.status === AssetStatus.AVAILABLE && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 animate-fade-in shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Allocate Asset</h3>
              <div className="space-y-4">
                <Select
                  label="Allocate To (Employee)"
                  placeholder="Select employee..."
                  options={employees.map(e => ({ value: e.id, label: e.name }))}
                />
                <Input label="Expected Return Date" type="date" />
                <Button icon={<ArrowRight className="w-4 h-4" />}>
                  Allocate Asset
                </Button>
              </div>
            </div>
          )}

          {selectedAsset && activeAllocation && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 animate-fade-in shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Request Transfer</h3>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800 text-sm text-slate-500 dark:text-slate-400">
                  From: <span className="font-medium text-slate-900 dark:text-slate-100">{activeAllocation.employee?.name}</span>
                </div>
                <Select
                  label="Transfer To"
                  placeholder="Select employee..."
                  options={employees.map(e => ({ value: e.id, label: e.name }))}
                />
                <Textarea label="Reason for Transfer" placeholder="Explain why this transfer is needed..." />
                <Button icon={<ArrowLeftRight className="w-4 h-4" />}>
                  Submit Transfer Request
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'active' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden animate-fade-in shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocated To</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Since</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Return By</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.filter(a => a.status === AllocationStatus.ACTIVE).map((alloc) => (
                <tr key={alloc.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <code className="font-mono text-xs text-teal-600 dark:text-teal-400">{alloc.asset?.assetTag}</code>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{alloc.asset?.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-slate-100">{alloc.employee?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {new Date(alloc.allocatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-sm hidden md:table-cell">
                    {alloc.expectedReturnDate ? (
                      <span className={new Date(alloc.expectedReturnDate) < new Date() ? 'text-red-500 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                        {new Date(alloc.expectedReturnDate).toLocaleDateString()}
                        {new Date(alloc.expectedReturnDate) < new Date() && ' (overdue)'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Button variant="outline" size="sm">Return</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden animate-fade-in shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {transfer.fromHolder} <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" /> {transfer.toHolder}
                    </p>
                    {transfer.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">{transfer.reason}</p>}
                  </td>
                  <td className="px-5 py-3.5"><TransferStatusBadge status={transfer.status} /></td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {new Date(transfer.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    {transfer.status === 'REQUESTED' && (
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" icon={<Check className="w-3.5 h-3.5" />}>Approve</Button>
                        <Button variant="destructive" size="sm" icon={<X className="w-3.5 h-3.5" />}>Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
