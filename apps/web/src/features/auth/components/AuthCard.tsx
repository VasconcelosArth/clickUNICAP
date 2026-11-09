import type { ReactNode } from 'react';
import { Card, PageTitle } from '@/components/ui';

interface AuthCardProps {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <>
      <div className="mb-6">
        <PageTitle>{title}</PageTitle>
        {description && <p className="text-sm mt-2">{description}</p>}
      </div>
      <Card className="p-5">{children}</Card>
      {footer && <p className="text-sm text-center mt-4">{footer}</p>}
    </>
  );
}
