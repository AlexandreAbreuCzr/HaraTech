import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Check,
  Droplets,
  History,
  Leaf,
  Radio,
  Wifi,
} from 'lucide-react'
import { BrandLogo } from '../components/BrandLogo'

const benefits = [
  {
    icon: Droplets,
    title: 'Controle por área',
    description: 'Acione cada setor de irrigação separadamente e use a água onde ela é necessária.',
  },
  {
    icon: CalendarClock,
    title: 'Rotinas programadas',
    description: 'Organize horários de irrigação de acordo com a necessidade de cada cultivo.',
  },
  {
    icon: History,
    title: 'Histórico confiável',
    description: 'Acompanhe as confirmações enviadas pelo dispositivo e saiba o que aconteceu no campo.',
  },
]

const steps = [
  ['01', 'Conecte', 'Cadastre o dispositivo Hara Tech no seu painel.'],
  ['02', 'Organize', 'Associe áreas, culturas e rotinas de irrigação.'],
  ['03', 'Acompanhe', 'Monitore o sistema e controle a irrigação de onde estiver.'],
]

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-black">
      <header className="border-b border-black/10">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" aria-label="Hara Tech — início">
            <BrandLogo compact />
          </Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 sm:block">
              Entrar
            </Link>
            <Link to="/register" className="inline-flex h-10 items-center rounded-lg bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-[#292929]">
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative border-b border-black/10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-32">
            <div className="max-w-3xl">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase">
                <Leaf className="size-3.5" aria-hidden="true" />
                Tecnologia para cultivar melhor
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.96] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                Irrigação inteligente. Controle simples.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                Gerencie áreas, culturas e rotinas de irrigação em um só lugar. Mais clareza para cuidar da produção e usar água com precisão.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-[#292929]">
                  Começar agora <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a href="#como-funciona" className="inline-flex h-12 items-center justify-center rounded-lg border border-black/15 bg-white px-6 text-sm font-semibold transition-colors hover:border-black">
                  Como funciona
                </a>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-2"><Check className="size-4 text-black" /> Controle remoto</span>
                <span className="inline-flex items-center gap-2"><Check className="size-4 text-black" /> Programação por área</span>
                <span className="inline-flex items-center gap-2"><Check className="size-4 text-black" /> Histórico de ações</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -inset-5 rounded-[2rem] bg-black/[0.035]" />
              <div className="relative overflow-hidden rounded-2xl border border-black/15 bg-white shadow-[0_28px_80px_rgb(0_0_0/0.12)]">
                <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-[var(--text-tertiary)] uppercase">Visão geral</p>
                    <p className="mt-1 text-lg font-semibold">Minha irrigação</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white">
                    <Wifi className="size-3.5" /> Online
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-px bg-black/10">
                  <div className="bg-white p-5">
                    <p className="text-xs text-[var(--text-tertiary)]">Áreas conectadas</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">03</p>
                  </div>
                  <div className="bg-white p-5">
                    <p className="text-xs text-[var(--text-tertiary)]">Rotinas ativas</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">02</p>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  {[
                    ['Horta principal', 'Irrigando', '72%', true],
                    ['Estufa', 'Programada · 18:30', '54%', false],
                    ['Pomar', 'Em repouso', '61%', false],
                  ].map(([name, status, moisture, active]) => (
                    <div key={name as string} className="rounded-xl border border-black/10 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{name}</p>
                          <p className="mt-1 text-xs text-[var(--text-tertiary)]">Umidade estimada · {moisture}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${active ? 'bg-black text-white' : 'bg-black/5 text-black'}`}>{status}</span>
                      </div>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
                        <div className="h-full rounded-full bg-black" style={{ width: moisture as string }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-6 -left-3 hidden items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-[0_12px_35px_rgb(0_0_0/0.12)] sm:flex">
                <span className="flex size-9 items-center justify-center rounded-lg bg-black text-white"><Radio className="size-4" /></span>
                <div><p className="text-xs font-semibold">Dispositivo conectado</p><p className="mt-0.5 text-[0.68rem] text-[var(--text-tertiary)]">Atualizado agora</p></div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="beneficios-title" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="max-w-2xl">
            <p className="brand-overline">Tudo em um só painel</p>
            <h2 id="beneficios-title" className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Decisões melhores começam com uma visão clara.</h2>
          </div>
          <div className="mt-12 grid border-y border-black/10 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className={`py-8 md:px-8 md:py-10 ${index > 0 ? 'border-t border-black/10 md:border-t-0 md:border-l' : ''} ${index === 0 ? 'md:pl-0' : ''}`}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-black text-white"><Icon className="size-5" aria-hidden="true" /></span>
                <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-title" className="bg-black text-white">
          <div className="mx-auto grid max-w-7xl gap-16 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.7fr_1.3fr] lg:px-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase">Como funciona</p>
              <h2 id="como-funciona-title" className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Do dispositivo ao controle, sem complicação.</h2>
            </div>
            <ol className="border-t border-white/20">
              {steps.map(([number, title, description]) => (
                <li key={number} className="grid gap-3 border-b border-white/20 py-7 sm:grid-cols-[4rem_10rem_1fr] sm:items-start">
                  <span className="text-xs font-semibold text-white/40">{number}</span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-6 text-white/60">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="flex flex-col items-start justify-between gap-8 rounded-2xl border border-black/10 bg-[#f5f5f5] p-8 sm:p-12 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="brand-overline">Hara Tech</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Cultive com mais controle.</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Crie sua conta e comece a organizar a irrigação da sua produção.</p>
            </div>
            <Link to="/register" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-[#292929]">
              Criar minha conta <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-[var(--text-tertiary)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <BrandLogo compact />
          <p>© {new Date().getFullYear()} Hara Tech. Irrigação inteligente, futuro sustentável.</p>
        </div>
      </footer>
    </div>
  )
}
