"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000];

/**
 * YearFilter — <select> de ano do calendário. É um Client Component porque o
 * <select> com onChange precisa de estado/handlers; a página /calendario é um
 * Server Component (não pode serializar event handlers p/ o client).
 */
export function YearFilter({ season, year }: { season: string; year: string }) {
  const router = useRouter();
  const [value, setValue] = useState(year || "");

  function onChange(y: string) {
    setValue(y);
    const q = new URLSearchParams();
    if (y) q.set("year", y);
    if (season) q.set("season", season);
    router.push(`/calendario?${q.toString()}`);
  }

  return (
    <select
      className="field !w-auto min-h-11"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrar por ano"
    >
      <option value="">Todos</option>
      {YEARS.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}