import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TouchButtonProps extends ButtonProps {
  touchFriendly?: boolean;
}

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, touchFriendly = true, size, ...props }, ref) => {
    const touchSize = touchFriendly ? 'min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto' : '';
    
    return (
      <Button
        className={cn(
          touchSize,
          'touch-manipulation',
          className
        )}
        size={size}
        ref={ref}
        {...props}
      />
    );
  }
);

TouchButton.displayName = 'TouchButton';