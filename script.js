const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 600;
const HEIGHT = 800;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// ==================== 图片资源加载 ====================
const planeImg = new Image();
planeImg.src = "assets/Plane.jpg";

const meteoriteImg = new Image();
meteoriteImg.src = "assets/Meteorite.jpg";

const goldImg = new Image();
goldImg.src = "assets/GMe.jpg";

const redImg = new Image();
redImg.src = "assets/RMe.jpg";

const arrowImg = new Image();
arrowImg.src = "assets/Arrow.jpg";

const shieldImg = new Image();
shieldImg.src = "assets/Shield.jpg";

const bossImg = new Image();
bossImg.src = "assets/1.1.png";

const boss2Img = new Image();
boss2Img.src = "assets/1.2.png";

const boss3Img = new Image();
boss3Img.src = "assets/2.1.png";

const boss4Img = new Image();
boss4Img.src = "assets/3.1.png";

const boss5Img = new Image();
boss5Img.src = "assets/4.1.png";

// ==================== 游戏状态 ====================
let obstacles = [];
let powerups = [];
let particles = [];
let bossBullets = [];

let score = 0;
let last_gold_trigger_time = -1;

let laser_count = 3;
let laser_color_mode = 0;
let powerup_count = 0;

let rage_mode = false;
let rage_end_time = 0;

let shield_hits = 0;

let running = true;
let highestScore = parseInt(localStorage.getItem(isMobile() ? "highestScore_mobile" : "highestScore_desktop")) || 0;

// ==================== 玩家 ====================
const player = {
    x: WIDTH / 2,
    y: HEIGHT - 100,
    width: 75,
    height: 75,
    speed: 5,

    left() { return this.x; },
    right() { return this.x + this.width; },
    top() { return this.y; },
    bottom() { return this.y + this.height; },
    centerx() { return this.x + this.width / 2; },
    centery() { return this.y + this.height / 2; }
};

// ==================== 粒子 ====================
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        if (this.life > 0) {
            ctx.fillStyle = "rgb(255,180,50)";
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ==================== 道具 ====================
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;

        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;

        this.flash = 0;
        this.visible = true;
        this.type = type; // arrow / shield
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x + this.width > WIDTH) this.vx *= -1;
        if (this.y < 0 || this.y + this.height > HEIGHT) this.vy *= -1;

        this.flash++;
        this.visible = this.flash % 10 < 5;
    }

    draw() {
        if (!this.visible) return;

        if (this.type === "shield") {
            ctx.drawImage(shieldImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.drawImage(arrowImg, this.x, this.y, this.width, this.height);
        }
    }
}

// ==================== 陨石 ====================
function createObstacle(type = "normal") {
    let maxTry = 200;

    for (let t = 0; t < maxTry; t++) {

        let baseSize = (type === "boss" || type === "boss2" || type === "boss3" || type === "boss4") ? 98 : (type === "boss5" ? 147 : 65);
        let rect = {
            x: Math.random() * (WIDTH - baseSize),
            y: Math.random() * -300,
            width: baseSize,
            height: baseSize
        };

        // ===== 扩展碰撞区域（防止贴太近）=====
        let expanded = {
            x: rect.x,
            y: rect.y - 15,
            width: rect.width,
            height: rect.height + 15
        };

        let overlap = false;

        for (let o of obstacles) {
            let other = {
                x: o.rect.x,
                y: o.rect.y - 15,
                width: o.rect.width,
                height: o.rect.height + 15
            };

            if (collide(expanded, other)) {
                overlap = true;
                break;
            }
        }

        // ✅ 找到不重叠的位置才返回
        if (!overlap) {
            let hp = 60;
            if (type === "gold") hp = 180;
            if (type === "red") hp = 360;
            if (type === "boss") hp = 200;
            if (type === "boss2") hp = 220;
            if (type === "boss3") hp = 240;
            if (type === "boss4") hp = 260;
            if (type === "boss5") hp = 280;

            if (type === "boss5") {
                return { rect, hp, type, lastAttackTime: 0, isMoving: false, stayStartTime: Date.now(), moveStartTime: 0, targetX: 0, direction: 0 };
            }
            return { rect, hp, type, lastAttackTime: 0 };
        }
    }

    // ===== fallback（和 python 一样）=====
    let fallbackSize = (type === "boss" || type === "boss2" || type === "boss3" || type === "boss4") ? 98 : (type === "boss5" ? 147 : 65);
    let rect = {
        x: Math.random() * (WIDTH - fallbackSize),
        y: -fallbackSize,
        width: fallbackSize,
        height: fallbackSize
    };

    let hp = 60;
    if (type === "gold") hp = 180;
    if (type === "red") hp = 360;
    if (type === "boss") hp = 180;
    if (type === "boss2") hp = 200;
    if (type === "boss3") hp = 220;
    if (type === "boss4") hp = 240;
    if (type === "boss5") hp = 260;

    if (type === "boss5") {
        return { rect, hp, type, lastAttackTime: 0, isMoving: false, stayStartTime: Date.now(), moveStartTime: 0, targetX: 0, direction: 0 };
    }
    return { rect, hp, type, lastAttackTime: 0 };
}

