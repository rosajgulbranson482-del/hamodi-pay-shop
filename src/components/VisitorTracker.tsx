import { useVisitorTracking } from '@/hooks/useVisitorTracking';

const VisitorTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useVisitorTracking();
  return <>{children}</>;
};

export default VisitorTracker;
