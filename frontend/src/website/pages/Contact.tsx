import { useState, FormEvent } from 'react';
import { MapPin, Phone, Mail, Clock, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TextReveal } from '@/components/reactbits/TextReveal';
import { BlurFade } from '@/components/reactbits/BlurFade';
import { ShimmerButton } from '@/components/reactbits/ShimmerButton';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Hook this up to your backend / EmailJS / Formspree later.
    // For the marketing site we just acknowledge success client-side.
    setSubmitted(true);
  };

  return (
    <>
      <section className="bg-gradient-to-b from-teal-50/60 to-white pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <BlurFade>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200">Get in Touch</Badge>
          </BlurFade>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl">
            <TextReveal>We're here, every hour of every day.</TextReveal>
          </h1>
          <BlurFade delay={0.4}>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 leading-relaxed">
              Reach us by phone, email or the form below. For medical emergencies
              call <span className="text-rose-600 font-semibold">1066</span>{' '}
              directly — it routes to the on-duty emergency physician.
            </p>
          </BlurFade>
        </div>
      </section>

      <section className="py-16 md:py-20" id="book">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-5 gap-10">
            {/* Contact details */}
            <div className="lg:col-span-2 space-y-6">
              <BlurFade>
                <ContactCard
                  Icon={MapPin}
                  title="Visit"
                  body={<>12 Park Street, Kolkata 700016<br />West Bengal, India</>}
                />
              </BlurFade>
              <BlurFade delay={0.05}>
                <ContactCard
                  Icon={Phone}
                  title="Call"
                  body={<>Front desk: <a className="text-teal-700" href="tel:+919830012345">+91 98300 12345</a><br />Appointments: <a className="text-teal-700" href="tel:+919830012346">+91 98300 12346</a></>}
                />
              </BlurFade>
              <BlurFade delay={0.1}>
                <ContactCard
                  Icon={Mail}
                  title="Email"
                  body={<>General: <a className="text-teal-700" href="mailto:care@hospital.example">care@hospital.example</a><br />Insurance: <a className="text-teal-700" href="mailto:tpa@hospital.example">tpa@hospital.example</a></>}
                />
              </BlurFade>
              <BlurFade delay={0.15}>
                <ContactCard
                  Icon={Clock}
                  title="Hours"
                  body={<>OPD: Mon-Sat, 8am - 8pm<br />Emergency: 24×7<br />Pharmacy: 24×7</>}
                />
              </BlurFade>
              <BlurFade delay={0.2}>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-rose-900">Medical emergency?</div>
                    <div className="text-rose-800 mt-0.5">
                      Don't wait for a form reply. Call <a href="tel:1066" className="font-semibold underline">1066</a> or
                      come straight to our emergency department — open 24×7.
                    </div>
                  </div>
                </div>
              </BlurFade>
            </div>

            {/* Booking form */}
            <div className="lg:col-span-3">
              <BlurFade delay={0.1}>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-slate-900">Book an appointment</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Fill this form and our help desk will call you within 30 minutes
                    to confirm a slot. No advance payment required.
                  </p>

                  {submitted ? (
                    <div className="mt-8 rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                      <div className="mt-3 font-semibold text-emerald-900">Thanks — we've got it.</div>
                      <p className="mt-1 text-sm text-emerald-800">
                        A member of the help desk will call you within 30 minutes.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setSubmitted(false)}
                        className="mt-5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                      >
                        Submit another
                      </Button>
                    </div>
                  ) : (
                    <form className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={onSubmit}>
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Full name</Label>
                        <Input id="name" required placeholder="Your name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" required placeholder="+91 …" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="email">Email <span className="text-slate-400 font-normal">(optional)</span></Label>
                        <Input id="email" type="email" placeholder="you@example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Speciality</Label>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Choose a department" /></SelectTrigger>
                          <SelectContent>
                            {[
                              'Cardiology', 'Neurology', 'Paediatrics', 'Obstetrics & Gynaecology',
                              'Orthopaedics', 'Ophthalmology', 'Internal Medicine', 'General Surgery', 'Other / Not sure',
                            ].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Preferred time</Label>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="When?" /></SelectTrigger>
                          <SelectContent>
                            {['Today', 'Tomorrow', 'This week', 'Next week', 'Anytime'].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="reason">Briefly, what's the concern?</Label>
                        <Textarea id="reason" placeholder="A line or two so the doctor's desk can prepare." rows={4} />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between flex-wrap gap-3 pt-2">
                        <p className="text-xs text-slate-500 max-w-xs">
                          By submitting you agree we may contact you to confirm the appointment.
                        </p>
                        <ShimmerButton type="submit" className="h-11 px-6">
                          <Send className="h-4 w-4" />
                          Request appointment
                        </ShimmerButton>
                      </div>
                    </form>
                  )}
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <BlurFade>
            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[16/7] bg-gradient-to-br from-slate-100 to-slate-50 grid place-items-center">
              <div className="text-center px-6">
                <MapPin className="h-10 w-10 text-slate-400 mx-auto" />
                <div className="mt-2 font-medium text-slate-700">Embed your Google Maps iframe here</div>
                <div className="text-sm text-slate-500 mt-1">12 Park Street, Kolkata 700016</div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>
    </>
  );
}

function ContactCard({ Icon, title, body }: { Icon: any; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex gap-4">
      <div className="h-11 w-11 grid place-items-center rounded-lg bg-teal-50 text-teal-700 shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
