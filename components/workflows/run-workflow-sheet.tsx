"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RunWorkflowForm } from "./run-workflow-form";
import type { Workflow } from "@/types/api";

interface RunWorkflowSheetProps {
  workflow: Workflow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunWorkflowSheet({ workflow, open, onOpenChange }: RunWorkflowSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Run: {workflow.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <RunWorkflowForm workflow={workflow} onSuccess={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
