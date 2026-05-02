import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ChevronRight, ArrowRight, Calendar, ChevronLeft, CheckCircle2,
  Stethoscope as StethIcon, ShieldCheck, Clock, HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TextReveal } from '@/components/reactbits/TextReveal';
import { BlurFade } from '@/components/reactbits/BlurFade';
import { ShimmerButton } from '@/components/reactbits/ShimmerButton';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { AnimatedGridPattern } from '@/components/reactbits/AnimatedGridPattern';
import { SERVICES, SERVICE_BY_SLUG } from '../services/data';
import { SERVICE_ICONS } from '../services/icons';
import { doctorAvatarUrl } from '../doctors/avatar';

/**
 * Dynamic service detail page rendered for /services/:slug.
 *
 * Looks the slug up in services/data.ts. Unknown slugs redirect back to
 * the services index. The page layout is identical for every service —
 * only the content changes — so adding a new service is a data-file edit
 * and nothing more.
 */
export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const service = slug ? SERVICE_BY_SLUG[slug] : undefined;

  if (!service) return <Navigate to="/services" replace />;

  const Icon = SERVICE_ICONS[service.iconKey] ?? StethIcon;

  // Sibling cards at the bottom — three other services for cross-discovery.
  const siblings = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <Hero service={service} Icon={Icon} />
      <Intro service={service} />
      {service.highlights.length > 0 && <Highlights service={service} />}
      {service.conditions.length > 0 && <Conditions service={service} />}
      {service.doctors.length > 0 && <DoctorsBlock service={service} />}
      {service.faqs.length > 0 && <FAQs service={service} />}
      <Siblings services={siblings} />
      <CTA />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Hero({ service, Icon }: { service: typeof SERVICES[0]; Icon: any }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-white to-white">
      <AnimatedGridPattern
        className="text-teal-500/30 [mask-image:radial-gradient(600px_circle_at_top,white,transparent)]"
        numSquares={22}
        maxOpacity={0.3}
      />
      <div className="relative mx-auto max-w-7xl px-6 pt-12 md:pt-16 pb-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 flex items-center gap-1.5">
          <Link to="/" className="hover:text-teal-700">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/services" className="hover:text-teal-700">Services</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-700">{service.name}</span>
        </nav>

        <div className="mt-8 flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-center">
          <BlurFade>
            <div className="h-20 w-20 grid place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200">
              <Icon className="h-10 w-10" />
            </div>
          </BlurFade>
          <div className="flex-1 min-w-0">
            <BlurFade delay={0.1}>
              <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">
                {service.tag}
              </Badge>
            </BlurFade>
            <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              <TextReveal>{service.name}</TextReveal>
            </h1>
            <BlurFade delay={0.6}>
              <p className="mt-4 text-xl text-teal-700 font-medium">
                {service.tagline}
              </p>
            </BlurFade>
            <BlurFade delay={0.7}>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/contact#book">
                  <ShimmerButton className="h-12 px-7">
                    <Calendar className="h-4 w-4" />
                    Book consultation
                  </ShimmerButton>
                </Link>
                <Button asChild variant="outline" size="lg" className="h-12 border-slate-300 hover:border-teal-500 hover:text-teal-700">
                  <Link to="/services"><ChevronLeft className="h-4 w-4 mr-1" /> All services</Link>
                </Button>
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  );
}

