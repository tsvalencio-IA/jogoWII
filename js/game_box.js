// =============================================================================
// 🥊 SUPER BOXING: 20/10 EVOLUTION (IMPACT OVERHAUL & DODGE SYSTEM)
// ARQUITETO: SENIOR GAME ENGINE ARCHITECT
// STATUS: JAB/UPPERCUT DETECTION, DODGE MECHANICS, SWEAT/BLOOD PARTICLES, RED FLASH
// =============================================================================

if(!window.Games) window.Games = [];

window.Games.push({
    id: 'box',
    title: 'SUPER BOXING',
    logic: {
        state: 'CALIBRATING', // CALIBRATING, FIGHT, KO
        calibFrames: 0,
        wingspan: 300, // Envergadura calibrada
        
        player: { hp: 100, stamina: 100, isGuarding: false, isDodging: false, xPos: 0 },
        enemy: { hp: 100, state: 'IDLE', xPos: 0, attackTimer: 0 },
        
        punches: [], // Array de socos em voo
        damageFlash: 0, // Tela piscando vermelho
        
        // Histórico de rastreamento para cálculo de velocidade
        lastWrists: { lx: 0, ly: 0, rx: 0, ry: 0, lz: 0, rz: 0 },
        lastNoseX: 0,

        init: function() {
            this.state = 'CALIBRATING';
            this.calibFrames = 0;
            this.player = { hp: 100, stamina: 100, isGuarding: false, isDodging: false, xPos: 0 };
            this.enemy = { hp: 100, state: 'IDLE', xPos: 0, attackTimer: 100 };
            this.punches = [];
            this.damageFlash = 0;
            window.Sfx.play(400, 'sine', 0.5, 0.2); // Som de gongo inicial
        },

        cleanup: function() {},

        update: function(ctx, w, h, pose) {
            // EFEITO DE DANO (Tela pisca em vermelho)
            if (this.damageFlash > 0) {
                ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlash})`;
                ctx.fillRect(0, 0, w, h);
                this.damageFlash -= 0.05;
            }

            if (!pose || !pose.keypoints) return this.renderScene(ctx, w, h, "AGUARDANDO CÂMERA...");
            const kps = pose.keypoints;
            const lw = kps.find(k => k.name === 'left_wrist');
            const rw = kps.find(k => k.name === 'right_wrist');
            const nose = kps.find(k => k.name === 'nose');
            const ls = kps.find(k => k.name === 'left_shoulder');
            const rs = kps.find(k => k.name === 'right_shoulder');

            if (!lw || !rw || !nose || lw.score < 0.3 || rw.score < 0.3) {
                return this.renderScene(ctx, w, h, "POSICIONE-SE NA TELA");
            }

            // 1. FASE DE CALIBRAÇÃO (T-POSE)
            if (this.state === 'CALIBRATING') {
                let dist = Math.abs(rw.x - lw.x);
                if (dist > 150 && Math.abs(rw.y - lw.y) < 50) { // Braços abertos
                    this.calibFrames++;
                    ctx.fillStyle = "#2ecc71";
                    ctx.fillRect(w/2 - 100, h/2 + 50, (this.calibFrames/60) * 200, 20);
                    if (this.calibFrames > 60) {
                        this.wingspan = dist; // Salva envergadura
                        this.state = 'FIGHT';
                        window.Sfx.play(800, 'square', 0.5, 0.2);
                        window.Gfx.addShake(10);
                    }
                } else {
                    this.calibFrames = 0;
                }
                return this.renderScene(ctx, w, h, "ABRA OS BRAÇOS PARA CALIBRAR (T-POSE)");
            }

            // 2. MECÂNICA DE DEFESA E ESQUIVA (DODGE 20/10)
            this.player.isGuarding = (lw.y < nose.y + 50 && rw.y < nose.y + 50 && Math.abs(lw.x - rw.x) < 100);
            
            // Deteção de Esquiva (Movimento lateral rápido do nariz/ombros)
            let noseSpeed = nose.x - this.lastNoseX;
            if (Math.abs(noseSpeed) > 15) {
                this.player.isDodging = true;
                this.player.xPos = noseSpeed > 0 ? 100 : -100; // Desvia pra direita ou esquerda
                window.Gfx.spawnParticle(w/2, h/2, "#fff", 5, 10); // "Swoosh" visual
            } else {
                this.player.isDodging = false;
                this.player.xPos *= 0.8; // Volta ao centro suavemente
            }
            this.lastNoseX = nose.x;

            // 3. MECÂNICA DE SOCO (JAB vs UPPERCUT)
            if (this.player.stamina > 10 && !this.player.isGuarding) {
                // Cálculo de Aceleração Z (profundidade baseada no tamanho aparente do pulso ou velocidade pura)
                let lSpeed = Math.abs(lw.x - this.lastWrists.lx) + Math.abs(lw.y - this.lastWrists.ly);
                let rSpeed = Math.abs(rw.x - this.lastWrists.rx) + Math.abs(rw.y - this.lastWrists.ry);
                
                let isLeftPunch = lSpeed > 40;
                let isRightPunch = rSpeed > 40;

                if (isLeftPunch || isRightPunch) {
                    let yDir = isLeftPunch ? (lw.y - this.lastWrists.ly) : (rw.y - this.lastWrists.ry);
                    let type = yDir < -20 ? 'UPPERCUT' : 'JAB'; // Soco de baixo pra cima = Uppercut
                    
                    this.punches.push({
                        side: isLeftPunch ? 'L' : 'R',
                        type: type,
                        z: 0, // 0 = perto da tela, 100 = bateu no inimigo
                        power: type === 'UPPERCUT' ? 25 : 10,
                        xOff: isLeftPunch ? -50 : 50
                    });
                    
                    this.player.stamina -= type === 'UPPERCUT' ? 20 : 10;
                    window.Sfx.play(type === 'UPPERCUT' ? 200 : 300, 'sawtooth', 0.1, 0.1); // Som do "woosh"
                    window.Sfx.vibrate(type === 'UPPERCUT' ? 80 : 30);
                }
            }
            
            // Recuperação de Stamina
            if (this.player.stamina < 100) this.player.stamina += 0.5;

            // Atualizar variáveis de frame passado
            this.lastWrists = { lx: lw.x, ly: lw.y, rx: rw.x, ry: rw.y };

            // 4. ATUALIZAR SOCOS EM VOO
            for (let i = this.punches.length - 1; i >= 0; i--) {
                let p = this.punches[i];
                p.z += 15; // Velocidade do soco
                if (p.z >= 100) { // Acertou o inimigo
                    if (this.enemy.state !== 'BLOCK') {
                        this.enemy.hp -= p.power;
                        window.Gfx.addShake(p.type === 'UPPERCUT' ? 15 : 5);
                        window.Sfx.impact();
                        // Partículas de Suor/Sangue
                        for(let k=0; k<5; k++) window.Gfx.spawnParticle(w/2, h/3, p.type === 'UPPERCUT' ? "#e74c3c" : "#bdc3c7", 10, 20);
                    } else {
                        window.Sfx.play(400, 'square', 0.1, 0.05); // Som de bloqueio
                    }
                    this.punches.splice(i, 1);
                }
            }

            // 5. IA DO INIMIGO
            this.enemy.attackTimer--;
            if (this.enemy.attackTimer <= 0 && this.enemy.hp > 0) {
                let action = Math.random();
                if (action > 0.6) {
                    // Inimigo Ataca
                    this.enemy.state = 'ATTACK';
                    window.Sfx.play(150, 'sawtooth', 0.3, 0.1);
                    setTimeout(() => {
                        if(this.state !== 'FIGHT') return;
                        if (!this.player.isGuarding && !this.player.isDodging) {
                            // TOMOU DANO
                            this.player.hp -= 15;
                            this.damageFlash = 0.5;
                            window.Gfx.addShake(20);
                            window.Sfx.vibrate([100, 100, 200]);
                        } else if (this.player.isDodging) {
                            // ESQUIVA PERFEITA (Slow Motion Feel - Partículas de sucesso)
                            window.Sfx.play(800, 'sine', 0.3, 0.1);
                            window.Gfx.spawnParticle(w/2, h/2, "#f1c40f", 20, 30);
                        } else {
                            // BLOQUEIO
                            this.player.hp -= 2; // Dano residual
                            window.Sfx.play(300, 'square', 0.1, 0.05);
                        }
                        this.enemy.state = 'IDLE';
                        this.enemy.attackTimer = 60 + Math.random() * 60;
                    }, 500); // Meio segundo de delay para o jogador reagir
                } else {
                    this.enemy.state = 'BLOCK';
                    this.enemy.attackTimer = 40;
                }
            } else if (this.enemy.attackTimer <= 0) {
                this.enemy.state = 'IDLE';
            }

            // 6. CONDIÇÕES DE VITÓRIA/DERROTA
            if (this.enemy.hp <= 0) {
                this.state = 'KO';
                window.System.gameOver("VITÓRIA POR NOCAUTE!");
                return this.player.hp;
            }
            if (this.player.hp <= 0) {
                this.state = 'KO';
                window.System.gameOver("DERROTA...");
                return 0;
            }

            // 7. RENDERIZAÇÃO
            this.renderScene(ctx, w, h, "");
            return this.player.hp;
        },

        renderScene: function(ctx, w, h, msg) {
            // Fundo Ringue
            let ringGrad = ctx.createLinearGradient(0,0,0,h);
            ringGrad.addColorStop(0, "#2c3e50");
            ringGrad.addColorStop(1, "#34495e");
            ctx.fillStyle = ringGrad; ctx.fillRect(0,0,w,h);
            
            // Cordas
            ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2 + 50); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, h/2 + 100); ctx.lineTo(w, h/2 + 150); ctx.stroke();

            if (this.state === 'FIGHT') {
                // Inimigo
                let ex = w/2 + this.enemy.xPos - this.player.xPos; // Efeito parallax da esquiva
                let ey = h/3 + (this.enemy.state === 'BLOCK' ? 50 : 0);
                
                // Corpo inimigo
                ctx.fillStyle = this.enemy.hp < 30 ? "#e74c3c" : "#95a5a6";
                ctx.fillRect(ex - 80, ey, 160, 250);
                // Cabeça
                ctx.fillStyle = "#f39c12";
                ctx.beginPath(); ctx.arc(ex, ey - 40, 60, 0, Math.PI*2); ctx.fill();

                if (this.enemy.state === 'ATTACK') {
                    // Luva inimiga vindo na cara
                    ctx.fillStyle = "#c0392b";
                    ctx.beginPath(); ctx.arc(w/2, h/2, 100, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = "white"; ctx.font = "bold 40px 'Russo One'";
                    ctx.fillText("INCOMING!", w/2 - 90, h/2 + 15);
                }

                // Luvas do Jogador em voo (Pseudo-3D)
                this.punches.forEach(p => {
                    let scale = 1 - (p.z / 100); // Diminui conforme afasta
                    let px = (w/2) + p.xOff + (this.player.xPos); // Considera a esquiva
                    let py = (h - 100) - (p.z * 3); // Sobe/afasta na tela
                    
                    if (p.type === 'UPPERCUT') py -= (p.z * 2); // Uppercut sobe mais rápido visualmente
                    
                    ctx.fillStyle = p.type === 'UPPERCUT' ? "#f1c40f" : "#3498db"; // Uppercut = Amarelo, Jab = Azul
                    ctx.beginPath(); ctx.arc(px, py, 60 * scale, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();
                });

                // HUD Inimigo
                ctx.fillStyle = "red"; ctx.fillRect(w/2 - 150, 20, 300, 20);
                ctx.fillStyle = "#2ecc71"; ctx.fillRect(w/2 - 150, 20, 300 * (this.enemy.hp/100), 20);
                
                // Feedback visual do jogador
                if (this.player.isGuarding) {
                    ctx.fillStyle = "rgba(52, 152, 219, 0.5)";
                    ctx.fillRect(w/2 - 150, h/2, 300, 200); // Escudo visual
                    ctx.fillStyle = "white"; ctx.font = "bold 20px 'Russo One'";
                    ctx.fillText("GUARDING", w/2 - 50, h/2 + 100);
                }
                if (this.player.isDodging) {
                    ctx.fillStyle = "#f1c40f"; ctx.font = "bold 40px italic 'Russo One'";
                    ctx.fillText("DODGE!", w/2 + (this.player.xPos > 0 ? 100 : -200), h/2);
                }
            }

            // HUD Player
            ctx.fillStyle = "white"; ctx.font = "bold 30px 'Russo One'";
            if (msg) ctx.fillText(msg, w/2 - (ctx.measureText(msg).width/2), h/2);
            
            ctx.fillText(`HP: ${Math.floor(this.player.hp)}`, 20, h - 60);
            // Barra de Stamina
            ctx.fillStyle = "#7f8c8d"; ctx.fillRect(20, h - 40, 200, 15);
            ctx.fillStyle = this.player.stamina < 20 ? "#e74c3c" : "#f1c40f"; 
            ctx.fillRect(20, h - 40, 200 * (this.player.stamina/100), 15);
        }
    }
});
