import { Award, ShieldCheck, Heart, Users, Building2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TextReveal } from '@/components/reactbits/TextReveal';
import { BlurFade } from '@/components/reactbits/BlurFade';
import { NumberTicker } from '@/components/reactbits/NumberTicker';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

export default function About() {
  return (
    <>
      <section className="bg-gradient-to-b from-teal-50/60 to-white pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <BlurFade>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200">Our Story</Badge>
          </BlurFade>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl">
            <TextReveal>Started in 1998. Still answering bells at 3 AM.</TextReveal>
          </h1>
          <BlurFade delay={0.5}>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 leading-relaxed">
              We opened with eight beds and three doctors, on the simple promise
              that no one in the neighbourhood should have to travel to Salt Lake
              for a midnight emergency. Twenty-eight years later we still hold to
              that promise — only now we have 180 beds and 65 specialists.
            </p>
          </BlurFade>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <BlurFade>
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-teal-100 via-emerald-50 to-white border border-teal-100/60 p-10 grid place-items-center">
                <Building2 className="h-32 w-32 text-teal-600/40" />
              </div>
            </BlurFade>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                Our mission
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                To deliver clinically excellent, financially honest, and humanly
                kind healthcare to every person who walks through our doors —
                regardless of their ability to pay full price.
              </p>
              <h3 className="mt-8 text-lg font-semibold text-slate-900">What that means in practice</h3>
              <ul className="mt-3 space-y-2.5 text-slate-600 text-[15px]">
                <li className="flex gap-2.5"><Heart className="h-4 w-4 text-teal-600 mt-1 shrink-0" /> Every patient sees a senior consultant for surgical decisions, not a junior.</li>
                <li className="flex gap-2.5"><Heart className="h-4 w-4 text-teal-600 mt-1 shrink-0" /> Quoted estimate equals final bill, except for items consented to in writing.</li>
                <li className="flex gap-2.5"><Heart className="h-4 w-4 text-teal-600 mt-1 shrink-0" /> 12% of beds reserved for community-rate access.</li>
                <li className="flex gap-2.5"><Heart className="h-4 w-4 text-teal-600 mt-1 shrink-0" /> Discharge summaries given before bill is settled, never as leverage.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 text-center">
            {[
              { value: 180, label: 'Beds' },
              { value: 65, suffix: '+', label: 'Specialists' },
              { value: 28, suffix: '+', label: 'Years of service' },
              { value: 30, suffix: '+', label: 'Insurance partners' },
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

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <BlurFade>
            <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">Values</Badge>
          </BlurFade>
          <BlurFade delay={0.1}>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-slate-900 max-w-3xl">
              The four lines that decide every hard call.
            </h2>
          </BlurFade>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { Icon: Heart, title: 'Patient first', body: 'Every protocol exists to help the person on the bed, not to please an audit.' },
              { Icon: ShieldCheck, title: 'No surprise bills', body: 'Quote → consent → invoice. The amount on the discharge sheet equals what we said upfront.' },
              { Icon: Award, title: 'Senior accountability', body: 'A consultant signs every surgical decision, every ICU shift, every discharge. Names on the chart, not initials.' },
              { Icon: Sparkles, title: 'Always learning', body: 'Mortality reviews are open to all clinicians. New evidence is in protocols within four weeks of publication.' },
            ].map(({ Icon, title, body }, i) => (
              <BlurFade key={title} delay={0.05 * i}>
                <SpotlightCard className="h-full">
                  <div className="h-11 w-11 grid place-items-center rounded-lg bg-teal-50 text-teal-700 mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-slate-900">{title}</div>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </SpotlightCard>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <Users className="h-6 w-6 text-teal-600 mb-4" />
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Leadership</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              The hospital is led by a clinical leadership team — three senior
              consultants who jointly chair the medical board, supported by a CEO
              who has spent twenty years in hospital administration.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
