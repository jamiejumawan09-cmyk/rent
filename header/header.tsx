import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight">
          
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="Home" className="text-sm font-medium hover:text-gray-600">
            Home
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-gray-600">
            About
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:text-gray-600">
            Contact
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}