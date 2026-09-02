import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowLeft,
  ArrowRight,
  Activity as ActivityIcon,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Divide,
  Home as HomeIcon,
  Lightbulb,
  LockKeyhole,
  Menu,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  X as MultiplyIcon,
  X,
} from 'lucide-react';
import {
  getGetMasteryQueryKey,
  getGetPracticeQuestionQueryKey,
  getListRecentActivityQueryKey,
  useAnalyzeThinking,
  useGetMastery,
  useGetPracticeQuestion,
  useListRecentActivity,
  useListSkills,
  useSubmitAttempt,
} from '@workspace/api-client-react';
import type {
  Activity,
  AttemptResult,
  LearningAnalysisResult,
  Mastery,
  Question,
  Skill,
} from '@workspace/api-client-react';
import {
  Route,
  Switch,
  Link,
  useLocation,
  useParams,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const fallbackSkills: Skill[] = [
  { id: 'addition', name: 'Addition', description: 'Put numbers together with confidence.', symbol: '+', accent: '#F2C94C', examples: ['8 + 7', '24 + 19'] },
  { id: 'subtraction', name: 'Subtraction', description: 'Find the difference, one step at a time.', symbol: '−', accent: '#E99A74', examples: ['15 − 6', '42 − 18'] },
  { id: 'multiplication', name: 'Multiplication', description: 'See equal groups in a whole new way.', symbol: '×', accent: '#8BB9C9', examples: ['4 × 6', '7 × 8'] },
  { id: 'division', name: 'Division', description: 'Share fairly and spot the pattern.', symbol: '÷', accent: '#B7A4D5', examples: ['24 ÷ 4', '63 ÷ 7'] },
];

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { href: '/', label: 'Today', icon: HomeIcon },
    { href: '/skills', label: 'Practice', icon: BookOpen },
  ];
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);
  return (
    <div className="learnloop-shell">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] md:flex">
        <Link href="/" className="focus-ring mb-12 flex items-center gap-3 rounded-xl" data-testid="link-brand">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="text-[17px] font-extrabold tracking-[-.04em]">LearnLoop <span className="font-medium opacity-60">AI</span></span>
        </Link>
        <p className="mono-label mb-3 px-3 text-[10px] text-[hsl(var(--sidebar-foreground)/.45)]">Your space</p>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active(href) ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.64)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]'}`} data-testid={`link-nav-${label.toLowerCase()}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              {active(href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
            </Link>
          ))}
        </nav>
         <div className="mt-auto rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.45)] p-4">
          <div className="mb-3 flex items-center justify-between">
             <span className="mono-label text-[9px] text-[hsl(var(--sidebar-foreground)/.5)]">A gentle reminder</span>
            <Sparkles size={15} className="text-[hsl(var(--sidebar-primary))]" />
          </div>
           <p className="text-sm font-semibold leading-snug">A little practice adds up.</p>
           <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--sidebar-foreground)/.55)]">Come back whenever you’re ready for the next small step.</p>
        </div>
        <button className="focus-ring mt-5 flex items-center gap-3 rounded-xl px-3 py-2 text-left text-xs text-[hsl(var(--sidebar-foreground)/.5)] transition-colors hover:text-[hsl(var(--sidebar-foreground))]" onClick={() => setLocation('/')} data-testid="button-profile">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))]">A</span>
           <span><strong className="block text-[hsl(var(--sidebar-foreground)/.85)]">Learner space</strong><span>Learning mode</span></span>
        </button>
      </aside>

      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.9)] px-5 backdrop-blur md:hidden">
        <Link href="/" className="focus-ring flex items-center gap-2" data-testid="link-mobile-brand"><span className="brand-mark !h-8 !w-8 !rounded-lg !text-lg">L</span><span className="text-sm font-extrabold">LearnLoop <span className="font-medium text-[hsl(var(--muted-foreground))]">AI</span></span></Link>
        <button className="focus-ring rounded-lg p-2" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu" data-testid="button-menu"><Menu size={21} /></button>
      </header>
      {menuOpen && <div className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/.2)] md:hidden" onClick={() => setMenuOpen(false)}>
        <div className="absolute right-3 top-16 w-56 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex justify-end px-1 pb-1"><button className="focus-ring rounded-lg p-1.5" onClick={() => setMenuOpen(false)} aria-label="Close menu" data-testid="button-close-menu"><X size={16} /></button></div>
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]" data-testid={`link-mobile-${label.toLowerCase()}`}><Icon size={17} />{label}</Link>)}
        </div>
      </div>}
      <main className="min-h-[calc(100dvh-72px)] md:ml-[248px] md:min-h-[100dvh]">{children}</main>
    </div>
  );
}

