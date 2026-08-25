/* ─────────────────────────────────────────────
   ГЛАВА I · ПЕРЕВАЛ · ТехноШаман
   Появление блоков, прогресс чтения, плеер на два трека.
   ───────────────────────────────────────────── */

/* ── появление блоков ── */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.rv').forEach((el) => io.observe(el));

/* ── полоса прогресса ── */
const prog = document.getElementById('prog');
addEventListener('scroll', () => {
  const h = document.documentElement.scrollHeight - innerHeight;
  prog.style.width = (scrollY / h * 100) + '%';
}, { passive: true });


/* ═══════════════════════════════════════════════
   ТРЕК 02 — генеративный эмбиент с этно-битом.
   Ничего не грузится: всё синтезируется в браузере.
   ═══════════════════════════════════════════════ */
const Generative = (() => {
  let ctx, master, wet, dry, timer = null, step = 0, nextT = 0, bar = 0, built = false;
  const BPM = 72, SIXTEENTH = 60 / BPM / 4;

  function noiseBuf(sec) {
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let l0 = 0, l1 = 0, l2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      l0 = 0.99765 * l0 + w * 0.0990460;
      l1 = 0.96300 * l1 + w * 0.2965164;
      l2 = 0.57000 * l2 + w * 1.0526913;
      d[i] = (l0 + l1 + l2 + w * 0.1848) * 0.22;
    }
    return b;
  }

  function impulse(sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }

  /* дрон: пять голосов, каждый продублирован с расстройкой */
  function drone() {
    [41.20, 61.74, 82.41, 92.50, 123.47].forEach((f, i) => {
      [0, 1].forEach((k) => {
        const o = ctx.createOscillator();
        o.type = i < 2 ? 'sawtooth' : 'triangle';
        o.frequency.value = f * (k ? 1.004 : 0.997);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 150 + i * 40; lp.Q.value = 1.2;
        const g = ctx.createGain();
        g.gain.value = (i < 2 ? 0.085 : 0.045) * (k ? 0.7 : 1);
        o.connect(lp); lp.connect(g); g.connect(dry); g.connect(wet);
        const lfo = ctx.createOscillator(), la = ctx.createGain();
        lfo.frequency.value = 0.017 + i * 0.007 + k * 0.004;
        la.gain.value = i < 2 ? 0.04 : 0.022;
        lfo.connect(la); la.connect(g.gain);
        lfo.start(); o.start();
      });
    });

    /* шумовой полог, медленно ползущий по частоте */
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(8); src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.05;
    src.connect(bp); bp.connect(g); g.connect(wet);
    const sw = ctx.createOscillator(), sa = ctx.createGain();
    sw.frequency.value = 0.023; sa.gain.value = 190;
    sw.connect(sa); sa.connect(bp.frequency);
    sw.start(); src.start();
  }

  /* ── голоса ударных ── */
  function doum(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(128, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.14);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    o.connect(g); g.connect(dry); g.connect(wet);
    o.start(t); o.stop(t + 0.5);

    const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.1);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(v * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(lp); lp.connect(ng); ng.connect(dry);
    s.start(t); s.stop(t + 0.1);
  }

  function tek(t, v) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2100; bp.Q.value = 3.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    s.connect(bp); bp.connect(g); g.connect(dry); g.connect(wet);
    s.start(t); s.stop(t + 0.2);
  }

  function shaker(t, v) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.15);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    s.connect(hp); hp.connect(g); g.connect(dry);
    s.start(t); s.stop(t + 0.15);
  }

  function bell(t) {
    [523.25, 1445, 1979].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05 / (i + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
      o.connect(g); g.connect(wet);
      o.start(t); o.stop(t + 6);
    });
  }

  const DOUM = { 0: 1, 6: 0.72, 10: 0.9 };
  const TEK  = { 3: 0.34, 8: 0.4, 11: 0.24, 14: 0.38 };

  function tick() {
    while (nextT < ctx.currentTime + 0.25) {
      const t = nextT + (Math.random() - 0.5) * 0.006;   /* лёгкая нечёткость сетки */
      if (DOUM[step]) doum(t, DOUM[step] * 0.55);
      if (TEK[step])  tek(t, TEK[step] * 0.5);
      if (step % 2 === 0) shaker(t, step % 4 === 0 ? 0.07 : 0.045);
      else if (Math.random() < 0.35) shaker(t, 0.03);
      if (step === 0) { bar++; if (bar % 8 === 1) bell(t); }
      step = (step + 1) % 16;
      nextT += SIXTEENTH;
    }
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    const cut = ctx.createBiquadFilter();
    cut.type = 'lowpass'; cut.frequency.value = 5200;
    master.connect(cut); cut.connect(ctx.destination);

    dry = ctx.createGain(); dry.gain.value = 0.85; dry.connect(master);
    const conv = ctx.createConvolver(); conv.buffer = impulse(5.5, 3.2);
    wet = ctx.createGain(); wet.gain.value = 0.5;
    wet.connect(conv); conv.connect(master);

    drone();
    nextT = ctx.currentTime + 0.15;
    timer = setInterval(tick, 60);
    built = true;
  }

  /* целевой уровень генератива. 0.62 — исходная настройка на слух,
     она соответствует положению ползунка громкости на 75 */
  let target = 0.62;

  return {
    /* v — доля 0…1 с ползунка; 0.75 обязано давать прежние 0.62 */
    setLevel(v) {
      target = Math.max(0.0001, v * (0.62 / 0.75));
      if (!built || !timer) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(target, t + 0.12);
    },
    fadeIn(sec) {
      if (!built) build();
      if (ctx.state === 'suspended') ctx.resume();
      if (!timer) { nextT = ctx.currentTime + 0.15; timer = setInterval(tick, 60); }
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(target, t + sec);
    },
    fadeOut(sec) {
      if (!built) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + sec);
      setTimeout(() => { clearInterval(timer); timer = null; }, sec * 1000 + 100);
    }
  };
})();


