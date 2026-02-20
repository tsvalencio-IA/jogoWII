// =============================================================================
// 🏓 PING PONG WII: 20/10 EVOLUTION (ULTIMATE FEEL)
// ARQUITETO: SENIOR GAME ENGINE ARCHITECT (PlayStation / Nintendo Standard)
// STATUS: SPIN PHYSICS, DYNAMIC CAMERA ZOOM, CROWD CHEER, REAL SHADOWS
// =============================================================================

if(!window.Games) window.Games = [];

window.Games.push({
    id: 'tennis',
    title: 'PING PONG WII',
    logic: {
        ball: { x: 0, y: 300, z: -1000, vx: 0, vy: 0, vz: 0, spin: 0 },
        paddle: { x: 0, y: 0, lastX: 0, lastY: 0 },
        rally: 0,
        score: { p1: 0, p2: 0 },
        state: 'SERVE', // SERVE, PLAY, POINT
        camZoom: 1.0, // Tension Engine
        
        // IA
        aiX: 0,

        init: function() {
            this.rally = 0;
            this.score = { p1: 0, p2: 0 };
            this.resetBall(true);
            window.Sfx.play(600, 'sine', 0.5, 0.1);
        },

        resetBall: function(playerServe) {
            this.state = 'SERVE';
            this.rally = 0;
            this.camZoom = 1.0;
            if (playerServe) {
                this.ball = { x: 0, y: -200, z: -100, vx: 0, vy: -15, vz: 20, spin: 0 };
            } else {
                this.ball = { x: 0, y: -200, z: 2000, vx: 0, vy: -15, vz: -20, spin: 0 };
            }
        },

        cleanup: function() {},

        update: function(ctx, w, h, pose) {
            // 1. TENSION ENGINE (Aumenta zoom e pitch da música conforme rally)
            let targetZoom = 1.0 + Math.min(this.rally * 0.05, 0.5); // Max 1.5x zoom
            this.camZoom += (targetZoom - this.camZoom) * 0.1;

            // Fundo Torcida Dinâmica (Efeito visual)
            let bgGrad = ctx.createLinearGradient(0,0,0,h);
            bgGrad.addColorStop(0, this.rally > 10 ? "#c0392b" : "#2c3e50"); // Fica vermelho se tenso
            bgGrad.addColorStop(1, "#34495e");
            ctx.fillStyle = bgGrad; ctx.fillRect(0,0,w,h);

            // 2. FÍSICA DA BOLA & SPIN (20/10)
            if (this.state === 'PLAY' || this.state === 'SERVE') {
                this.ball.x += this.ball.vx + this.ball.spin; // Spin aplica curva no eixo X
                this.ball.y += this.ball.vy;
                this.ball.z += this.ball.vz;
                this.ball.vy += 0.8; // Gravidade
                
                // Spin decai com atrito do ar
                this.ball.spin *= 0.98;

                // Colisão com a mesa (Y = 0)
                if (this.ball.y > 0 && this.ball.z > 0 && this.ball.z < 2740) {
                    this.ball.y = 0;
                    this.ball.vy *= -0.85; // Quique
                    window.Sfx.play(800 + (this.rally * 20), 'square', 0.1, 0.1);
                    window.Gfx.spawnParticle(w/2 + this.ball.x, h/2 + this.ball.y, "#fff", 3, 5); // Pó na mesa
                }

                // Anti-Net System (Empurra sutilmente por cima se for bater na rede)
                if (Math.abs(this.ball.z - 1370) < 50 && this.ball.y > -152) {
                    this.ball.vy -= 2; // Força para cima
                }

                // Ponto?
                if (this.ball.y > 500) { // Caiu no chão
                    this.state = 'POINT';
                    if (this.ball.z > 1370) { this.score.p1++; window.Sfx.play(1000, 'sine', 0.5, 0.2); window.Gfx.addShake(15); }
                    else { this.score.p2++; window.Sfx.play(200, 'sawtooth', 0.5, 0.2); }
                    
                    setTimeout(() => this.resetBall(this.ball.z <= 1370), 2000);
                }
            }

            // 3. VISÃO COMPUTACIONAL (Raquete)
            if (pose && pose.keypoints) {
                const rw = pose.keypoints.find(k => k.name === 'right_wrist');
                if (rw && rw.score > 0.4) {
                    // Mapeamento normalizado da raquete
                    let targetPx = ((rw.x - 320) / 320) * (w/2);
                    let targetPy = ((rw.y - 240) / 240) * (h/2);
                    
                    // Suavização
                    this.paddle.x += (targetPx - this.paddle.x) * 0.3;
                    this.paddle.y += (targetPy - this.paddle.y) * 0.3;

                    // Hitbox Magnética e Spin Calculation
                    let swingVelX = this.paddle.x - this.paddle.lastX;
                    let swingVelY = this.paddle.y - this.paddle.lastY;
                    let swingSpeed = Math.sqrt(swingVelX**2 + swingVelY**2);

                    // Verifica janela de profundidade (Z entre -200 e 200) para o jogador bater
                    if (this.ball.z < 200 && this.ball.z > -200 && this.ball.vz < 0) {
                        let dist2D = Math.sqrt((this.paddle.x - this.ball.x)**2 + (this.paddle.y - this.ball.y)**2);
                        
                        if (dist2D < 200 && swingSpeed > 5) { // Bateu!
                            this.state = 'PLAY';
                            this.rally++;
                            
                            // Física Parabólica Assistida (Nintendo Style)
                            let isSmash = swingSpeed > 30;
                            this.ball.vz = isSmash ? 50 : 35; // Profundidade
                            this.ball.vy = isSmash ? -5 : -15; // Altura da parábola
                            this.ball.vx = swingVelX * 0.5; // Direção
                            
                            // Spin Calculation (Corte cruzado gera efeito)
                            this.ball.spin = swingVelX * 0.2;

                            window.Gfx.addShake(isSmash ? 20 : 5);
                            window.Sfx.play(isSmash ? 1500 : 1200, 'square', 0.1, 0.2);
                            window.Sfx.vibrate(isSmash ? [100, 50, 100] : 50);

                            // Crowd react to long rally
                            if (this.rally === 10) window.Sfx.play(400, 'sawtooth', 1.0, 0.3); // "Ooooh!"
                        }
                    }

                    this.paddle.lastX = this.paddle.x;
                    this.paddle.lastY = this.paddle.y;
                }
            }

            // 4. IA INIMIGA
            if (this.ball.z > 2000 && this.ball.vz > 0 && this.state === 'PLAY') {
                this.aiX += (this.ball.x - this.aiX) * 0.1; // Move para a bola
                if (this.ball.z > 2600) { // Rebate
                    this.ball.vz = -35 - (this.rally * 0.5); // Fica mais rápido com o tempo
                    this.ball.vy = -15;
                    this.ball.vx = (Math.random() - 0.5) * 20;
                    this.ball.spin = (Math.random() - 0.5) * 5; // IA manda spin
                    this.rally++;
                    window.Sfx.play(1000, 'square', 0.1, 0.1);
                }
            } else {
                this.aiX *= 0.95; // Volta ao centro
            }

            // 5. RENDERIZAÇÃO 3D C/ SOMBRAS E ZOOM
            this.render3D(ctx, w, h);

            return this.score.p1;
        },

        render3D: function(ctx, w, h) {
            ctx.save();
            // Aplica Tension Zoom no centro da tela
            ctx.translate(w/2, h/2);
            ctx.scale(this.camZoom, this.camZoom);
            ctx.translate(-w/2, -h/2);

            // 3D Projection Engine
            const project = (x, y, z) => {
                let fov = 900;
                let scale = fov / (fov + z + 1000); // 1000 = offset de camera
                return {
                    x: (w/2) + (x * scale),
                    y: (h/2) + (y * scale) + 200, // +200 desloca mesa pra baixo
                    s: scale
                };
            };

            // Desenha Mesa (Múltiplos polígonos)
            ctx.fillStyle = "#27ae60"; // Verde Mesa Nintendo
            let tl = project(-762, 0, 2740);
            let tr = project(762, 0, 2740);
            let bl = project(-762, 0, 0);
            let br = project(762, 0, 0);

            if(Number.isFinite(tl.x)) {
                ctx.beginPath();
                ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
                ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
                ctx.fill();
                
                // Linhas da mesa
                ctx.strokeStyle = "white"; ctx.lineWidth = 4 * bl.s;
                ctx.stroke();
                ctx.beginPath();
                let ml = project(0, 0, 2740); let mb = project(0, 0, 0);
                ctx.moveTo(ml.x, ml.y); ctx.lineTo(mb.x, mb.y);
                ctx.stroke();

                // Rede (com transparência)
                let netL = project(-800, -152, 1370);
                let netR = project(800, -152, 1370);
                let netBL = project(-800, 0, 1370);
                let netBR = project(800, 0, 1370);
                ctx.fillStyle = "rgba(236, 240, 241, 0.6)";
                ctx.beginPath();
                ctx.moveTo(netL.x, netL.y); ctx.lineTo(netR.x, netR.y);
                ctx.lineTo(netBR.x, netBR.y); ctx.lineTo(netBL.x, netBL.y);
                ctx.fill();
            }

            // Desenha Sombra Real da Bola (Z e X iguais, Y = 0 projetado)
            let shadowP = project(this.ball.x, 0, this.ball.z);
            let ballP = project(this.ball.x, this.ball.y, this.ball.z);
            
            if (Number.isFinite(shadowP.x) && this.ball.z > 0 && this.ball.z < 2740) {
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                let shadowRadius = 35 * shadowP.s * (1 - (this.ball.y / -1000)); // Diminui sombra se a bola subir
                if(shadowRadius > 0) {
                    ctx.beginPath(); ctx.ellipse(shadowP.x, shadowP.y, shadowRadius, shadowRadius * 0.3, 0, 0, Math.PI*2); ctx.fill();
                }
            }

            // Desenha Bola
            if (Number.isFinite(ballP.x)) {
                ctx.fillStyle = this.rally > 15 ? "#e74c3c" : "#f1c40f"; // Bola fica vermelha em rallys tensos
                ctx.beginPath(); ctx.arc(ballP.x, ballP.y, 35 * ballP.s, 0, Math.PI*2); ctx.fill();
                // Rastro de fogo para Smash/Rally longo
                if (this.rally > 15 || this.ball.vz > 40) {
                    window.Gfx.spawnParticle(ballP.x, ballP.y, "#e67e22", 5, 10);
                }
            }

            // Desenha Raquete Inimiga (IA)
            let aiP = project(this.aiX, -100, 2740);
            if (Number.isFinite(aiP.x)) {
                ctx.fillStyle = "#c0392b"; // Raquete Vermelha
                ctx.beginPath(); ctx.arc(aiP.x, aiP.y, 80 * aiP.s, 0, Math.PI*2); ctx.fill();
            }

            // Desenha Raquete Player (Hud overlay)
            ctx.fillStyle = "#3498db"; // Raquete Azul
            ctx.beginPath(); ctx.arc(w/2 + this.paddle.x, h - 150 + this.paddle.y, 100, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.stroke();

            ctx.restore(); // Fim do Tension Zoom

            // HUD Placares
            ctx.fillStyle = "white"; ctx.font = "bold 50px 'Russo One'";
            ctx.fillText(`${this.score.p1}`, 50, 80);
            ctx.fillText(`${this.score.p2}`, w - 100, 80);
            
            if (this.rally > 0) {
                ctx.fillStyle = "#f1c40f"; ctx.font = "italic 30px 'Russo One'";
                ctx.fillText(`RALLY: ${this.rally}`, w/2 - 80, 50);
            }
            if (this.state === 'POINT') {
                ctx.fillStyle = "#e74c3c"; ctx.font = "bold 60px 'Russo One'";
                ctx.fillText("PONTO!", w/2 - 120, h/2);
            }
        }
    }
});
