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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Compare Properties</h1>
        <p className="text-sm text-gray-500 mb-6">Select up to 3 properties to compare side by side.</p>

        {/* Property selector */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <p className="text-xs font-semibold text-gray-600 mb-3">Select properties ({selected.length}/3):</p>
          {loading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {all.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    selected.includes(p.id)
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
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
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">⚖️</p>
            <p className="text-sm font-semibold">No properties selected</p>
            <p className="text-xs mt-1">Select at least 2 properties above to compare.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-semibold text-gray-500 p-4 w-28">Feature</th>
                    {compared.map((p) => (
                      <th key={p.id} className="p-4 text-center min-w-[200px]">
                        <div className="relative h-32 rounded-lg overflow-hidden bg-gray-100 mb-2">
                          {p.images?.[0] ? (
                            <Image src={p.images[0]} alt={p.title} fill sizes="200px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                          )}
                        </div>
                        <p className="text-sm font-extrabold text-gray-800">{p.title}</p>
                        <button
                          onClick={() => router.push(`/houses/${p.id}`)}
                          className="mt-1 text-[10px] text-blue-600 hover:underline"
                        >
                          View details →
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.key} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-4 text-xs font-semibold text-gray-500">{row.label}</td>
                      {compared.map((p) => (
                        <td key={p.id} className="p-4 text-center text-sm text-gray-700">
                          {row.key === "status" ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                              {p.status}
                            </span>
                          ) : (
                            p[row.key] ?? <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="p-4 text-xs font-semibold text-gray-500">Description</td>
                    {compared.map((p) => (
                      <td key={p.id} className="p-4 text-xs text-gray-500 text-center align-top">
                        {p.description || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t">
                    <td className="p-4" />
                    {compared.map((p) => (
                      <td key={p.id} className="p-4 text-center">
                        <button
                          onClick={() => router.push(`/houses/${p.id}`)}
                          className="w-full bg-gray-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-700"
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
