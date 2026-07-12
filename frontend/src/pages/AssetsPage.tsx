import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { AssetStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/LoadingSpinner';
import { mockApi } from '@/lib/mock-api';
import type { Asset, AssetCategory } from '@/types';
import { AssetStatus } from '@/types';

export function AssetsPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [assetData, catData] = await Promise.all([
        mockApi.getAssets(),
        mockApi.getCategories(),
      ]);
      setAssets(assetData);
      setCategories(catData);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  const filtered = assets.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.assetTag.toLowerCase().includes(q) && !(a.serialNumber?.toLowerCase().includes(q))) return false;
    }
    if (statusFilter && a.status !== statusFilter) return false;
    if (categoryFilter && a.categoryId !== categoryFilter) return false;
    return true;
  });

  const statusOptions = Object.values(AssetStatus).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Directory"
        subtitle={`${assets.length} assets registered`}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setRegisterOpen(true)}>
            Register Asset
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
        <div className="flex-1">
          <Input
            placeholder="Search by tag, serial, or name..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          placeholder="All Statuses"
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          placeholder="All Categories"
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
        {(statusFilter || categoryFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setCategoryFilter(''); }}>
            Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No assets found"
          description={search || statusFilter || categoryFilter ? 'Try adjusting your search or filters.' : 'Register your first asset to get started.'}
          action={!search && !statusFilter && !categoryFilter ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setRegisterOpen(true)}>Register Asset</Button> : undefined}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden animate-fade-in shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tag</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => navigate(`/assets/${asset.id}`)}
                  className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <code className="font-mono text-sm text-teal-600 dark:text-teal-400 font-medium">{asset.assetTag}</code>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{asset.name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">{asset.category?.name}</td>
                  <td className="px-5 py-3.5">
                    <AssetStatusBadge status={asset.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400 hidden lg:table-cell">{asset.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Register New Asset" size="lg"
        footer={<><Button variant="secondary" onClick={() => setRegisterOpen(false)}>Cancel</Button><Button icon={<Plus className="w-4 h-4" />}>Register</Button></>}
      >
        <div className="space-y-4">
          <Input label="Asset Name" placeholder="e.g., MacBook Pro 16&quot;" required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" placeholder="Select category" options={categoryOptions} />
            <Input label="Serial Number" placeholder="e.g., SN-MBP-2024-001" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Acquisition Date" type="date" />
            <Input label="Acquisition Cost ($)" type="number" placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Condition" options={[{ value: 'Excellent', label: 'Excellent' }, { value: 'Good', label: 'Good' }, { value: 'Fair', label: 'Fair' }, { value: 'Poor', label: 'Poor' }]} placeholder="Select" />
            <Input label="Location" placeholder="e.g., Floor 3, Desk 12" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-blue-600" />
            This is a bookable resource (room, vehicle, etc.)
          </label>
        </div>
      </Modal>
    </div>
  );
}

export function AssetDetailPage() {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    (async () => {
      const data = await mockApi.getAssetById(id || '');
      setAsset(data || null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;
  if (!asset) return <EmptyState title="Asset not found" description="This asset doesn't exist or has been removed." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={asset.name}
        subtitle={`Asset Tag: ${asset.assetTag}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 animate-fade-in shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Asset Details</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            <DetailRow label="Asset Tag" value={<code className="font-mono text-teal-600 dark:text-teal-400">{asset.assetTag}</code>} />
            <DetailRow label="Status" value={<AssetStatusBadge status={asset.status} />} />
            <DetailRow label="Category" value={asset.category?.name || '—'} />
            <DetailRow label="Serial Number" value={asset.serialNumber || '—'} />
            <DetailRow label="Condition" value={asset.condition || '—'} />
            <DetailRow label="Location" value={asset.location || '—'} />
            <DetailRow label="Acquisition Date" value={asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString() : '—'} />
            <DetailRow label="Acquisition Cost" value={asset.acquisitionCost ? `$${asset.acquisitionCost.toLocaleString()}` : '—'} />
            <DetailRow label="Bookable" value={asset.isBookable ? 'Yes' : 'No'} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 animate-fade-in space-y-3 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Actions</h3>
          <Button variant="secondary" className="w-full justify-start" size="sm">Allocate Asset</Button>
          <Button variant="secondary" className="w-full justify-start" size="sm">Raise Maintenance</Button>
          <Button variant="secondary" className="w-full justify-start" size="sm">View History</Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <div className="text-sm text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
