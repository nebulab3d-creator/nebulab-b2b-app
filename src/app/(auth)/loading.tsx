import { Spinner } from '@/components/ui/spinner';

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" className="text-muted-foreground" />
    </div>
  );
}
