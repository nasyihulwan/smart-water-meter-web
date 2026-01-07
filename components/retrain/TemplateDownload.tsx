'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Lightbulb } from 'lucide-react';

interface TemplateDownloadProps {
  variant?: 'default' | 'compact';
}

export function TemplateDownload({
  variant = 'default',
}: TemplateDownloadProps) {
  const templates = [
    {
      name: 'Daily Template',
      file: 'template_daily.xlsx',
      size: '8 KB',
      recommended: true,
      description: 'Best accuracy (~5-10% error margin)',
    },
    {
      name: 'Monthly Template',
      file: 'template_monthly.xlsx',
      size: '7 KB',
      recommended: false,
      description: 'Lower accuracy (~10-15% error margin)',
    },
  ];

  if (variant === 'compact') {
    return (
      <div className="flex gap-2">
        {templates.map((template) => (
          <Button
            key={template.file}
            variant={template.recommended ? 'default' : 'outline'}
            size="sm"
            asChild
          >
            <a href={`/templates/${template.file}`} download>
              <Download className="mr-2 h-4 w-4" />
              {template.name}
            </a>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recommendation Callout */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Recommendation: Use daily data for better accuracy
            </p>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>• Monthly data: ~10-15% MAPE (error margin)</li>
              <li>• Daily data: ~5-10% MAPE (error margin)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Template Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.file} className="p-4 relative">
            {template.recommended && (
              <Badge className="absolute top-2 right-2" variant="default">
                Recommended
              </Badge>
            )}
            <div className="mb-3">
              <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Excel format • {template.size}
              </span>
              <Button
                variant={template.recommended ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <a href={`/templates/${template.file}`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Format Info */}
      <Card className="p-4 bg-muted">
        <p className="text-sm font-medium mb-2">Template Format:</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-mono bg-background px-2 py-1 rounded">date</p>
            <p className="text-muted-foreground mt-1">
              YYYY-MM-DD (daily) or YYYY-MM (monthly)
            </p>
          </div>
          <div>
            <p className="font-mono bg-background px-2 py-1 rounded">
              total_m3
            </p>
            <p className="text-muted-foreground mt-1">
              Water volume in cubic meters
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