/* ═══════════════════════════════════════════════
   ПЛЕЕР
   01 — The Machine’s Lullaby (файл)
   02 — De Trave (файл)
   03 — Inferno (генератив)
   ═══════════════════════════════════════════════ */
const Player = (() => {
  const tape = document.getElementById('tape');
  const panel = document.getElementById('player');
  const nameEl = panel.querySelector('.tname');
  const numEl = panel.querySelector('.tnum');
  const playBtn = document.getElementById('play');
  const volEl = document.getElementById('vol');
  const bars = panel.querySelectorAll('#eq i');
  const tie = document.getElementById('tie');

  const TRACKS = [
    { title: 'The Machine’s Lullaby', kind: 'file', src: 'assets/audio/machines-lullaby.mp3' },
    { title: 'De Trave', kind: 'file', src: 'assets/audio/de-trave.mp3' },
    /* tie — у трека есть ход на сторону: пока он играет, показываем ссылку */
    { title: 'Her Soul', kind: 'file', src: 'assets/audio/her-soul.mp3', tie: true },
    { title: 'Inferno', kind: 'gen' }
  ];
  const FADE = 1.4;         /* секунды перекрёстного затухания */

  let idx = 0, playing = false, eqTimer = null, rampTimer = null;
  let vol = 0.75;           /* доля 0…1, синхронна с ползунком громкости */
  let blocked = false;      /* браузер отказал в автозапуске, ждём действия */

  function label() {
    const state = playing ? 'играет' : (blocked ? 'нажмите ▶' : 'пауза');
    nameEl.textContent = TRACKS[idx].title;
    numEl.textContent = String(idx + 1).padStart(2, '0') + ' / ' +
      String(TRACKS.length).padStart(2, '0') + ' · ' + state;
    panel.classList.toggle('on', playing);
    /* ссылка живёт ровно столько, сколько звучит её трек */
    if (tie) tie.classList.toggle('show', playing && !!TRACKS[idx].tie);
    const hint = playing ? 'Выключить звук' : 'Включить звук';
    playBtn.title = hint;
    playBtn.setAttribute('aria-label', hint);
    playBtn.setAttribute('aria-pressed', String(playing));
  }

  /* плавное изменение громкости у <audio> */
  function rampTape(to, sec, done) {
    clearInterval(rampTimer);
    const from = tape.volume, steps = Math.max(1, Math.round(sec * 40));
    let i = 0;
    rampTimer = setInterval(() => {
      i++;
      tape.volume = Math.min(1, Math.max(0, from + (to - from) * (i / steps)));
      if (i >= steps) { clearInterval(rampTimer); if (done) done(); }
    }, sec * 1000 / steps);
  }

  /* Файловых треков два, <audio> один — перед запуском подставляем нужный.
     Сравниваем по абсолютному адресу: в tape.src браузер держит развёрнутый
     URL, и прямое сравнение с относительным путём всегда давало бы промах,
     то есть перезагрузку потока на каждом нажатии play */
  function useFile(track) {
    const want = new URL(track.src, location.href).href;
    if (tape.src === want) return;
    tape.src = track.src;
    tape.load();
  }

  function startCurrent(fade) {
    if (TRACKS[idx].kind === 'file') {
      useFile(TRACKS[idx]);
      tape.muted = false;   /* мог остаться от беззвучного прогрева */
      tape.volume = 0;
      tape.play().catch(() => {});
      rampTape(vol, fade);
    } else {
      Generative.fadeIn(fade);
    }
  }

  /* ползунок: генератив помнит уровень и в паузе, файлу правим на лету */
  function applyVolume() {
    Generative.setLevel(vol);
    if (!playing || TRACKS[idx].kind !== 'file') return;
    clearInterval(rampTimer);
    tape.volume = vol;
  }

  function stopCurrent(fade, hard) {
    if (TRACKS[idx].kind === 'file') {
      rampTape(0, fade, () => { if (hard) tape.pause(); });
    } else {
      Generative.fadeOut(fade);
    }
  }

  function eq(on) {
    clearInterval(eqTimer);
    if (on) {
      eqTimer = setInterval(() => {
        bars.forEach((b) => { b.style.height = (2 + Math.random() * 12) + 'px'; });
      }, 110);
    } else {
      bars.forEach((b) => { b.style.height = '3px'; });
    }
  }

  /* Беззвучный автозапуск разрешён всегда, поэтому трек сразу заводится
     с muted: поток грузится и крутится вхолостую. Дальше остаётся снять
     немоту — и звук появляется мгновенно, без паузы на подкачку.

     ACT  — события, дающие пользовательскую активацию по спецификации.
            На них снятие немоты почти наверняка пройдёт.
     SOFT — движение мыши, колесо, прокрутка. Активацией НЕ считаются,
            и Chrome прихлопнет воспроизведение, если снять немоту на них.
            Поэтому здесь одна тихая проба: интерфейс не трогаем, ждём
            вердикта, и при отказе больше не дёргаемся — иначе mousemove
            сыпал бы попытками сотнями и панель мигала бы эквалайзером.
            В Firefox и в Chrome с высоким Media Engagement Index проба
            проходит, и звук включается буквально от движения курсора. */
  const ACT  = ['pointerdown', 'pointerup', 'mousedown', 'touchend',
                'keydown', 'click'];
  const SOFT = ['mousemove', 'pointermove', 'touchmove', 'wheel', 'scroll'];
  const WAKE = ACT.concat(SOFT);

  /* звук пошёл */
  function commit() {
    blocked = false;
    playing = true;
    eq(true);
    label();
    rampTape(vol, FADE);
  }

  /* Беззвучный прогрев. Muted-автозапуск разрешён всегда, поэтому поток
     грузится и крутится вхолостую — вход по клику выходит мгновенным,
     без паузы на подкачку пяти мегабайт */
  function warm() {
    blocked = true;
    label();
    tape.muted = true;
    tape.play().catch(() => {});
  }

  /* браузер прихлопнул воспроизведение — возвращаемся в прогрев */
  function relapse() {
    playing = false;
    eq(false);
    warm();
    arm();
  }

  /* loud — сразу рисовать «играет» (для настоящих кликов) либо ждать
     проверки молча (для движения). onOk только при подтверждённом звуке. */
  function unmute(loud, onOk) {
    tape.muted = false;
    if (loud) commit();
    setTimeout(() => {
      if (tape.paused) { relapse(); return; }
      if (!loud) commit();
      if (onOk) onOk();
    }, 300);
  }

  let armed = false, softSpent = false;

  function arm() {
    if (armed) return;      /* без этого откат подпишется поверх подписки */
    armed = true;

    const off = () => {
      armed = false;
      WAKE.forEach((ev) => window.removeEventListener(ev, kick));
    };

    const kick = (e) => {
      if (playing) { off(); return; }
      /* ткнули в сам плеер — сработает его собственный обработчик,
         иначе pointerdown и click дадут двойное переключение */
      if (e && e.target && panel.contains(e.target)) { off(); return; }

      const soft = SOFT.indexOf(e.type) !== -1;
      if (soft) {
        if (softSpent) return;
        softSpent = true;   /* проба одна: отказал — значит отказал */
        SOFT.forEach((ev) => window.removeEventListener(ev, kick));
      }

      /* поток уже греется беззвучно — остаётся снять немоту */
      if (!tape.paused) { unmute(!soft, off); return; }

      tape.muted = false;
      tape.volume = 0;
      const p = tape.play();
      if (!p || typeof p.then !== 'function') { unmute(!soft, off); return; }
      p.then(() => unmute(!soft, off)).catch(() => { tape.muted = true; });
    };

    WAKE.forEach((ev) => window.addEventListener(ev, kick, { passive: true }));
  }

  const api = {
    toggle() {
      blocked = false;
      playing = !playing;
      if (playing) startCurrent(FADE); else stopCurrent(FADE, true);
      eq(playing);
      label();
    },
    go(delta) {
      const was = playing;
      if (was) stopCurrent(FADE, true);
      idx = (idx + delta + TRACKS.length) % TRACKS.length;
      if (was) setTimeout(() => startCurrent(FADE), FADE * 500);
      label();
    },
    setVolume(pct) {
      vol = Math.min(1, Math.max(0, pct / 100));
      applyVolume();
    },
    /* Вход через ворота. Клик по ним даёт пользовательскую активацию,
       поэтому здесь запуск гарантирован и пробовать движение не нужно.
       arm() тут не вызывается: ворота перекрывают экран, и слушатели на
       окне поймали бы всплывший клик, дав двойное переключение. */
    enter() {
      if (playing) return;
      /* поток уже греется беззвучно — остаётся снять немоту */
      if (!tape.paused) { unmute(true); return; }
      tape.muted = false;
      tape.volume = 0;
      const p = tape.play();
      if (!p || typeof p.then !== 'function') { unmute(true); return; }
      p.then(() => unmute(true)).catch(() => {
        tape.muted = true;
        blocked = true;
        label();
        arm();          /* патологический случай: активации не хватило */
      });
    },
    init() {
      volEl.value = String(Math.round(vol * 100));
      Generative.setLevel(vol);
      label();
      eq(false);

      tape.volume = 0;
      /* Попытки автозапуска со звуком здесь нет намеренно. Ворота Burn me
         существуют, чтобы вход был осознанным действием; если браузер
         доверяет домену и трек заиграл бы сам, музыка шла бы из-за
         закрытых ворот и обесценивала бы клик. Поэтому только беззвучный
         прогрев, а звук начинается ровно в момент входа */
      warm();
    }
  };
  return api;
})();

document.getElementById('play').addEventListener('click', () => Player.toggle());
document.getElementById('next').addEventListener('click', () => Player.go(1));
document.getElementById('prev').addEventListener('click', () => Player.go(-1));
document.getElementById('vol').addEventListener('input', (e) => Player.setVolume(e.target.value));
Player.init();

/* ═══════════════════════════════════════════════
   Ворота входа · Burn me
   Клик даёт пользовательскую активацию, поэтому звук отсюда включается
   гарантированно. Слушатель один и висит на самих воротах: клик по кнопке
   до него всплывёт, а нажатие Enter на кнопке браузер тоже превращает
   в click — значит клавиатура работает без отдельной ветки.
   ═══════════════════════════════════════════════ */
(() => {
  const gate = document.getElementById('gate');
  const burn = document.getElementById('burn');
  if (!gate || !burn) return;

  const root = document.documentElement;
  root.classList.add('gated');       /* пока ворота закрыты, страница не скроллится */
  let opened = false;

  gate.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    Player.enter();
    gate.classList.add('gone');
    root.classList.remove('gated');
    /* убираем из дерева после затухания, чтобы не ловил фокус и клики */
    setTimeout(() => gate.remove(), 1000);
  });

  burn.focus({ preventScroll: true });
})();
