'use client';

import { Box, TextField, useTheme } from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import { animate } from 'animejs';
import { BACKEND_TEMPLATES, FRONTEND_TEMPLATES, GITHUB_OWNER, MOCK_TREES, TemplateItem } from '@/lib/templates';
import { useToast } from '@/components/Toast';
import { buildAndDownload } from '@/lib/download';

/* ─── tree helpers ───────────────────────────────────────────── */
interface TreeNode { name: string; isDir: boolean; children: TreeNode[]; }

function getFileIcon(name: string): string {
  if (name === 'Dockerfile' || name === '.dockerignore') return '🐳';
  if (name.endsWith('.java'))                            return '☕';
  if (name.endsWith('.go'))                              return '🐹';
  if (name.endsWith('.ts') || name.endsWith('.tsx'))     return '🔷';
  if (name.endsWith('.jsx') || name.endsWith('.js'))     return '🟨';
  if (name.endsWith('.json') || name === 'go.sum')       return '{}';
  if (name.endsWith('.yml') || name.endsWith('.yaml'))   return '⚙️';
  if (name.endsWith('.md'))                              return '📝';
  if (name.endsWith('.xml'))                             return '📋';
  if (name.endsWith('.css') || name.endsWith('.scss'))   return '🎨';
  if (name.endsWith('.html'))                            return '🌐';
  return '📄';
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    const isDir = path.endsWith('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      let node = current.find(n => n.name === part);
      if (!node) {
        node = { name: part, isDir: isLeaf ? isDir : true, children: [] };
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

function renderTree(nodes: TreeNode[], prefix = ''): string[] {
  const lines: string[] = [];
  nodes.forEach((node, idx) => {
    const isLast = idx === nodes.length - 1;
    const connector = isLast ? '└──' : '├──';
    const icon = node.isDir ? '📁' : getFileIcon(node.name);
    lines.push(`${prefix}${connector} ${icon} ${node.name}${node.isDir ? '/' : ''}`);
    if (node.children.length > 0)
      lines.push(...renderTree(node.children, prefix + (isLast ? '    ' : '│   ')));
  });
  return lines;
}

async function fetchTreePaths(template: TemplateItem): Promise<string[]> {
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${template.repo}/git/trees/${template.branch}?recursive=1`;
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    return (data.tree || []).map(
      (item: { path: string; type: string }) => item.path + (item.type === 'tree' ? '/' : '')
    );
  } catch {
    const key = template.id.replace(/^template_/, '');
    return MOCK_TREES[key] ?? MOCK_TREES[template.id] ?? [];
  }
}

/* ─── static tokens (no dependen del modo) ───────────────────── */
const ACCENT   = '#6366f1';
const SUCCESS  = '#22c55e';
const SANS     = 'var(--font-dm-sans)';
const MONO     = 'var(--font-dm-mono)';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const STEP_LABELS    = ['Proyecto', 'Stack', 'Generar'];
const RADIUS         = 54;
const CIRCUMFERENCE  = 2 * Math.PI * RADIUS;

type ProjectType = 'full' | 'backend' | 'frontend';
type DlStatus    = 'idle' | 'downloading' | 'done' | 'error';

/* ─── template card ──────────────────────────────────────────── */
function TemplateCard({
  template, selected, onToggle, index,
}: {
  template: TemplateItem; selected: boolean; onToggle: () => void; index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const disabled = !!template.comingSoon;
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const SLATE        = dark ? '#c7d0e8' : '#0f172a';
  const MUTED        = dark ? '#7885a8' : '#64748b';
  const BORDER       = dark ? '#252a45' : '#e2e8f0';
  const ACCENT_LIGHT = dark ? '#1c1f3a' : '#eef2ff';

  return (
    <Box
      ref={cardRef}
      onClick={disabled ? undefined : onToggle}
      onMouseEnter={() => { if (!disabled && cardRef.current) animate(cardRef.current, { scale: 1.025, duration: 180, ease: 'easeOutSine' }); }}
      onMouseLeave={() => { if (!disabled && cardRef.current) animate(cardRef.current, { scale: 1,     duration: 180, ease: 'easeOutSine' }); }}
      sx={{
        background: disabled ? (dark ? '#1a1d30' : '#f8fafc') : selected ? ACCENT_LIGHT : (dark ? '#1a1d30' : '#ffffff'),
        border: `1.5px solid ${disabled ? BORDER : selected ? ACCENT : BORDER}`,
        borderRadius: '12px',
        p: 2, cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 0.75,
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.18s, background 0.18s',
        '@keyframes cardIn': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        animation: `cardIn ${0.1 + index * 0.05}s ease both`,
      }}
    >
      {disabled && (
        <Box sx={{
          position: 'absolute', top: 8, right: 8,
          px: 1, py: 0.25, background: dark ? '#1c1f3a' : '#f1f5f9', border: dark ? '1px solid #252a45' : '1px solid #cbd5e1',
          borderRadius: '4px', fontFamily: MONO, fontSize: '0.62rem', color: MUTED, letterSpacing: '0.02em',
        }}>
          Próximamente
        </Box>
      )}
      {!disabled && (
        <Box sx={{
          position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%',
          background: selected ? ACCENT : 'transparent', border: `2px solid ${selected ? ACCENT : BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.18s', flexShrink: 0,
        }}>
          {selected && <Box component="span" sx={{ color: dark ? '#000' : '#fff', fontSize: '0.6rem', lineHeight: 1 }}>✓</Box>}
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pr: 3 }}>
        {template.logo.startsWith('http') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Box component="img" src={template.logo} alt={template.name}
            sx={{ width: 26, height: 26, objectFit: 'contain', filter: disabled || selected ? 'none' : 'grayscale(30%) opacity(0.6)' }} />
        ) : (
          <Box sx={{ fontSize: '1.3rem', lineHeight: 1 }}>{template.logo}</Box>
        )}
        <Box sx={{ fontFamily: SANS, fontWeight: 600, fontSize: '0.88rem', color: SLATE }}>
          {template.name}
        </Box>
      </Box>
      <Box sx={{ fontFamily: SANS, fontSize: '0.76rem', color: MUTED, lineHeight: 1.5 }}>
        {template.desc}
      </Box>
      <Box sx={{
        display: 'inline-flex', alignSelf: 'flex-start', px: 1, py: 0.2,
        background: selected ? `${ACCENT}1a` : (dark ? '#1c1f3a' : '#f1f5f9'), borderRadius: '4px',
        fontFamily: MONO, fontSize: '0.68rem', color: selected ? ACCENT : MUTED, transition: 'all 0.18s',
      }}>
        {template.badge}
      </Box>
    </Box>
  );
}

