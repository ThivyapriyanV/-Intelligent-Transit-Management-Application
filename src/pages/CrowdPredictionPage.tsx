import React, { useState } from 'react';
import { Info, TrendingUp } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTransit } from '../context/TransitContext';
import { StationId } from '../types/transit';
import { DensityTag } from '../components/common/StatusIndicator';

export const CrowdPredictionPage: React.FC = () => {
  const { forecasts, selectedStationFilter } = useTransit();
  const [focusedStationId, setFocusedStationId] = useState<StationId>('guindy');

  const effectiveStationId: StationId =
    selectedStationFilter !== 'all' ? selectedStationFilter : focusedStationId;

  const activeForecast =
    forecasts.find((f) => f.stationId === effectiveStationId) ?? forecasts[0];

  const h15 = activeForecast.horizons.find((h) => h.minutes === 15)!;
  const h30 = activeForecast.horizons.find((h) => h.minutes === 30)!;
  const h60 = activeForecast.horizons.find((h) => h.minutes === 60)!;

  return (
    <div className="space-y-6">
      {/* Simulated Estimate Disclaimer + Station Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#343039]">
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#201C22] border border-[#B51232]/40 text-xs text-[#AAA3AD] max-w-2xl">
          <Info className="w-4 h-4 text-[#D01940] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F4F1F3]">Simulated Forecast Notice:</strong> Values below are
            simulated estimates computed via Holt&apos;s double exponential smoothing (α=
            {activeForecast.alphaLevel}, β={activeForecast.betaTrend}) over simulated historical
            intervals—not live machine learning model output.
          </span>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-[#201C22] border border-[#343039] shrink-0 self-start">
          {forecasts.map((f) => (
            <button
              key={f.stationId}
              type="button"
              onClick={() => setFocusedStationId(f.stationId)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                effectiveStationId === f.stationId
                  ? 'bg-[#B51232] text-[#F4F1F3]'
                  : 'text-[#AAA3AD] hover:text-[#F4F1F3]'
              }`}
            >
              {f.stationName}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl bg-[#201C22] border border-[#343039] p-4">
          <div className="text-xs text-[#AAA3AD]">Current Passenger Count</div>
          <div className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            {activeForecast.currentPassengers}
          </div>
          <div className="text-xs text-[#77717B] mt-1">{activeForecast.stationName}</div>
        </div>

        {[h15, h30, h60].map((h) => (
          <div
            key={h.minutes}
            className="rounded-xl bg-[#201C22] border border-[#343039] p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#AAA3AD]">Predicted (+{h.minutes} min)</span>
              <DensityTag level={h.densityLevel} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold text-[#F4F1F3] font-display tabular-nums">
                {h.predictedPassengers}
              </span>
              <span className="text-xs font-mono tabular-nums text-[#AAA3AD]">
                {h.occupancyPercentage}% load
              </span>
            </div>
            <div className="text-[11px] text-[#77717B] font-mono tabular-nums mt-1">
              Confidence: {h.confidencePercentage}%
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-[#201C22] border border-[#B51232]/50 crimson-glow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#AAA3AD]">Expected Peak Window</span>
            <TrendingUp className="w-4 h-4 text-[#D01940]" />
          </div>
          <div className="text-xl font-semibold text-[#F4F1F3] font-display tabular-nums mt-1">
            {activeForecast.expectedPeakTime}
          </div>
          <div className="text-xs text-[#AAA3AD] font-mono tabular-nums mt-1">
            Est. {activeForecast.expectedPeakPassengers} pax · {activeForecast.overallConfidence}%
            conf.
          </div>
        </div>
      </div>

      {/* Forecast Trend Chart */}
      <section className="rounded-xl bg-[#201C22] border border-[#343039] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
              {activeForecast.stationName} — Passenger Flow Forecast Trajectory
            </h2>
            <p className="text-xs text-[#AAA3AD]">
              Recent simulated observations paired with +15m, +30m, +45m, and +60m double
              exponential smoothing estimates
            </p>
          </div>
          <div className="text-xs font-mono text-[#FB7185]">
            Model Confidence: {activeForecast.overallConfidence}%
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeForecast.series}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#343039" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#77717B"
                tick={{ fontSize: 11, fill: '#AAA3AD' }}
              />
              <YAxis stroke="#77717B" tick={{ fontSize: 11, fill: '#AAA3AD' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#262128',
                  borderColor: '#343039',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F4F1F3',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#AAA3AD' }} />
              <Area
                type="monotone"
                dataKey="upperBound"
                name="Upper Estimate Band"
                stroke="none"
                fill="#B51232"
                fillOpacity={0.16}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                name="Lower Estimate Band"
                stroke="none"
                fill="#201C22"
                fillOpacity={0.9}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actualPassengers"
                name="Observed (Simulated)"
                stroke="#AAA3AD"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#F4F1F3' }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="predictedPassengers"
                name="Forecast Estimate"
                stroke="#D01940"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                dot={{ r: 3.5, fill: '#D01940' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Network Forecast Summary Table */}
      <section className="rounded-xl bg-[#201C22] border border-[#343039] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#343039]">
          <h2 className="text-sm font-medium text-[#F4F1F3] font-display">
            All-Station 60-Minute Forecast Comparison (Simulated Estimates)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#343039] text-xs font-medium text-[#AAA3AD] bg-[#262128]">
                <th className="py-3 px-4">Station</th>
                <th className="py-3 px-4 text-right">Current</th>
                <th className="py-3 px-4 text-right">+15 min</th>
                <th className="py-3 px-4 text-right">+30 min</th>
                <th className="py-3 px-4 text-right">+60 min</th>
                <th className="py-3 px-4">Predicted Density (+30m)</th>
                <th className="py-3 px-4 text-right">Expected Peak</th>
                <th className="py-3 px-4 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#343039] text-sm">
              {forecasts.map((f) => {
                const f15 = f.horizons[0];
                const f30 = f.horizons[1];
                const f60 = f.horizons[2];
                return (
                  <tr key={f.stationId} className="hover:bg-[#B51232]/10 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#F4F1F3]">{f.stationName}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                      {f.currentPassengers}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                      {f15.predictedPassengers}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#F4F1F3] font-semibold">
                      {f30.predictedPassengers}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                      {f60.predictedPassengers}
                    </td>
                    <td className="py-3 px-4">
                      <DensityTag level={f30.densityLevel} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#AAA3AD]">
                      {f.expectedPeakTime}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#FB7185]">
                      {f.overallConfidence}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