function LoadingState({ label = 'Finding your next step' }: { label?: string }) {
  return <div className="flex min-h-[42vh] items-center justify-center"><div className="w-full max-w-md space-y-4 px-6"><div className="h-3 w-28 animate-pulse rounded-full bg-[hsl(var(--muted))]" /><div className="h-10 w-4/5 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /><div className="h-28 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /><p className="pt-2 text-center text-sm text-[hsl(var(--muted-foreground))]" data-testid="status-loading">{label}</p></div></div>;
}

function ErrorState({ retry, label = 'Something took a wrong turn.' }: { retry?: () => void; label?: string }) {
  return <div className="mx-auto flex min-h-[42vh] max-w-md flex-col items-center justify-center px-6 text-center"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--accent)/.35)] text-[hsl(var(--primary))]"><CircleHelp size={23} /></div><h2 className="display-serif text-2xl font-semibold">{label}</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Try again in a moment. Your progress is safe.</p>{retry && <button className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" onClick={retry} data-testid="button-retry"><RotateCcw size={15} />Try again</button>}</div>;
}

function SkillIcon({ skill, size = 28 }: { skill: Skill; size?: number }) {
  const common = { size, strokeWidth: 1.8 };
  if (skill.id === 'addition') return <Plus {...common} />;
  if (skill.id === 'subtraction') return <Minus {...common} />;
  if (skill.id === 'multiplication') return <MultiplyIcon {...common} />;
  return <Divide {...common} />;
}

function SkillCard({ skill, compact = false }: { skill: Skill; compact?: boolean }) {
  return <Link href={`/learn/${skill.id}`} className={`skill-tile focus-ring group paper-card relative block overflow-hidden rounded-[24px] ${compact ? 'p-4' : 'p-6'}`} data-testid={`card-skill-${skill.id}`}>
    <div className="absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full opacity-50" style={{ backgroundColor: skill.accent }} />
    <div className="relative flex items-start justify-between">
      <span className="grid h-12 w-12 place-items-center rounded-2xl text-[hsl(var(--foreground))]" style={{ backgroundColor: `${skill.accent}66` }}><SkillIcon skill={skill} /></span>
      <span className="rounded-full border border-[hsl(var(--border))] px-2 py-1 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">Level 1</span>
    </div>
    <div className="relative mt-7">
      <h3 className="text-lg font-extrabold tracking-[-.03em]">{skill.name}</h3>
      {!compact && <p className="mt-2 max-w-[210px] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{skill.description}</p>}
    </div>
    <div className="relative mt-6 flex items-center justify-between">
      <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{skill.examples[0]} · {skill.examples[1]}</span>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>
    </div>
  </Link>;
}

function Home() {
  const skillsQuery = useListSkills();
  const activityQuery = useListRecentActivity();
  const skills = skillsQuery.data?.length ? skillsQuery.data : fallbackSkills;
  const activity = activityQuery.data?.slice(0, 3) ?? [];
  if (skillsQuery.isLoading) return <LoadingState label="Setting up your learning space" />;
  if (skillsQuery.isError && !skillsQuery.data) return <Shell><ErrorState retry={() => skillsQuery.refetch()} label="We couldn’t set up your learning space." /></Shell>;
  return <Shell><div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
    <section className="relative overflow-hidden rounded-[30px] bg-[hsl(var(--primary))] px-6 py-10 text-[hsl(var(--primary-foreground))] sm:px-12 sm:py-14">
      <div className="dot-grid absolute inset-0 opacity-20" />
      <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full border-[36px] border-[hsl(var(--accent)/.18)]" />
      <div className="relative max-w-2xl float-in">
        <div className="mb-6 flex items-center gap-2 text-[hsl(var(--accent))]"><Sparkles size={16} /><span className="mono-label text-[10px]">A kinder way to get better</span></div>
        <h1 className="display-serif max-w-[680px] text-5xl leading-[.95] tracking-[-.04em] sm:text-7xl">Every answer is a <em className="text-[hsl(var(--accent))]">clue.</em></h1>
        <p className="mt-7 max-w-[480px] text-base leading-relaxed text-[hsl(var(--primary-foreground)/.7)] sm:text-lg">LearnLoop notices how you think, then finds the next question that makes the idea click.</p>
        <Link href="/skills" className="focus-ring mt-9 inline-flex items-center gap-3 rounded-xl bg-[hsl(var(--accent))] px-5 py-3.5 text-sm font-extrabold text-[hsl(var(--accent-foreground))] shadow-[0_5px_0_hsl(43_57%_47%/.3)] transition-transform hover:-translate-y-0.5" data-testid="link-start-practice">Start a practice session <ArrowRight size={17} /></Link>
      </div>
      <div className="relative mt-12 grid max-w-lg grid-cols-4 gap-2 sm:absolute sm:bottom-10 sm:right-12 sm:mt-0 sm:w-[270px]">
        {['S', 'E', 'D', 'A'].map((letter, index) => <div key={letter} className={`flex h-14 items-center justify-center rounded-2xl border border-[hsl(var(--primary-foreground)/.14)] text-lg font-extrabold ${index === 0 ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--primary-foreground)/.07)]'}`}><span>{letter}</span></div>)}
        <span className="col-span-4 text-center font-mono text-[9px] tracking-[.14em] text-[hsl(var(--primary-foreground)/.42)]">SOLVE · EXPLAIN · DIAGNOSE · ADAPT</span>
      </div>
    </section>

    <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-5 flex items-end justify-between"><div><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">Choose your next step</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">What would you like to explore?</h2></div><Link href="/skills" className="focus-ring hidden items-center gap-1 text-sm font-bold text-[hsl(var(--primary))] sm:flex" data-testid="link-all-skills">All skills <ChevronRight size={16} /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2">{skills.slice(0, 4).map((skill) => <SkillCard key={skill.id} skill={skill} />)}</div>
      </div>
      <ActivityPanel activities={activity} isLoading={activityQuery.isLoading} />
    </section>

    <section className="mt-16 border-t border-[hsl(var(--border))] pt-8"><div className="grid gap-6 sm:grid-cols-3"><Feature icon={<Brain size={19} />} title="It listens for patterns" body="Your answer tells us more than right or wrong. We look for the idea underneath." /><Feature icon={<Lightbulb size={19} />} title="Hints, not shortcuts" body="A nudge arrives only when you need it, so the discovery stays yours." /><Feature icon={<Trophy size={19} />} title="Progress you can feel" body="Small wins collect into real confidence, one calm session at a time." /></div></section>
  </div></Shell>;
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <div className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent)/.38)] text-[hsl(var(--primary))]">{icon}</span><div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{body}</p></div></div>;
}