/* ─── file tree ──────────────────────────────────────────────── */
function FileTreeBlock({ label, lines, loading }: { label: string; lines: string[]; loading: boolean }) {
  const theme = useTheme();
  const MUTED = theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b';
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ fontFamily: MONO, fontSize: '0.73rem', color: MUTED, mb: 0.6 }}>📁 {label}/</Box>
      <Box sx={{
        background: '#0f172a', borderRadius: '8px', px: 2, py: 1.5,
        maxHeight: 200, overflowY: 'auto',
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: 2 },
      }}>
        {loading ? (
          <Box sx={{ color: '#64748b', fontFamily: MONO, fontSize: '0.73rem', fontStyle: 'italic' }}>cargando…</Box>
        ) : lines.length === 0 ? (
          <Box sx={{ color: '#64748b', fontFamily: MONO, fontSize: '0.73rem' }}>sin datos</Box>
        ) : lines.map((line, i) => (
          <Box key={i} sx={{ fontFamily: MONO, fontSize: '0.73rem', color: '#94a3b8', whiteSpace: 'pre', lineHeight: 1.7 }}>
            {line}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ─── step tabs ──────────────────────────────────────────────── */
function StepTabs({ step }: { step: number }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const SLATE  = dark ? '#e2e8f0' : '#0f172a';
  const MUTED  = dark ? '#94a3b8' : '#64748b';
  const BORDER = dark ? '#334155' : '#e2e8f0';
  return (
    <Box sx={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
      {STEP_LABELS.map((label, i) => {
        const done   = step > i;
        const active = step === i;
        return (
          <Box key={i} sx={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            py: 1.5, gap: 0.5, cursor: 'default', userSelect: 'none',
            borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
            transition: 'border-color 0.3s',
          }}>
            <Box sx={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: done ? SUCCESS : active ? ACCENT : (dark ? '#1c1f3a' : '#f1f5f9'),
              color: done || active ? '#fff' : (dark ? '#4a5270' : '#cbd5e1'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontFamily: SANS, fontWeight: 700, transition: 'all 0.3s',
            }}>
              {done ? '✓' : i + 1}
            </Box>
            <Box sx={{
              fontFamily: SANS, fontSize: '0.68rem',
              fontWeight: active ? 600 : 400,
              color: active ? SLATE : done ? MUTED : '#cbd5e1',
              display: { xs: 'none', sm: 'block' },
            }}>
              {label}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── project type option card ───────────────────────────────── */
function TypeCard({
  value, label, desc, icon, selected, onSelect,
}: {
  value: ProjectType; label: string; desc: string; icon: string;
  selected: boolean; onSelect: () => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const SLATE        = dark ? '#c7d0e8' : '#0f172a';
  const MUTED        = dark ? '#7885a8' : '#64748b';
  const BORDER       = dark ? '#252a45' : '#e2e8f0';
  const ACCENT_LIGHT = dark ? '#1c1f3a' : '#eef2ff';
  return (
    <Box
      onClick={onSelect}
      sx={{
        flex: 1, border: `1.5px solid ${selected ? ACCENT : BORDER}`,
        borderRadius: '10px', px: { xs: 1.5, sm: 2 }, py: 1.75,
        cursor: 'pointer', background: selected ? ACCENT_LIGHT : (dark ? '#1a1d30' : '#fff'),
        transition: 'all 0.18s', textAlign: 'center', userSelect: 'none',
        '&:hover': { borderColor: selected ? ACCENT : '#94a3b8' },
      }}
    >
      <Box sx={{ fontSize: '1.35rem', mb: 0.5 }}>{icon}</Box>
      <Box sx={{ fontFamily: SANS, fontWeight: 600, fontSize: '0.83rem', color: SLATE }}>{label}</Box>
      <Box sx={{ fontFamily: SANS, fontSize: '0.72rem', color: MUTED, mt: 0.25 }}>{desc}</Box>
    </Box>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function CorporateInitializer() {
  const { showToast } = useToast();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  /* ─── design tokens reactivos al modo ───────────────────────── */
  const SLATE        = dark ? '#c7d0e8' : '#0f172a';
  const MUTED        = dark ? '#7885a8' : '#64748b';
  const BORDER       = dark ? '#252a45' : '#e2e8f0';
  const ACCENT_LIGHT = dark ? '#1c1f3a' : '#eef2ff';

  const [step,               setStep]               = useState(0);
  const [projectName,        setProjectName]        = useState('');
  const [projectType,        setProjectType]        = useState<ProjectType>('full');
  const [includeDocker,      setIncludeDocker]      = useState(false);
  const [groupId,            setGroupId]            = useState('');
  const [selectedBackendId,  setSelectedBackendId]  = useState<string | null>(null);
  const [selectedFrontendId, setSelectedFrontendId] = useState<string | null>(null);
  const [backendTreeLines,   setBackendTreeLines]   = useState<string[]>([]);
  const [frontendTreeLines,  setFrontendTreeLines]  = useState<string[]>([]);
  const [treeLoading,        setTreeLoading]        = useState(false);
  const [dlProgress,         setDlProgress]         = useState(0);
  const [dlSpinnerIdx,       setDlSpinnerIdx]       = useState(0);
  const [dlStatus,           setDlStatus]           = useState<DlStatus>('idle');
  const [dlLabel,            setDlLabel]            = useState('');

  const contentRef     = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  const selectedBackend  = BACKEND_TEMPLATES.find(t => t.id === selectedBackendId);
  const selectedFrontend = FRONTEND_TEMPLATES.find(t => t.id === selectedFrontendId);
  const isJavaTemplate   = (t: TemplateItem | undefined) => t?.badge === 'Java' || t?.badge === 'Quarkus';

  const needsBackend  = projectType === 'full' || projectType === 'backend';
  const needsFrontend = projectType === 'full' || projectType === 'frontend';
  const needsGroupId  = needsBackend && isJavaTemplate(selectedBackend);
  const hasBoth       = !!(selectedBackend && selectedFrontend);

  const canNext0 = projectName.trim().length > 0;
  const canNext1 = !needsGroupId || groupId.trim().length > 0;
  const canDownload = projectType === 'full'     ? !!(selectedBackend || selectedFrontend)
                    : projectType === 'backend'  ? !!selectedBackend
                    : !!selectedFrontend;

  /* reset incompatible selections when type changes */
  useEffect(() => {
    if (projectType === 'backend')  setSelectedFrontendId(null);
    if (projectType === 'frontend') setSelectedBackendId(null);
  }, [projectType]);

  /* animate content + progress bar on step change */
  useEffect(() => {
    if (contentRef.current) {
      animate(contentRef.current, {
        opacity: [0, 1], translateY: [16, 0], duration: 380, ease: 'easeOutQuart',
      });
    }
    if (progressBarRef.current && step <= 2) {
      animate(progressBarRef.current, {
        width: `${(step / 2) * 100}%`, duration: 500, ease: 'easeInOutCubic',
      });
    }
  }, [step]);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  /* fetch trees when entering step 2 */
  useEffect(() => {
    if (step !== 2) return;
    setTreeLoading(true);
    const fetches: Promise<void>[] = [];
    if (selectedBackend && backendTreeLines.length === 0)
      fetches.push(fetchTreePaths(selectedBackend).then(p => setBackendTreeLines(renderTree(buildTree(p)))));
    if (selectedFrontend && frontendTreeLines.length === 0)
      fetches.push(fetchTreePaths(selectedFrontend).then(p => setFrontendTreeLines(renderTree(buildTree(p)))));
    if (fetches.length === 0) { setTreeLoading(false); return; }
    Promise.all(fetches).finally(() => setTreeLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* spinner during download */
  useEffect(() => {
    if (step !== 2 || dlStatus !== 'downloading') return;
    const si = setInterval(() => setDlSpinnerIdx(p => (p + 1) % SPINNER_FRAMES.length), 80);
    const pi = setInterval(() => setDlProgress(p => p >= 85 ? p : p + Math.random() * 3.5 + 0.8), 130);
    return () => { clearInterval(si); clearInterval(pi); };
  }, [step, dlStatus]);

  const resetWizard = useCallback(() => {
    setStep(0);
    setProjectName('');
    setProjectType('full');
    setIncludeDocker(false);
    setGroupId('');
    setSelectedBackendId(null);
    setSelectedFrontendId(null);
    setBackendTreeLines([]);
    setFrontendTreeLines([]);
    setDlProgress(0);
    setDlStatus('idle');
    setDlLabel('');
  }, []);

  const goNext = useCallback(() => {
    if (step === 0 && !canNext0) return;
    if (step === 1 && !canNext1) return;
    if (step < 2) setStep(s => s + 1);
  }, [step, canNext0, canNext1]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    if (step === 2 && dlStatus === 'downloading') return;
    if (step === 2 && dlStatus === 'done') return;
    if (step === 2 && dlStatus === 'error') { setDlStatus('idle'); setDlProgress(0); return; }
    if (step === 2) {
      setBackendTreeLines([]);
      setFrontendTreeLines([]);
    }
    setStep(s => s - 1);
  }, [step, dlStatus]);

  /* Enter key for steps 0-1 */
  useEffect(() => {
    if (step >= 2) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter') goNext(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, goNext]);

  const downloadProject = async () => {
    if (!canDownload) { showToast('error', 'Selecciona al menos una plantilla'); return; }
    const effectiveBackend  = needsBackend  ? selectedBackend  : undefined;
    const effectiveFrontend = needsFrontend ? selectedFrontend : undefined;
    setDlLabel(`${projectName}.zip`);
    setDlProgress(0);
    setDlStatus('downloading');
    try {
      await buildAndDownload({
        projectName, groupId,
        backend:       effectiveBackend,
        frontend:      effectiveFrontend,
        isJavaBackend: isJavaTemplate(selectedBackend),
        includeDocker,
        onProgress:    setDlProgress,
      });
      setDlStatus('done');
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al descargar las plantillas');
      setDlStatus('error');
    }
  };

  const svgOffset   = CIRCUMFERENCE - (dlProgress / 100) * CIRCUMFERENCE;
  const showFooter  = step < 2 || (step === 2 && (dlStatus === 'idle' || dlStatus === 'error'));
  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      fontFamily: MONO, fontSize: '1rem', color: SLATE, borderRadius: '10px',
      '& fieldset': { borderColor: BORDER },
      '&:hover fieldset': { borderColor: '#94a3b8' },
      '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 2 },
    },
    '& .MuiOutlinedInput-input::placeholder': { color: '#cbd5e1', opacity: 1 },
  };

  return (
    <Box
      component="section"
      id="corporate-initializer"
      sx={{
        background: dark
          ? 'linear-gradient(160deg, #0a0c1a 0%, #0f1228 60%, #0a0c1a 100%)'
          : 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 60%, #f8fafc 100%)',
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: 2, py: 10,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 760 }}>

        {/* ── page header ── */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            fontFamily: 'var(--font-syne)',
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 800, color: SLATE, letterSpacing: '-0.04em', lineHeight: 1.15,
          }}>
            Configura tu proyecto
          </Box>
          <Box sx={{ fontFamily: SANS, fontSize: '0.9rem', color: MUTED, mt: 1 }}>
            Elige tu stack y descarga al instante
          </Box>
        </Box>

        {/* ── wizard card ── */}
        <Box sx={{
          background: dark ? '#13162a' : '#ffffff', borderRadius: '16px',
          border: `1px solid ${BORDER}`,
          boxShadow: '0 4px 32px rgba(99,102,241,0.07), 0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>

          {/* top progress stripe */}
          <Box sx={{ height: 3, background: dark ? '#1c1f3a' : '#f1f5f9', position: 'relative' }}>
            <Box ref={progressBarRef} sx={{
              position: 'absolute', left: 0, top: 0, height: '100%', width: '0%',
              background: `linear-gradient(90deg, ${ACCENT}, #818cf8)`,
              borderRadius: '0 2px 2px 0',
            }} />
          </Box>

          {/* step tabs */}
          {dlStatus !== 'done' && <StepTabs step={step} />}

          {/* ── animated content area ── */}
          <Box ref={contentRef} sx={{ px: { xs: 2.5, sm: 4 }, py: 3.5, minHeight: 340 }}>

            {/* ─── step 0: proyecto ─── */}
            {step === 0 && (
              <Box>
                {/* project name */}
                <Box sx={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.05rem', color: SLATE, mb: 0.4 }}>
                  Nombre del proyecto
                </Box>
                <Box sx={{ fontFamily: SANS, fontSize: '0.83rem', color: MUTED, mb: 2 }}>
                  Elige un identificador único para tu nuevo proyecto.
                </Box>
                <TextField
                  inputRef={inputRef}
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); goNext(); } }}
                  placeholder="my-awesome-app"
                  variant="outlined"
                  fullWidth
                  autoFocus
                  sx={textFieldSx}
                />

                {/* project type */}
                <Box sx={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.05rem', color: SLATE, mt: 3.5, mb: 0.4 }}>
                  Tipo de descarga
                </Box>
                <Box sx={{ fontFamily: SANS, fontSize: '0.83rem', color: MUTED, mb: 1.5 }}>
                  Selecciona qué partes del proyecto descargar.
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TypeCard value="full"     label="Completo"       desc="Backend + Frontend" icon="⚡"  selected={projectType === 'full'}     onSelect={() => setProjectType('full')} />
                  <TypeCard value="backend"  label="Solo Backend"   desc="Servidor"           icon="⚙️"  selected={projectType === 'backend'}  onSelect={() => setProjectType('backend')} />
                  <TypeCard value="frontend" label="Solo Frontend"  desc="UI"                 icon="🎨"  selected={projectType === 'frontend'} onSelect={() => setProjectType('frontend')} />
                </Box>

                {/* docker toggle */}
                <Box
                  onClick={() => setIncludeDocker(d => !d)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, mt: 2.5, p: 1.75,
                    borderRadius: '10px', cursor: 'pointer',
                    border: `1.5px solid ${includeDocker ? ACCENT : BORDER}`,
                    background: includeDocker ? ACCENT_LIGHT : (dark ? '#1a1d30' : '#fafafa'),
                    transition: 'all 0.2s', userSelect: 'none',
                    '&:hover': { borderColor: ACCENT },
                  }}
                >
                  <Box sx={{
                    width: 42, height: 23, borderRadius: '12px', flexShrink: 0,
                    background: includeDocker ? ACCENT : BORDER,
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <Box sx={{
                      position: 'absolute', top: 3.5, left: includeDocker ? 22 : 3.5,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.18)', transition: 'left 0.2s',
                    }} />
                  </Box>
                  <Box>
                    <Box sx={{ fontFamily: SANS, fontWeight: 600, fontSize: '0.85rem', color: SLATE }}>
                      Incluir{' '}
                      <Box component="span" sx={{ fontFamily: MONO, color: ACCENT }}>docker-compose.yml</Box>
                    </Box>
                    <Box sx={{ fontFamily: SANS, fontSize: '0.73rem', color: MUTED, mt: 0.15 }}>
                      Orquestación de contenedores para tu stack
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* ─── step 1: stack ─── */}
            {step === 1 && (
              <Box>
                {/* Backend section */}
                {needsBackend && (
                  <Box sx={{ mb: needsFrontend ? 3.5 : 0 }}>
                    <Box sx={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.05rem', color: SLATE, mb: 0.4 }}>
                      Backend{' '}
                      <Box component="span" sx={{ fontWeight: 400, color: MUTED, fontSize: '0.82rem' }}>(opcional)</Box>
                    </Box>
                    <Box sx={{ fontFamily: SANS, fontSize: '0.83rem', color: MUTED, mb: 2 }}>
                      Selecciona el framework de servidor de tu proyecto.
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      {BACKEND_TEMPLATES.map((t, i) => (
                        <TemplateCard
                          key={t.id} template={t}
                          selected={selectedBackendId === t.id}
                          onToggle={() => setSelectedBackendId(prev => prev === t.id ? null : t.id)}
                          index={i}
                        />
                      ))}
                    </Box>

                    {/* Inline Group ID — Java/Quarkus backends */}
                    {needsGroupId && (
                      <Box sx={{
                        mt: 2.5, p: 2, borderRadius: '10px',
                        background: ACCENT_LIGHT, border: `1.5px solid ${ACCENT}33`,
                      }}>
                        <Box sx={{ fontFamily: SANS, fontWeight: 600, fontSize: '0.9rem', color: SLATE, mb: 0.3 }}>
                          Group ID
                        </Box>
                        <Box sx={{ fontFamily: SANS, fontSize: '0.8rem', color: MUTED, mb: 1.25 }}>
                          Identificador de paquete Maven/Gradle (ej.{' '}
                          <Box component="span" sx={{ fontFamily: MONO, color: ACCENT }}>com.miempresa</Box>).
                        </Box>
                        <TextField
                          inputRef={inputRef}
                          value={groupId}
                          onChange={e => setGroupId(e.target.value)}
                          placeholder="com.miempresa"
                          variant="outlined"
                          fullWidth
                          autoFocus
                          sx={textFieldSx}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Divider for full project */}
                {needsBackend && needsFrontend && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1, borderTop: `1px solid ${BORDER}` }} />
                    <Box sx={{ fontFamily: MONO, fontSize: '0.68rem', color: MUTED }}>frontend</Box>
                    <Box sx={{ flex: 1, borderTop: `1px solid ${BORDER}` }} />
                  </Box>
                )}

                {/* Frontend section */}
                {needsFrontend && (
                  <Box>
                    <Box sx={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.05rem', color: SLATE, mb: 0.4 }}>
                      Frontend{' '}
                      <Box component="span" sx={{ fontWeight: 400, color: MUTED, fontSize: '0.82rem' }}>(opcional)</Box>
                    </Box>
                    <Box sx={{ fontFamily: SANS, fontSize: '0.83rem', color: MUTED, mb: 2 }}>
                      Selecciona el framework de UI.
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      {FRONTEND_TEMPLATES.map((t, i) => (
                        <TemplateCard
                          key={t.id} template={t}
                          selected={selectedFrontendId === t.id}
                          onToggle={() => setSelectedFrontendId(prev => prev === t.id ? null : t.id)}
                          index={i}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* ─── step 2: generar — review ─── */}
            {step === 2 && dlStatus === 'idle' && (
              <Box>
                <Box sx={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.05rem', color: SLATE, mb: 0.4 }}>
                  Resumen del proyecto
                </Box>
                <Box sx={{ fontFamily: SANS, fontSize: '0.83rem', color: MUTED, mb: 2.5 }}>
                  Revisa la configuración antes de descargar.
                </Box>

                {/* config summary */}
                <Box sx={{
                  background: dark ? '#0d1020' : '#f8fafc', border: `1px solid ${BORDER}`,
                  borderRadius: '10px', px: 2.5, py: 2, mb: 2.5,
                  display: 'flex', flexDirection: 'column', gap: 1.25,
                }}>
                  {[
                    { label: 'nombre',   value: projectName },
                    { label: 'tipo',     value: projectType === 'full' ? 'completo' : projectType === 'backend' ? 'solo backend' : 'solo frontend' },
                    ...(isJavaTemplate(selectedBackend) ? [{ label: 'group id', value: groupId }] : []),
                    { label: 'backend',  value: selectedBackend?.name  ?? '—' },
                    { label: 'frontend', value: selectedFrontend?.name ?? '—' },
                    ...(includeDocker ? [{ label: 'docker',   value: 'docker-compose.yml' }] : []),
                  ].map(({ label, value }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                      <Box sx={{ fontFamily: MONO, fontSize: '0.73rem', color: MUTED, minWidth: 72 }}>{label}:</Box>
                      <Box sx={{
                        fontFamily: SANS, fontSize: '0.875rem', fontWeight: 500,
                        color: value === '—' ? '#cbd5e1' : label === 'docker' ? ACCENT : SLATE,
                      }}>
                        {value}
                      </Box>
                    </Box>
                  ))}
                </Box>

                {/* file trees */}
                {selectedBackend && (
                  <FileTreeBlock
                    label={hasBoth ? `${projectName}/backend` : projectName}
                    lines={backendTreeLines}
                    loading={treeLoading && backendTreeLines.length === 0}
                  />
                )}
                {selectedFrontend && (
                  <FileTreeBlock
                    label={hasBoth ? `${projectName}/frontend` : projectName}
                    lines={frontendTreeLines}
                    loading={treeLoading && frontendTreeLines.length === 0}
                  />
                )}

                {!canDownload && (
                  <Box sx={{
                    background: dark ? '#422006' : '#fffbeb', border: dark ? '1px solid #78350f' : '1px solid #fde68a',
                    borderRadius: '8px', px: 2, py: 1.25,
                    fontFamily: SANS, fontSize: '0.8rem', color: dark ? '#fcd34d' : '#92400e',
                  }}>
                    ⚠ Selecciona al menos una plantilla para poder descargar
                  </Box>
                )}
              </Box>
            )}

            {/* ─── step 2: generar — downloading ─── */}
            {step === 2 && dlStatus === 'downloading' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2.5 }}>
                <Box sx={{ position: 'relative', width: 140, height: 140 }}>
                  <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="70" cy="70" r={RADIUS} fill="none" stroke={BORDER} strokeWidth="7" />
                    <circle
                      cx="70" cy="70" r={RADIUS} fill="none"
                      stroke={ACCENT} strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE} strokeDashoffset={svgOffset}
                      style={{ transition: 'stroke-dashoffset 0.25s linear' }}
                    />
                  </svg>
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Box sx={{ fontFamily: MONO, fontSize: '1.5rem', fontWeight: 700, color: SLATE, lineHeight: 1 }}>
                      {Math.round(dlProgress)}%
                    </Box>
                    <Box sx={{ fontFamily: MONO, fontSize: '0.75rem', color: MUTED, mt: 0.25 }}>
                      {SPINNER_FRAMES[dlSpinnerIdx]}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontFamily: SANS, fontWeight: 600, fontSize: '1rem', color: SLATE, mb: 0.4 }}>
                    Preparando tu proyecto…
                  </Box>
                  <Box sx={{ fontFamily: SANS, fontSize: '0.82rem', color: MUTED }}>
                    Obteniendo templates desde GitHub…
                  </Box>
                </Box>
              </Box>
            )}

            {/* ─── step 2: generar — success ─── */}
            {step === 2 && dlStatus === 'done' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2.5 }}>
                <Box sx={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: `${SUCCESS}15`, border: `2px solid ${SUCCESS}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', color: SUCCESS,
                  '@keyframes popIn': {
                    '0%':   { transform: 'scale(0.4)', opacity: 0 },
                    '70%':  { transform: 'scale(1.15)' },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                  },
                  animation: 'popIn 0.5s ease both',
                }}>
                  ✓
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '1.35rem', color: SLATE, mb: 0.4 }}>
                    ¡Proyecto listo!
                  </Box>
                  <Box sx={{ fontFamily: SANS, fontSize: '0.85rem', color: MUTED }}>
                    {dlLabel} descargado correctamente.
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    projectName,
                    selectedBackend?.name,
                    selectedFrontend?.name,
                    ...(includeDocker ? ['docker-compose'] : []),
                  ].filter(Boolean).map(v => (
                    <Box key={v} sx={{
                      px: 1.5, py: 0.4, background: ACCENT_LIGHT, borderRadius: '20px',
                      fontFamily: MONO, fontSize: '0.73rem', color: ACCENT,
                    }}>
                      {v}
                    </Box>
                  ))}
                </Box>
                <Box
                  onClick={resetWizard}
                  sx={{
                    mt: 0.5, px: 3, py: 1, background: ACCENT, color: '#fff',
                    borderRadius: '8px', fontFamily: SANS, fontWeight: 600, fontSize: '0.9rem',
                    cursor: 'pointer', userSelect: 'none',
                    transition: 'background 0.18s, transform 0.12s',
                    '&:hover': { background: '#4f46e5', transform: 'translateY(-1px)' },
                    '&:active': { transform: 'translateY(0)' },
                  }}
                >
                  Nuevo proyecto
                </Box>
              </Box>
            )}

            {/* ─── step 2: generar — error ─── */}
            {step === 2 && dlStatus === 'error' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
                <Box sx={{ fontSize: '2.5rem' }}>⚠️</Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontFamily: SANS, fontWeight: 700, fontSize: '1rem', color: SLATE, mb: 0.4 }}>
                    Error al descargar
                  </Box>
                  <Box sx={{ fontFamily: SANS, fontSize: '0.83rem', color: MUTED }}>
                    No se pudo obtener las plantillas desde GitHub.
                  </Box>
                </Box>
              </Box>
            )}

          </Box>

          {/* ── footer controls ── */}
          {showFooter && (
            <Box sx={{
              px: { xs: 2.5, sm: 4 }, py: 2,
              borderTop: `1px solid ${BORDER}`,
              background: dark ? '#0d1020' : '#fafafa',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <Box
                onClick={goBack}
                sx={{
                  fontFamily: SANS, fontSize: '0.84rem',
                  color: step === 0 ? 'transparent' : MUTED,
                  pointerEvents: step === 0 ? 'none' : 'auto',
                  cursor: 'pointer', userSelect: 'none',
                  '&:hover': { color: SLATE }, transition: 'color 0.15s',
                }}
              >
                ← Atrás
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ fontFamily: SANS, fontSize: '0.73rem', color: '#cbd5e1' }}>
                  {step + 1} / 3
                </Box>

                {step < 2 ? (
                  <Box
                    onClick={goNext}
                    sx={{
                      px: 2.5, py: 0.85,
                      background: (step === 0 && !canNext0) ? BORDER : ACCENT,
                      color:      (step === 0 && !canNext0) ? '#94a3b8' : '#fff',
                      borderRadius: '8px', fontFamily: SANS, fontWeight: 600, fontSize: '0.875rem',
                      cursor: (step === 0 && !canNext0) ? 'not-allowed' : 'pointer',
                      userSelect: 'none', transition: 'all 0.18s',
                      '&:hover': (step === 0 && !canNext0) ? {} : { background: '#4f46e5', transform: 'translateY(-1px)' },
                      '&:active': { transform: 'translateY(0)' },
                    }}
                  >
                    {step === 1 ? 'Revisar →' : 'Siguiente →'}
                  </Box>
                ) : (
                  <Box
                    onClick={dlStatus === 'error' ? downloadProject : downloadProject}
                    sx={{
                      px: 2.5, py: 0.85,
                      background: canDownload ? ACCENT : BORDER,
                      color:      canDownload ? '#fff' : '#94a3b8',
                      borderRadius: '8px', fontFamily: SANS, fontWeight: 600, fontSize: '0.875rem',
                      cursor: canDownload ? 'pointer' : 'not-allowed',
                      userSelect: 'none', transition: 'all 0.18s',
                      '&:hover': canDownload ? { background: '#4f46e5', transform: 'translateY(-1px)' } : {},
                      '&:active': { transform: 'translateY(0)' },
                    }}
                  >
                    {dlStatus === 'error' ? 'Reintentar ↓' : 'Descargar ZIP ↓'}
                  </Box>
                )}
              </Box>
            </Box>
          )}

        </Box>
      </Box>
    </Box>
  );
}
