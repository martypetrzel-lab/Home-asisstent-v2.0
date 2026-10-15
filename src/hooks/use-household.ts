"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export interface HouseholdItem {
  id: string;
  text: string;
  done: boolean;
}
export interface Household {
  revision: number;
  notes: string;
  tasks: HouseholdItem[];
  shopping: HouseholdItem[];
  relayNames: [string, string];
}
export function useHousehold() {
  const client = useQueryClient();
  const query = useQuery<Household>({
    queryKey: ["household"],
    queryFn: async () => {
      const r = await fetch("/api/household", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (r.status === 401)
        window.dispatchEvent(new Event("home-session-expired"));
      if (!r.ok) throw new Error("Sdílenou domácnost se nepodařilo načíst.");
      return r.json();
    },
    refetchInterval: 10000,
  });
  const mutation = useMutation({
    mutationFn: async (patch: Partial<Omit<Household, "revision">>) => {
      const r = await fetch("/api/household", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: query.data?.revision, ...patch }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.status === 409) {
        await client.invalidateQueries({ queryKey: ["household"] });
        throw new Error(
          "Mezitím někdo upravil domácnost. Načetli jsme aktuální verzi; váš rozepsaný vzkaz zůstal zachován. Zkontrolujte změny a uložte znovu.",
        );
      }
      if (r.status === 401)
        window.dispatchEvent(new Event("home-session-expired"));
      const v = await r.json();
      if (!r.ok)
        throw new Error(
          v.error?.message ||
            (typeof v.error === "string"
              ? v.error
              : "Změnu se nepodařilo uložit."),
        );
      return v as Household;
    },
    onSuccess: (v) => {
      client.setQueryData(["household"], v);
    },
  });
  return {
    ...query,
    save: mutation.mutateAsync,
    saving: mutation.isPending,
    saveError: mutation.error,
  };
}