function ActivityPanel({ activities, isLoading }: { activities: Activity[]; isLoading: boolean }) {
  return <div className="paper-card rounded-[24px] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">Recent trail</p><h2 className="mt-2 text-lg font-extrabold tracking-[-.03em]">Little discoveries</h2></div><ActivityIcon size={19} className="text-[hsl(var(--muted-foreground))]" /></div>{isLoading ? <div className="mt-6 space-y-3"><div className="h-10 animate-pulse rounded-lg bg-[hsl(var(--muted))]" /><div className="h-10 animate-pulse rounded-lg bg-[hsl(var(--muted))]" /></div> : activities.length ? <div className="mt-5 space-y-1">{activities.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-[hsl(var(--border)/.7)] py-3 last:border-0" data-testid={`activity-item-${item.id}`}><span className={`grid h-7 w-7 place-items-center rounded-full ${item.correct ? 'bg-[hsl(var(--accent)/.55)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{item.correct ? <Check size={14} /> : <span className="text-sm">·</span>}</span><div className="min-w-0 flex-1"><p className="truncate font-mono text-[11px]">{item.question}</p><p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">{item.skillName}</p></div><span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">{item.correct ? 'Got it' : 'Next try'}</span></div>)}</div> : <div className="mt-5 rounded-xl bg-[hsl(var(--muted)/.6)] p-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]" data-testid="empty-activity">Your first discovery is waiting. Choose a skill to begin.</div>}</div>;
}

function Skills() {
  const query = useListSkills();
  const skills = query.data?.length ? query.data : fallbackSkills;
  if (query.isLoading) return <LoadingState label="Loading your skill shelf" />;
  if (query.isError && !query.data) return <Shell><ErrorState retry={() => query.refetch()} label="We couldn’t load the skill shelf." /></Shell>;
  return <Shell><div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12"><div className="float-in max-w-2xl"><Link href="/" className="focus-ring mb-8 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="link-back-home"><ArrowLeft size={15} /> Today</Link><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">Practice shelf</p><h1 className="display-serif mt-3 text-5xl leading-none tracking-[-.04em] sm:text-6xl">Pick a thread<br /><em className="text-[hsl(var(--primary))]">to follow.</em></h1><p className="mt-6 max-w-md text-base leading-relaxed text-[hsl(var(--muted-foreground))]">There’s no perfect place to start. Choose the idea that feels interesting today.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2">{skills.map((skill, index) => <div key={skill.id} className={`float-in float-in-delay-${Math.min(index + 1, 3)}`}><SkillCard skill={skill} /></div>)}</div><div className="mt-10 flex items-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--border))] px-5 py-4 text-sm text-[hsl(var(--muted-foreground))]"><LockKeyhole size={16} /><span>Each session adjusts gently to your answers. Nothing here is timed.</span></div></div></Shell>;
}

function Learn() {
  const { skillId = '' } = useParams<{ skillId: string }>();
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [analysis, setAnalysis] = useState<LearningAnalysisResult | null>(null);
  const [requestedActivity, setRequestedActivity] = useState<'standard' | 'visual'>('standard');
  const [requestedLevel, setRequestedLevel] = useState<number | undefined>();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const queryClient = useQueryClient();
  const questionParams = requestedLevel ? { level: requestedLevel, activity: requestedActivity } : { activity: requestedActivity };
  const questionQuery = useGetPracticeQuestion(skillId, questionParams, { query: { queryKey: getGetPracticeQuestionQueryKey(skillId, questionParams) } });
  const masteryQuery = useGetMastery(skillId, { query: { queryKey: getGetMasteryQueryKey(skillId) } });
  const skillsQuery = useListSkills();
  const submit = useSubmitAttempt();
  const analyze = useAnalyzeThinking();
  const skill = (skillsQuery.data ?? fallbackSkills).find((item) => item.id === skillId) ?? fallbackSkills.find((item) => item.id === skillId) ?? fallbackSkills[0];
  const question = questionQuery.data as Question | undefined;
  const mastery = masteryQuery.data as Mastery | undefined;
  const submitAnswer = () => {
    if (!question || answer.trim() === '' || submit.isPending) return;
    submit.mutate({ data: { questionId: question.id, skillId: question.skillId, answer: Number(answer), expectedAnswer: question.answer, level: question.level, explanation: null } }, {
      onSuccess: (attempt) => {
        setResult(attempt);
        setAnalysis(null);
        setShowThinking(false);
        queryClient.invalidateQueries({ queryKey: getGetMasteryQueryKey(skillId) });
        queryClient.invalidateQueries({ queryKey: getListRecentActivityQueryKey() });
      },
    });
  };
  const analyzeThinking = () => {
    if (!question || !result || result.correct || !explanation.trim() || analyze.isPending) return;
    analyze.mutate({ data: {
      gradeLevel: 3,
      skillId: question.skillId,
      skill: skill.name,
      question: question.prompt,
      correctAnswer: question.answer,
      studentAnswer: Number(answer),
      studentExplanation: explanation.trim(),
      previousAttemptCount: mastery?.attempted ?? 0,
      previousWasIncorrect: !result.correct,
      currentDifficulty: question.level,
    } }, {
      onSuccess: (insight) => setAnalysis(insight),
    });
  };
  const nextQuestion = (recommendation: LearningAnalysisResult['recommendedNextActivity'] | 'retry' = 'retry') => {
    const nextActivity = recommendation === 'visual' ? 'visual' : 'standard';
    const nextLevel = recommendation === 'simpler' ? Math.max(1, (question?.level ?? 1) - 1) : undefined;
    setRequestedActivity(nextActivity);
    setRequestedLevel(nextLevel);
    setResult(null); setAnalysis(null); setAnswer(''); setExplanation(''); setShowHint(false); setShowThinking(false); setQuestionNumber((value) => value + 1);
    queryClient.invalidateQueries({ queryKey: getGetPracticeQuestionQueryKey(skillId, { activity: nextActivity }) });
  };
  if (questionQuery.isLoading || skillsQuery.isLoading) return <LoadingState />;
  if (questionQuery.isError || !question) return <Shell><ErrorState retry={() => questionQuery.refetch()} label="We couldn’t find the next question." /></Shell>;
  const progress = mastery?.mastery ?? 0;
  return <Shell><div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
    <div className="mb-8 flex items-center justify-between"><Link href="/skills" className="focus-ring inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="link-back-skills"><ArrowLeft size={15} /> Skills</Link><div className="flex items-center gap-3"><span className="hidden font-mono text-[10px] text-[hsl(var(--muted-foreground))] sm:block">QUESTION {String(questionNumber).padStart(2, '0')}</span><div className="w-24"><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(9, progress)}%`, backgroundColor: skill.accent }} /></div></div></div></div>
    <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
      <section className="float-in">
        {question.activityType === 'visual' && <VisualModel skillId={question.skillId} prompt={question.prompt} />}
        <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: `${skill.accent}66` }}><SkillIcon skill={skill} size={20} /></span><div><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">{skill.name}</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">Level {question.level} · At your pace</p></div></div>
        <div className="paper-card rounded-[28px] p-6 sm:p-10"><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">Solve this</p><h1 className="display-serif mt-5 text-5xl tracking-[-.05em] sm:text-7xl" data-testid="text-question-prompt">{question.prompt}</h1><div className="mt-10 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="answer">Your answer</label><input id="answer" inputMode="numeric" autoFocus value={answer} onChange={(event) => setAnswer(event.target.value.replace(/[^0-9.-]/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter') submitAnswer(); }} placeholder="Your answer" disabled={!!result} className="answer-input focus-ring h-14 min-w-0 flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-5 text-2xl outline-none transition-colors focus:border-[hsl(var(--primary))] disabled:opacity-60" data-testid="input-answer" /><button className="focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-extrabold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" disabled={!answer.trim() || !!result || submit.isPending} onClick={submitAnswer} data-testid="button-submit-answer">{submit.isPending ? 'Checking…' : 'Check answer'} <Send size={16} /></button></div>
         {!result && <div className="mt-7 flex flex-wrap items-center gap-4"><button className="focus-ring inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))] hover:underline" onClick={() => setShowHint((visible) => !visible)} data-testid="button-toggle-hint"><Lightbulb size={16} /> {showHint ? 'Hide hint' : 'Give me a hint'}</button><span className="text-[hsl(var(--border))]">|</span><span className="text-xs text-[hsl(var(--muted-foreground))]">Take a guess. It’s information, not a grade.</span></div>}
         {showHint && <div className="mt-5 rounded-2xl bg-[hsl(var(--accent)/.23)] p-4 text-sm leading-relaxed text-[hsl(var(--foreground))]" data-testid="text-hint"><span className="font-bold">A small nudge: </span>{question.hint}</div>}
         {result && <ResultPanel result={result} analysis={analysis} showHint={showHint} showThinking={showThinking} explanation={explanation} analysisPending={analyze.isPending} onToggleHint={() => setShowHint((visible) => !visible)} onToggleThinking={() => setShowThinking((visible) => !visible)} onExplanationChange={setExplanation} onAnalyze={analyzeThinking} nextQuestion={nextQuestion} />}
        </div>
      </section>
      <aside className="space-y-4"><div className="paper-card rounded-[24px] p-5"><div className="flex items-center gap-2 text-[hsl(var(--primary))]"><Trophy size={17} /><p className="mono-label text-[10px]">Your progress</p></div><p className="mt-5 text-4xl font-extrabold tracking-[-.06em]" data-testid="text-mastery-value">{Math.round(progress)}<span className="text-xl text-[hsl(var(--muted-foreground))]">%</span></p><div className="mt-3 progress-track"><div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: skill.accent }} /></div><div className="mt-3 flex justify-between text-[11px] text-[hsl(var(--muted-foreground))]"><span>{mastery?.correct ?? 0} correct</span><span>{mastery?.attempted ?? 0} attempted</span></div><Link href={`/mastery/${skillId}`} className="focus-ring mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4 text-xs font-bold text-[hsl(var(--primary))]" data-testid="link-view-mastery">See full mastery <ChevronRight size={15} /></Link></div><div className="rounded-[24px] bg-[hsl(var(--muted)/.65)] p-5"><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">The loop</p><div className="mt-4 space-y-3">{['Solve', 'Explain', 'Diagnose', 'Adapt', 'Master'].map((step, index) => <div key={step} className="flex items-center gap-3 text-xs"><span className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[10px] ${index === 0 ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>{index + 1}</span><span className={index === 0 ? 'font-bold' : 'text-[hsl(var(--muted-foreground))]'}>{step}</span></div>)}</div></div></aside>
    </div>
  </div></Shell>;
}

