import React, { useState } from 'react';
import { Info, TrendingUp } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
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

  // If header station filter is set to a specific station, align with it automatically
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 max-w-2xl">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Simulated Forecast Notice:</strong> Values below are simulated estimates
            computed via Holt&apos;s double exponential smoothing (α={activeForecast.alphaLevel}, β=
            {activeForecast.betaTrend}) over simulated historical intervals—not live machine
            learning model output.
          </span>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-[#111827] border border-slate-800 shrink-0 self-start">
          {forecasts.map((f) => (
            <button
              key={f.stationId}
              type="button"
              onClick={() => setFocusedStationId(f.stationId)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                effectiveStationId === f.stationId
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {f.stationName}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast Summary Strip: Current + 15m / 30m / 60m + Peak & Confidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4">
          <div className="text-xs text-slate-400">Current Passenger Count</div>
          <div className="text-2xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            {activeForecast.currentPassengers}
          </div>
          <div className="text-xs text-slate-400 mt-1">{activeForecast.stationName}</div>
        </div>

        {[h15, h30, h60].map((h) => (
          <div
            key={h.minutes}
            className="rounded-xl bg-[#111827] border border-slate-800/90 p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Predicted (+{h.minutes} min)</span>
              <DensityTag level={h.densityLevel} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold text-slate-100 font-mono tabular-nums">
                {h.predictedPassengers}
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-300">
                {h.occupancyPercentage}% load
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-1">
              Confidence: {h.confidencePercentage}%
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-[#111827] border border-slate-800/90 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Expected Peak Window</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            {activeForecast.expectedPeakTime}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
            Est. {activeForecast.expectedPeakPassengers} pax · {activeForecast.overallConfidence}%
            conf.
          </div>
        </div>
      </div>

      {/* Forecast Trend Chart */}
      <section className="rounded-xl bg-[#111827] border border-slate-800/90 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {activeForecast.stationName} — Passenger Flow Forecast Trajectory
            </h2>
            <p className="text-xs text-slate-400">
              Recent simulated observations paired with +15m, +30m, +45m, and +60m double
              exponential smoothing estimates
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Model Confidence: {activeForecast.overallConfidence}%
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeForecast.series}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="timeLabel" stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F1F5F9',
                }}
              />
              <Area
                type="monotone"
                dataKey="upperBound"
                name="Upper Estimate Band"
                stroke="none"
                fill="#3B82F6"
                fillOpacity={0.14}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                name="Lower Estimate Band"
                stroke="none"
                fill="#0B1120"
                fillOpacity={0.85}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actualPassengers"
                name="Observed (Simulated)"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#10B981' }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="predictedPassengers"
                name="Forecast Estimate"
                stroke="#3B82F6"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                dot={{ r: 3.5, fill: '#3B82F6' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Network Forecast Summary Table */}
      <section className="rounded-xl bg-[#111827] border border-slate-800/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">
            All-Station 60-Minute Forecast Comparison (Simulated Estimates)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-[#0F172A]">
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
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {forecasts.map((f) => {
                const f15 = f.horizons[0];
                const f30 = f.horizons[1];
                const f60 = f.horizons[2];
                return (
                  <tr key={f.stationId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-100">{f.stationName}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                      {f.currentPassengers}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                      {f15.predictedPassengers}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100 font-semibold">
                      {f30.predictedPassengers}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                      {f60.predictedPassengers}
                    </td>
                    <td className="py-3 px-4">
                      <DensityTag level={f30.densityLevel} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {f.expectedPeakTime}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-400">
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
