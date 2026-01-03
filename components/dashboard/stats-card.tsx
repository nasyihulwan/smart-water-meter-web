'use client';

import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatsCard({
  title,
  value,
  unit,
  icon: Icon,
  iconColor = 'text-blue-500',
  iconBgColor = 'bg-blue-50 dark:bg-blue-950',
}: StatsCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}