function ResultPanel({
  result,
  analysis,
  showHint,
  showThinking,
  explanation,
  analysisPending,
  onToggleHint,
  onToggleThinking,
  onExplanationChange,
  onAnalyze,
  nextQuestion,
}: {
  result: AttemptResult;
  analysis: LearningAnalysisResult | null;
  showHint: boolean;
  showThinking: boolean;
  explanation: string;
  analysisPending: boolean;
  onToggleHint: () => void;
  onToggleThinking: () => void;
  onExplanationChange: (value: string) => void;
  onAnalyze: () => void;
  nextQuestion: (recommendation?: LearningAnalysisResult['recommendedNextActivity'] | 'retry') => void;
}) {
  const nextLabel = analysis?.recommendedNextActivity === 'simpler'
    ? 'Try a simpler one'
    : analysis?.recommendedNextActivity === 'visual'
      ? 'Try a visual one'
      : analysis?.recommendedNextActivity === 'similar'
        ? 'Try a similar one'
        : 'Try again';

  return <div className={`mt-8 rounded-2xl p-5 ${result.correct ? 'bg-[hsl(var(--accent)/.3)]' : 'bg-[hsl(var(--muted))]'}`} data-testid="panel-result">
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--card))]">{result.correct ? <Check size={18} className="text-[hsl(var(--primary))]" /> : <Lightbulb size={18} className="text-[hsl(var(--primary))]" />}</span>
      <div><p className="font-extrabold">{result.correct ? 'That clicked.' : 'Not quite yet.'}</p><p className="mt-1 text-sm leading-relaxed">{result.feedback}</p></div>
    </div>
    <div className="mt-4 border-t border-[hsl(var(--foreground)/.1)] pt-4"><p className="mono-label text-[10px] opacity-60">What we noticed</p><p className="mt-2 text-sm leading-relaxed">{result.explanation}</p></div>
    {!result.correct && <div className="mt-5 flex flex-wrap gap-3">
      <button className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-3.5 py-2.5 text-xs font-extrabold" onClick={onToggleHint} data-testid="button-result-hint"><Lightbulb size={14} /> {showHint ? 'Hide hint' : 'Give me a hint'}</button>
      <button className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-3.5 py-2.5 text-xs font-extrabold" onClick={onToggleThinking} data-testid="button-explain-thinking"><Brain size={14} /> {showThinking ? 'Hide my thinking' : 'Explain My Thinking'}</button>
    </div>}
    {!result.correct && showThinking && <div className="mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-4" data-testid="thinking-panel">
      <p className="font-extrabold">Want to show me how you were thinking?</p>
      <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Write it in your own words. There’s no perfect way to explain it.</p>
      <textarea value={explanation} onChange={(event) => onExplanationChange(event.target.value.slice(0, 500))} placeholder="I thought..." rows={3} className="focus-ring mt-4 w-full resize-none rounded-xl border border-[hsl(var(--input))] bg-transparent p-3 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground)/.6)] focus:border-[hsl(var(--primary))]" data-testid="input-thinking-analysis" />
      <div className="mt-3 flex items-center justify-between gap-3"><span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{explanation.length}/500</span><button className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-extrabold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50" onClick={onAnalyze} disabled={!explanation.trim() || analysisPending} data-testid="button-analyze-thinking">{analysisPending ? 'Looking for a pattern…' : 'Analyze My Thinking'} <ArrowRight size={14} /></button></div>
    </div>}
    {analysis && <div className="mt-5 rounded-2xl border border-[hsl(var(--accent)/.55)] bg-[hsl(var(--accent)/.16)] p-4" data-testid="card-learning-insight">
      <div className="flex items-center justify-between gap-3"><p className="mono-label text-[10px]">Here’s what I noticed</p><span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-2 py-1 text-[10px] font-bold capitalize text-[hsl(var(--muted-foreground))]">{analysis.confidence} confidence</span></div>
      <p className="mt-4 text-sm leading-relaxed">{analysis.explanation}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="mono-label text-[9px] text-[hsl(var(--muted-foreground))]">Possible learning pattern</p><p className="mt-1 text-xs leading-relaxed">{analysis.misconception}</p></div><div><p className="mono-label text-[9px] text-[hsl(var(--muted-foreground))]">Recommended strategy</p><p className="mt-1 text-xs leading-relaxed">{analysis.recommendedStrategy}</p></div></div>
      <div className="mt-4 border-t border-[hsl(var(--foreground)/.1)] pt-3"><p className="mono-label text-[9px] text-[hsl(var(--muted-foreground))]">Recommended next activity</p><p className="mt-1 text-xs font-bold capitalize">{analysis.recommendedNextActivity}</p></div>
    </div>}
    {result.recommendation && !analysis && <p className="mt-3 text-xs font-semibold opacity-75">{result.recommendation}</p>}
    <button className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-extrabold text-[hsl(var(--primary-foreground))]" onClick={() => nextQuestion(analysis?.recommendedNextActivity ?? 'retry')} data-testid="button-next-question">{nextLabel} <ArrowRight size={16} /></button>
  </div>;
}

