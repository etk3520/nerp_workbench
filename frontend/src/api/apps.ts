import type { AppItem } from "@/types";

export async function fetchApps(): Promise<AppItem[]> {
  const res = await fetch("/api/v1/apps/");
  const data = await res.json();
  return data.apps;
}
