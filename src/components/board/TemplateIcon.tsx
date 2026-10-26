import {
  AlertTriangle,
  CalendarDays,
  Columns3,
  LayoutGrid,
  ListChecks,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { TemplateIcon as TemplateIconKey } from '@/lib/templates';

const icons: Record<TemplateIconKey, LucideIcon> = {
  blank: LayoutGrid,
  kanban: Columns3,
  sprint: Zap,
  content: CalendarDays,
  bugs: AlertTriangle,
  personal: ListChecks,
};

export function TemplateGlyph({
  icon,
  className,
}: {
  icon: TemplateIconKey;
  className?: string;
}) {
  const Icon = icons[icon] ?? LayoutGrid;
  return <Icon className={className} aria-hidden="true" />;
}
