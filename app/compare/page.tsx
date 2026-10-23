"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Property = {
  id: string;
  title: string;
  location: string;
  price: string;
  status: string;
  description: string;
  images: string[];
  beds?: number;
  baths?: number;
  sqm?: number;
};

const statusColor: Record<string, string> = {
  Available:   "bg-green-100 text-green-700",
  Booked:      "bg-blue-100 text-blue-700",
  Maintenance: "bg-yellow-100 text-yellow-700",
};

export default function ComparePage() {
  const router = useRouter();
  const [all, setAll] = useState<Property[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("compare_ids") || "[]");
    setSelected(saved);
    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => { setAll(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3 ? [...prev, id] : prev;
      localStorage.setItem("compare_ids", JSON.stringify(next));
      return next;
    });
  }

  const compared = all.filter((p) => selected.includes(p.id));

  const rows = [
    { label: "Price",    key: "price" },
    { label: "Location", key: "location" },
    { label: "Status",   key: "status" },
    { label: "Beds",     key: "beds" },
    { label: "Baths",    key: "baths" },
    { label: "Sqm",      key: "sqm" },
  ] as const;

  return (
    <main className="min-h-screen bg-[#387a4b]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-white mb-1">Compare Properties</h1>
        <p className="text-lime-200 text-sm mb-6">Select up to 3 properties to compare side by side.</p>

        {/* Property selector */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-white/70 mb-3">Select properties ({selected.length}/3):</p>
          {loading ? (
            <p className="text-xs text-white/40">Loading...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {all.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    selected.includes(p.id)
                      ? "bg-white text-[#387a4b] border-white"
                      : "bg-white/10 text-white border-white/30 hover:bg-white/20"
                  }`}
                >
                  {selected.includes(p.id) ? "✓ " : ""}{p.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comparison table */}
        {compared.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <p className="text-4xl mb-3">⚖️</p>
            <p className="text-sm font-semibold text-white/70">No properties selected</p>
            <p className="text-xs mt-1">Select at least 2 properties above to compare.</p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-xs font-semibold text-white/50 p-4 w-28">Feature</th>
                    {compared.map((p) => (
                      <th key={p.id} className="p-4 text-center min-w-[200px]">
                        <div className="relative h-32 rounded-lg overflow-hidden bg-white/10 mb-2">
                          {p.images?.[0] ? (
                            <Image src={p.images[0]} alt={p.title} fill sizes="200px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">No image</div>
                          )}
                        </div>
                        <p className="text-sm font-extrabold text-white">{p.title}</p>
                        <button
                          onClick={() => router.push(`/houses/${p.id}`)}
                          className="mt-1 text-[10px] text-lime-300 hover:text-white"
                        >
                          View details →
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.key} className={i % 2 === 0 ? "bg-white/5" : ""}>
                      <td className="p-4 text-xs font-semibold text-white/50">{row.label}</td>
                      {compared.map((p) => (
                        <td key={p.id} className="p-4 text-center text-sm text-white">
                          {row.key === "status" ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                              {p.status}
                            </span>
                          ) : (
                            p[row.key] ?? <span className="text-white/30">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="p-4 text-xs font-semibold text-white/50">Description</td>
                    {compared.map((p) => (
                      <td key={p.id} className="p-4 text-xs text-white/60 text-center align-top">
                        {p.description || <span className="text-white/20">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-white/20">
                    <td className="p-4" />
                    {compared.map((p) => (
                      <td key={p.id} className="p-4 text-center">
                        <button
                          onClick={() => router.push(`/houses/${p.id}`)}
                          className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 rounded-lg border border-white/20 transition-colors"
                        >
                          Book Now
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