// ==================== 碰撞 ====================
function collide(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// ==================== 激光颜色 ====================
function getLaserColor() {
    if (rage_mode) return [255, 215, 0];
    if (laser_color_mode === 1) return [180, 0, 255];
    return [0, 255, 255];
}

// ==================== 键盘 ====================
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ==================== 触屏控制 ====================
let touchActive = false;

canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    touchActive = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    player.x = (touch.clientX - rect.left) * scaleX - player.width / 2;
    player.y = (touch.clientY - rect.top) * scaleY - player.height / 2;
}, { passive: false });

canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    if (!touchActive) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    player.x = (touch.clientX - rect.left) * scaleX - player.width / 2;
    player.y = (touch.clientY - rect.top) * scaleY - player.height / 2;
}, { passive: false });

canvas.addEventListener("touchend", e => {
    e.preventDefault();
    touchActive = false;
}, { passive: false });

// ==================== 玩家移动 ====================
function updatePlayer() {
    // 键盘模式
    if (controlMode === "keyboard") {
        if (keys["ArrowLeft"] && player.left() > 0) player.x -= player.speed;
        if (keys["ArrowRight"] && player.right() < WIDTH) player.x += player.speed;
        if (keys["ArrowUp"] && player.top() > 0) player.y -= player.speed;
        if (keys["ArrowDown"] && player.bottom() < HEIGHT) player.y += player.speed;
    }

    // 鼠标模式
    if (controlMode === "mouse") {
        player.x = mouseX - player.width / 2;
        player.y = mouseY - player.height / 2;
    }

    // 边界限制（键盘和触屏共用）
    if (player.x < 0) player.x = 0;
    if (player.x > WIDTH - player.width) player.x = WIDTH - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > HEIGHT - player.height) player.y = HEIGHT - player.height;
}