function VisualModel({ skillId, prompt }: { skillId: string; prompt: string }) {
  const values = prompt.match(/\d+/g)?.map(Number) ?? [];
  const first = Math.min(values[0] ?? 0, 24);
  const second = Math.min(values[1] ?? 0, 12);
  const dot = (key: string, faded = false) => <span key={key} className={`grid h-4 w-4 place-items-center rounded-full bg-[hsl(var(--primary)/.75)] ${faded ? 'opacity-25' : ''}`} aria-hidden="true" />;

  if (skillId === 'multiplication') {
    const groups = Math.min(first, 5);
    const perGroup = Math.min(second, 8);
    return <div className="mb-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] p-4" data-testid="visual-model"><p className="mono-label text-[9px] text-[hsl(var(--muted-foreground))]">See the equal groups</p><div className="mt-4 space-y-2">{Array.from({ length: groups }, (_, row) => <div key={row} className="flex flex-wrap gap-1">{Array.from({ length: perGroup }, (_, column) => dot(`${row}-${column}`))}</div>)}</div></div>;
  }

  if (skillId === 'division') {
    const groupSize = Math.min(second, 8);
    const groups = Math.min(Math.ceil(first / Math.max(1, groupSize)), 6);
    return <div className="mb-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] p-4" data-testid="visual-model"><p className="mono-label text-[9px] text-[hsl(var(--muted-foreground))]">Share into equal groups</p><div className="mt-4 flex flex-wrap gap-2">{Array.from({ length: groups }, (_, group) => <div key={group} className="flex gap-1 rounded-lg border border-[hsl(var(--border))] p-2">{Array.from({ length: groupSize }, (_, item) => dot(`${group}-${item}`))}</div>)}</div></div>;
  }

  if (skillId === 'subtraction') {
    const remaining = Math.max(0, Math.min(first - second, 24));
    const removed = Math.min(second, 12);
    return <div className="mb-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] p-4" data-testid="visual-model"><p className="mono-label text-[9px] text-[hsl(var(--muted-foreground))]">Take some away</p><div className="mt-4 flex flex-wrap gap-1">{Array.from({ length: remaining }, (_, item) => dot(`keep-${item}`))}{Array.from({ length: removed }, (_, item) => dot(`remove-${item}`, true))}</div><p className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">Faded dots are the ones removed.</p></div>;
  }

  const firstGroup = Math.min(first, 12);
  const secondGroup = Math.min(second, 12);
  return <div className="mb-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] p-4" data-testid="visual-model"><p className="mono-label text-[9px] text-[hsl(var(--muted-foreground))]">Put the parts together</p><div className="mt-4 flex flex-wrap items-center gap-1">{Array.from({ length: firstGroup }, (_, item) => dot(`first-${item}`))}<span className="mx-2 text-xs font-bold text-[hsl(var(--muted-foreground))]">+</span>{Array.from({ length: secondGroup }, (_, item) => dot(`second-${item}`))}</div></div>;
}

