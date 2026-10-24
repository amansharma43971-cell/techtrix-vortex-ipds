import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface PageHeaderProps {
  breadcrumbGroup?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'blue' | 'purple' | 'emerald' | 'amber' | 'cyan' | 'slate';
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbGroup = 'Godown Operations',
  title,
  subtitle,
  badge,
  badgeColor = 'blue',
  actions
}) => {
  const badgeColors: Record<string, string> = {
    blue: 'bg-blue-50 text-[#0B4DA8] border-blue-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const badgeCls = badgeColors[badgeColor] || badgeColors.blue;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 mb-1 flex-wrap">
          <Link to="/" className="hover:text-[#0B4DA8] transition-colors">
            BhandarSetu
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span>{breadcrumbGroup}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[#0B4DA8] font-bold">{title}</span>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {badge && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${badgeCls}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 leading-normal max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