function Intro({ service }: { service: typeof SERVICES[0] }) {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-6">
        {service.intro.map((para, i) => (
          <BlurFade key={i} delay={0.05 * i}>
            <p className="text-lg text-slate-600 leading-relaxed mb-5 last:mb-0">
              {para}
            </p>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}

function Highlights({ service }: { service: typeof SERVICES[0] }) {
  return (
    <section className="py-14 md:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <BlurFade>
          <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">What we do</Badge>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Procedures &amp; capabilities.
          </h2>
        </BlurFade>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {service.highlights.map((h, i) => (
            <BlurFade key={h} delay={0.04 * (i % 6)}>
              <div className="rounded-xl bg-white border border-slate-200 p-5 flex gap-3 h-full">
                <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 text-[15px] leading-relaxed">{h}</span>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function Conditions({ service }: { service: typeof SERVICES[0] }) {
  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <BlurFade>
          <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">Conditions treated</Badge>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            What we see most often.
          </h2>
        </BlurFade>
        <BlurFade delay={0.2}>
          <p className="mt-3 text-slate-600 max-w-2xl">
            Don't see what you're looking for? Our doctors handle conditions
            beyond this list — book a consultation and we'll point you to the
            right specialist.
          </p>
        </BlurFade>
        <div className="mt-8 flex flex-wrap gap-2">
          {service.conditions.map((c, i) => (
            <BlurFade key={c} delay={0.02 * (i % 10)}>
              <span className="inline-block px-4 py-2 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-sm font-medium">
                {c}
              </span>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function DoctorsBlock({ service }: { service: typeof SERVICES[0] }) {
  return (
    <section className="py-14 md:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <BlurFade>
          <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">Specialists</Badge>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Doctors in this department.
          </h2>
        </BlurFade>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {service.doctors.map((d, i) => (
            <BlurFade key={d.name} delay={0.05 * i}>
              <SpotlightCard className="h-full">
                <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 mb-4 overflow-hidden grid place-items-center">
                  <img src={doctorAvatarUrl(d.name)} alt={d.name} className="w-full h-full object-cover" />
                </div>
                <div className="font-semibold text-slate-900 text-lg">{d.name}</div>
                <div className="text-sm text-teal-700">{service.name}</div>
                <Link to="/doctors" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:gap-2 transition-all">
                  View profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQs({ service }: { service: typeof SERVICES[0] }) {
  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-6">
        <BlurFade>
          <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">FAQs</Badge>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Quick answers.
          </h2>
        </BlurFade>
        <div className="mt-8 space-y-3">
          {service.faqs.map((f, i) => (
            <BlurFade key={f.q} delay={0.04 * i}>
              <details className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-teal-300 transition-colors">
                <summary className="flex justify-between items-start gap-3 cursor-pointer list-none">
                  <span className="flex gap-2 items-start font-medium text-slate-900">
                    <HelpCircle className="h-4 w-4 mt-0.5 shrink-0 text-teal-600" />
                    {f.q}
                  </span>
                  <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 ml-6 text-slate-600 text-[15px] leading-relaxed">
                  {f.a}
                </p>
              </details>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function Siblings({ services }: { services: typeof SERVICES }) {
  return (
    <section className="py-14 md:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <BlurFade>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Other services you may need</h2>
        </BlurFade>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => {
            const Icon = SERVICE_ICONS[s.iconKey] ?? StethIcon;
            return (
              <BlurFade key={s.slug} delay={0.05 * i}>
                <Link to={`/services/${s.slug}`} className="block">
                  <SpotlightCard className="h-full hover:-translate-y-0.5 transition-transform">
                    <div className="h-11 w-11 grid place-items-center rounded-lg bg-teal-50 text-teal-700 mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{s.short}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </SpotlightCard>
                </Link>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-3xl bg-slate-900 text-white px-8 md:px-14 py-12 md:py-16 grid lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Need to talk to a doctor about this?
            </h2>
            <p className="mt-3 text-slate-300 text-lg leading-relaxed max-w-xl">
              Our help desk will route you to the right specialist within 30 minutes
              of receiving your request — call, walk in, or book online.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-300"><Clock className="h-4 w-4 text-teal-400" /> 24×7 emergency: 1066</span>
              <span className="inline-flex items-center gap-2 text-slate-300"><ShieldCheck className="h-4 w-4 text-teal-400" /> Cashless · 30+ TPAs</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <Link to="/contact#book">
              <ShimmerButton className="h-12 px-8 bg-white text-slate-900 hover:bg-white">
                Book appointment
              </ShimmerButton>
            </Link>
            <Link
              to="/doctors"
              className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1"
            >
              Browse doctors <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
