import { Link } from 'react-router-dom';
import {
  Stethoscope, HeartPulse, Brain, Baby, Bone, Eye,
  Activity, Microscope, Pill, Clock, ShieldCheck, Sparkles, ArrowRight, Calendar,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextReveal } from '@/components/reactbits/TextReveal';
import { BlurFade } from '@/components/reactbits/BlurFade';
import { NumberTicker } from '@/components/reactbits/NumberTicker';
import { Marquee } from '@/components/reactbits/Marquee';
import { ShimmerButton } from '@/components/reactbits/ShimmerButton';
import { AnimatedGridPattern } from '@/components/reactbits/AnimatedGridPattern';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { PORTAL_URL } from '../WebsiteLayout';
import { doctorAvatarUrl } from '../doctors/avatar';

export default function Home() {
  return (
    <>
      <Hero />
      <Specialities />
      <WhyUs />
      <Stats />
      <DoctorsTeaser />
      <Testimonials />
      <CTA />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-white to-white">
      <AnimatedGridPattern
        className="text-teal-500/30 [mask-image:radial-gradient(700px_circle_at_top,white,transparent)]"
        numSquares={28}
        maxOpacity={0.35}
        duration={5}
      />
      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <BlurFade>
              <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50 border-teal-200 rounded-full px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                NABH-aligned · 24×7 emergency
              </Badge>
            </BlurFade>
            <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05]">
              <TextReveal>Care that listens.</TextReveal>
              <br />
              <TextReveal delay={0.4} className="text-teal-700">
                Healing that works.
              </TextReveal>
            </h1>
            <BlurFade delay={0.7}>
              <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
                A multi-speciality hospital combining experienced clinicians with
                modern diagnostics. From everyday OPD to critical care, we look
                after the people of West Bengal — round the clock.
              </p>
            </BlurFade>
            <BlurFade delay={0.9}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact#book">
                  <ShimmerButton className="h-12 px-8">
                    <Calendar className="h-4 w-4" />
                    Book Appointment
                  </ShimmerButton>
                </Link>
                <Button asChild variant="outline" size="lg" className="h-12 border-slate-300 hover:border-teal-500 hover:text-teal-700">
                  <Link to="/services">Explore services <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
            </BlurFade>
            <BlurFade delay={1.1}>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  Cashless · 30+ TPAs
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-600" />
                  Avg. OPD wait under 18 min
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  Live bed availability
                </div>
              </div>
            </BlurFade>
          </div>

          {/* Hero visual block — stylised "always on" duty card */}
          <BlurFade delay={0.5} yOffset={20}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-teal-200/40 via-transparent to-emerald-200/40 blur-2xl rounded-3xl" />
              <div className="relative rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500">Right now</div>
                    <div className="text-2xl font-semibold text-slate-900">On Duty</div>
                  </div>
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {[
                    { dept: 'Emergency', name: 'Dr. R. Banerjee', spec: 'Emergency Medicine' },
                    { dept: 'Cardiology', name: 'Dr. S. Mukherjee', spec: 'Interventional Cardiology' },
                    { dept: 'Paediatrics', name: 'Dr. P. Roy', spec: 'Paediatric Medicine' },
                    { dept: 'OB-GYN', name: 'Dr. A. Sen', spec: 'Obstetrics & Gynaecology' },
                  ].map((row) => (
                    <li key={row.dept} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-500">{row.spec}</div>
                      </div>
                      <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50">
                        {row.dept}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">ICU beds</div>
                    <div className="text-lg font-semibold text-slate-900">8 / 24</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">OT today</div>
                    <div className="text-lg font-semibold text-slate-900">6</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Wait</div>
                    <div className="text-lg font-semibold text-slate-900">14m</div>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}

const SPECIALITIES = [
  { Icon: HeartPulse, name: 'Cardiology', desc: 'Heart attack, angiography, angioplasty, pacemaker.' },
  { Icon: Brain, name: 'Neurology', desc: 'Stroke care, headache, seizure, neuro-rehabilitation.' },
  { Icon: Baby, name: 'Paediatrics', desc: 'Newborn care, vaccinations, NICU, child wellness.' },
  { Icon: Bone, name: 'Orthopaedics', desc: 'Fracture care, joint replacement, spine, sports injury.' },
  { Icon: Eye, name: 'Ophthalmology', desc: 'Cataract, LASIK, retinal care, glaucoma management.' },
  { Icon: Stethoscope, name: 'General Medicine', desc: 'Diabetes, hypertension, fever clinic, health checks.' },
  { Icon: Microscope, name: 'Diagnostics', desc: 'Pathology, radiology, MRI, CT, ultrasound.' },
  { Icon: Pill, name: 'Pharmacy', desc: '24×7 in-house pharmacy with home delivery.' },
];

function Specialities() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <BlurFade>
            <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">Our Specialities</Badge>
          </BlurFade>
          <BlurFade delay={0.1}>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Eight departments. One coordinated team.
            </h2>
          </BlurFade>
          <BlurFade delay={0.2}>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Every patient story crosses many departments. Our shared electronic
              record means your cardiologist, paediatrician and pharmacist all see
              the same notes — without you repeating yourself.
            </p>
          </BlurFade>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SPECIALITIES.map(({ Icon, name, desc }, i) => (
            <BlurFade key={name} delay={0.05 * i}>
              <SpotlightCard className="h-full">
                <div className="h-11 w-11 grid place-items-center rounded-lg bg-teal-50 text-teal-700 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-slate-900">{name}</div>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{desc}</p>
                <Link
                  to="/services"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:gap-2 transition-all"
                >
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const ITEMS = [
    {
      Icon: Clock,
      title: 'Always open',
      body: '24×7 emergency, ICU, in-house pharmacy and diagnostics. No "come back tomorrow" for what cannot wait.',
    },
    {
      Icon: ShieldCheck,
      title: 'Cashless friendly',
      body: 'Direct billing with 30+ insurance partners and TPAs. Most claims pre-authorised within 4 hours.',
    },
    {
      Icon: Activity,
      title: 'Modern records',
      body: 'Your reports, prescriptions and bills all live in your patient portal. Available on any device, any time.',
    },
  ];
  return (
    <section className="bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {ITEMS.map(({ Icon, title, body }, i) => (
            <BlurFade key={title} delay={0.1 * i}>
              <div className="rounded-2xl bg-white border border-slate-200 p-8 h-full">
                <div className="h-12 w-12 grid place-items-center rounded-xl bg-teal-600 text-white mb-5">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">{body}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-teal-50/40 to-white" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 text-center">
          {[
            { value: 28, suffix: '+', label: 'Years of service' },
            { value: 120000, label: 'Patients treated' },
            { value: 65, suffix: '+', label: 'Specialist consultants' },
            { value: 98, suffix: '%', label: 'Satisfaction score' },
          ].map((s, i) => (
            <BlurFade key={s.label} delay={0.05 * i}>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-slate-900 tabular-nums">
                  <NumberTicker value={s.value} suffix={s.suffix || ''} />
                </div>
                <div className="mt-2 text-sm text-slate-600">{s.label}</div>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

const DOCTORS = [
  { name: 'Dr. Sarbari Mukherjee', spec: 'Interventional Cardiology', exp: '22 yrs', from: 'AIIMS' },
  { name: 'Dr. Rohan Banerjee', spec: 'Emergency Medicine', exp: '14 yrs', from: 'CMC Vellore' },
  { name: 'Dr. Priyanka Roy', spec: 'Paediatrics & Neonatology', exp: '17 yrs', from: 'PGI Chandigarh' },
  { name: 'Dr. Anuradha Sen', spec: 'Obstetrics & Gynaecology', exp: '20 yrs', from: 'KEM Mumbai' },
];

function DoctorsTeaser() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div className="max-w-xl">
            <BlurFade>
              <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">Senior Consultants</Badge>
            </BlurFade>
            <BlurFade delay={0.1}>
              <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Doctors who've trained where it matters.
              </h2>
            </BlurFade>
          </div>
          <BlurFade delay={0.2}>
            <Button asChild variant="outline" className="border-slate-300 hover:border-teal-500 hover:text-teal-700">
              <Link to="/doctors">View all doctors <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </BlurFade>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {DOCTORS.map((d, i) => (
            <BlurFade key={d.name} delay={0.05 * i}>
              <SpotlightCard className="h-full !p-0 overflow-hidden">
                <div className="aspect-[4/5] bg-slate-50 overflow-hidden border-b border-slate-100">
                  <img
                    src={doctorAvatarUrl(d.name)}
                    alt={d.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <div className="font-semibold text-slate-900">{d.name}</div>
                  <div className="text-sm text-teal-700">{d.spec}</div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{d.exp} experience</span>
                    <span className="text-slate-400">{d.from}</span>
                  </div>
                </div>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  { name: 'Sumit C.', role: 'Patient · Cardiology', body: 'The cath lab team caught my heart attack inside the golden hour. The follow-up app keeps reminding me about meds — useful at my age.' },
  { name: 'Riya & family', role: 'NICU · 12 days', body: 'Our baby was 32 weeks. Dr. Roy and the NICU nurses were calm even when we weren\'t. We took a healthy daughter home.' },
  { name: 'Mr. Ghosh', role: 'Joint replacement', body: 'Total knee on Monday, walking with support by Thursday. Honest pricing — what they quoted is what we paid.' },
  { name: 'Dr. Pal', role: 'Referring physician', body: 'I refer my OPD cases here for cross-consults. Reports come back the same day, formatted, on the patient portal.' },
  { name: 'Anita M.', role: 'Maternity', body: 'Two pregnancies, two safe deliveries. The OB-GYN team listens to questions instead of brushing them off.' },
  { name: 'Prashant T.', role: 'Diabetes care', body: 'I\'ve been a patient for 9 years. They updated my prescription on the app — no more clinic queue for renewals.' },
];

function Testimonials() {
  return (
    <section className="bg-slate-900 text-white py-20 md:py-28 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 mb-12">
        <div className="max-w-2xl">
          <Badge variant="outline" className="text-teal-300 border-teal-700 bg-teal-900/30">Voices</Badge>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
            What our patients say.
          </h2>
          <p className="mt-3 text-slate-400 leading-relaxed">
            Real stories from real patients. Names shortened where requested.
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-900 to-transparent z-10" />
        <Marquee speedSec={50}>
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="w-[340px] sm:w-[380px] shrink-0 rounded-2xl border border-slate-800 bg-slate-800/40 p-6"
            >
              <Quote className="h-5 w-5 text-teal-400 mb-3" />
              <blockquote className="text-sm leading-relaxed text-slate-200">
                {t.body}
              </blockquote>
              <figcaption className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-sm font-medium text-white">{t.name}</div>
                <div className="text-xs text-slate-400">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="book" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 px-8 md:px-14 py-14 md:py-20 text-white">
          <AnimatedGridPattern
            className="text-white/15 [mask-image:radial-gradient(600px_circle_at_top_right,white,transparent)]"
            numSquares={22}
            maxOpacity={0.25}
          />
          <div className="relative max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              <TextReveal>Need to see a doctor today?</TextReveal>
            </h2>
            <p className="mt-5 text-teal-50 text-lg max-w-xl leading-relaxed">
              Book online, walk in, or call our 24×7 helpline. Most OPD slots are
              available within 90 minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact#book">
                <ShimmerButton className="h-12 px-8 bg-white text-slate-900 hover:bg-white">
                  Book appointment
                </ShimmerButton>
              </Link>
              <Link to={PORTAL_URL}>
                <Button variant="outline" size="lg" className="h-12 bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white">
                  Open patient portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
