import { Outlet, NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import { Heart, Menu, X, Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/reactbits/ShimmerButton';
import { cn } from '@/lib/utils';

// The portal sign-in URL — same domain, /login route. The website lives
// at the root of hospital-vnyb.vercel.app and the portal is at /app
// (login form at /login). PORTAL_URL is left as an absolute URL so any
// future split-deployment (separate marketing domain) keeps working.
const PORTAL_URL = '/login';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/contact', label: 'Contact' },
];

export default function WebsiteLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Top utility bar — phone, email, emergency line */}
      <div className="hidden md:block border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-2 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> +91 98300 12345</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> care@hospital.example</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-rose-600 font-medium">24×7 Emergency: 1066</span>
            <span className="hidden lg:inline text-slate-400">|</span>
            <a href="#" className="hidden lg:inline hover:text-slate-900">Patient Portal</a>
            <a href="#" className="hidden lg:inline hover:text-slate-900">Careers</a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-teal-600 text-white grid place-items-center transition-transform group-hover:scale-105">
              <Heart className="h-5 w-5" fill="currentColor" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">Asha Hospital</div>
              <div className="text-[11px] text-slate-500 tracking-wide uppercase">Care · Cure · Compassion</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'text-teal-700 bg-teal-50'
                      : 'text-slate-700 hover:text-teal-700 hover:bg-slate-50',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild className="text-slate-700">
              <a href="#book">Book Appointment</a>
            </Button>
            <Link to={PORTAL_URL}>
              <ShimmerButton className="h-10 px-6 text-sm">
                Sign In
              </ShimmerButton>
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-md hover:bg-slate-100"
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'px-3 py-2 text-sm font-medium rounded-md',
                      isActive ? 'text-teal-700 bg-teal-50' : 'text-slate-700 hover:bg-slate-50',
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <Link
                to={PORTAL_URL}
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-teal-500 text-white grid place-items-center">
              <Heart className="h-5 w-5" fill="currentColor" />
            </div>
            <span className="font-semibold text-white text-lg">Asha Hospital</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 max-w-md">
            A multi-speciality hospital in West Bengal delivering compassionate
            care backed by modern technology. Open 24×7 for emergency care.
          </p>
          <div className="mt-5 flex gap-3">
            {[Facebook, Instagram, Linkedin, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="h-9 w-9 grid place-items-center rounded-md border border-slate-700 hover:border-teal-500 hover:text-teal-400 transition-colors"
                aria-label="Social link"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-teal-400">About Us</Link></li>
            <li><Link to="/services" className="hover:text-teal-400">Services</Link></li>
            <li><Link to="/doctors" className="hover:text-teal-400">Our Doctors</Link></li>
            <li><Link to="/contact" className="hover:text-teal-400">Contact</Link></li>
            <li><Link to={PORTAL_URL} className="hover:text-teal-400">Patient Portal</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Reach Us</h4>
          <ul className="space-y-2.5 text-sm">
            <li className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-teal-400" /> 12 Park Street, Kolkata 700016, West Bengal</li>
            <li className="flex gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0 text-teal-400" /> +91 98300 12345</li>
            <li className="flex gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0 text-teal-400" /> care@hospital.example</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Asha Hospital. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Patient Charter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { PORTAL_URL };
