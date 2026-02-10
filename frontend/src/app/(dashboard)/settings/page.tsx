'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Application and account settings will be available here.
        </p>
      </header>
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Application and account settings will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

