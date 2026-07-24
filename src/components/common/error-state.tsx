import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-arena-danger/30 bg-arena-danger/5 px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-arena-danger" />
      <p className="text-sm text-arena-silver">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          再試行
        </Button>
      )}
    </div>
  );
}
