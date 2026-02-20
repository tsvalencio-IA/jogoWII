// =============================================================================
// 🏎️ KART LEGENDS: 20/10 EVOLUTION
// ARQUITETO: SENIOR GAME ENGINE ARCHITECT
// STATUS: SLIPSTREAM (VÁCUO), DRIFT SPARKS, NITRO EFFECT, ULTRA SMOOTH RENDERING
// =============================================================================

if(!window.Games) window.Games = [];

window.Games.push({
    id: 'kart',
    title: 'KART LEGENDS',
    logic: {
        distance: 0,
        speed: 0,
        x: 0, // Posição lateral (-2 esq, 2 dir)
        nitroFrames: 0,
        nitroActive: false,
        driftSparks: 0, // Acúmulo de drift
        
        // IA
        aiDistance: 50,
        aiX: 0,
        
        init: function() {
            this.distance = 0;
            this.speed = 0;
            this.x = 0;
            this.nitroFrames = 0;
            this.nitroActive = false;
            this.driftSparks = 0;
            this.aiDistance = 50;
            this.aiX = 0;
            window.Sfx.play(400, 'sine', 0.5, 0.2); // Start motor
        },

        cleanup: function() {},

        update: function(ctx, w, h, pose) {
            let maxSpeed = this.nitroActive ? 250 : 150;
            let steerX = 0;

            // 1. VISÃO COMPUTACIONAL & CONTROLES
            if (pose && pose.keypoints) {
                const kps = pose.keypoints;
                const lw = kps.find(k => k.name === 'left_wrist');
                const rw = kps.find(k => k.name === 'right_wrist');
                const nose = kps.find(k => k.name === 'nose');

                if (lw && rw && lw.score > 0.4 && rw.score > 0.4) {
                    // Volante (Atan2 para ângulo real)
                    let dx = rw.x - lw.x;
                    let dy = rw.y - lw.y;
                    let angle = Math.atan2(dy, dx);
                    steerX = angle * 2.5; 
                    
                    this.x += steerX * (this.speed / maxSpeed) * 0.1;
                    
                    // Aceleração Base
                    this.speed += 2; 

                    // Mecânica de Drift (20/10)
                    if(Math.abs(steerX) > 0.6 && this.speed > 80) {
                        this.driftSparks = Math.min(this.driftSparks + 1, 100);
                        if(Math.random() > 0.5) {
                            let color = this.driftSparks > 70 ? "#3498db" : "#f1c40f"; // Amarelo -> Azul
                            window.Gfx.spawnParticle(w/2 + (steerX > 0 ? -50 : 50), h-80, color, 10, 15);
                        }
                    } else if (this.driftSparks > 0) {
                        // Soltou o Drift = Mini Boost
                        if(this.driftSparks > 70) {
                            this.speed += 50;
                            window.Gfx.addShake(10);
                            window.Sfx.play(600, 'square', 0.3, 0.1);
                        }
                        this.driftSparks = 0;
                    }

                    // Detecção de Nitro (Mãos acima do nariz)
                    if (nose && lw.y < nose.y && rw.y < nose.y) {
                        this.nitroFrames++;
                        if (this.nitroFrames > 25 && !this.nitroActive) {
                            this.nitroActive = true;
                            window.Gfx.addShake(20);
                            window.Sfx.play(800, 'sawtooth', 1.0, 0.2); // Explosão de nitro
                            window.Sfx.vibrate([100, 50, 200]);
                        }
                    } else {
                        this.nitroFrames = 0;
                        this.nitroActive = false;
                    }
                } else {
                    this.speed *= 0.98; // Desacelera sem mãos
                    this.driftSparks = 0;
                }
            }

            // 2. FÍSICA & SLIPSTREAM (VÁCUO)
            // Lógica do Off-road
            if (Math.abs(this.x) > 1.45) {
                this.speed *= 0.90; // Areia/Grama reduz velocidade brutalmente
                window.Gfx.addShake(3);
                window.Gfx.spawnParticle(w/2, h-50, "#bdc3c7", 8, 10);
                window.Sfx.vibrate(20);
            }

            // Slipstream (Atrás da IA)
            let distToAi = this.aiDistance - this.distance;
            if (distToAi > 10 && distToAi < 300 && Math.abs(this.x - this.aiX) < 0.3) {
                this.speed += 3; // Puxado pelo Vácuo
                ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; // Efeito de vento
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(w/2 - 100, h/2); ctx.lineTo(w/2 - 150, h);
                ctx.moveTo(w/2 + 100, h/2); ctx.lineTo(w/2 + 150, h);
                ctx.stroke();
            }

            if (this.speed > maxSpeed) this.speed = maxSpeed;
            if (this.speed < 0) this.speed = 0;
            this.distance += this.speed;

            // Atualiza IA (LookAhead simplificado)
            let curve = Math.sin(this.aiDistance / 200); 
            if(Math.abs(curve) > 0.5) this.aiX += (curve > 0 ? 0.05 : -0.05);
            this.aiDistance += 120; // Velocidade da IA
            
            // Audio do motor escalonado
            if(this.speed > 10) window.Sfx.engine(this.speed);

            // 3. RENDERIZAÇÃO PSEUDO-3D ULTRA POLIDA
            this.render3D(ctx, w, h, curve);

            return this.distance;
        },

        render3D: function(ctx, w, h, curve) {
            // Fundo montanhas dinâmicas
            let skyGrad = ctx.createLinearGradient(0,0,0,h/2);
            skyGrad.addColorStop(0, "#2980b9");
            skyGrad.addColorStop(1, "#f39c12");
            ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h/2);

            // Sol
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.beginPath(); ctx.arc(w/2 - (this.x*100), h/3, 60, 0, Math.PI*2); ctx.fill();

            const lines = 150;
            const camD = 0.84;
            const trackW = 3000;

            let currentCurve = Math.sin(this.distance / 200);

            for (let i = 0; i < lines; i++) {
                let z = i * 20;
                let relZ = z - (this.distance % 20);
                if (relZ < 1) continue;

                let scale = camD / (relZ / 100);
                let py = h/2 + (50 * scale);
                let pxWidth = trackW * scale;
                
                // Aplicar curva visual à pista
                let cx = (w/2) + ((currentCurve * relZ * relZ * 0.005) * scale) - (this.x * pxWidth / 2);

                let isDark = Math.floor((this.distance + relZ) / 100) % 2 === 0;
                
                // Grama
                ctx.fillStyle = isDark ? "#27ae60" : "#2ecc71";
                ctx.fillRect(0, py, w, 50 * scale);

                // Asfalto
                ctx.fillStyle = isDark ? "#7f8c8d" : "#95a5a6";
                ctx.fillRect(cx - pxWidth/2, py, pxWidth, 50 * scale);

                // Zebras (Rumble strips)
                ctx.fillStyle = isDark ? "#c0392b" : "#ecf0f1";
                ctx.fillRect(cx - pxWidth/2 - (pxWidth*0.05), py, pxWidth*0.05, 50 * scale);
                ctx.fillRect(cx + pxWidth/2, py, pxWidth*0.05, 50 * scale);
            }

            // Renderizar IA
            let distToAi = this.aiDistance - this.distance;
            if (distToAi > 0 && distToAi < 3000) {
                let scale = camD / (distToAi / 100);
                let py = h/2 + (50 * scale);
                let cx = (w/2) + ((currentCurve * distToAi * distToAi * 0.005) * scale) - ((this.x - this.aiX) * trackW * scale / 2);
                let wAi = 300 * scale;
                
                ctx.fillStyle = "#8e44ad"; // Kart IA roxo
                ctx.fillRect(cx - wAi/2, py - wAi*0.8, wAi, wAi*0.8);
            }

            // Renderizar HUD
            ctx.fillStyle = "white"; ctx.font = "bold 30px 'Russo One'";
            ctx.fillText(`VEL: ${Math.floor(this.speed)} KM/H`, 20, 40);
            if(this.nitroActive) {
                ctx.fillStyle = "#3498db";
                ctx.fillText("!!! NITRO ATIVADO !!!", w/2 - 120, 80);
            }
        }
    }
});
