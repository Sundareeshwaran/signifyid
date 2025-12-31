"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: "users" | "clients";
  rowCount: number;
  filters?: Record<string, string | number | boolean | null | undefined>;
  onConfirm: (format: "csv" | "json") => Promise<void>;
}

export function ExportDataDialog({
  open,
  onOpenChange,
  resource,
  rowCount,
  filters,
  onConfirm,
}: ExportDataDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "json">("csv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm(selectedFormat);
      onOpenChange(false);
      // Reset format selection on success
      setSelectedFormat("csv");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Export failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setSelectedFormat("csv");
      setError(null);
    }
    onOpenChange(open);
  };

  // Format filters for display
  const activeFilters = filters
    ? Object.entries(filters)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {resource.charAt(0).toUpperCase() + resource.slice(1)} Data
          </DialogTitle>
          <DialogDescription>
            This export may contain sensitive data. Please handle with care.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Warning */}
          <div className="p-4 bg-accent/50 border border-accent rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">
                  ⚠️ Warning: Privileged Export
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This export includes organizational data. Ensure you handle
                  the exported file securely and in compliance with your data
                  protection policies.
                </p>
              </div>
            </div>
          </div>

          {/* Dataset Summary */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Resource
              </p>
              <p className="text-sm font-semibold capitalize">{resource}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Records to Export
              </p>
              <p className="text-sm font-semibold">{rowCount} records</p>
            </div>
            {activeFilters.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Applied Filters
                </p>
                <p className="text-sm">{activeFilters.join(", ")}</p>
              </div>
            )}
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Export Format</Label>
            <RadioGroup
              value={selectedFormat}
              onValueChange={(value: string) =>
                setSelectedFormat(value as "csv" | "json")
              }
              disabled={loading}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="csv" id="csv" />
                <Label
                  htmlFor="csv"
                  className="flex-1 cursor-pointer font-normal"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <p className="font-medium">
                        CSV (Comma-Separated Values)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Compatible with Excel, Google Sheets, and databases
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="json" id="json" />
                <Label
                  htmlFor="json"
                  className="flex-1 cursor-pointer font-normal"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <p className="font-medium">
                        JSON (JavaScript Object Notation)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Structured data for programmatic processing
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Confirm & Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
