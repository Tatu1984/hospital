import { Link } from 'react-router-dom';
import {
  Stethoscope, HeartPulse, Brain, Baby, Bone, Eye, Activity, Microscope, Pill,
  Ambulance, Syringe, Scissors, Droplet, Bed, Calendar, ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TextReveal } from '@/components/reactbits/TextReveal';
import { BlurFade } from '@/components/reactbits/BlurFade';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShimmerButton } from '@/components/reactbits/ShimmerButton';

const SERVICES = [
  {
    Icon: HeartPulse,
    name: 'Cardiology',
    body: 'Cardiac OPD, ECG / TMT / Echo, 24×7 cath lab, angiography & angioplasty, pacemaker implantation, post-MI rehabilitation programme.',
    tag: 'Core',
  },
  {
    Icon: Brain,
    name: 'Neurology & Stroke',
    body: 'Stroke ER protocol with door-to-needle under 30 minutes, CT scan and MRI on-site, neuro-rehabilitation OPD, headache and seizure clinics.',
    tag: 'Core',
  },
  {
    Icon: Baby,
    name: 'Paediatrics & NICU',
    body: 'Newborn ward, Level-IIIa NICU with ventilator beds, paediatric OPD, vaccination schedule, well-baby clinic.',
    tag: 'Core',
  },
  {
    Icon: Stethoscope,
    name: 'Obstetrics & Gynaecology',
    body: 'Antenatal package, ultrasound and foetal monitoring, normal and caesarean delivery, gynaec surgery, fertility consultation.',
    tag: 'Core',
  },
  {
    Icon: Bone,
    name: 'Orthopaedics & Joint Replacement',
    body: 'Fracture management, total knee and hip replacement, arthroscopy, spine surgery, sports-injury rehabilitation.',
    tag: 'Core',
  },
  {
    Icon: Scissors,
    name: 'General & Laparoscopic Surgery',
    body: 'Hernia, gallbladder, appendix, hydrocele, hemorrhoids — most done laparoscopically with same-day or next-day discharge.',
    tag: 'Core',
  },
  {
    Icon: Eye,
    name: 'Ophthalmology',
    body: 'Cataract surgery (phacoemulsification + lens implant), LASIK, retinal disease management, glaucoma, paediatric eye care.',
    tag: 'OPD',
  },
  {
    Icon: Stethoscope,
    name: 'Internal Medicine',
    body: 'Diabetes care, hypertension management, fever clinic, geriatric medicine, periodic health checks.',
    tag: 'OPD',
  },
  {
    Icon: Activity,
    name: 'Critical Care (ICU)',
    body: '24-bed ICU with dedicated MICU, SICU and CCU wings. Senior intensivist on duty 24×7. Daily family briefings at fixed hours.',
    tag: 'IPD',
  },
  {
    Icon: Bed,
    name: 'Emergency & Trauma',
    body: 'Triage by senior emergency physician, resuscitation bay, on-site CT, blood bank cross-match in under 30 minutes.',
    tag: 'IPD',
  },
  {
    Icon: Microscope,
    name: 'Pathology & Diagnostics',
    body: 'NABL-aligned pathology lab, biochemistry, microbiology, histopathology. Most reports the same day.',
    tag: 'Diagnostics',
  },
  {
    Icon: Activity,
    name: 'Radiology & Imaging',
    body: 'X-ray, ultrasound (including portable for ICU), CT scan, MRI, mammography. PACS-based digital report delivery.',
    tag: 'Diagnostics',
  },
  {
    Icon: Droplet,
    name: 'Blood Bank',
    body: 'In-house blood bank with whole blood, packed RBC, platelets, plasma. Compatibility testing on-site, no delays for OT cases.',
    tag: 'Support',
  },
  {
    Icon: Pill,
    name: 'Pharmacy',
    body: '24×7 in-house pharmacy. RFID/barcode-linked dispensing reduces medication errors. Home delivery for chronic-care patients.',
    tag: 'Support',
  },
  {
    Icon: Ambulance,
    name: 'Ambulance Service',
    body: 'Three ambulances — one BLS, two ALS. Average response time 14 minutes within Kolkata corporation limits.',
    tag: 'Support',
  },
  {
    Icon: Syringe,
    name: 'Health Checkup Packages',
    body: 'Basic, executive, women\'s health, senior citizen, and pre-employment packages. Bookable online with home sample collection.',
    tag: 'Wellness',
  },
];

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
            {SERVICES.map(({ Icon, name, body, tag }, i) => (
              <BlurFade key={name} delay={0.04 * (i % 6)}>
                <SpotlightCard className="h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-11 w-11 grid place-items-center rounded-lg bg-teal-50 text-teal-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-1 rounded-md border ${TAG_STYLES[tag]}`}>
                      {tag}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 text-lg">{name}</div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
                </SpotlightCard>
              </BlurFade>
            ))}
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
              <Link to="/website/contact#book">
                <ShimmerButton className="h-12 px-8">
                  <Calendar className="h-4 w-4" /> Book appointment
                </ShimmerButton>
              </Link>
              <Link
                to="/website/doctors"
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
