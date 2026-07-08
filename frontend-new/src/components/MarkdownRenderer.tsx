import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!content) return null;

  // Split content by code blocks: ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-4 text-xs md:text-sm leading-relaxed text-slate-700 selection:bg-blue-100 selection:text-blue-950 font-sans">
      {parts.map((part, index) => {
        // Check if this part is a code block
        if (part.startsWith("```")) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : "code";
          const codeText = match ? match[2].trim() : part.slice(3, -3).trim();
          const blockId = `code-block-${index}`;

          return (
            <div key={index} className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 my-5 font-mono shadow-md">
              <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <span>{lang.toUpperCase()} CODE ACCENT</span>
                <button
                  onClick={() => handleCopyCode(codeText, blockId)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedId === blockId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制代码</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-xs text-slate-300 leading-normal">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }

        // Parse regular markdown lines
        const lines = part.split("\n");
        return (
          <div key={index} className="space-y-3">
            {lines.map((line, lIndex) => {
              const trimmed = line.trim();

              if (!trimmed) return <div key={lIndex} className="h-2"></div>;

              // Headers: ## or ###
              if (trimmed.startsWith("###")) {
                return (
                  <h4 key={lIndex} className="text-sm font-bold text-slate-900 pt-2 flex items-center gap-1">
                    <span className="w-1.5 h-3.5 bg-blue-500 rounded-full inline-block"></span>
                    {trimmed.replace(/^###\s*/, "")}
                  </h4>
                );
              }

              if (trimmed.startsWith("##")) {
                return (
                  <h3 key={lIndex} className="text-base font-extrabold text-slate-950 pt-4 pb-1 border-b border-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-4.5 bg-blue-600 rounded inline-block"></span>
                    {trimmed.replace(/^##\s*/, "")}
                  </h3>
                );
              }

              if (trimmed.startsWith("#")) {
                return (
                  <h2 key={lIndex} className="text-lg font-black tracking-tight text-slate-950 pt-5 pb-2">
                    {trimmed.replace(/^#\s*/, "")}
                  </h2>
                );
              }

              // Quotes: > Quote
              if (trimmed.startsWith(">")) {
                return (
                  <blockquote key={lIndex} className="pl-4 py-2 border-l-4 border-blue-500 bg-blue-50/30 text-xs text-blue-950 rounded-r-lg my-2 italic font-semibold leading-relaxed">
                    {trimmed.replace(/^>\s*/, "")}
                  </blockquote>
                );
              }

              // Horizontal Rule: ---
              if (trimmed === "---") {
                return <hr key={lIndex} className="my-6 border-t border-slate-100" />;
              }

              // Bullet List: - item or * item
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const text = trimmed.replace(/^[-*]\s+/, "");
                return (
                  <ul key={lIndex} className="list-disc pl-5 space-y-1.5 my-1 text-slate-600">
                    <li className="leading-relaxed">
                      {parseInlineFormatting(text)}
                    </li>
                  </ul>
                );
              }

              // Number List: 1. item
              if (/^\d+\.\s+/.test(trimmed)) {
                const text = trimmed.replace(/^\d+\.\s+/, "");
                const num = trimmed.match(/^(\d+)\./)?.[1] || "1";
                return (
                  <div key={lIndex} className="flex gap-2 pl-2 my-2 text-slate-600 leading-relaxed">
                    <span className="font-mono font-bold text-blue-600">{num}.</span>
                    <span>{parseInlineFormatting(text)}</span>
                  </div>
                );
              }

              // Default Paragraph
              return (
                <p key={lIndex} className="leading-relaxed text-slate-600 font-medium">
                  {parseInlineFormatting(trimmed)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Simple parser helper for bold **text**, code `text` and math $$ or $
function parseInlineFormatting(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match: **bold**, `code`, $$math$$, $math$
  const regex = /(\*\*.*?\*\*|`.*?`|\$\$.*?\$\$|\$.*?\$)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 bg-slate-100 text-blue-600 font-mono text-[11px] rounded border border-slate-150">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <span key={i} className="block text-center py-2 bg-blue-50/20 text-blue-950 font-mono text-xs rounded-lg border border-blue-100/30 my-2">
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      return <span key={i} className="font-mono font-bold text-blue-950 px-0.5">{part.slice(1, -1)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}
