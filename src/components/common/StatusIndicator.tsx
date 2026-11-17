import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  Info,
  Wifi,
  WifiOff,
  Wrench,
  XOctagon,
} from 'lucide-react';
import {
  AlertSeverity,
  AlertStatus,
  BusFleetStatus,
  CameraStatus,
  CrowdDensityLevel,
  RecommendationPriority,
  RecommendationStatus,
  RouteOperationalStatus,
} from '../../types/transit';

/**
 * Crowd density color mapping:
 * - LOW: Green (#22C55E)
 * - MODERATE: Yellow (#EAB308)
 * - HIGH: Orange (#F97316)
 * - CRITICAL: Crimson Red (#E11D48)
 */
export function getDensityColorHex(level: CrowdDensityLevel): string {
  switch (level) {
    case 'LOW':
      return '#22C55E';
    case 'MODERATE':
      return '#EAB308';
    case 'HIGH':
      return '#F97316';
    case 'CRITICAL':
      return '#E11D48';
  }
}

export const DensityTag: React.FC<{ level: CrowdDensityLevel }> = ({ level }) => {
  const config: Record<
    CrowdDensityLevel,
    { label: string; textClass: string; borderClass: string; icon: React.ReactNode }
  > = {
    LOW: {
      label: 'Low',
      textClass: 'text-[#4ADE80]',
      borderClass: 'border-[#22C55E]/30 bg-[#22C55E]/10',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    MODERATE: {
      label: 'Moderate',
      textClass: 'text-[#FACC15]',
      borderClass: 'border-[#EAB308]/30 bg-[#EAB308]/10',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    HIGH: {
      label: 'High',
      textClass: 'text-[#FB923C]',
      borderClass: 'border-[#F97316]/35 bg-[#F97316]/12',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    CRITICAL: {
      label: 'Critical',
      textClass: 'text-[#FB7185]',
      borderClass: 'border-[#B51232]/60 bg-[#B51232]/20',
      icon: <AlertOctagon className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const c = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${c.textClass} ${c.borderClass}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

export const SeverityTag: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  const styles: Record<AlertSeverity, { label: string; cls: string; icon: React.ReactNode }> = {
    INFO: {
      label: 'Info',
      cls: 'text-[#FACC15] border-[#EAB308]/30 bg-[#EAB308]/10',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    WARNING: {
      label: 'Warning',
      cls: 'text-[#FB923C] border-[#F97316]/35 bg-[#F97316]/12',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    CRITICAL: {
      label: 'Critical',
      cls: 'text-[#FB7185] border-[#B51232]/60 bg-[#B51232]/20',
      icon: <AlertOctagon className="w-3.5 h-3.5 shrink-0" />,
    },
  };
  const s = styles[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${s.cls}`}
    >
      {s.icon}
      <span>{s.label}</span>
    </span>
  );
};

export const AlertStatusText: React.FC<{ status: AlertStatus }> = ({ status }) => {
  const map: Record<AlertStatus, { label: string; cls: string }> = {
    ACTIVE: { label: 'Active', cls: 'text-[#FB7185]' },
    ACKNOWLEDGED: { label: 'Acknowledged', cls: 'text-[#FB923C]' },
    RESOLVED: { label: 'Resolved', cls: 'text-[#4ADE80]' },
  };
  const item = map[status];
  return <span className={`text-xs font-medium whitespace-nowrap ${item.cls}`}>{item.label}</span>;
};

export const CameraStatusTag: React.FC<{ status: CameraStatus }> = ({ status }) => {
  if (status === 'ONLINE') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4ADE80] whitespace-nowrap shrink-0">
        <Wifi className="w-3.5 h-3.5" />
        <span>Online</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#FB7185] whitespace-nowrap shrink-0">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline</span>
    </span>
  );
};

export const PriorityTag: React.FC<{ priority: RecommendationPriority }> = ({ priority }) => {
  const styles: Record<RecommendationPriority, string> = {
    URGENT: 'text-[#FB7185] border-[#B51232]/60 bg-[#B51232]/20',
    HIGH: 'text-[#FB923C] border-[#F97316]/35 bg-[#F97316]/12',
    MEDIUM: 'text-[#FACC15] border-[#EAB308]/30 bg-[#EAB308]/10',
    LOW: 'text-[#4ADE80] border-[#22C55E]/30 bg-[#22C55E]/10',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border whitespace-nowrap shrink-0 ${styles[priority]}`}
    >
      {priority}
    </span>
  );
};

export const RecommendationStatusText: React.FC<{ status: RecommendationStatus }> = ({
  status,
}) => {
  const map: Record<RecommendationStatus, { label: string; cls: string }> = {
    PENDING: { label: 'Pending Review', cls: 'text-[#AAA3AD]' },
    REVIEWED: { label: 'Reviewed', cls: 'text-[#FACC15]' },
    ASSIGNED: { label: 'Assigned (Simulated)', cls: 'text-[#4ADE80]' },
  };
  const item = map[status];
  return <span className={`text-xs font-medium whitespace-nowrap ${item.cls}`}>{item.label}</span>;
};

export const BusFleetStatusTag: React.FC<{ status: BusFleetStatus }> = ({ status }) => {
  const config: Record<BusFleetStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    RUNNING: {
      label: 'RUNNING',
      cls: 'text-[#4ADE80] border-[#22C55E]/30 bg-[#22C55E]/10',
      icon: <Bus className="w-3.5 h-3.5 shrink-0" />,
    },
    AVAILABLE: {
      label: 'AVAILABLE',
      cls: 'text-[#FACC15] border-[#EAB308]/30 bg-[#EAB308]/10',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    MAINTENANCE: {
      label: 'MAINTENANCE',
      cls: 'text-[#FB923C] border-[#F97316]/35 bg-[#F97316]/12',
      icon: <Wrench className="w-3.5 h-3.5 shrink-0" />,
    },
    'OUT OF SERVICE': {
      label: 'OUT OF SERVICE',
      cls: 'text-[#FB7185] border-[#B51232]/60 bg-[#B51232]/20',
      icon: <XOctagon className="w-3.5 h-3.5 shrink-0" />,
    },
  };
  const item = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded border whitespace-nowrap shrink-0 ${item.cls}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};

export const RouteStatusTag: React.FC<{ status: RouteOperationalStatus }> = ({ status }) => {
  const config: Record<RouteOperationalStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    OPTIMAL: {
      label: 'Optimal',
      cls: 'text-[#4ADE80] border-[#22C55E]/30 bg-[#22C55E]/10',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    WATCH: {
      label: 'Standby Ready',
      cls: 'text-[#FACC15] border-[#EAB308]/30 bg-[#EAB308]/10',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    DEFICIT: {
      label: 'Shortfall',
      cls: 'text-[#FB923C] border-[#F97316]/35 bg-[#F97316]/12',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    CRITICAL: {
      label: 'Critical Deficit',
      cls: 'text-[#FB7185] border-[#B51232]/60 bg-[#B51232]/20',
      icon: <AlertOctagon className="w-3.5 h-3.5 shrink-0" />,
    },
  };
  const item = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${item.cls}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
