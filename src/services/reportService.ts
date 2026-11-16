import {
  BusRecommendation,
  DailyReportRecord,
  Station,
  TransitAlert,
} from '../types/transit';

export interface WeeklyTrendPoint {
  day: string;
  chennaiCentral: number;
  tNagar: number;
  guindy: number;
  tambaram: number;
  total: number;
}

export function getWeeklyPassengerTrends(stations: Station[]): WeeklyTrendPoint[] {
  const byId = new Map(stations.map((s) => [s.id, s]));
  const ccBase = (byId.get('chennai-central')?.currentPassengers ?? 350) * 38;
  const tnBase = (byId.get('t-nagar')?.currentPassengers ?? 310) * 36;
  const gdBase = (byId.get('guindy')?.currentPassengers ?? 420) * 40;
  const tbBase = (byId.get('tambaram')?.currentPassengers ?? 240) * 34;

  const dayMultipliers = [
    { day: 'Mon', mult: 0.98 },
    { day: 'Tue', mult: 1.01 },
    { day: 'Wed', mult: 0.99 },
    { day: 'Thu', mult: 1.04 },
    { day: 'Fri', mult: 1.12 },
    { day: 'Sat', mult: 0.91 },
    { day: 'Sun', mult: 0.78 },
  ];

  return dayMultipliers.map(({ day, mult }) => {
    const chennaiCentral = Math.round(ccBase * mult);
    const tNagar = Math.round(tnBase * mult);
    const guindy = Math.round(gdBase * mult);
    const tambaram = Math.round(tbBase * mult);
    return {
      day,
      chennaiCentral,
      tNagar,
      guindy,
      tambaram,
      total: chennaiCentral + tNagar + guindy + tambaram,
    };
  });
}

export function buildDailyReportRecords(
  stations: Station[],
  alerts: TransitAlert[],
  recommendations: BusRecommendation[],
  dateRangeDays: 1 | 7 | 30,
  referenceDate: Date,
): DailyReportRecord[] {
  const records: DailyReportRecord[] = [];
  const daysCount = dateRangeDays === 1 ? 1 : dateRangeDays === 7 ? 7 : 10;

  const peakHoursByStation: Record<string, string> = {
    'chennai-central': '09:00 - 10:00',
    't-nagar': '18:00 - 19:00',
    guindy: '08:30 - 09:30',
    tambaram: '18:30 - 19:30',
  };

  for (let d = 0; d < daysCount; d++) {
    const dateObj = new Date(referenceDate.getTime() - d * 86_400_000);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const dayFactor = d === 0 ? 1 : 0.88 + ((d * 17) % 21) / 100;

    stations.forEach((station) => {
      const stationAlerts = alerts.filter((a) => a.stationId === station.id).length;
      const stationRec = recommendations.find((r) => r.stationId === station.id);
      const buses = stationRec ? stationRec.recommendedAdditionalBuses : 0;

      records.push({
        date: dateStr,
        stationId: station.id,
        stationName: station.name,
        totalPassengers: Math.round(station.currentPassengers * 36 * dayFactor),
        peakOccupancy: Math.min(
          100,
          Math.round(station.occupancyPercentage * (d === 0 ? 1 : 0.94 + ((d * 7) % 10) / 100)),
        ),
        peakHour: peakHoursByStation[station.id] ?? '09:00 - 10:00',
        alertsTriggered: d === 0 ? stationAlerts : Math.max(0, stationAlerts - (d % 2)),
        busesRecommended: d === 0 ? buses : Math.max(0, buses - (d % 2)),
      });
    });
  }

  return records;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvReport(records: DailyReportRecord[]): string {
  const headers = [
    'Date',
    'Station',
    'Estimated Daily Passengers',
    'Peak Occupancy (%)',
    'Peak Crowd Period',
    'Alerts Triggered',
    'Recommended Additional Buses',
  ];

  const rows = records.map((rec) =>
    [
      rec.date,
      rec.stationName,
      rec.totalPassengers,
      rec.peakOccupancy,
      rec.peakHour,
      rec.alertsTriggered,
      rec.busesRecommended,
    ]
      .map(escapeCsvCell)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}
