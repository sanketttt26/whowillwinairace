'use client';

import { Component, Fragment } from 'react';

export default class Page extends Component {
  OPTS = [
    { id: 'openai', name: 'OpenAI', sub: 'they have something cooking.', roast: 'you really thought the company that names models like Wi-Fi passwords was going to make this simple?' },
    { id: 'anthropic', name: 'Anthropic', sub: 'but is winning safe?', roast: 'respectfully, they were still checking whether crossing the finish line was aligned with their values.' },
    { id: 'google', name: 'Google DeepMind', sub: 'already won internally.', roast: 'congratulations. they actually won six months ago. internally.' },
    { id: 'xai', name: 'xAI', sub: 'currently posting about it.', roast: 'bold choice. the race was temporarily paused for a tweet.' },
    { id: 'meta', name: 'Meta', sub: 'the source code is on GitHub.', roast: 'they open-sourced the finish line. everyone crossed it.' }
  ];
  // sealed → prediction_selected → verifying → opening → revealed
  state = { phase: 'sealed', pick: null, step: 0, settled: false, opens: 0, stampClicks: 0, tallies: {}, redacted: true, sharing: false, shareUrl: null };
  timers = [];

  componentWillUnmount() { this.clear(); this.dropShare(); cancelAnimationFrame(this.raf); }
  clear() { this.timers.forEach(clearTimeout); this.timers = []; }
  dropShare() { if (this.state.shareUrl) URL.revokeObjectURL(this.state.shareUrl); }
  reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  active(p) { return p === 'verifying' || p === 'opening' || p === 'revealed'; }
  dateStr() {
    const d = new Date();
    return d.getDate() + ' ' + ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()] + ' ' + d.getFullYear();
  }

  choose(id) {
    if (this.active(this.state.phase)) return;
    this.setState({ pick: id, phase: 'prediction_selected' });
  }

  seal(page) {
    const s = this.state;
    if (!s.pick || this.active(s.phase)) return;
    const reduce = this.reduced();
    const k = reduce ? 0.35 : 1;
    this.clear();
    if (page) { page.style.setProperty('--rx', '0deg'); page.style.setProperty('--ry', '0deg'); page.style.setProperty('--sx', '0'); page.style.setProperty('--sy', '0'); }
    this.dropShare();
    this.setState({ phase: 'verifying', step: 0, settled: false, shareUrl: null, opens: s.opens + 1, tallies: Object.assign({}, s.tallies, { [s.pick]: (s.tallies[s.pick] || 0) + 1 }) });
    const stage = page && page.querySelector('.stage');
    if (stage) {
      const r = stage.getBoundingClientRect();
      const h = r.height + 150;
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - Math.max(16, (window.innerHeight - h) / 2)), behavior: reduce ? 'auto' : 'smooth' });
    }
    const at = (ms, fn) => this.timers.push(setTimeout(fn, ms * k));
    at(220, () => this.setState({ step: 1 }));
    at(820, () => this.setState({ step: 2 }));
    at(1420, () => this.setState({ step: 3 }));
    at(1980, () => this.setState({ phase: 'opening', step: 4 }));
    at(3180, () => this.setState({ phase: 'revealed' }));
    at(3420, () => { const t = page && page.querySelector('[data-report-title]'); if (t) t.focus({ preventScroll: true }); });
    at(5600, () => this.setState({ settled: true }));
  }

  onSeal = (e) => this.seal(e.currentTarget.closest('.page'));

  onAgain = (e) => {
    const page = e.currentTarget.closest('.page');
    this.clear();
    this.dropShare();
    this.setState({ phase: 'sealed', pick: null, step: 0, settled: false, shareUrl: null, sharing: false });
    setTimeout(() => {
      const st = page && page.querySelector('.stage');
      if (st) window.scrollTo({ top: Math.max(0, window.scrollY + st.getBoundingClientRect().top - 120), behavior: this.reduced() ? 'auto' : 'smooth' });
    }, 40);
  };

  onStamp = () => this.setState((s) => ({ stampClicks: s.stampClicks + 1 }));
  onRedact = () => this.setState((s) => ({ redacted: !s.redacted }));

  onMove = (e) => {
    if (e.pointerType === 'touch' || this.reduced()) return;
    const page = e.currentTarget;
    const x = e.clientX, y = e.clientY;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      page.style.setProperty('--mx', (15 + (x / Math.max(1, window.innerWidth)) * 70).toFixed(1) + '%');
      const tilt = page.querySelector('.tilt');
      if (!tilt || this.active(this.state.phase)) return;
      const r = tilt.getBoundingClientRect();
      if (!r.width) return;
      const cx = Math.max(-1, Math.min(1, (x - r.left - r.width / 2) / (r.width * 0.9)));
      const cy = Math.max(-1, Math.min(1, (y - r.top - r.height / 2) / (r.height * 1.4)));
      page.style.setProperty('--ry', (cx * 7).toFixed(2) + 'deg');
      page.style.setProperty('--rx', (-cy * 5).toFixed(2) + 'deg');
      page.style.setProperty('--sx', cx.toFixed(3));
      page.style.setProperty('--sy', cy.toFixed(3));
    });
  };
  onLeave = (e) => {
    const st = e.currentTarget.style;
    cancelAnimationFrame(this.raf);
    st.setProperty('--rx', '0deg'); st.setProperty('--ry', '0deg'); st.setProperty('--sx', '0'); st.setProperty('--sy', '0');
  };

  // mobile: swipe across the envelope after voting
  onTouchStart = (e) => { const t = e.touches && e.touches[0]; this.touch = t ? { x: t.clientX, y: t.clientY } : null; };
  onTouchEnd = (e) => {
    const t0 = this.touch, t = e.changedTouches && e.changedTouches[0];
    this.touch = null;
    if (!t0 || !t || this.state.phase !== 'prediction_selected') return;
    const dx = t.clientX - t0.x, dy = t.clientY - t0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) this.seal(e.currentTarget.closest('.page'));
  };

  shareText(name) {
    return 'i predicted ' + name + ' would win the ai race.\n\nactual winner: me.\nreason: $20/month.\nstatus: financially confused.';
  }

  onShare = async (e) => {
    const page = e.currentTarget.closest('.page');
    const pick = this.OPTS.find((o) => o.id === this.state.pick);
    if (!pick || this.state.sharing) return;
    this.setState({ sharing: true });
    try {
      const blob = await this.drawCard(pick.name.toUpperCase(), page);
      this.dropShare();
      this.setState({ sharing: false, shareUrl: URL.createObjectURL(blob) });
      const file = new File([blob], 'whowillwinairace-record.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: this.shareText(pick.name) + '\n\nwhowillwinairace.com' }); } catch (_) { /* cancelled or blocked: the download + X links below still work */ }
      }
    } catch (_) {
      this.setState({ sharing: false });
    }
  };

  async drawCard(pickU, page) {
    // next/font hashes the family names; read the real stacks off the page's CSS vars
    const css = getComputedStyle(page);
    const MONO = css.getPropertyValue('--mono').trim();
    const SERIF = css.getPropertyValue('--serif').trim();
    const SANS = css.getPropertyValue('--sans').trim();
    try { await Promise.all(['500 19px ' + MONO, '600 28px ' + MONO, '400 26px ' + MONO, 'italic 32px ' + SERIF, '600 40px ' + SANS].map((f) => document.fonts.load(f))); } catch (_) {}
    const W = 1200, H = 675, S = 2;
    const c = document.createElement('canvas');
    c.width = W * S; c.height = H * S;
    const x = c.getContext('2d');
    x.scale(S, S);
    x.fillStyle = '#F7F5EF'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 14000; i++) { x.fillStyle = 'rgba(70,55,30,' + (Math.random() * 0.05).toFixed(3) + ')'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    x.save(); x.shadowColor = 'rgba(48,36,16,0.22)'; x.shadowBlur = 40; x.shadowOffsetY = 18; x.fillStyle = '#FBFAF6'; x.fillRect(80, 56, 1040, 563); x.restore();
    x.strokeStyle = 'rgba(32,32,32,0.22)'; x.lineWidth = 1; x.strokeRect(80.5, 56.5, 1039, 562);
    const L = 136, R = 1064;
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#202020'; x.font = '500 19px ' + MONO; x.fillText('WHOWILLWINAIRACE.COM', L, 122);
    x.font = '500 15px ' + MONO;
    const lab = 'TOP SECRET · EYES ONLY', lw = x.measureText(lab).width;
    x.fillStyle = '#BF2E2A'; x.fillText(lab, R - lw - 12, 120);
    x.strokeStyle = '#BF2E2A'; x.lineWidth = 1.25; x.strokeRect(R - lw - 24, 100, lw + 24, 29);
    x.fillStyle = 'rgba(32,32,32,0.25)'; x.fillRect(L, 152, R - L, 1);
    x.fillStyle = '#202020'; x.font = '600 26px ' + MONO; x.fillText('OFFICIAL PREDICTION RECORD', L, 204);
    x.fillStyle = '#6B6863'; x.font = '400 15px ' + MONO; x.fillText('FORM AIR-5 · FILED ' + this.dateStr(), L, 232);
    [['MY PICK', pickU, '#202020'], ['ACTUAL WINNER', 'ME', '#BF2E2A'], ['REASON', '$20/MONTH', '#202020'], ['STATUS', 'FINANCIALLY CONFUSED', '#202020']].forEach(([k, v, col], i) => {
      const y = 300 + i * 62;
      x.font = '400 26px ' + MONO; x.fillStyle = '#6B6863'; x.fillText(k, L, y);
      const kw = x.measureText(k).width;
      x.fillStyle = 'rgba(32,32,32,0.35)';
      for (let dx = L + kw + 14; dx < L + 330; dx += 9) x.fillRect(dx, y - 3, 2.5, 2.5);
      x.font = '600 28px ' + MONO; x.fillStyle = col; x.fillText(v, L + 344, y);
    });
    // the stamp, with a little ink loss
    x.save(); x.translate(925, 312); x.rotate(-0.13); x.globalAlpha = 0.9;
    x.font = '600 40px ' + SANS;
    const st = 'CASE CLOSED.', sw = x.measureText(st).width;
    x.fillStyle = '#D93632'; x.fillText(st, -sw / 2, 14);
    x.strokeStyle = '#D93632'; x.lineWidth = 4; x.strokeRect(-sw / 2 - 22, -36, sw + 44, 66);
    x.lineWidth = 1.5; x.strokeRect(-sw / 2 - 15, -29, sw + 30, 52);
    x.globalAlpha = 1; x.fillStyle = '#FBFAF6';
    for (let i = 0; i < 520; i++) { x.globalAlpha = 0.35 + Math.random() * 0.55; x.beginPath(); x.arc(-sw / 2 - 24 + Math.random() * (sw + 48), -38 + Math.random() * 70, 0.4 + Math.random() * 1.3, 0, 6.283); x.fill(); }
    x.restore();
    x.fillStyle = 'rgba(32,32,32,0.25)'; x.fillRect(L, 532, R - L, 1);
    x.fillStyle = '#202020'; x.font = 'italic 32px ' + SERIF; x.fillText('the winner has already been chosen.', L, 580);
    x.fillStyle = '#6B6863'; x.font = '400 15px ' + MONO;
    const u = 'WHOWILLWINAIRACE.COM'; x.fillText(u, R - x.measureText(u).width, 578);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
  }

  renderVals() {
    const s = this.state;
    const phase = s.phase;
    const active = this.active(phase);
    const revealed = phase === 'revealed';
    const pick = this.OPTS.find((o) => o.id === s.pick);
    const total = Object.keys(s.tallies).reduce((a, k) => a + s.tallies[k], 0);
    const steps = ['verifying confidential intelligence...', 'consulting 47 proprietary benchmarks...', 'ignoring all of them...'];
    const lines = steps.slice(0, Math.min(s.step, 3)).map((text, i) => ({ text, done: s.step >= i + 2, caret: s.step === i + 1, mark: i === 2 ? 'done.' : 'ok' }));
    return {
      stageClass: 'stage is-' + phase,
      dimClass: 'dim is-' + phase,
      showDim: active && !s.settled,
      showEnvelope: !(revealed && s.settled),
      showTicker: phase === 'verifying' || phase === 'opening',
      showReport: revealed,
      showBallot: !revealed,
      lines,
      options: this.OPTS.map((o, i) => ({
        id: o.id, name: o.name, sub: o.sub,
        n: String(i + 1).padStart(2, '0'),
        checked: s.pick === o.id,
        cls: 'opt' + (s.pick === o.id ? ' is-on' : '') + (i === this.OPTS.length - 1 ? ' is-last' : ''),
        pick: () => this.choose(o.id)
      })),
      ballotLocked: active,
      cantSeal: !pick || active,
      noPick: !pick,
      hasPick: !!pick && !active,
      hasOpinion: !!pick,
      subj2Cls: 'subj-2' + (pick ? ' is-struck' : ''),
      stampText: s.stampClicks >= 4 ? 'PLEASE STOP.' : 'CONFIDENTIAL',
      stampCls: 'stamp env-stamp ' + (s.stampClicks === 0 ? '' : (s.stampClicks % 2 ? 'thunk-a' : 'thunk-b')),
      onStamp: this.onStamp,
      onSeal: this.onSeal,
      onAgain: this.onAgain,
      onMove: this.onMove,
      onLeave: this.onLeave,
      onTouchStart: this.onTouchStart,
      onTouchEnd: this.onTouchEnd,
      reportDate: this.dateStr(),
      showClosure: s.opens >= 4,
      pickUpper: pick ? pick.name.toUpperCase() : '',
      roast: pick ? pick.roast : '',
      onShare: this.onShare,
      sharing: s.sharing,
      shareLabel: s.sharing ? '[ DEVELOPING EVIDENCE... ]' : '[ SHARE THE TRUTH ]',
      shareReady: !!s.shareUrl,
      shareUrl: s.shareUrl || '',
      shareAlt: pick ? 'Official prediction record. My pick: ' + pick.name + '. Actual winner: me. Reason: $20 a month. Status: financially confused.' : '',
      xUrl: pick ? 'https://x.com/intent/tweet?text=' + encodeURIComponent(this.shareText(pick.name)) + '&url=' + encodeURIComponent('https://whowillwinairace.com') : 'https://x.com',
      votes: this.OPTS.map((o) => {
        const pct = total ? Math.round(((s.tallies[o.id] || 0) * 100) / total) : 0;
        return { name: o.name, pct, label: pct + '%', fillCls: 'vfill' + (o.id === s.pick ? ' is-mine' : '') };
      }),
      // ponytail: session-only tally, honest about it. Swap for the server count when the ballot box (DB) is wired.
      votesNote: 'ballots counted: ' + total + '. ' + (total === 1 ? 'it is yours.' : 'all of them are yours.') + ' the public tally opens once the ballot box is connected to a real database.',
      redactCls: 'redact' + (s.redacted ? '' : ' is-shown'),
      redactLabel: s.redacted ? 'redacted sentence. press to reveal.' : undefined,
      onRedact: this.onRedact
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <div className="page" onPointerMove={v.onMove} onPointerLeave={v.onLeave} style={{ minHeight: '100vh', position: 'relative', overflowX: 'clip', background: '#F7F5EF', color: '#202020', fontFamily: 'var(--sans)' }}>

      <svg className="defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
      <radialGradient id="wax" cx="38%" cy="32%" r="75%"><stop offset="0" stopColor="#EC625C"></stop><stop offset=".45" stopColor="#D93632"></stop><stop offset="1" stopColor="#A9261F"></stop></radialGradient>
      <filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="3" result="t"></feTurbulence><feColorMatrix in="t" type="matrix" values="0 0 0 0 .32  0 0 0 0 .25  0 0 0 0 .14  1 0 0 0 -.38" result="g"></feColorMatrix><feComposite in="g" in2="SourceAlpha" operator="in" result="gc"></feComposite><feMerge><feMergeNode in="SourceGraphic"></feMergeNode><feMergeNode in="gc"></feMergeNode></feMerge></filter>
      <filter id="fold" x="-5%" y="-10%" width="110%" height="120%"><feDropShadow dx="0" dy="-1.5" stdDeviation="2" floodColor="#4A3613" floodOpacity=".2"></feDropShadow></filter>
      <filter id="ink" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="7" result="n"></feTurbulence><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.6 0 0 0 2.25" result="holes"></feColorMatrix><feComposite in="SourceGraphic" in2="holes" operator="in" result="speck"></feComposite><feDisplacementMap in="speck" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter>
      <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"></feTurbulence><feColorMatrix type="matrix" values="0 0 0 0 .3  0 0 0 0 .24  0 0 0 0 .16  1.1 0 0 0 -.42"></feColorMatrix></filter>
      </defs>
      </svg>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px 24px', padding: '22px clamp(20px, 5vw, 64px)', borderBottom: '1px solid rgba(32, 32, 32, 0.14)' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', letterSpacing: '0.02em' }}>whowillwinairace.com</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: '500', letterSpacing: '0.18em', color: '#BF2E2A', border: '1px solid #BF2E2A', padding: '6px 10px 5px' }}>TOP SECRET · EYES ONLY</span>
      </header>

      <main style={{ padding: '0 clamp(20px, 5vw, 64px)' }}>

      <section style={{ maxWidth: '1180px', margin: '0 auto', paddingTop: 'clamp(56px, 8vw, 104px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <p style={{ margin: '0 0 28px', fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '0.08em', color: '#6B6863' }}>re: who will win the ai race?</p>
      <h1 style={{ margin: '0', maxWidth: '11.5em', fontFamily: 'var(--serif)', fontWeight: '400', fontSize: 'clamp(52px, 9vw, 136px)', lineHeight: '0.9', letterSpacing: '-0.025em', textWrap: 'balance' }}>the winner has already been chosen.</h1>
      <p style={{ margin: '34px 0 0', maxWidth: '34em', fontSize: 'clamp(17px, 1.6vw, 20px)', lineHeight: '1.5', color: '#4A4844', textWrap: 'pretty' }}>after billions of dollars, millions of GPUs, and an unreasonable number of podcasts, we finally have an answer.</p>
      <p style={{ margin: '20px 0 0', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '23px', color: '#202020' }}>but first, we need your prediction.</p>
      </section>

      <div className={v.stageClass} onTouchStart={v.onTouchStart} onTouchEnd={v.onTouchEnd} style={{ margin: 'clamp(48px, 6vw, 76px) auto 0' }}>

      {v.showEnvelope && (<>
      <div className="float">
      <div className="tilt">
      <div className="nudge">
      <div className="env">
      <div className="env-back"></div>

      <div className="letter" aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: '1.5cqw', letterSpacing: '0.12em', color: '#6B6863' }}><span>FORM AIR-0 · CLASSIFIED</span><span>1 OF 1</span></div>
      <p style={{ margin: '3.4cqw 0 0', fontFamily: 'var(--mono)', fontWeight: '600', fontSize: '1.9cqw', letterSpacing: '0.24em', color: '#BF2E2A' }}>FINAL REPORT</p>
      <p style={{ margin: '1cqw 0 0', fontFamily: 'var(--mono)', fontWeight: '600', fontSize: '2.7cqw', letterSpacing: '0.04em' }}>THE ARTIFICIAL INTELLIGENCE RACE</p>
      <div style={{ height: '1px', marginTop: '3cqw', background: 'rgba(32, 32, 32, 0.2)' }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.7cqw', marginTop: '3cqw' }}>
      <span style={{ display: 'block', height: '1.4cqw', width: '84%', background: '#202020' }}></span>
      <span style={{ display: 'block', height: '1.4cqw', width: '62%', background: '#202020' }}></span>
      <span style={{ display: 'block', height: '1.4cqw', width: '74%', background: '#202020' }}></span>
      </div>
      </div>

      <svg className="pocket" viewBox="0 0 560 360" preserveAspectRatio="none" aria-hidden="true">
      <g filter="url(#paper)">
      <path d="M0 0 L270 203 Q281 212 270 221 L0 360 Z" fill="#E4D9C0"></path>
      <path d="M560 0 L290 203 Q279 212 290 221 L560 360 Z" fill="#E0D5BA"></path>
      <path d="M0 360 L258 190 Q280 176 302 190 L560 360 Z" fill="#EAE2CE" filter="url(#fold)"></path>
      </g>
      <path d="M0 360 L258 190 Q280 176 302 190 L560 360" fill="none" stroke="#202020" strokeOpacity=".07" strokeWidth="1"></path>
      </svg>

      <div className="print">
      <button type="button" className={v.stampCls} onClick={v.onStamp}>{v.stampText}</button>
      <div className="subject">
      <span className="subj-1">SUBJECT: THE WINNER OF THE AI RACE</span>
      <span className={v.subj2Cls}>DO NOT OPEN UNTIL YOU HAVE AN OPINION</span>
      {v.hasOpinion && (<><span className="subj-3">opinion on file.</span></>)}
      </div>
      <button type="button" className="docid">DOC. AIR-2026-000020<span className="tip" role="tooltip">generated by a human, allegedly.</span></button>
      <span className="routing">ROUTING: EYES ONLY</span>
      </div>

      <svg className="flap" viewBox="0 0 560 232" aria-hidden="true">
      <path d="M0 0 H560 L304 207 Q280 226 256 207 Z" fill="#EEE7D5" filter="url(#paper)"></path>
      <path d="M0 0.5 H560" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1"></path>
      </svg>

      <div className="seal" aria-hidden="true">
      <div className="seal-half seal-l">
      <svg viewBox="0 0 100 100">
      <path d="M50 5 C58 5 62 9 68 8 C76 7 80 14 86 18 C92 23 90 30 94 36 C98 43 95 50 96 56 C97 64 92 68 90 75 C88 83 80 85 75 90 C69 95 62 93 56 96 C49 99 43 95 36 95 C28 95 24 89 18 85 C11 80 12 73 8 67 C4 60 7 53 5 46 C3 38 9 33 11 26 C14 18 21 16 27 11 C34 6 42 6 50 5 Z" fill="url(#wax)"></path>
      <circle cx="50" cy="50" r="31" fill="#C42F2B"></circle>
      <circle cx="50" cy="50" r="31" fill="none" stroke="#9E2421" strokeWidth="2.5"></circle>
      <circle cx="50" cy="50" r="26.5" fill="none" stroke="#E8635E" strokeWidth=".9" strokeDasharray="1.6 2.4" opacity=".8"></circle>
      <text x="49.2" y="60.2" textAnchor="middle" style={{ fontFamily: 'var(--serif)' }} fontSize="34" fill="#EE7A74" opacity=".6">W</text>
      <text x="50.8" y="61.8" textAnchor="middle" style={{ fontFamily: 'var(--serif)' }} fontSize="34" fill="#8A1F1C">W</text>
      <text x="50" y="61" textAnchor="middle" style={{ fontFamily: 'var(--serif)' }} fontSize="34" fill="#B32925">W</text>
      <ellipse cx="35" cy="27" rx="11" ry="4.5" fill="#FFFFFF" opacity=".2" transform="rotate(-32 35 27)"></ellipse>
      </svg>
      </div>
      <div className="seal-half seal-r">
      <svg viewBox="0 0 100 100">
      <path d="M50 5 C58 5 62 9 68 8 C76 7 80 14 86 18 C92 23 90 30 94 36 C98 43 95 50 96 56 C97 64 92 68 90 75 C88 83 80 85 75 90 C69 95 62 93 56 96 C49 99 43 95 36 95 C28 95 24 89 18 85 C11 80 12 73 8 67 C4 60 7 53 5 46 C3 38 9 33 11 26 C14 18 21 16 27 11 C34 6 42 6 50 5 Z" fill="url(#wax)"></path>
      <circle cx="50" cy="50" r="31" fill="#C42F2B"></circle>
      <circle cx="50" cy="50" r="31" fill="none" stroke="#9E2421" strokeWidth="2.5"></circle>
      <circle cx="50" cy="50" r="26.5" fill="none" stroke="#E8635E" strokeWidth=".9" strokeDasharray="1.6 2.4" opacity=".8"></circle>
      <text x="49.2" y="60.2" textAnchor="middle" style={{ fontFamily: 'var(--serif)' }} fontSize="34" fill="#EE7A74" opacity=".6">W</text>
      <text x="50.8" y="61.8" textAnchor="middle" style={{ fontFamily: 'var(--serif)' }} fontSize="34" fill="#8A1F1C">W</text>
      <text x="50" y="61" textAnchor="middle" style={{ fontFamily: 'var(--serif)' }} fontSize="34" fill="#B32925">W</text>
      <ellipse cx="35" cy="27" rx="11" ry="4.5" fill="#FFFFFF" opacity=".2" transform="rotate(-32 35 27)"></ellipse>
      </svg>
      </div>
      </div>

      </div>
      </div>
      </div>
      </div>
      </>)}

      {v.showTicker && (<>
      <div className="ticker" role="status" aria-live="polite">
      <div className="thead"><span>SECURE FEED 47-B</span><span>INCOMING</span></div>
      {v.lines.map((l, i) => (<Fragment key={i}>
      <div className="tline"><span>{l.text}{l.caret && (<><span className="caret" aria-hidden="true"></span></>)}</span>{l.done && (<><span className="tok">{l.mark}</span></>)}</div>
      </Fragment>))}
      </div>
      </>)}

      {v.showReport && (<>
      <article className="report" aria-labelledby="report-title">
      <div className="panel panel-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.12em', color: '#6B6863' }}><span>FORM AIR-0 · CLASSIFIED</span><span>FILED {v.reportDate}</span></div>
      <p style={{ margin: '30px 0 0', fontFamily: 'var(--mono)', fontWeight: '600', fontSize: '13px', letterSpacing: '0.24em', color: '#BF2E2A' }}>FINAL REPORT</p>
      <h2 id="report-title" data-report-title="" tabIndex="-1" style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: '600', fontSize: 'clamp(16px, 2.4vw, 19px)', letterSpacing: '0.04em', outline: 'none' }}>THE ARTIFICIAL INTELLIGENCE RACE</h2>
      <div style={{ height: '1px', marginTop: '22px', background: 'rgba(32, 32, 32, 0.2)' }}></div>
      <p style={{ margin: '14px 0 0', fontFamily: 'var(--mono)', fontSize: '11px', lineHeight: '1.7', letterSpacing: '0.08em', color: '#6B6863' }}>DISTRIBUTION: 1 (ONE) READER · REF: AIR-2026-000020 · CONFIDENCE: UNREASONABLE</p>
      {v.showClosure && (<>
      <p style={{ margin: '18px 0 0', fontFamily: 'var(--mono)', fontSize: '13px', color: '#BF2E2A' }}>NOTE: the result has not changed. please seek closure.</p>
      </>)}
      <div style={{ marginTop: '30px' }}><span className="stamp slam slam-1" style={{ '--r': '-5deg', fontSize: 'clamp(24px, 5vw, 40px)' }}>WINNER CONFIRMED.</span></div>
      </div>
      <div className="panel panel-2">
      <p style={{ margin: '0', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.16em', color: '#6B6863' }}>SUBJECT IDENTIFIED AS:</p>
      <p style={{ margin: '10px 0 0', fontFamily: 'var(--serif)', fontSize: 'clamp(120px, 28vw, 232px)', lineHeight: '0.82', letterSpacing: '-0.035em' }}>YOU.</p>
      <p style={{ margin: '26px 0 0', maxWidth: '30em', fontSize: 'clamp(17px, 2vw, 20px)', lineHeight: '1.5', color: '#202020', textWrap: 'pretty' }}>yes, you. the person paying five different companies $20 a month to summarize the same PDF.</p>
      </div>
      <div className="panel panel-3">
      <div className="mirror" role="img" aria-label="A small mirror. The winner, reflected."><span className="mirror-word" aria-hidden="true">you.</span></div>
      <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontSize: '10.5px', letterSpacing: '0.12em', color: '#6B6863' }}>FIG. 1 — THE WINNER, PICTURED.</p>
      <p style={{ margin: '28px 0 0', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'clamp(24px, 3.2vw, 30px)', lineHeight: '1.2', textWrap: 'pretty' }}>turns out the real winner was the subscriptions we made along the way.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '26px' }}><span className="stamp slam slam-2" style={{ '--r': '-7deg', fontSize: '15px' }}>CASE CLOSED.</span></div>
      </div>
      </article>
      </>)}

      </div>

      {v.showBallot && (<>
      <section style={{ maxWidth: '780px', margin: '0 auto', paddingTop: 'clamp(96px, 11vw, 140px)', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0' }}>
      <h2 id="q-title" style={{ margin: '0 0 32px', textAlign: 'center', fontFamily: 'var(--serif)', fontWeight: '400', fontSize: 'clamp(38px, 5vw, 60px)', lineHeight: '1', letterSpacing: '-0.015em' }}>so, who's winning this thing?</h2>
      <fieldset className="ballot" aria-labelledby="q-title">
      <div className="bhead"><span>FORM AIR-5 · OFFICIAL BALLOT</span><span>MARK ONE (1) BOX ONLY</span></div>
      {v.options.map((o, i) => (<Fragment key={i}>
      <label className={o.cls}>
      <input type="radio" className="sr-only" name="contender" value={o.id} checked={o.checked} disabled={v.ballotLocked} onChange={o.pick} />
      <span className="box" aria-hidden="true"><svg className="check" viewBox="0 0 40 40"><path d="M9 21 L17 30 L35 7" fill="none" stroke="#D93632" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"></path></svg></span>
      <span className="num" style={{ gridRow: '1', gridColumn: '1' }}>{o.n}</span>
      <span className="oname">{o.name}<svg className="ring" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M14 34 C10 14 60 6 104 7 C150 8 194 15 193 31 C192 47 146 55 98 54 C52 53 8 47 9 30 C10 19 28 11 52 8" pathLength="1" fill="none" stroke="#D93632" strokeWidth="2.2" strokeLinecap="round"></path></svg></span>
      <span className="osub">{o.sub}</span>
      </label>
      </Fragment>))}
      <div className="bfoot"><span>DO NOT FOLD, SPINDLE OR FINE-TUNE.</span><span>PAGE 1 OF 1</span></div>
      </fieldset>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginTop: '40px', textAlign: 'center' }}>
      <button type="button" className="btn btn-solid" disabled={v.cantSeal} onClick={v.onSeal} style={{ fontSize: '15px', letterSpacing: '0.16em', padding: '18px 32px', minHeight: '58px' }}>[ SEAL MY PREDICTION ]</button>
      {v.noPick && (<><p style={{ margin: '0', fontFamily: 'var(--mono)', fontSize: '12px', color: '#6B6863' }}>status: no opinion detected.</p></>)}
      {v.hasPick && (<><p className="touch-only" style={{ margin: '0', fontFamily: 'var(--mono)', fontSize: '12px', color: '#202020' }}>or swipe across the envelope to break the seal.</p></>)}
      <p style={{ margin: '4px 0 0', fontFamily: 'var(--mono)', fontSize: '12px', color: '#6B6863' }}>your prediction will be taken very seriously by absolutely nobody.</p>
      </div>
      </section>
      </>)}

      {v.showReport && (<>
      <section className="after d1" style={{ maxWidth: '660px', margin: 'clamp(80px, 9vw, 112px) auto 0' }}>
      <p style={{ margin: '0', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.16em', color: '#BF2E2A' }}>ADDENDUM A — RE: YOUR PREDICTION ({v.pickUpper})</p>
      <p style={{ margin: '16px 0 0', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'clamp(28px, 3.6vw, 38px)', lineHeight: '1.15', letterSpacing: '-0.01em', textWrap: 'pretty' }}>“{v.roast}”</p>
      </section>

      <section className="after d2" style={{ maxWidth: '660px', margin: 'clamp(80px, 9vw, 112px) auto 0' }}>
      <p style={{ margin: '0 0 18px', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.16em', color: '#BF2E2A' }}>EXHIBIT B — APPROVED FOR PUBLIC RELEASE</p>
      <div className="record">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '12px', letterSpacing: '0.1em' }}><span style={{ fontWeight: '500' }}>WHOWILLWINAIRACE.COM</span><span style={{ color: '#BF2E2A', border: '1px solid #BF2E2A', padding: '3px 7px 2px', fontSize: '10px', letterSpacing: '0.16em' }}>TOP SECRET</span></div>
      <div style={{ height: '1px', margin: '14px 0 16px', background: 'rgba(32, 32, 32, 0.2)' }}></div>
      <p style={{ margin: '0 0 12px', fontWeight: '600', fontSize: '15px', letterSpacing: '0.1em' }}>OFFICIAL PREDICTION RECORD</p>
      <div className="rrow"><span className="rlab">MY PICK</span><span className="rdots"></span><span className="rval">{v.pickUpper}</span></div>
      <div className="rrow"><span className="rlab">ACTUAL WINNER</span><span className="rdots"></span><span className="rval" style={{ color: '#BF2E2A' }}>ME</span></div>
      <div className="rrow"><span className="rlab">REASON</span><span className="rdots"></span><span className="rval">$20/MONTH</span></div>
      <div className="rrow"><span className="rlab">STATUS</span><span className="rdots"></span><span className="rval">FINANCIALLY CONFUSED</span></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}><span className="stamp rstamp">CASE CLOSED.</span></div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '28px' }}>
      <button type="button" className="btn btn-solid" onClick={v.onShare} disabled={v.sharing}>{v.shareLabel}</button>
      <button type="button" className="btn btn-ghost" onClick={v.onAgain}>[ RUN THE INVESTIGATION AGAIN ]</button>
      </div>
      {v.shareReady && (<>
      <div className="share-out">
      <img src={v.shareUrl} alt={v.shareAlt} width="1200" height="675" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: '0 0 4px', fontFamily: 'var(--mono)', fontSize: '12px', lineHeight: '1.6', color: '#4A4844' }}>evidence developed. 1200 × 675, sized for X.</p>
      <a className="btn btn-solid" href={v.shareUrl} download="whowillwinairace-record.png">[ DOWNLOAD IMAGE ]</a>
      <a className="btn btn-ghost" href={v.xUrl} target="_blank" rel="noopener noreferrer">[ POST IT ON X ]</a>
      </div>
      </div>
      </>)}
      </section>

      <section className="after d3" style={{ maxWidth: '660px', margin: 'clamp(88px, 10vw, 128px) auto 0' }}>
      <p style={{ margin: '0', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.16em', color: '#BF2E2A' }}>APPENDIX C — PUBLIC OPINION</p>
      <h2 style={{ margin: '12px 0 22px', fontFamily: 'var(--serif)', fontWeight: '400', fontSize: 'clamp(36px, 4.6vw, 52px)', lineHeight: '1', letterSpacing: '-0.015em' }}>what everyone else thought.</h2>
      <div style={{ borderTop: '1px solid rgba(32, 32, 32, 0.12)' }}>
      {v.votes.map((vt, i) => (<Fragment key={i}>
      <div className="vrow"><span className="vname">{vt.name}</span><span className="vtrack"><span className={vt.fillCls} style={{ width: vt.pct + '%' }}></span></span><span className="vpct">{vt.label}</span></div>
      </Fragment>))}
      </div>
      <p style={{ margin: '18px 0 0', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '21px', color: '#202020' }}>the wisdom of crowds. historically a flawless system.</p>
      <p style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontSize: '11.5px', lineHeight: '1.6', color: '#6B6863' }}>{v.votesNote}</p>
      </section>
      </>)}

      </main>

      <footer style={{ marginTop: 'clamp(110px, 12vw, 160px)', padding: '26px clamp(20px, 5vw, 64px) 40px', borderTop: '1px solid rgba(32, 32, 32, 0.16)', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--mono)', fontSize: '11.5px', letterSpacing: '0.04em', color: '#6B6863' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px 32px' }}>
      <span style={{ color: '#202020' }}>© 2026 WHOWILLWINAIRACE.COM</span>
      <span>internal memo: <button type="button" className={v.redactCls} onClick={v.onRedact} aria-label={v.redactLabel}>we also pay for all five.</button></span>
      </div>
      <p style={{ margin: '6px 0 0', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '19px', letterSpacing: '0', color: '#202020' }}>no AI companies were harmed in the making of this website. their valuations remain intact.</p>
      <p style={{ margin: '0', fontSize: '10.5px' }}>terms and conditions apply. usage limits may vary. intelligence sold separately.</p>
      <p style={{ margin: '0', fontSize: '10.5px' }}>satire. every joke here is fiction, not a factual claim. not affiliated with any company named.</p>
      </footer>

      {v.showDim && (<><div className={v.dimClass} aria-hidden="true"></div></>)}
      <svg className="grain" aria-hidden="true"><rect width="100%" height="100%" fill="#000000" filter="url(#grain)"></rect></svg>
      </div>
    );
  }
}
