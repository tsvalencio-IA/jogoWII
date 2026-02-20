// =============================================================================
// 🏃‍♂️ THIAGUINHO SPRINT 100M: OLYMPIC ENGINE (NOVO!)
// ARQUITETO: SENIOR GAME ENGINE ARCHITECT
// STATUS: 3D TRACK, RUN MOMENTUM, JUMP DETECTION, HAPTIC HURDLES
// =============================================================================

if(!window.Games) window.Games = [];

window.Games.push({
    id: 'run',
    title: 'SPRINT 100M',
    logic: {
        trackLength: 10000,
        distance: 0,
        speed: 0,
        maxSpeed: 150,
        yPos: 0, // Altura do pulo
        yVel: 0,
        state: 'RUNNING', // RUNNING, JUMPING, FALLING
        lastWristsY: 0,
        hurdles: [],
        
        init: function() {
            this.distance = 0;
            this.speed = 0;
            this.yPos = 0;
            this.yVel = 0;
            this.state = 'RUNNING';
            this.hurdles = [];
            // Gerar barreiras a cada 1000 unidades
            for(let i=1000; i<this.trackLength; i+=1000) {
                this.hurdles.push({ z: i, hit: false });
            }
        },

        cleanup: function() {
            // Limpeza ao sair do jogo
        },

        update: function(ctx, w, h, pose) {
            // 1. LÓGICA DE MOVIMENTO (VISÃO COMPUTACIONAL)
            if(pose && pose.keypoints) {
                const kps = pose.keypoints;
                const nose = kps.find(k => k.name === 'nose');
                const lw = kps.find(k => k.name === 'left_wrist');
                const rw = kps.find(k => k.name === 'right_wrist');

                // Detecção de Corrida (Agitar braços/pulsos)
                if(lw && rw && lw.score > 0.3 && rw.score > 0.3) {
                    let avgY = (lw.y + rw.y) / 2;
                    let delta = Math.abs(avgY - this.lastWristsY);
                    if(delta > 15 && this.state !== 'JUMPING') {
                        this.speed += 8; // Acelera
                        window.Sfx.play(150 + this.speed, 'sine', 0.05, 0.02);
                    }
                    this.lastWristsY = avgY;
                }

                // Detecção de Pulo (Nariz sobe rapidamente)
                if(nose && nose.score > 0.5) {
                    if(!this.lastNoseY) this.lastNoseY = nose.y;
                    let noseSpeed = this.lastNoseY - nose.y; // Y inverte no canvas
                    if(noseSpeed > 30 && this.state === 'RUNNING') {
                        this.state = 'JUMPING';
                        this.yVel = 25; // Força do pulo
                        window.Sfx.play(600, 'square', 0.2, 0.1);
                        window.Sfx.vibrate(50);
                    }
                    this.lastNoseY = nose.y;
                }
            }

            // Física e Atrito
            if(this.state === 'RUNNING') {
                this.speed *= 0.95; // Atrito da pista
            }
            if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;
            if(this.speed < 0) this.speed = 0;
            
            this.distance += this.speed;

            // Gravidade do Pulo
            if(this.state === 'JUMPING') {
                this.yPos += this.yVel;
                this.yVel -= 1.5; // Gravidade
                if(this.yPos <= 0) {
                    this.yPos = 0;
                    this.state = 'RUNNING';
                    window.Gfx.addShake(5); // Impacto no chão
                    window.Sfx.play(200, 'sawtooth', 0.1, 0.1);
                }
            }

            // Fim de jogo
            if(this.distance >= this.trackLength) {
                window.System.gameOver(Math.floor(this.trackLength));
                return this.trackLength;
            }

            // Colisão com Barreiras
            this.hurdles.forEach(h => {
                if(!h.hit && this.distance > h.z - 50 && this.distance < h.z + 50) {
                    if(this.yPos < 60) { // Bateu!
                        h.hit = true;
                        this.speed *= 0.3; // Perde 70% da velocidade
                        window.Gfx.addShake(15);
                        window.Sfx.vibrate([100, 50, 100]);
                        window.Sfx.play(100, 'sawtooth', 0.3, 0.2);
                        window.Gfx.spawnParticle(w/2, h/2, "#fff", 15, 20); // Poeria
                    }
                }
            });

            // 2. RENDERIZAÇÃO 3D (PSEUDO-3D RASTERIZATION)
            this.render3DTrack(ctx, w, h);

            return this.distance;
        },

        render3DTrack: function(ctx, w, h) {
            // Céu e Grama
            ctx.fillStyle = "#3498db"; ctx.fillRect(0, 0, w, h/2);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(0, h/2, w, h/2);

            const camD = 0.84; 
            const trackWidth = 2000;
            const segments = 200;
            
            // Desenha Pista
            for(let i = 0; i < segments; i++) {
                let z = i * 50;
                let relZ = z - (this.distance % 50);
                if(relZ < 1) continue;

                let scale = camD / (relZ / 100);
                let py = h/2 + (50 * scale);
                let pxWidth = trackWidth * scale;

                let isDark = Math.floor((this.distance + relZ) / 100) % 2 === 0;
                ctx.fillStyle = isDark ? "#c0392b" : "#e74c3c"; // Vermelho Pista Atlética

                // Proteção matemática
                if(Number.isFinite(py) && Number.isFinite(pxWidth)) {
                    ctx.fillRect(w/2 - pxWidth/2, py, pxWidth, 50 * scale);
                    
                    // Linhas brancas das raias
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(w/2 - pxWidth/4, py, pxWidth/40, 50 * scale);
                    ctx.fillRect(w/2 + pxWidth/4, py, pxWidth/40, 50 * scale);
                }
            }

            // Desenha Barreiras (Hurdles)
            this.hurdles.forEach(hurdle => {
                let relZ = hurdle.z - this.distance;
                if(relZ > 0 && relZ < 3000) {
                    let scale = camD / (relZ / 100);
                    let py = h/2 + (50 * scale);
                    let pw = trackWidth * scale;
                    let ph = 150 * scale;

                    if(hurdle.hit) {
                        ctx.globalAlpha = 0.5; // Barreira caída
                        ph = 20 * scale; 
                    }

                    ctx.fillStyle = "#2c3e50";
                    ctx.fillRect(w/2 - pw/2, py - ph, pw, ph);
                    // Faixa branca
                    ctx.fillStyle = "#ecf0f1";
                    ctx.fillRect(w/2 - pw/2, py - ph, pw, ph/4);
                    ctx.globalAlpha = 1.0;
                }
            });

            // Desenha Jogador (Falso 3D)
            const pScale = 1 + (this.yPos / 200);
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.arc(w/2, h - 100 - this.yPos, 40 * pScale, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "#000"; ctx.stroke();
            
            // Sombra
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.ellipse(w/2, h - 100, 40, 10, 0, 0, Math.PI*2);
            ctx.fill();
            
            // Efeito de velocidade (Wind lines)
            if(this.speed > 80) {
                ctx.strokeStyle = "rgba(255,255,255,0.5)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                for(let i=0; i<5; i++) {
                    let lx = w/2 + (Math.random()-0.5)*400;
                    let ly = h/2 + Math.random()*h/2;
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx, ly + 50 + Math.random()*100);
                }
                ctx.stroke();
            }
            
            // HUD
            ctx.fillStyle = "white"; ctx.font = "bold 30px 'Russo One'";
            ctx.fillText(`DIST: ${Math.floor(this.distance/100)}M / 100M`, 20, 40);
            ctx.fillText(`VEL: ${Math.floor(this.speed)} KM/H`, 20, 80);
        }
    }
});
