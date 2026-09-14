import React from 'react';
import { Lead } from '../types';
import { X, UserCheck, Mail, Phone, Globe, Calendar, Download, Copy, Check } from 'lucide-react';

interface LeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onRefresh: () => void;
}

export const LeadsModal: React.FC<LeadsModalProps> = ({
  isOpen,
  onClose,
  leads,
  onRefresh,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Project Type', 'Requirements', 'Language', 'Date'];
    const rows = leads.map((l) => [
      l.id,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.projectType || '').replace(/"/g, '""')}"`,
      `"${(l.requirements || '').replace(/"/g, '""')}"`,
      `"${(l.language || '').replace(/"/g, '""')}"`,
      `"${new Date(l.createdAt).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `haven-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(leads, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        id="leads-modal"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Captured Project Leads
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collected automatically by HAVEN AI Voice Agent via function calls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-csv-btn"
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              id="copy-json-btn"
              onClick={handleCopyJSON}
              disabled={leads.length === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition disabled:opacity-50"
              title="Copy JSON"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              id="close-leads-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {leads.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No leads captured yet.</p>
              <p className="text-xs mt-1">
                When a visitor speaks their name and email/phone, the voice agent will automatically save their details here.
              </p>
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                id={`lead-card-${lead.id}`}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {lead.name}
                      {lead.language && (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                          {lead.language}
                        </span>
                      )}
                    </h4>
                    <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {lead.projectType || 'Custom Website Development'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`mailto:${lead.email}`} className="hover:underline truncate">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`tel:${lead.phone}`} className="hover:underline truncate">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                </div>

                {lead.requirements && (
                  <div className="mt-2 text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                      Project Notes:
                    </span>
                    {lead.requirements}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{leads.length} {leads.length === 1 ? 'Lead' : 'Leads'} captured</span>
          <button
            onClick={onRefresh}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Refresh List
          </button>
        </div>
      </div>
    </div>
  );
};
