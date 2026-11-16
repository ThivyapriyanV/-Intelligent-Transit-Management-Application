import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AlertSeverity,
  AlertStatus,
  CameraStatus,
  CrowdDensityLevel,
  RecommendationPriority,
  RecommendationStatus,
} from '../../types/transit';

export function getDensityColorHex(level: CrowdDensityLevel): string {
  switch (level) {
    case 'LOW':
      return '#10B981';
    case 'MODERATE':
      return '#3B82F6';
    case 'HIGH':
      return '#F59E0B';
    case 'CRITICAL':
      return '#EF4444';
  }
}

export const DensityTag: React.FC<{ level: CrowdDensityLevel }> = ({ level }) => {
  const config: Record<
    CrowdDensityLevel,
    { label: string; textClass: string; borderClass: string; icon: React.ReactNode }
  > = {
    LOW: {
      label: 'Low',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30 bg-emerald-500/10',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    MODERATE: {
      label: 'Moderate',
      textClass: 'text-blue-400',
      borderClass: 'border-blue-500/30 bg-blue-500/10',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    HIGH: {
      label: 'High',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/30 bg-amber-500/10',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    CRITICAL: {
      label: 'Critical',
      textClass: 'text-red-400',
      borderClass: 'border-red-500/30 bg-red-500/10',
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
      cls: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    WARNING: {
      label: 'Warning',
      cls: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    CRITICAL: {
      label: 'Critical',
      cls: 'text-red-400 border-red-500/30 bg-red-500/10',
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
    ACTIVE: { label: 'Active', cls: 'text-red-400' },
    ACKNOWLEDGED: { label: 'Acknowledged', cls: 'text-amber-400' },
    RESOLVED: { label: 'Resolved', cls: 'text-emerald-400' },
  };
  const item = map[status];
  return <span className={`text-xs font-medium whitespace-nowrap ${item.cls}`}>{item.label}</span>;
};

export const CameraStatusTag: React.FC<{ status: CameraStatus }> = ({ status }) => {
  if (status === 'ONLINE') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 whitespace-nowrap shrink-0">
        <Wifi className="w-3.5 h-3.5" />
        <span>Online</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 whitespace-nowrap shrink-0">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline</span>
    </span>
  );
};

export const PriorityTag: React.FC<{ priority: RecommendationPriority }> = ({ priority }) => {
  const styles: Record<RecommendationPriority, string> = {
    URGENT: 'text-red-400 border-red-500/30 bg-red-500/10',
    HIGH: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    MEDIUM: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    LOW: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
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
    PENDING: { label: 'Pending Review', cls: 'text-slate-300' },
    REVIEWED: { label: 'Reviewed', cls: 'text-blue-400' },
    ASSIGNED: { label: 'Assigned (Simulated)', cls: 'text-emerald-400' },
  };
  const item = map[status];
  return <span className={`text-xs font-medium whitespace-nowrap ${item.cls}`}>{item.label}</span>;
};
