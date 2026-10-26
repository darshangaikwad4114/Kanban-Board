import { Skeleton } from '@/components/ui/Skeleton';

export function AuthFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading form">
      <Skeleton className="h-[4.5rem] w-full" />
      <Skeleton className="h-[4.5rem] w-full" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
