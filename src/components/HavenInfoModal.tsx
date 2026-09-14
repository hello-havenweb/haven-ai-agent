import React from 'react';
import { X, Globe, Layers, ShoppingBag, Briefcase, Code, Sparkles, CheckCircle2 } from 'lucide-react';

interface HavenInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HavenInfoModal: React.FC<HavenInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        id="haven-info-modal"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              H
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                About HAVEN
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  haven.pntr.dev
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-End Custom Website Design, Development & Deployment
              </p>
            </div>
          </div>
          <button
            id="close-haven-info"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-700 dark:text-slate-300 text-sm">
          {/* Key Value Proposition */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Complete Turnkey Website Development
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              HAVEN takes care of everything—custom bespoke design, modern responsive code, automated cloud hosting setup, and domain pointing (via custom subdomains or domains like pntr.dev). Clients don't need any technical knowledge.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Services Offered
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Business Websites & Landing Pages
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  High-converting, polished showcase pages and corporate sites built for fast load times and search ranking.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  E-Commerce & Payments
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Full online stores with automated product catalogs, checkout flows, and payment integrations.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Portfolios for Creators & Pros
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Stunning visual showcases for photographers, designers, agencies, and independent professionals.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  <Code className="w-4 h-4 text-indigo-600" />
                  Web Applications & Redesigns
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Modern web app development, UI/UX overhauls, and legacy site migrations to high-performance stacks.
                </p>
              </div>
            </div>
          </div>

          {/* Workflow & Pricing */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Payment & Quotes
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Pricing varies depending on project scope, custom features, and timeline requirements.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Pay upon delivery or per project milestone agreement.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>The HAVEN team sends an exact quote and proposal once your details are captured.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <a
            href="https://haven.pntr.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Visit haven.pntr.dev</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
