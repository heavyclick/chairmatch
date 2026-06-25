import { LucideIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  locked?: boolean;
}

export function NavItem({ icon: Icon, label, active, locked }: NavItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium cursor-pointer transition-colors mb-0.5",
        active && "bg-teal text-white",
        !active && !locked && "text-[#B9C6C2] hover:bg-white/5 hover:text-white",
        locked && "text-[#B9C6C2]/45 cursor-default"
      )}
    >
      <Icon size={17} strokeWidth={2} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {locked && <Lock size={12} className="opacity-70" />}
    </div>
  );
}
