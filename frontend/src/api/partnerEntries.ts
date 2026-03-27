export interface EntryIn {
  project_name?: string | null;
  project_pm?: string | null;
  module?: string | null;
  role?: string | null;
  contract_company?: string | null;
  belong_company?: string | null;
  team?: string | null;
  name?: string | null;
  email?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  req_pledge?: boolean;
  req_ad?: boolean;
  req_srbs?: boolean;
}

export async function bulkSaveEntries(entries: EntryIn[]): Promise<{ ids: number[]; count: number }> {
  const res = await fetch("/api/v1/partner-entries/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw new Error("저장 실패");
  return res.json();
}

export async function fetchEntries() {
  const res = await fetch("/api/v1/partner-entries/");
  const data = await res.json();
  return data.entries;
}
