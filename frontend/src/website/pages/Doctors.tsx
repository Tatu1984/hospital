import { useMemo, useState } from 'react';
import { Search, GraduationCap, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TextReveal } from '@/components/reactbits/TextReveal';
import { BlurFade } from '@/components/reactbits/BlurFade';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { Link } from 'react-router-dom';
import { ShimmerButton } from '@/components/reactbits/ShimmerButton';

interface Doctor {
  name: string;
  spec: string;
  exp: number;
  qual: string;
  from: string;
  days: string;
}

const DOCTORS: Doctor[] = [
  { name: 'Dr. Sarbari Mukherjee', spec: 'Cardiology', exp: 22, qual: 'MD, DM (Cardiology)', from: 'AIIMS New Delhi', days: 'Mon, Wed, Fri · 10am-1pm' },
  { name: 'Dr. Rohan Banerjee', spec: 'Emergency Medicine', exp: 14, qual: 'MD, FRCEM', from: 'CMC Vellore', days: 'On-call 24×7' },
  { name: 'Dr. Priyanka Roy', spec: 'Paediatrics', exp: 17, qual: 'MD (Paed), DNB Neonatology', from: 'PGI Chandigarh', days: 'Mon-Sat · 9am-12pm' },
  { name: 'Dr. Anuradha Sen', spec: 'Obstetrics & Gynaecology', exp: 20, qual: 'MS (OB-GYN), MRCOG', from: 'KEM Mumbai', days: 'Tue, Thu, Sat · 11am-2pm' },
  { name: 'Dr. Vikram Das', spec: 'Orthopaedics', exp: 18, qual: 'MS (Ortho), Fellowship Joint Replacement', from: 'NUH Singapore', days: 'Mon, Wed, Fri · 5pm-8pm' },
  { name: 'Dr. Mitra Ghosh', spec: 'Neurology', exp: 16, qual: 'MD, DM (Neurology)', from: 'NIMHANS', days: 'Tue, Thu · 10am-1pm' },
  { name: 'Dr. Abhik Pal', spec: 'General Surgery', exp: 15, qual: 'MS (Gen Surg), FMAS, FALS', from: 'KGMC Lucknow', days: 'Mon-Fri · 9am-12pm' },
  { name: 'Dr. Nandita Roy', spec: 'Ophthalmology', exp: 19, qual: 'MS (Ophth), Fellowship Retina', from: 'Sankara Nethralaya', days: 'Tue, Thu, Sat · 10am-2pm' },
  { name: 'Dr. Joydeep Sarkar', spec: 'Internal Medicine', exp: 24, qual: 'MD (Medicine), FRCP', from: 'Royal London Hospital', days: 'Mon-Sat · 8am-11am' },
  { name: 'Dr. Tanya Saha', spec: 'Pathology', exp: 13, qual: 'MD (Path), Fellowship Histopath', from: 'Tata Memorial', days: 'Mon-Fri · 9am-5pm' },
  { name: 'Dr. Imran Mondal', spec: 'Anaesthesiology', exp: 17, qual: 'MD (Anaesth), Critical Care', from: 'AIIMS Bhubaneswar', days: 'On-call · OT schedule' },
  { name: 'Dr. Lakshmi Ray', spec: 'Cardiology', exp: 11, qual: 'MD, DM (Cardiology)', from: 'SCTIMST Trivandrum', days: 'Tue, Thu, Sat · 4pm-7pm' },
];

const SPECIALITIES = ['All', 'Cardiology', 'Neurology', 'Paediatrics', 'Obstetrics & Gynaecology', 'Orthopaedics', 'General Surgery', 'Ophthalmology', 'Internal Medicine', 'Emergency Medicine', 'Anaesthesiology', 'Pathology'];

export default function Doctors() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOCTORS.filter((d) =>
      (filter === 'All' || d.spec === filter) &&
      (!q || d.name.toLowerCase().includes(q) || d.qual.toLowerCase().includes(q) || d.from.toLowerCase().includes(q))
    );
  }, [filter, query]);

  return (
    <>
      <section className="bg-gradient-to-b from-teal-50/60 to-white pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <BlurFade>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200">Doctors</Badge>
          </BlurFade>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl">
            <TextReveal>Find your specialist.</TextReveal>
          </h1>
          <BlurFade delay={0.4}>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 leading-relaxed">
              Senior consultants only. Every doctor listed here trained at one of
              India's top tertiary centres or an internationally accredited
              programme.
            </p>
          </BlurFade>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          <BlurFade>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-8">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 h-11"
                  placeholder="Search by name, qualification…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {SPECIALITIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      filter === s
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </BlurFade>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
              No doctors match that search. Try a different speciality or clear the filter.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((d, i) => (
                <BlurFade key={d.name} delay={0.04 * (i % 6)}>
                  <SpotlightCard className="h-full">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 grid place-items-center text-teal-700 text-lg font-bold">
                        {d.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{d.name}</div>
                        <div className="text-sm text-teal-700">{d.spec}</div>
                        <div className="mt-1 text-xs text-slate-500">{d.exp} years experience</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
                      <div className="flex gap-2 text-slate-600">
                        <GraduationCap className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                        <div>
                          <div>{d.qual}</div>
                          <div className="text-xs text-slate-500">{d.from}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 text-slate-600">
                        <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                        <span>{d.days}</span>
                      </div>
                    </div>
                    <Link
                      to="/website/contact#book"
                      className="mt-5 inline-flex w-full justify-center items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                    >
                      Book consultation
                    </Link>
                  </SpotlightCard>
                </BlurFade>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            Looking for a visiting consultant?
          </h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Oncology, nephrology, urology and dermatology consultants visit on
            scheduled days. Call our help desk to book.
          </p>
          <div className="mt-6">
            <Link to="/website/contact">
              <ShimmerButton className="h-12 px-8">Contact us</ShimmerButton>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
