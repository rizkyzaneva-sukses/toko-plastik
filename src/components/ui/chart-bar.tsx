/**
 * Pure SVG bar chart — tanpa dependency tambahan.
 *
 * Menampilkan bar chart dengan dua dataset (omzet + laba) + label sumbu X.
 * Responsive lewat viewBox.
 */

"use client";

import { formatRupiah } from "@/lib/utils";

interface DataPoint {
  label: string;
  nilai1: number;
  nilai2: number;
}

interface ChartBarProps {
  data: DataPoint[];
  label1?: string;
  label2?: string;
  warna1?: string;
  warna2?: string;
  tinggi?: number;
}

export function ChartBar({
  data,
  label1 = "Omzet",
  label2 = "Laba",
  warna1 = "#3b82f6",
  warna2 = "#10b981",
  tinggi = 220,
}: ChartBarProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
        Belum ada data
      </div>
    );
  }

  const lebar = 600;
  const paddingKiri = 75;
  const paddingKanan = 20;
  const paddingAtas = 20;
  const paddingBawah = 50;
  const areaTinggi = tinggi - paddingAtas - paddingBawah;
  const areaLebar = lebar - paddingKiri - paddingKanan;

  const maxNilai = Math.max(...data.flatMap((d) => [d.nilai1, d.nilai2]), 1);
  const barGroupWidth = areaLebar / data.length;
  const barWidth = Math.min(barGroupWidth * 0.35, 40);
  const gap = 3;

  // Grid lines
  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) =>
    Math.round((maxNilai / gridLines) * i)
  );

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: warna1 }}
          />
          {label1}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: warna2 }}
          />
          {label2}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${lebar} ${tinggi}`}
        className="w-full"
        role="img"
        aria-label="Grafik omzet dan laba"
      >
        {/* Grid lines */}
        {gridValues.map((val, i) => {
          const y = paddingAtas + areaTinggi - (val / maxNilai) * areaTinggi;
          return (
            <g key={i}>
              <line
                x1={paddingKiri}
                y1={y}
                x2={lebar - paddingKanan}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
              />
              <text
                x={paddingKiri - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-500 dark:fill-gray-400"
                fontSize="10"
              >
                {val >= 1000000
                  ? `${(val / 1000000).toFixed(1)}jt`
                  : val >= 1000
                    ? `${(val / 1000).toFixed(0)}rb`
                    : val.toString()}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = paddingKiri + barGroupWidth * i + barGroupWidth / 2;
          const h1 = (d.nilai1 / maxNilai) * areaTinggi;
          const h2 = (d.nilai2 / maxNilai) * areaTinggi;
          const y1 = paddingAtas + areaTinggi - h1;
          const y2 = paddingAtas + areaTinggi - h2;

          return (
            <g key={i}>
              {/* Bar 1 (omzet) */}
              <rect
                x={cx - barWidth - gap / 2}
                y={y1}
                width={barWidth}
                height={Math.max(h1, 0)}
                fill={warna1}
                rx={3}
                opacity={0.85}
              >
                <title>
                  {d.label}: {label1} {formatRupiah(d.nilai1)}
                </title>
              </rect>

              {/* Bar 2 (laba) */}
              <rect
                x={cx + gap / 2}
                y={y2}
                width={barWidth}
                height={Math.max(h2, 0)}
                fill={warna2}
                rx={3}
                opacity={0.85}
              >
                <title>
                  {d.label}: {label2} {formatRupiah(d.nilai2)}
                </title>
              </rect>

              {/* Label X */}
              <text
                x={cx}
                y={tinggi - paddingBawah + 18}
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-400"
                fontSize="10"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Axis */}
        <line
          x1={paddingKiri}
          y1={paddingAtas + areaTinggi}
          x2={lebar - paddingKanan}
          y2={paddingAtas + areaTinggi}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
      </svg>
    </div>
  );
}
