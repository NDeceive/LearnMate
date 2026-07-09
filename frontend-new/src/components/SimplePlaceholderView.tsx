import React from "react";
import { ArrowRight, FileText } from "lucide-react";

interface SimplePlaceholderViewProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SimplePlaceholderView({
  title,
  description,
  actionLabel,
  onAction
}: SimplePlaceholderViewProps) {
  return (
    <div className="fade-in font-sans">
      <section className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
          <FileText className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{description}</p>
        </div>

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            {actionLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </section>
    </div>
  );
}
