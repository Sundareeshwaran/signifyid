"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-gsap";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const ref = useScrollReveal<HTMLDivElement>({ y: 20, duration: 0.4 });

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div
      ref={ref}
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          {filename ? (
            <span className="text-sm font-medium text-muted-foreground">
              {filename}
            </span>
          ) : (
            <span className="text-xs font-mono text-muted-foreground uppercase">
              {language}
            </span>
          )}
        </div>
        <button
          onClick={copyToClipboard}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
            "hover:bg-muted",
            copied
              ? "text-emerald-500"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="font-mono">
            {showLineNumbers ? (
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="pr-4 text-right text-muted-foreground/50 select-none w-8">
                        {index + 1}
                      </td>
                      <td className="whitespace-pre">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              code
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Inline code component
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="relative rounded bg-muted px-[0.4rem] py-[0.2rem] font-mono text-sm font-medium">
      {children}
    </code>
  );
}
