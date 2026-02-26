import { ShoppingCart, CreditCard, Package, Truck, MapPin, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'pending', label: 'Pending', icon: ShoppingCart },
  { key: 'confirmed', label: 'Confirmed', icon: CreditCard },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'send_to_courier', label: 'Send to Courier', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
] as const;

interface OrderStatusTrackerProps {
  status: string;
}

const OrderStatusTracker = ({ status }: OrderStatusTrackerProps) => {
  const isReturned = status === 'returned';
  const isCancelled = status === 'cancelled';

  // Find current step index
  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const activeIndex = isReturned || isCancelled ? -1 : currentIndex;

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-4">
      {isReturned ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-destructive" />
          </div>
          <span className="text-sm font-semibold text-destructive">Returned</span>
          <p className="text-xs text-muted-foreground">This order has been returned.</p>
        </div>
      ) : isCancelled ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-destructive" />
          </div>
          <span className="text-sm font-semibold text-destructive">Cancelled</span>
          <p className="text-xs text-muted-foreground">This order has been cancelled.</p>
        </div>
      ) : (
        <div className="flex items-start justify-between relative">
          {/* Progress line behind icons */}
          <div className="absolute top-5 left-0 right-0 h-[3px] bg-muted mx-[10%] z-0" />
          <div
            className="absolute top-5 left-0 h-[3px] bg-secondary mx-[10%] z-0 transition-all duration-500"
            style={{
              width: activeIndex <= 0 ? '0%' : `${(activeIndex / (STEPS.length - 1)) * 80}%`,
            }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDone = activeIndex >= i;
            const isCurrent = activeIndex === i;

            return (
              <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                    isDone
                      ? 'bg-secondary border-secondary text-secondary-foreground shadow-md'
                      : 'bg-card border-muted text-muted-foreground',
                    isCurrent && 'ring-2 ring-secondary/40 ring-offset-2 ring-offset-background'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    'text-[10px] sm:text-xs mt-2 text-center font-medium leading-tight',
                    isDone ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderStatusTracker;
