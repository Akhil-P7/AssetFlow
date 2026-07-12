interface TabBarProps {
  tabs: { key: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`
            whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md
            transition-colors duration-200 cursor-pointer
            ${activeTab === tab.key
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-slate-500 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