function StatCard({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className={`rounded-[22px] border p-5 ${accent ? 'border-[hsl(var(--accent)/.6)] bg-[hsl(var(--accent)/.2)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)]'}`} data-testid={`stat-${label.toLowerCase()}`}><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-4 text-3xl font-extrabold tracking-[-.06em]">{value}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function MasteryPage() {
  const { skillId = '' } = useParams<{ skillId: string }>();
  const masteryQuery = useGetMastery(skillId, { query: { queryKey: getGetMasteryQueryKey(skillId) } });
  const activityQuery = useListRecentActivity();
  const skillsQuery = useListSkills();
  const skill = useMemo(() => (skillsQuery.data ?? fallbackSkills).find((item) => item.id === skillId) ?? fallbackSkills[0], [skillsQuery.data, skillId]);
  const activities = (activityQuery.data ?? []).filter((item) => item.skillId === skillId).slice(0, 6);
  if (masteryQuery.isLoading || skillsQuery.isLoading) return <LoadingState label="Gathering your progress" />;
  if (masteryQuery.isError) return <Shell><ErrorState retry={() => masteryQuery.refetch()} label="We couldn’t load this progress yet." /></Shell>;
  const mastery = masteryQuery.data as Mastery;
  const accuracy = mastery.attempted ? Math.round((mastery.correct / mastery.attempted) * 100) : 0;
  return <Shell><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12"><div className="mb-9 flex items-center justify-between"><Link href="/skills" className="focus-ring inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--muted-foreground))]" data-testid="link-mastery-back"><ArrowLeft size={15} /> Skills</Link><Link href={`/learn/${skillId}`} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-extrabold text-[hsl(var(--primary-foreground))]" data-testid="link-practice-again">Practice again <ArrowRight size={15} /></Link></div><header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ backgroundColor: `${skill.accent}66` }}><SkillIcon skill={skill} size={21} /></span><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">{skill.name} mastery</p></div><h1 className="display-serif mt-4 text-5xl leading-none tracking-[-.04em]">You’re building<br /><em className="text-[hsl(var(--primary))]">momentum.</em></h1></div><div className="text-left sm:text-right"><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">Current level</p><p className="mt-2 text-3xl font-extrabold">0{mastery.level}</p></div></header><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Mastery" value={`${Math.round(mastery.mastery)}%`} detail="of the path explored" accent /><StatCard label="Accuracy" value={`${accuracy}%`} detail={`${mastery.correct} correct answers`} /><StatCard label="Attempts" value={`${mastery.attempted}`} detail="questions answered" /><StatCard label="Streak" value={`${mastery.streak}`} detail="in a row" /></div><div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><section className="paper-card rounded-[26px] p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">Mastery path</p><h2 className="mt-2 text-xl font-extrabold">Keep following the thread</h2></div><Sparkles size={20} className="text-[hsl(var(--accent-foreground))]" /></div><div className="mt-8 flex items-center gap-3"><div className="progress-track h-3 flex-1"><div className="progress-fill" style={{ width: `${mastery.mastery}%`, backgroundColor: skill.accent }} /></div><span className="font-mono text-xs">{Math.round(mastery.mastery)} / 100</span></div><div className="mt-6 grid grid-cols-5 gap-1">{['Begin', 'Notice', 'Try', 'Stretch', 'Master'].map((label, index) => <div key={label} className="text-center"><div className={`mx-auto h-2 w-2 rounded-full ${index * 25 <= mastery.mastery ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`} /><p className="mt-3 text-[10px] text-[hsl(var(--muted-foreground))]">{label}</p></div>)}</div><div className="mt-8 rounded-2xl bg-[hsl(var(--accent)/.22)] p-4 text-sm leading-relaxed"><span className="font-bold">Next best step: </span>{mastery.mastery >= 75 ? 'Try a few stretch questions and explain each move.' : 'Keep a steady rhythm. Look for the pattern before reaching for the answer.'}</div></section><section className="paper-card rounded-[26px] p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="mono-label text-[10px] text-[hsl(var(--muted-foreground))]">Recent activity</p><h2 className="mt-2 text-xl font-extrabold">Your trail</h2></div><Clock3 size={19} className="text-[hsl(var(--muted-foreground))]" /></div>{activityQuery.isLoading ? <div className="mt-6 h-32 animate-pulse rounded-xl bg-[hsl(var(--muted))]" /> : activities.length ? <div className="mt-5 space-y-1">{activities.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-[hsl(var(--border)/.7)] py-3 last:border-0" data-testid={`mastery-activity-${item.id}`}><span className={`grid h-7 w-7 place-items-center rounded-full ${item.correct ? 'bg-[hsl(var(--accent)/.55)]' : 'bg-[hsl(var(--muted))]'}`}>{item.correct ? <Check size={14} /> : <span>—</span>}</span><div className="min-w-0 flex-1"><p className="truncate font-mono text-[11px]">{item.question}</p><p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">{item.correct ? 'Correct' : 'A next step'}</p></div></div>)}</div> : <div className="mt-5 rounded-xl bg-[hsl(var(--muted)/.6)] p-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]" data-testid="empty-mastery-activity">No attempts here yet. Your first one can start now.</div>}</section></div></div></Shell>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/skills" component={Skills} />
        <Route path="/learn/:skillId" component={Learn} />
        <Route path="/mastery/:skillId" component={MasteryPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
