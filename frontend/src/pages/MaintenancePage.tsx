import { useState } from 'react';
import { Plus, Wrench, AlertCircle, FileText, Settings, FileSearch, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabBar } from '@/components/ui/TabBar';
import { Button } from '@/components/ui/Button';
import { MaintenanceStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PageLoader, EmptyState } from '@/components/ui/LoadingSpinner';
import apiClient from '@/api/apiClient';
import type { MaintenanceRequest, Asset, Employee } from '@/types';

export function MaintenancePage() {
  const [activeTab, setActiveTab] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);

  const { data: records = [], isLoading: recordsLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance'],
    queryFn: async () => (await apiClient.get('/maintenance')) as MaintenanceRequest[],
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => (await apiClient.get('/assets')) as Asset[],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => (await apiClient.get('/org/employees')) as Employee[],
  });

  if (recordsLoading || assetsLoading || employeesLoading) return <PageLoader />;

  const tabs = [
    { key: 'active', label: 'Active Requests', count: records.filter(r => r.status !== 'RESOLVED' && r.status !== 'REJECTED').length },
    { key: 'history', label: 'History' },
    { key: 'schedule', label: 'Preventative Schedule' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance & Repairs"
        subtitle="Track asset issues, schedule preventative maintenance, and manage repair workflows."
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Raise Request
          </Button>
        }
      />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'active' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden animate-fade-in shadow-sm">
          {records.length === 0 ? (
            <EmptyState title="No active maintenance requests" icon={<Wrench className="w-8 h-8 text-slate-400" />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Description</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Technician</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.filter(r => r.status !== 'RESOLVED' && r.status !== 'REJECTED').map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <code className="font-mono text-xs text-teal-600 dark:text-teal-400">{record.asset?.assetTag}</code>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{record.asset?.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate" title={record.issueDescription}>
                          {record.issueDescription}
                        </p>
                      </td>
                      <td className="px-5 py-3.5"><PriorityBadge priority={record.priority} /></td>
                      <td className="px-5 py-3.5"><MaintenanceStatusBadge status={record.status} /></td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {record.technicianName || 'Unassigned'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="ghost" size="sm" icon={<Settings className="w-4 h-4" />}>Update</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <EmptyState
          title="Preventative Maintenance"
          description="Schedule automated maintenance cycles for assets based on time or usage intervals. This feature will be available in the next release."
          icon={<CalendarIcon />}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Raise Maintenance Request"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button icon={<ArrowRight className="w-4 h-4" />}>Submit</Button></>}
      >
        <div className="space-y-4">
          <Select label="Asset" placeholder="Select an asset..." options={assets.map(a => ({ value: a.id, label: `${a.assetTag} — ${a.name}` }))} />
          <Textarea label="Issue Description" placeholder="Describe the problem in detail..." required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'CRITICAL', label: 'Critical' }
            ]} defaultValue="MEDIUM" />
            <Select label="Assign Technician (Optional)" placeholder="Select technician..." options={employees.map(e => ({ value: e.id, label: e.name }))} />
          </div>
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>If the asset is currently allocated, the assignee will be notified of this maintenance request.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CalendarIcon() {
  return <FileSearch className="w-8 h-8 text-slate-400" />;
}
