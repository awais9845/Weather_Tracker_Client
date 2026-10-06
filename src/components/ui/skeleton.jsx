import { cn } from "cn";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/70 dark:bg-muted/40", className)}
      {...props}
    />
  );
}

export { Skeleton };
