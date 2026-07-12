import { useState } from 'react';
import { Building2, Users, FolderTree, Plus, Settings, Tag, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabBar } from '@/components/ui/TabBar';
import { Button } from '@/components/ui/Button';
import { EntityStatusBadge, RoleBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import apiClient from '@/api/apiClient';
import type { Department, AssetCategory, Employee } from '@/types';
import { Role } from '@/types';

export function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState('departments');
  const [modalOpen, setModalOpen] = useState(false);
  const [promoteModal, setPromoteModal] = useState<Employee | null>(null);

  const { data: departments = [], isLoading: depsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => (await apiClient.get('/org/departments')) as Department[],
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery<AssetCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get('/org/categories')) as AssetCategory[],
  });

  const { data: employees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => (await apiClient.get('/org/employees')) as Employee[],
  });

  if (depsLoading || catsLoading || empLoading) return <PageLoader />;

  const tabs = [
    { key: 'departments', label: 'Departments', count: departments.length },
    { key: 'categories', label: 'Categories', count: categories.length },
    { key: 'employees', label: 'Employees', count: employees.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Setup"
        subtitle="Manage departments, asset categories, and employee directory."
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Add {activeTab === 'departments' ? 'Department' : activeTab === 'categories' ? 'Category' : 'Employee'}
          </Button>
        }
      />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="animate-fade-in">
        {activeTab === 'departments' && (
          <DepartmentsTable departments={departments} />
        )}
        {activeTab === 'categories' && (
          <CategoriesTable categories={categories} />
        )}
        {activeTab === 'employees' && (
          <EmployeesTable employees={employees} onPromote={setPromoteModal} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${activeTab === 'departments' ? 'Department' : activeTab === 'categories' ? 'Category' : 'Employee'}`}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button>Save</Button></>}
      >
        <div className="space-y-4">
          <Input label="Name" placeholder={`Enter ${activeTab.slice(0, -1)} name`} />
          {activeTab === 'departments' && (
            <Select label="Parent Department" placeholder="None (top-level)" options={departments.map(d => ({ value: d.id, label: d.name }))} />
          )}
        </div>
      </Modal>

      <Modal open={!!promoteModal} onClose={() => setPromoteModal(null)} title="Promote Employee"
        footer={<><Button variant="secondary" onClick={() => setPromoteModal(null)}>Cancel</Button><Button>Confirm Promotion</Button></>}
      >
        {promoteModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Promote <span className="font-medium text-slate-900 dark:text-slate-100">{promoteModal.name}</span> to a new role.
              This action will be logged.
            </p>
            <Select
              label="New Role"
              options={[
                { value: Role.DEPARTMENT_HEAD, label: 'Department Head' },
                { value: Role.ASSET_MANAGER, label: 'Asset Manager' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

function DepartmentsTable({ departments }: { departments: Department[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-500/10">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{dept.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                  {dept.parentDepartmentId ? departments.find(d => d.id === dept.parentDepartmentId)?.name || '—' : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <EntityStatusBadge status={dept.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoriesTable({ categories }: { categories: AssetCategory[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Fields</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-teal-50 dark:bg-teal-500/10">
                      <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{cat.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                  {cat.customFields.length > 0
                    ? cat.customFields.map(f => f.label).join(', ')
                    : <span className="text-slate-400">None</span>
                  }
                </td>
                <td className="px-5 py-3.5">
                  <EntityStatusBadge status={cat.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeesTable({ employees, onPromote }: { employees: Employee[]; onPromote: (e: Employee) => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-semibold">
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{emp.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{emp.email}</td>
                <td className="px-5 py-3.5"><RoleBadge role={emp.role} /></td>
                <td className="px-5 py-3.5"><EntityStatusBadge status={emp.status} /></td>
                <td className="px-5 py-3.5">
                  {emp.role === Role.EMPLOYEE && (
                    <Button variant="ghost" size="sm" icon={<Shield className="w-3.5 h-3.5" />} onClick={() => onPromote(emp)}>
                      Promote
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
