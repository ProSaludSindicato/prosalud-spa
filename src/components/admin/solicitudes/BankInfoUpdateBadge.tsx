import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

interface BankInfoUpdateBadgeProps {
  hasBankInfoUpdate: boolean;
  className?: string;
}

export function BankInfoUpdateBadge({ hasBankInfoUpdate, className = "" }: BankInfoUpdateBadgeProps) {
  if (!hasBankInfoUpdate) {
    return null;
  }

  return (
    <Badge 
      variant="secondary" 
      className={`bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 ${className}`}
    >
      <CreditCard className="w-3 h-3" />
      Actualización Bancaria
    </Badge>
  );
}
