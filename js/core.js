/* =================================================================
   🧠 CORE DO SISTEMA (CÉREBRO) - VERSÃO 20/10 (NISHINO STANDARD)
   STATUS: HAPTIC FEEDBACK, ANTI-CRASH BOUNDARIES, AUDIO ENGINE OTIMIZADA
   ================================================================= */

window.Sfx = {
    ctx: null,
    init: () => { 
        window.AudioContext = window.AudioContext || window.webkitAudioContext; 
        if (!window.Sfx.ctx) window.Sfx.ctx = new AudioContext(); 
        if (window.Sfx.ctx.state === 'suspended') window.Sfx.ctx.resume();
    },
    play: (f, t, d, v = 0.1) => {
        if(!window.Sfx.ctx) return;
        try {
            const o = window.Sfx.ctx.createOscillator(); 
            const g = window.Sfx.ctx.createGain();
            o.type = t; 
            o.frequency.setValueAtTime(f, window.Sfx.ctx.currentTime); 
            g.gain.setValueAtTime(v, window.Sfx.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, window.Sfx.ctx.currentTime + d);
            o.connect(g); 
            g.connect(window.Sfx.ctx.destination); 
            o.start(); 
            o.stop(window.Sfx.ctx.currentTime + d);
        } catch(e) { console.warn("Sfx Error:", e); }
    },
    // Engine de Sons 20/10
    hover: () => window.Sfx.play(800, 'sine', 0.05, 0.04),
    click: () => window.Sfx.play(1000, 'sine', 0.1, 0.08),
    engine: (speedFreq) => window.Sfx.play(100 + speedFreq, 'sawtooth', 0.1, 0.05),
    impact: () => {
        window.Sfx.play(150, 'square', 0.2, 0.2);
        window.Sfx.play(100, 'sawtooth', 0.3, 0.1);
    },
    coin: () => {
        window.Sfx.play(988, 'sine', 0.1, 0.1);
        setTimeout(() => window.Sfx.play(1319, 'sine', 0.2, 0.1), 100);
    },
    // HAPTIC FEEDBACK (Vibração nativa do dispositivo)
    vibrate: (pattern) => {
        if(navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch(e){}
        }
    }
};

window.Gfx = {
    shake: 0,
    addShake: (val) => { window.Gfx.shake = Math.min(window.Gfx.shake + val, 30); },
    updateShake: (ctx) => {
        if(window.Gfx.shake > 0.5) {
            const dx = (Math.random() - 0.5) * window.Gfx.shake;
            const dy = (Math.random() - 0.5) * window.Gfx.shake;
            ctx.translate(dx, dy);
            window.Gfx.shake *= 0.85; // Decaimento suave
        } else {
            window.Gfx.shake = 0;
        }
    },
    // Partículas Globais
    particles: [],
    spawnParticle: (x, y, color, speed, life) => {
        window.Gfx.particles.push({x, y, vx: (Math.random()-0.5)*speed, vy: (Math.random()-0.5)*speed, color, life, maxLife: life});
    },
    renderParticles: (ctx) => {
        for(let i = window.Gfx.particles.length - 1; i >= 0; i--) {
            let p = window.Gfx.particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3 * (p.life/p.maxLife), 0, Math.PI*2); ctx.fill();
            if(p.life <= 0) window.Gfx.particles.splice(i, 1);
        }
        ctx.globalAlpha = 1.0;
    }
};

window.System = {
    activeGame: null,
    loopId: null,
    canvas: null,
    video: null,
    detector: null,

    loop: async () => {
        if(!window.System.activeGame) return;
        const w = window.System.canvas.width;
        const h = window.System.canvas.height;
        const ctx = window.System.canvas.getContext('2d', { alpha: false }); // Otimização de render

        let pose = null;
        if(window.System.detector && window.System.video.readyState === 4) {
            const p = await window.System.detector.estimatePoses(window.System.video, {flipHorizontal: true});
            if(p.length > 0) pose = p[0];
        }

        // Fundo base para evitar rastros
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // BLINDAGEM ANTI-CRASH 20/10
        ctx.save();
        try {
            window.Gfx.updateShake(ctx);
            const score = window.System.activeGame.logic.update(ctx, w, h, pose);
            window.Gfx.renderParticles(ctx);
            
            const hud = document.getElementById('hud-score');
            if(hud) hud.innerText = Number.isFinite(score) ? Math.floor(score) : 0;
        } catch (error) {
            console.error("Game Loop Crash Prevented!", error);
            ctx.fillStyle = "red";
            ctx.font = "20px Arial";
            ctx.fillText("ENGINE RECOVERING...", 50, 50);
        } finally {
            ctx.restore(); // Garante que o estado do canvas SEMPRE resete
        }
        
        window.System.loopId = requestAnimationFrame(window.System.loop);
    },

    stopGame: () => {
        if(window.System.loopId) cancelAnimationFrame(window.System.loopId);
        if(window.System.activeGame?.logic.cleanup) window.System.activeGame.logic.cleanup();
        window.System.activeGame = null;
        window.Gfx.particles = []; // Limpa partículas
    },

    gameOver: (s) => {
        window.System.stopGame();
        document.getElementById('final-score').innerText = s;
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('screen-over').classList.remove('hidden');
        window.Sfx.vibrate([200, 100, 200]); // Haptic Game Over
    }
};
