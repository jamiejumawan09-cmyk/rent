"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";


const values = [
  { icon: "🏠", title: "Quality Homes", desc: "Every listing is verified and inspected to ensure it meets our standards for safety and comfort." },
  { icon: "🤝", title: "Trust & Transparency", desc: "We connect landlords and tenants with honest information and no hidden fees." },
  { icon: "⚡", title: "Fast & Easy", desc: "Browse, book, and move in — simplified into a seamless experience for everyone." },
  { icon: "📍", title: "Local Expertise", desc: "We know the Philippine rental market and help you find the right home in the right location." },
];

const stats = [
  { value: "500+", label: "Properties Listed" },
  { value: "1,200+", label: "Happy Tenants" },
  { value: "50+", label: "Cities Covered" },
  { value: "4.8★", label: "Average Rating" },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <Image src="/pic.jpg" alt="About Hero" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 flex flex-col justify-center px-6 md:px-16">
          <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Who we are</p>
          <h1 className="text-white text-3xl md:text-5xl font-extrabold leading-tight">
            About HOMERent
          </h1>
          <p className="text-gray-300 text-sm md:text-base max-w-md mt-2">
            The Philippines&apos; trusted rental platform connecting tenants with verified landlords since 2022.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5 text-center shadow-sm border">
              <p className="text-2xl font-extrabold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2">Our Mission</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-4">
              Making rental homes accessible to everyone
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              HOMERent was founded with a simple mission — make finding and renting a home in the Philippines easier, safer, and more transparent. We believe everyone deserves a comfortable place to call home without the stress and hassle of traditional property hunting.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              We work directly with verified landlords to bring you quality listings with accurate information, fair prices, and a straightforward booking process.
            </p>
          </div>
          <div className="relative h-64 rounded-xl overflow-hidden shadow-md">
            <Image src="/pic2.jpg" alt="Mission" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-14">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2">What we stand for</p>
            <h2 className="text-2xl font-extrabold text-gray-800">Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-gray-50 rounded-xl p-5 border hover:shadow-sm transition-shadow">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="text-sm font-extrabold text-gray-800 mb-2">{v.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-800 py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-white mb-3">Ready to find your next home?</h2>
          <p className="text-gray-300 text-sm mb-6">Browse hundreds of verified rental properties across the Philippines.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/houses")}
              className="bg-red-500 text-white text-sm font-bold px-8 py-3 rounded-lg hover:bg-red-600 transition-colors"
            >
              Browse Properties
            </button>
            <button
              onClick={() => router.push("/contact")}
              className="border border-gray-500 text-gray-300 text-sm font-bold px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

    </main>
  );
}