// ==================== 陨石生成 ====================
function spawn() {
    const sec = Math.floor(Date.now() / 1000);

    // 根据游戏时间调整生成概率
    let rateMultiplier = 1;
    if (sec < 90) {
        rateMultiplier = 1 / 3;
    } else if (sec < 180) {
        rateMultiplier = 1 / 2;
    }

    // 检查boss5所在行是否被占用
    let boss5 = obstacles.find(o => o.type === "boss5");
    let boss5RowBlocked = false;
    if (boss5 && boss5.rect.y > 0) {
        boss5RowBlocked = true;
    }

    if (Math.random() < (1 / 100) * rateMultiplier) {
        if (!boss5RowBlocked) {
            if (Math.random() < 1 / 5) obstacles.push(createObstacle("red"));
            else obstacles.push(createObstacle("normal"));
        }
    }

    // Boss生成：概率为普通陨石的1/6
    if (Math.random() < (1 / 600) * rateMultiplier) {
        if (!boss5RowBlocked) obstacles.push(createObstacle("boss"));
    }

    // Boss2生成：概率为普通陨石的1/8
    if (Math.random() < (1 / 800) * rateMultiplier) {
        if (!boss5RowBlocked) obstacles.push(createObstacle("boss2"));
    }

    // Boss3生成：概率为普通陨石的1/12
    if (Math.random() < (1 / 1200) * rateMultiplier) {
        if (!boss5RowBlocked) obstacles.push(createObstacle("boss3"));
    }

    // Boss4生成：概率为普通陨石的1/16
    if (Math.random() < (1 / 1600) * rateMultiplier) {
        if (!boss5RowBlocked) obstacles.push(createObstacle("boss4"));
    }

    // Boss5生成：概率为普通陨石的1/20
    if (Math.random() < 1 / 2000) {
        obstacles.push(createObstacle("boss5"));
    }

    if (
        sec >= 10 &&
        sec % 10 === 0 &&
        sec !== last_gold_trigger_time &&
        !obstacles.some(o => o.type === "gold")
    ) {
        obstacles.push(createObstacle("gold"));
        last_gold_trigger_time = sec;
    }
}

