import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Stethoscope as DefaultIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TextReveal } from '@/components/reactbits/TextReveal';
import { BlurFade } from '@/components/reactbits/BlurFade';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShimmerButton } from '@/components/reactbits/ShimmerButton';
import { SERVICES } from '../services/data';
import { SERVICE_ICONS } from '../services/icons';

const TAG_STYLES: Record<string, string> = {
  Core: 'bg-teal-50 text-teal-700 border-teal-200',
  OPD: 'bg-sky-50 text-sky-700 border-sky-200',
  IPD: 'bg-rose-50 text-rose-700 border-rose-200',
  Diagnostics: 'bg-violet-50 text-violet-700 border-violet-200',
  Support: 'bg-amber-50 text-amber-700 border-amber-200',
  Wellness: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function Services() {
  return (
    <>
      <section className="bg-gradient-to-b from-teal-50/60 to-white pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <BlurFade>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200">Services</Badge>
          </BlurFade>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl">
            <TextReveal>Sixteen specialities. One coordinated record.</TextReveal>
          </h1>
          <BlurFade delay={0.5}>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 leading-relaxed">
              From a fever clinic visit to a multi-vessel angioplasty, every
              encounter lives in the same patient record. Your doctor sees what
              the previous one wrote, your pharmacist sees what was prescribed,
              and you see all of it on the patient portal.
            </p>
          </BlurFade>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((service, i) => {
              const Icon = SERVICE_ICONS[service.iconKey] ?? DefaultIcon;
              return (
                <BlurFade key={service.slug} delay={0.04 * (i % 6)}>
                  <Link to={`/services/${service.slug}`} className="block h-full">
                    <SpotlightCard className="h-full hover:-translate-y-0.5 transition-transform">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-11 w-11 grid place-items-center rounded-lg bg-teal-50 text-teal-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-1 rounded-md border ${TAG_STYLES[service.tag]}`}>
                          {service.tag}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 text-lg">{service.name}</div>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{service.short}</p>
                      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
                        Learn more <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </SpotlightCard>
                  </Link>
                </BlurFade>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl bg-white border border-slate-200 px-8 md:px-14 py-12 md:py-16 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Don't see your speciality?
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                We host visiting consultants in oncology, urology, nephrology and
                dermatology on scheduled days. Call our help desk and we'll book
                you with the right one.
              </p>
            </div>
            <div className="flex lg:justify-end gap-3 flex-wrap">
              <Link to="/contact#book">
                <ShimmerButton className="h-12 px-8">
                  <Calendar className="h-4 w-4" /> Book appointment
                </ShimmerButton>
              </Link>
              <Link
                to="/doctors"
                className="inline-flex items-center gap-1 px-6 h-12 rounded-xl border border-slate-300 hover:border-teal-500 hover:text-teal-700 font-medium text-sm"
              >
                Browse doctors <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