// ==================== 激光系统 ====================
function lasers() {
    const cx = player.centerx();
    const offsets = laser_count === 3 ? [0, -6, 6] : [-8, -4, 0, 4, 8];

    const color = getLaserColor();
    const startY = player.y;

    let hit = new Set();

    for (let offset of offsets) {
        let x = cx + offset;
        let endY = 0;

        for (let o of obstacles) {
            let c = o.rect.x + o.rect.width / 2;
            if (Math.abs(c - x) < o.rect.width / 2 && o.rect.y < startY) {
                endY = Math.max(endY, o.rect.y);
            }
        }

        // 绘制三层激光（严格对应 pygame draw_laser）
        // 外层
        ctx.strokeStyle = `rgb(${Math.floor(color[0]/3)},${Math.floor(color[1]/3)},${Math.floor(color[2]/3)})`;
        ctx.lineWidth = 10;
        ctx.lineWidth = 6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();

        // 中层
        ctx.strokeStyle = `rgb(${Math.floor(color[0]/2)},${Math.floor(color[1]/2)},${Math.floor(color[2]/2)})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();

        // 核心
        ctx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();

        const laserRect = {
            x: x - 2,
            y: endY,
            width: 4,
            height: startY - endY
        };

        obstacles.forEach((o, i) => {
            if (collide(laserRect, o.rect)) hit.add(i);
        });
    }

    hit.forEach(i => {
    obstacles[i].hp -= 2;
    });
    

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        if (o.hp <= 0) {
            for (let k = 0; k < 20; k++) {
                particles.push(new Particle(o.rect.x + 20, o.rect.y + 20));
            }

            let addScore = 0;
            if (o.type === "gold") {
                powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "arrow"));
                addScore = 20;
            } else if (o.type === "red") {
                if (Math.random() < 1 / 3) {
                    powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "shield"));
                }
                addScore = 50;
            } else if (o.type === "boss") {
                addScore = 10;
            } else if (o.type === "boss2") {
                addScore = 20;
            } else if (o.type === "boss3") {
                addScore = 30;
            } else if (o.type === "boss4") {
                addScore = 40;
            } else if (o.type === "boss5") {
                addScore = 50;
            } else {
                addScore = 10;
            }

            // 暴走状态分数×2
            if (rage_mode) addScore *= 2;
            score += addScore;

            // Boss掉落：1/10升级道具，1/20护盾道具，最多掉落一个
            if (o.type === "boss" || o.type === "boss2" || o.type === "boss3" || o.type === "boss4") {
                let rand = Math.random();
                if (rand < 1 / 10) {
                    powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "arrow"));
                } else if (rand < 1 / 10 + 1 / 20) {
                    powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "shield"));
                }
            }

            obstacles.splice(i, 1);
        }
    }
}

// ==================== 道具 ====================
function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];

        p.update();

        let dx = player.centerx() - (p.x + 15);
        let dy = player.centery() - (p.y + 15);
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150 && dist !== 0) {
            p.x += (dx / dist) * 5;
            p.y += (dy / dist) * 5;
        }

        if (dist < 40) {
            if (p.type === "shield") {
                shield_hits = 1;
                powerups.splice(i, 1);
                continue;
            }

            powerup_count++;

            if (powerup_count === 1) {
                laser_count = 5;
            } else if (powerup_count === 2) {
                laser_color_mode = 1;
            } else {
                rage_mode = true;
                rage_end_time = Math.floor(Date.now() / 1000) + 3;
            }

            powerups.splice(i, 1);
        }
    }
}

// ==================== 绘制陨石（使用贴图） ====================
function drawObstacles() {
    for (let o of obstacles) {
        let img;
        if (o.type === "gold") img = goldImg;
        else if (o.type === "red") img = redImg;
        else if (o.type === "boss") img = bossImg;
        else if (o.type === "boss2") img = boss2Img;
        else if (o.type === "boss3") img = boss3Img;
        else if (o.type === "boss4") img = boss4Img;
        else if (o.type === "boss5") img = boss5Img;
        else img = meteoriteImg;

        ctx.drawImage(img, o.rect.x, o.rect.y, o.rect.width, o.rect.height);

        // 血条（严格对应 plane.py）
        let hp_max = 60;
        if (o.type === "gold") hp_max = 180;
        if (o.type === "red") hp_max = 360;
        if (o.type === "boss") hp_max = 180;

        let hp_ratio = Math.min(Math.max(o.hp / hp_max, 0), 1);

        ctx.fillStyle = "rgb(120,0,0)";
        ctx.fillRect(o.rect.x, o.rect.y - 10, o.rect.width, 6);

        ctx.fillStyle = "rgb(0,255,0)";
        ctx.fillRect(o.rect.x, o.rect.y - 10, Math.floor(o.rect.width * hp_ratio), 6);
    }
}

// ==================== 游戏结束检查 ====================
// Boss子弹碰撞检测
function checkBossBulletCollision() {
    let rageRadius = player.width / 2 + 30;
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        let b = bossBullets[i];
        let dx = b.x - player.centerx();
        let dy = b.y - player.centery();
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (rage_mode) {
            // 暴走模式：光波碰撞检测
            if (dist < rageRadius + b.radius) {
                bossBullets.splice(i, 1);
            }
        } else if (dist < b.radius + player.width / 10) {
            if (shield_hits > 0) {
                shield_hits--;
                bossBullets.splice(i, 1);
            } else {
                console.log("游戏结束");
                running = false;
                if (score > highestScore) {
                    highestScore = score;
                    localStorage.setItem(isMobile() ? "highestScore_mobile" : "highestScore_desktop", highestScore);
                }
                document.getElementById("highestScore").textContent = highestScore;
                document.getElementById("startHighestScoreValue").textContent = highestScore;
                document.getElementById("gameOver").classList.remove("hidden");
                document.getElementById("finalScore").textContent = score;
                return;
            }
        }
    }
}

function checkGameOver() {
    let rageRadius = player.width / 2 + 30;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        if (rage_mode) {
            // 暴走模式：光波碰撞检测
            let ox = o.rect.x + o.rect.width / 2;
            let oy = o.rect.y + o.rect.height / 2;
            let dx = ox - player.centerx();
            let dy = oy - player.centery();
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < rageRadius + o.rect.width / 2) {
                // 暴走碰撞击落获得分数
                let addScore = 10;
                if (o.type === "gold") addScore = 20;
                else if (o.type === "red") addScore = 50;
                else if (o.type === "boss") addScore = 10;
                else if (o.type === "boss2") addScore = 20;
                else if (o.type === "boss3") addScore = 30;
                else if (o.type === "boss4") addScore = 40;
                else if (o.type === "boss5") addScore = 50;
                score += addScore * 2; // 暴走状态×2
                obstacles.splice(i, 1);
            }
        } else if (collide(o.rect, {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        })) {
            if (shield_hits > 0) {
                shield_hits--;
                obstacles.splice(i, 1);
                continue;
            } else {
                console.log("游戏结束");
                running = false;
                if (score > highestScore) {
                    highestScore = score;
                    localStorage.setItem(isMobile() ? "highestScore_mobile" : "highestScore_desktop", highestScore);
                }
                document.getElementById("highestScore").textContent = highestScore;
                document.getElementById("startHighestScoreValue").textContent = highestScore;
                document.getElementById("gameOver").classList.remove("hidden");
                document.getElementById("finalScore").textContent = score;
                return;
            }
        }
    }
}

// ==================== 主循环 ====================
function gameLoop(currentTime) {

    let dt = 1;
    if (!window.lastTime) window.lastTime = currentTime;
    dt = (currentTime - window.lastTime) / 16.67;
    window.dt = dt;
    window.lastTime = currentTime;

    if (!running) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // 清屏
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // rage_mode 超时检查
    const currentSec = Math.floor(Date.now() / 1000);
    if (rage_mode && currentSec > rage_end_time) {
        rage_mode = false;
    }

    updatePlayer();
    spawn();

    // 更新陨石位置
    for (let o of obstacles) {
        o.rect.y += 4 * dt;
    }

    // Boss发射子弹
    const now = Date.now();
    for (let o of obstacles) {
        if (o.type === "boss5" && o.rect.y > 0) {
            // 初始化boss5发射状态
            if (o.boss5AttackState === undefined) {
                o.boss5AttackState = {
                    phase: 'waiting', // waiting, attacking, finished
                    bulletsFired: 0, // 每方向已发射子弹数
                    lastAttackTime: 0
                };
            }

            // boss5移动逻辑
            if (!o.isMoving) {
                // 静止状态，检查是否需要移动或开始攻击
                if (o.boss5AttackState.phase === 'waiting' && now - o.stayStartTime >= 1000) {
                    // 决定移动方向
                    let moveDistance = o.rect.width;
                    let canLeft = o.rect.x - moveDistance >= 0;
                    let canRight = o.rect.x + o.rect.width + moveDistance <= WIDTH;

                    if (canLeft && canRight) {
                        o.direction = Math.random() < 0.5 ? -1 : 1;
                    } else if (canLeft) {
                        o.direction = -1;
                    } else if (canRight) {
                        o.direction = 1;
                    } else {
                        o.direction = 0;
                    }

                    if (o.direction !== 0) {
                        o.isMoving = true;
                        o.moveStartTime = now;
                        o.targetX = o.rect.x + o.direction * moveDistance;
                    } else {
                        o.stayStartTime = now;
                    }
                }

                // 到达新位置后发射一次子弹（三个方向各3个，共9个）
                if (o.boss5AttackState.phase === 'waiting' && now - o.stayStartTime >= 1000) {
                    let bx = o.rect.x + o.rect.width / 2;
                    let by = o.rect.y + o.rect.height / 2;
                    let spd = 6;
                    let spacing = 30;
                    // 三个方向：下、左下、右下，每个方向3个子弹，间隔30像素
                    let dirs = [
                        { vx: 0, vy: spd },                    // 下
                        { vx: -spd * 0.707, vy: spd * 0.707 },  // 左下
                        { vx: spd * 0.707, vy: spd * 0.707 }    // 右下
                    ];
                    for (let d of dirs) {
                        // 归一化方向向量
                        let len = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
                        let nx = d.vx / len;
                        let ny = d.vy / len;
                        for (let j = 0; j < 3; j++) {
                            let offset = j * spacing;
                            bossBullets.push({
                                x: bx + nx * offset,
                                y: by + ny * offset,
                                radius: player.width / 12,
                                vx: d.vx,
                                vy: d.vy
                            });
                        }
                    }
                    o.boss5AttackState.phase = 'finished';
                }

                // 等待下一次移动
                if (o.boss5AttackState.phase === 'finished') {
                    // 什么都不做，等待移动触发
                }
            } else {
                // 移动状态，0.5秒内匀速移动
                let elapsed = now - o.moveStartTime;
                if (elapsed >= 500) {
                    o.rect.x = o.targetX;
                    o.isMoving = false;
                    o.stayStartTime = now;
                    // 到达新位置，重置攻击状态
                    o.boss5AttackState.phase = 'waiting';
                    o.boss5AttackState.bulletsFired = 0;
                } else {
                    let startX = o.rect.x;
                    let targetX = o.targetX;
                    let progress = elapsed / 500;
                    o.rect.x = startX + (targetX - startX) * progress;
                }
            }
        }
        if ((o.type === "boss" || o.type === "boss5") && o.rect.y > 0 && o.type !== "boss5") {
            if (now - o.lastAttackTime >= 1000) {
                bossBullets.push({
                    x: o.rect.x + o.rect.width / 2,
                    y: o.rect.y + o.rect.height,
                    radius: player.width / 12,
                    speed: 6
                });
                o.lastAttackTime = now;
            }
        }
        if (o.type === "boss4" && o.rect.y > 0) {
            if (now - o.lastAttackTime >= 1000) {
                let bx = o.rect.x + o.rect.width / 2;
                let by = o.rect.y + o.rect.height / 2;
                let spd = 6;
                // 8个方向：上、下、左、右、左上、左下、右上、右下
                let dirs = [
                    { vx: 0, vy: -spd },      // 上
                    { vx: 0, vy: spd },       // 下
                    { vx: -spd, vy: 0 },      // 左
                    { vx: spd, vy: 0 },       // 右
                    { vx: -spd * 0.707, vy: -spd * 0.707 },  // 左上
                    { vx: -spd * 0.707, vy: spd * 0.707 },   // 左下
                    { vx: spd * 0.707, vy: -spd * 0.707 },  // 右上
                    { vx: spd * 0.707, vy: spd * 0.707 }    // 右下
                ];
                for (let d of dirs) {
                    bossBullets.push({ x: bx, y: by, radius: player.width / 12, vx: d.vx, vy: d.vy });
                }
                o.lastAttackTime = now;
            }
        }
        if (o.type === "boss3" && o.rect.y > 0) {
            if (now - o.lastAttackTime >= 1000) {
                let bx = o.rect.x + o.rect.width / 2;
                let by = o.rect.y + o.rect.height;
                bossBullets.push({ x: bx, y: by, radius: player.width / 12, speed: 6 });
                bossBullets.push({ x: bx, y: by - 30, radius: player.width / 12, speed: 6 });
                bossBullets.push({ x: bx, y: by - 30, radius: player.width / 12, speed: 6 });
                o.lastAttackTime = now;
            }
        }
        if (o.type === "boss2" && o.rect.y > 0) {
            if (now - o.lastAttackTime >= 2000) {
                let bx = o.rect.x + o.rect.width / 2;
                let by = o.rect.y + o.rect.height;
                let dx = player.centerx() - bx;
                let dy = player.centery() - by;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    let vx = (dx / dist) * 4;
                    let vy = (dy / dist) * 4;
                    // 垂直于速度方向的单位向量（用于间隔30像素）
                    let px = -vy / 6 * 15;
                    let py = vx / 6 * 15;
                    bossBullets.push({ x: bx + px, y: by + py, radius: player.width / 12, vx: vx, vy: vy });
                    bossBullets.push({ x: bx - px, y: by - py, radius: player.width / 12, vx: vx, vy: vy });
                }
                o.lastAttackTime = now;
            }
        }
    }

    // 更新Boss子弹
    for (let b of bossBullets) {
        if (b.vx !== undefined && b.vy !== undefined) {
            b.x += b.vx;
            b.y += b.vy;
        } else {
            b.y += b.speed;
        }
    }
    bossBullets = bossBullets.filter(b => b.y < HEIGHT && b.y > -50 && b.x > -50 && b.x < WIDTH + 50);

    checkGameOver();
    checkBossBulletCollision();

    // 移除出界陨石
    obstacles = obstacles.filter(o => o.rect.y < HEIGHT);

    lasers();

    // 粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
    particles.forEach(p => p.draw());

    updatePowerups();
    powerups.forEach(p => p.draw());

    drawObstacles();

    // 绘制玩家飞机（使用贴图）
    ctx.drawImage(planeImg, player.x, player.y, player.width, player.height);

    // 暴走模式光波
    if (rage_mode) {
        let rageRadius = player.width / 2 + 30;
        let cx = player.centerx();
        let cy = player.centery();

        // 金色光晕（外层渐变）
        let glowGradient = ctx.createRadialGradient(cx, cy, rageRadius, cx, cy, rageRadius + 15);
        glowGradient.addColorStop(0, "rgba(255, 215, 0, 0.4)");
        glowGradient.addColorStop(1, "rgba(255, 215, 0, 0)");
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, rageRadius + 15, 0, Math.PI * 2);
        ctx.fill();

        // 金色光圈（闪烁）
        let flashAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 100);
        ctx.strokeStyle = `rgba(255, 215, 0, ${flashAlpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, rageRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 绘制Boss子弹
    for (let b of bossBullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
        ctx.fill();
    }
    if (shield_hits > 0) {
    ctx.strokeStyle = "rgba(30, 157, 176, 0.68)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(
        player.centerx(),
        player.centery(),
        45,
        0,
        Math.PI * 2
    );
    ctx.stroke();
}

    // 分数显示
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.font = "36px Arial";
    ctx.fillText(`分数: ${score}`, 10, 40);

    document.getElementById("scoreValue").textContent = score;

    requestAnimationFrame(gameLoop);
}

// ==================== 重新开始 ====================
document.getElementById("restartBtn").addEventListener("click", () => {
    obstacles = [];
    powerups = [];
    particles = [];
    bossBullets = [];
    score = 0;
    last_gold_trigger_time = -1;
    laser_count = 3;
    laser_color_mode = 0;
    powerup_count = 0;
    rage_mode = false;
    rage_end_time = 0;

    player.x = WIDTH / 2;
    player.y = HEIGHT - 100;

    running = true;
    document.getElementById("gameOver").classList.add("hidden");
});

// ==================== 启动 ====================
// 初始不自动启动，等待开始按钮
let gameStarted = false;
let controlMode = "keyboard"; // 控制模式: keyboard / mouse
let mouseX = WIDTH / 2;
let mouseY = HEIGHT / 2;

// 判断是否为移动端
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 768;
}

// ==================== 开始按钮 ====================
document.getElementById("startBtn").addEventListener("click", () => {
    document.getElementById("startScreen").classList.add("hidden");
    if (isMobile()) {
        // 移动端直接开始游戏
        if (!gameStarted) {
            gameStarted = true;
            requestAnimationFrame(gameLoop);
        }
    } else {
        // PC端显示控制选择界面
        document.getElementById("controlScreen").classList.remove("hidden");
    }
});

// ==================== 控制方式选择 ====================
document.getElementById("keyboardOption").addEventListener("click", () => {
    controlMode = "keyboard";
    document.getElementById("controlScreen").classList.add("hidden");
    if (!gameStarted) {
        gameStarted = true;
        requestAnimationFrame(gameLoop);
    }
});

document.getElementById("mouseOption").addEventListener("click", () => {
    controlMode = "mouse";
    document.getElementById("controlScreen").classList.add("hidden");
    if (!gameStarted) {
        gameStarted = true;
        requestAnimationFrame(gameLoop);
    }
});

// ==================== 鼠标移动跟踪 ====================
canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
});