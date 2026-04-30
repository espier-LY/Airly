const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 600;
const HEIGHT = 800;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// ==================== 图片资源加载 ====================
const planeImg = new Image();
planeImg.src = "assets/Plane.jpg";
planeImg._origSrc = "assets/Plane.jpg";

const meteoriteImg = new Image();
meteoriteImg.src = "assets/Meteorite.jpg";
meteoriteImg._origSrc = "assets/Meteorite.jpg";

const goldImg = new Image();
goldImg.src = "assets/GMe.jpg";
goldImg._origSrc = "assets/GMe.jpg";

const redImg = new Image();
redImg.src = "assets/RMe.jpg";
redImg._origSrc = "assets/RMe.jpg";

const arrowImg = new Image();
arrowImg.src = "assets/Arrow.jpg";
arrowImg._origSrc = "assets/Arrow.jpg";

const shieldImg = new Image();
shieldImg.src = "assets/Shield.jpg";
shieldImg._origSrc = "assets/Shield.jpg";

const bossImg = new Image();
bossImg.src = "assets/1.1.png";
bossImg._origSrc = "assets/1.1.png";

const boss2Img = new Image();
boss2Img.src = "assets/1.2.png";
boss2Img._origSrc = "assets/1.2.png";

const boss3Img = new Image();
boss3Img.src = "assets/2.1.png";
boss3Img._origSrc = "assets/2.1.png";

const boss4Img = new Image();
boss4Img.src = "assets/3.1.png";
boss4Img._origSrc = "assets/3.1.png";

const boss5Img = new Image();
boss5Img.src = "assets/4.1.png";
boss5Img._origSrc = "assets/4.1.png";

const boss6Img = new Image();
boss6Img.src = "assets/4.1.1.png";
boss6Img._origSrc = "assets/4.1.1.png";

const boss7Img = new Image();
boss7Img.src = "assets/3.1.1.png";
boss7Img._origSrc = "assets/3.1.1.png";

const boss8Img = new Image();
boss8Img.src = "assets/5.1.1.jpg";
boss8Img._origSrc = "assets/5.1.1.jpg";

const boss9Img = new Image();
boss9Img.src = "assets/6.1.1.png";
boss9Img._origSrc = "assets/6.1.1.png";

// ==================== 手机端图片预加载 ====================
const imageList = [
    planeImg, meteoriteImg, goldImg, redImg, arrowImg, shieldImg,
    bossImg, boss2Img, boss3Img, boss4Img, boss5Img, boss6Img, boss7Img, boss8Img, boss9Img
];

let mobilePreloadCallback = null;

function preloadImagesForMobile(callback) {
    mobilePreloadCallback = callback;
    let loadedCount = 0;
    const total = imageList.length;
    const loadingText = document.getElementById("mobileLoadingText");
    const loadingProgress = document.getElementById("mobileLoadingProgress");

    imageList.forEach(img => {
        const newImg = new Image();
        newImg.onload = () => {
            img.src = newImg.src;
            loadedCount++;
            const percent = Math.round((loadedCount / total) * 100);
            loadingText.textContent = "加载中... " + percent + "%";
            loadingProgress.style.width = percent + "%";
            if (loadedCount >= total && mobilePreloadCallback) {
                mobilePreloadCallback();
                mobilePreloadCallback = null;
            }
        };
        newImg.onerror = () => {
            console.error("图片加载失败: " + img._origSrc);
            img.src = newImg.src;
            loadedCount++;
            const percent = Math.round((loadedCount / total) * 100);
            loadingText.textContent = "加载中... " + percent + "%";
            loadingProgress.style.width = percent + "%";
            if (loadedCount >= total && mobilePreloadCallback) {
                mobilePreloadCallback();
                mobilePreloadCallback = null;
            }
        };
        newImg.src = img._origSrc + "?t=" + Date.now();
    });
}

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
let invincible = false;
let invincibleEndTime = 0;

let boss6Phase = "none"; // none, waiting_clear, warning, appearing, active, defeated
let boss6StartTime = 0;
let boss6Triggered = false; // 防止重复触发

let boss7Phase = "none";
let boss7StartTime = 0;
let boss7Triggered = false;

let boss8Phase = "none";
let boss8StartTime = 0;
let boss8Triggered = false;

let boss9Phase = "none";
let boss9StartTime = 0;
let boss9Triggered = false;

let running = true;
let animationId = null;
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
    const sec = Math.floor((Date.now() - gameStartTime) / 1000);

    // Boss6阶段检测：120秒时触发（仅在游戏已开始后）
    if (gameStarted && boss6Phase === "none" && sec >= 60 && !boss6Triggered) {
        boss6Triggered = true;
        boss6Phase = "waiting_clear";
        boss6StartTime = Date.now();
    }

    // Boss7阶段检测：60秒时触发
    if (gameStarted && boss7Phase === "none" && sec >= 5 && !boss7Triggered) {
        boss7Triggered = true;
        boss7Phase = "waiting_clear";
        boss7StartTime = Date.now();
    }

    // Boss6阶段处理
    if (boss6Phase === "waiting_clear") {
        // 等待所有陨石和boss消失
        if (obstacles.length === 0) {
            boss6Phase = "warning";
            boss6StartTime = Date.now();
        }
        return; // 停止生成陨石
    } else if (boss6Phase === "warning") {
        // 显示"终极boss来袭"1秒后消失
        if (Date.now() - boss6StartTime >= 1000) {
            boss6Phase = "waiting_after_warning";
            boss6StartTime = Date.now();
        }
        return; // 停止生成陨石
    } else if (boss6Phase === "waiting_after_warning") {
        // 警告消失后再等1秒，然后出现Boss6
        if (Date.now() - boss6StartTime >= 1000) {
            boss6Phase = "appearing";
            boss6StartTime = Date.now();
            // 创建Boss6在屏幕顶端中央
            let rect = {
                x: (WIDTH - 294) / 2,
                y: -294,
                width: 294,
                height: 294
            };
            obstacles.push({ rect, hp: 10000, type: "boss6", lastAttackTime: 0 });
        }
        return; // 停止生成陨石
    } else if (boss6Phase === "appearing") {
        // Boss6从顶部逐渐展示，完全显示后停在顶端
        let boss6 = obstacles.find(o => o.type === "boss6");
        if (boss6 && boss6.rect.y < 0) {
            boss6.rect.y += 4;
            return; // 继续显示，不生成陨石
        } else if (boss6) {
            boss6.rect.y = 60;
            boss6Phase = "active";
            return; // 停止生成陨石
        }
    } else if (boss6Phase === "active") {
        // Boss6激活状态，不生成新陨石，且不移动
        return;
    } else if (boss6Phase === "defeated") {
        // Boss6被击败后2秒恢复生成
        if (Date.now() - boss6StartTime >= 2000) {
            boss6Phase = "none";
            // 不重置boss6Triggered，确保boss6只触发一次
        }
        // 不return，让代码继续执行正常生成逻辑
    }

    // Boss7阶段处理
    if (boss7Phase === "waiting_clear") {
        if (obstacles.length === 0) {
            boss7Phase = "warning";
            boss7StartTime = Date.now();
        }
        return;
    } else if (boss7Phase === "warning") {
        if (Date.now() - boss7StartTime >= 1000) {
            boss7Phase = "waiting_after_warning";
            boss7StartTime = Date.now();
        }
        return;
    } else if (boss7Phase === "waiting_after_warning") {
        if (Date.now() - boss7StartTime >= 1000) {
            boss7Phase = "appearing";
            boss7StartTime = Date.now();
            let rect = {
                x: (WIDTH - 294) / 2,
                y: -294,
                width: 294,
                height: 294
            };
            obstacles.push({ rect, hp: 8000, type: "boss7", lastAttackTime: 0 });
        }
        return;
    } else if (boss7Phase === "appearing") {
        let boss7 = obstacles.find(o => o.type === "boss7");
        if (boss7 && boss7.rect.y < 0) {
            boss7.rect.y += 4;
            return;
        } else if (boss7) {
            boss7.rect.y = 210;
            boss7Phase = "active";
            return;
        }
    } else if (boss7Phase === "active") {
        return;
    } else if (boss7Phase === "defeated") {
        if (Date.now() - boss7StartTime >= 2000) {
            boss7Phase = "none";
        }
        // 不return，让代码继续执行正常生成逻辑
    }

    // 以下为普通生成逻辑（boss6和boss7未激活时执行）
    // 根据游戏时间调整生成概率
    let rateMultiplier = 1;
    if (sec < 90) {
        rateMultiplier = 1 / 2;
    } else if (sec < 180) {
        rateMultiplier = 3 / 4;
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
                // Boss5死亡爆炸：8个方向各3个子弹
                let bx = o.rect.x + o.rect.width / 2;
                let by = o.rect.y + o.rect.height / 2;
                let spd = 6;
                let spacing = 30;
                let dirs = [
                    { vx: 0, vy: -spd },                      // 上
                    { vx: 0, vy: spd },                       // 下
                    { vx: -spd, vy: 0 },                      // 左
                    { vx: spd, vy: 0 },                       // 右
                    { vx: -spd * 0.707, vy: -spd * 0.707 },  // 左上
                    { vx: -spd * 0.707, vy: spd * 0.707 },   // 左下
                    { vx: spd * 0.707, vy: -spd * 0.707 },   // 右上
                    { vx: spd * 0.707, vy: spd * 0.707 }     // 右下
                ];
                for (let d of dirs) {
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
            } else if (o.type === "boss6") {
                addScore = 500;
            } else if (o.type === "boss7") {
                addScore = 500;
            } else if (o.type === "boss8" || o.type === "boss9") {
                addScore = 500;
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

            // Boss5掉落：概率提高5倍（1/2箭头，1/4护盾）
            if (o.type === "boss5") {
                let rand = Math.random();
                if (rand < 1 / 2) {
                    powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "arrow"));
                } else if (rand < 1 / 2 + 1 / 4) {
                    powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "shield"));
                }
            }

            // Boss6被击败
            if (o.type === "boss6") {
                boss6Phase = "defeated";
                boss6StartTime = Date.now();
            }

            // Boss7被击败
            if (o.type === "boss7") {
                boss7Phase = "defeated";
                boss7StartTime = Date.now();
            }

            // Boss8被击败
            if (o.type === "boss8") {
                boss8Phase = "defeated";
                boss8StartTime = Date.now();
                boss3Running = false;
            }

            // Boss9被击败
            if (o.type === "boss9") {
                boss9Phase = "defeated";
                boss9StartTime = Date.now();
                boss4Running = false;
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
        else if (o.type === "boss6") img = boss6Img;
        else if (o.type === "boss7") img = boss7Img;
        else if (o.type === "boss8") img = boss8Img;
        else if (o.type === "boss9") img = boss9Img;
        else img = meteoriteImg;

        ctx.drawImage(img, o.rect.x, o.rect.y, o.rect.width, o.rect.height);

        // 血条（严格对应 plane.py）
        let hp_max = 60;
        if (o.type === "gold") hp_max = 180;
        if (o.type === "red") hp_max = 360;
        if (o.type === "boss") hp_max = 180;
        if (o.type === "boss6") hp_max = 10000;
        if (o.type === "boss7") hp_max = 8000;
        if (o.type === "boss8") hp_max = 12000;
        if (o.type === "boss9") hp_max = 12000;

        // boss6、boss7、boss8、boss9在完全出现后才显示血条
        if ((o.type === "boss6" || o.type === "boss7" || o.type === "boss8" || o.type === "boss9") && o.rect.y < 0) continue;

        let hp_ratio = Math.min(Math.max(o.hp / hp_max, 0), 1);

        // 血条位置
        let hp_y = o.rect.y - 10;

        ctx.fillStyle = "rgb(120,0,0)";
        ctx.fillRect(o.rect.x, hp_y, o.rect.width, 6);

        ctx.fillStyle = "rgb(0,255,0)";
        ctx.fillRect(o.rect.x, hp_y, Math.floor(o.rect.width * hp_ratio), 6);
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
                invincible = true;
                invincibleEndTime = Date.now() + 1000;
                bossBullets.splice(i, 1);
            } else if (!invincible) {
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
                // 暴走碰撞击落获得分数（boss6、boss7、boss8、boss9除外）
                if (o.type === "boss6" || o.type === "boss7" || o.type === "boss8" || o.type === "boss9") continue;

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
                if (o.type === "boss6" || o.type === "boss7" || o.type === "boss8" || o.type === "boss9") {
                    shield_hits--;
                    invincible = true;
                    invincibleEndTime = Date.now() + 1000;
                    continue;
                }
                shield_hits--;
                invincible = true;
                invincibleEndTime = Date.now() + 1000;
                obstacles.splice(i, 1);
                continue;
            } else if (!invincible) {
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
        return;
    }

    // 无敌时间检查
    if (invincible && Date.now() > invincibleEndTime) {
        invincible = false;
    }

    // 清屏
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // rage_mode 超时检查
    const currentSec = Math.floor(Date.now() / 1000);
    if (rage_mode && currentSec > rage_end_time) {
        rage_mode = false;
    }

    // 移除出界陨石（提前到spawn之前，确保waiting_clear正确检测）
    obstacles = obstacles.filter(o => o.rect.y < HEIGHT);

    updatePlayer();
    spawn();

    // 更新陨石位置（boss6、boss7、boss8、boss9固定在顶端不移动）
    for (let o of obstacles) {
        if (o.type === "boss6" && boss6Phase === "active") continue;
        if (o.type === "boss7" && boss7Phase === "active") continue;
        if (o.type === "boss8" && boss8Phase === "active") continue;
        if (o.type === "boss9" && boss9Phase === "active") continue;
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
        // Boss6攻击
        if (o.type === "boss6" && boss6Phase === "active" && o.rect.y >= 0) {
            // 初始化boss6移动状态
            if (o.isMoving === undefined) {
                o.isMoving = false;
                o.stayStartTime = now;
                o.moveStartTime = 0;
                o.targetX = o.rect.x;
                o.startX = o.rect.x;
                o.boss6Phase = 1; // 1=第一阶段, 2=第二阶段, 3=过渡期
                o.phaseTransitionTime = 0;
                o.lastAttackTime = 0;
                o.boss6SingleShotTime = 0;
            }

            // 阶段检测：血量低于一半时切换到第二阶段
            let hpMax = 10000;
            if (o.boss6Phase === 1 && o.hp <= hpMax / 2) {
                o.boss6Phase = 3; // 过渡期
                o.phaseTransitionTime = now;
            }

            // 过渡期：休息1秒后进入第二阶段
            if (o.boss6Phase === 3) {
                if (now - o.phaseTransitionTime >= 1000) {
                    o.boss6Phase = 2;
                    o.stayStartTime = now;
                    o.isMoving = false;
                }
                // 过渡期不攻击，不移动
                continue;
            }

            if (!o.isMoving) {
                // 静止状态，检查是否需要移动
                if (now - o.stayStartTime >= 5000) {
                    // 决定移动方向，随机向左或向右移动50-100像素
                    let moveDistance = 50 + Math.random() * 50;
                    let direction = Math.random() < 0.5 ? -1 : 1;
                    let newX = o.rect.x + direction * moveDistance;
                    // 边界检查
                    newX = Math.max(0, Math.min(WIDTH - o.rect.width, newX));
                    o.targetX = newX;
                    o.startX = o.rect.x;
                    o.isMoving = true;
                    o.moveStartTime = now;
                }
            } else {
                // 移动状态，0.5秒内匀速移动
                let elapsed = now - o.moveStartTime;
                if (elapsed >= 500) {
                    o.rect.x = o.targetX;
                    o.isMoving = false;
                    o.stayStartTime = now;
                } else {
                    let progress = elapsed / 500;
                    o.rect.x = o.startX + (o.targetX - o.startX) * progress;
                }
            }

            // 静止时攻击
            if (!o.isMoving) {
                if (o.boss6Phase === 1) {
                    // 第一阶段：每1秒5个方向，每方向3颗子弹，速度6
                    if (now - o.lastAttackTime >= 1000) {
                        let bx = o.rect.x + o.rect.width / 2;
                        let by = o.rect.y + o.rect.height / 2;
                        let spd = 6;
                        let spacing = 30;
                        let dirs = [
                            { vx: spd * 0.866, vy: spd * 0.5 },     // -30°
                            { vx: spd * 0.5, vy: spd * 0.866 },     // -60°
                            { vx: 0, vy: spd },                      // -90°
                            { vx: -spd * 0.5, vy: spd * 0.866 },   // -120°
                            { vx: -spd * 0.866, vy: spd * 0.5 }    // -150°
                        ];
                        for (let d of dirs) {
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
                        o.lastAttackTime = now;
                    }
                    // 向飞机发射单个子弹，每0.5秒一次，速度1
                    if (now - o.boss6SingleShotTime >= 500) {
                        let bx = o.rect.x + o.rect.width / 2;
                        let by = o.rect.y + o.rect.height / 2;
                        let dx = player.centerx() - bx;
                        let dy = player.centery() - by;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            bossBullets.push({
                                x: bx,
                                y: by,
                                radius: player.width / 12,
                                vx: (dx / dist) * 1,
                                vy: (dy / dist) * 1
                            });
                        }
                        o.boss6SingleShotTime = now;
                    }
                } else if (o.boss6Phase === 2) {
                    // 第二阶段：每1秒10个方向，每方向6颗子弹，速度8
                    if (now - o.lastAttackTime >= 1000) {
                        let bx = o.rect.x + o.rect.width / 2;
                        let by = o.rect.y + o.rect.height / 2;
                        let spd = 8;
                        let spacing = 30;
                        let dirs = [
                            { vx: spd * 0.966, vy: spd * 0.259 },    // -15°
                            { vx: spd * 0.866, vy: spd * 0.5 },     // -30°
                            { vx: spd * 0.707, vy: spd * 0.707 },   // -45°
                            { vx: spd * 0.5, vy: spd * 0.866 },     // -60°
                            { vx: spd * 0.259, vy: spd * 0.966 },   // -75°
                            { vx: 0, vy: spd },                      // -90°
                            { vx: -spd * 0.259, vy: spd * 0.966 }, // -105°
                            { vx: -spd * 0.5, vy: spd * 0.866 },   // -120°
                            { vx: -spd * 0.707, vy: spd * 0.707 }, // -135°
                            { vx: -spd * 0.866, vy: spd * 0.5 }    // -150°
                        ];
                        for (let d of dirs) {
                            let len = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
                            let nx = d.vx / len;
                            let ny = d.vy / len;
                            for (let j = 0; j < 6; j++) {
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
                        o.lastAttackTime = now;
                    }
                    // 向飞机发射单个子弹，每0.5秒一次，速度2
                    if (now - o.boss6SingleShotTime >= 500) {
                        let bx = o.rect.x + o.rect.width / 2;
                        let by = o.rect.y + o.rect.height / 2;
                        let dx = player.centerx() - bx;
                        let dy = player.centery() - by;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            bossBullets.push({
                                x: bx,
                                y: by,
                                radius: player.width / 12,
                                vx: (dx / dist) * 2,
                                vy: (dy / dist) * 2
                            });
                        }
                        o.boss6SingleShotTime = now;
                    }
                }
            }
        }
        // Boss7攻击
        if (o.type === "boss7" && boss7Phase === "active" && o.rect.y >= 0) {
            if (o.isMoving === undefined) {
                o.isMoving = false;
                o.stayStartTime = now;
                o.moveStartTime = 0;
                o.targetX = o.rect.x;
                o.startX = o.rect.x;
                o.boss7Phase = 1;
                o.phaseTransitionTime = 0;
                o.lastAttackTime = 0;
                o.boss7SingleShotTime = 0;
                o.boss7RotateAngle = 0;
            }
            let hpMax = 8000;
            if (o.boss7Phase === 1 && o.hp <= hpMax / 2) {
                o.boss7Phase = 3;
                o.phaseTransitionTime = now;
            }
            if (o.boss7Phase === 3) {
                if (now - o.phaseTransitionTime >= 1000) {
                    o.boss7Phase = 2;
                    o.stayStartTime = now;
                    o.isMoving = false;
                }
                continue;
            }
            if (!o.isMoving) {
                if (now - o.stayStartTime >= 2000) {
                    let moveDistance = 50 + Math.random() * 50;
                    let direction = Math.random() < 0.5 ? -1 : 1;
                    let newX = o.rect.x + direction * moveDistance;
                    newX = Math.max(0, Math.min(WIDTH - o.rect.width, newX));
                    o.targetX = newX;
                    o.startX = o.rect.x;
                    o.isMoving = true;
                    o.moveStartTime = now;
                }
            } else {
                let elapsed = now - o.moveStartTime;
                if (elapsed >= 500) {
                    o.rect.x = o.targetX;
                    o.isMoving = false;
                    o.stayStartTime = now;
                } else {
                    let progress = elapsed / 500;
                    o.rect.x = o.startX + (o.targetX - o.startX) * progress;
                }
            }
            if (!o.isMoving) {
                if (o.boss7Phase === 1) {
                    // 第一阶段：12个方向固定发射子弹，间隔30像素，速度6
                    if (now - o.lastAttackTime >= 100) {
                        let bx = o.rect.x + o.rect.width / 2;
                        let by = o.rect.y + o.rect.height / 2;
                        let spd = 6;
                        let dirs = [
                            { vx: spd * 0.866, vy: -spd * 0.5 },   // -30°
                            { vx: spd * 0.5, vy: -spd * 0.866 },   // -60°
                            { vx: 0, vy: -spd },                    // -90°
                            { vx: -spd * 0.5, vy: -spd * 0.866 },  // -120°
                            { vx: -spd * 0.866, vy: -spd * 0.5 },  // -150°
                            { vx: spd * 0.866, vy: spd * 0.5 },    // 30°
                            { vx: spd * 0.5, vy: spd * 0.866 },    // 60°
                            { vx: 0, vy: spd },                     // 90°
                            { vx: -spd * 0.5, vy: spd * 0.866 },   // 120°
                            { vx: -spd * 0.866, vy: spd * 0.5 },   // 150°
                            { vx: -spd, vy: 0 },                    // 180°
                            { vx: spd, vy: 0 }                     // -180°
                        ];
                        for (let d of dirs) {
                            let len = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
                            let nx = d.vx / len;
                            let ny = d.vy / len;
                            bossBullets.push({ x: bx + nx * 30, y: by + ny * 30, radius: player.width / 12, vx: d.vx, vy: d.vy });
                            bossBullets.push({ x: bx + nx * 60, y: by + ny * 60, radius: player.width / 12, vx: d.vx, vy: d.vy });
                            bossBullets.push({ x: bx + nx * 90, y: by + ny * 90, radius: player.width / 12, vx: d.vx, vy: d.vy });
                        }
                        o.lastAttackTime = now;
                    }
                } else if (o.boss7Phase === 2) {
                    // 第二阶段：12个方向旋转发射子弹，间隔30像素，速度6
                    if (now - o.lastAttackTime >= 100) {
                        let bx = o.rect.x + o.rect.width / 2;
                        let by = o.rect.y + o.rect.height / 2;
                        let spd = 6;
                        let baseAngles = [
                            -Math.PI / 6, -Math.PI / 3, -Math.PI / 2, -2 * Math.PI / 3, -5 * Math.PI / 6,
                            Math.PI / 6, Math.PI / 3, Math.PI / 2, 2 * Math.PI / 3, 5 * Math.PI / 6,
                            Math.PI, -Math.PI
                        ];
                        o.boss7RotateAngle += 0.05;
                        for (let baseAngle of baseAngles) {
                            let angle = baseAngle + o.boss7RotateAngle;
                            let vx = Math.cos(angle) * spd;
                            let vy = Math.sin(angle) * spd;
                            let nx = vx / spd;
                            let ny = vy / spd;
                            bossBullets.push({ x: bx + nx * 30, y: by + ny * 30, radius: player.width / 12, vx: vx, vy: vy });
                            bossBullets.push({ x: bx + nx * 60, y: by + ny * 60, radius: player.width / 12, vx: vx, vy: vy });
                            bossBullets.push({ x: bx + nx * 90, y: by + ny * 90, radius: player.width / 12, vx: vx, vy: vy });
                        }
                        o.lastAttackTime = now;
                    }
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

    // 绘制玩家飞机（使用贴图，无敌时闪烁）
    if (!invincible || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.drawImage(planeImg, player.x, player.y, player.width, player.height);
    }

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

    // Boss6警告文字
    if (boss6Phase === "warning") {
        ctx.fillStyle = "rgb(255,0,0)";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("终极boss来袭", WIDTH / 2, HEIGHT / 2);
        ctx.textAlign = "left";
    }

    // Boss7警告文字
    if (boss7Phase === "warning") {
        ctx.fillStyle = "rgb(255,0,0)";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("终极boss来袭", WIDTH / 2, HEIGHT / 2);
        ctx.textAlign = "left";
    }

    document.getElementById("scoreValue").textContent = score;

    animationId = requestAnimationFrame(gameLoop);
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
    boss6Phase = "none";
    boss6Triggered = false;
    boss7Phase = "none";
    boss7Triggered = false;
    gameStartTime = Date.now();
    window.lastTime = 0;
    gameStarted = true;
    shield_hits = 0;
    invincible = false;
    invincibleEndTime = 0;

    player.x = WIDTH / 2;
    player.y = HEIGHT - 100;

    running = true;
    document.getElementById("gameOver").classList.add("hidden");
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
});

// ==================== 启动 ====================
// 初始不自动启动，等待开始按钮
let gameStarted = false;
let gameStartTime = 0; // 游戏开始时间，用于计算游戏内秒数
let controlMode = "keyboard"; // 控制模式: keyboard / mouse
let gameMode = "endless"; // 游戏模式: endless / boss
let mouseX = WIDTH / 2;
let mouseY = HEIGHT / 2;

// 判断是否为移动端
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ==================== 开始按钮 ====================
document.getElementById("startBtn").addEventListener("click", () => {
    document.getElementById("startScreen").classList.add("hidden");
    if (isMobile()) {
        // 移动端显示加载界面并预加载图片
        if (!gameStarted) {
            const loadingText = document.getElementById("mobileLoadingText");
            const loadingProgress = document.getElementById("mobileLoadingProgress");
            const loadingScreen = document.getElementById("mobileLoadingScreen");
            if (loadingText) loadingText.textContent = "加载中... 0%";
            if (loadingProgress) loadingProgress.style.width = "0%";
            if (loadingScreen) loadingScreen.classList.remove("hidden");
            preloadImagesForMobile(() => {
                const ls = document.getElementById("mobileLoadingScreen");
                const cs = document.getElementById("controlScreen");
                if (ls) ls.classList.add("hidden");
                if (cs) cs.classList.remove("hidden");
            });
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
    document.getElementById("modeScreen").classList.remove("hidden");
});

document.getElementById("mouseOption").addEventListener("click", () => {
    controlMode = "mouse";
    document.getElementById("controlScreen").classList.add("hidden");
    document.getElementById("modeScreen").classList.remove("hidden");
});

// ==================== 游戏模式选择 ====================
document.getElementById("endlessOption").addEventListener("click", () => {
    gameMode = "endless";
    document.getElementById("modeScreen").classList.add("hidden");
    if (!gameStarted) {
        gameStarted = true;
        gameStartTime = Date.now();
        running = true;
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(gameLoop);
    }
});

document.getElementById("bossOption").addEventListener("click", () => {
    gameMode = "boss";
    document.getElementById("modeScreen").classList.add("hidden");
    document.getElementById("bossSelectScreen").classList.remove("hidden");
});

document.getElementById("boss1Btn").addEventListener("click", () => {
    document.getElementById("bossSelectScreen").classList.add("hidden");
    startBoss1Game();
});

document.getElementById("boss2Btn").addEventListener("click", () => {
    document.getElementById("bossSelectScreen").classList.add("hidden");
    startBoss2Game();
});

document.getElementById("boss3Btn").addEventListener("click", () => {
    document.getElementById("bossSelectScreen").classList.add("hidden");
    startBoss3Game();
});

document.getElementById("boss4Btn").addEventListener("click", () => {
    document.getElementById("bossSelectScreen").classList.add("hidden");
    startBoss4Game();
});

document.getElementById("backToModeFromBossBtn").addEventListener("click", () => {
    document.getElementById("bossSelectScreen").classList.add("hidden");
    document.getElementById("modeScreen").classList.remove("hidden");
});

document.getElementById("backToControlBtn").addEventListener("click", () => {
    document.getElementById("modeScreen").classList.add("hidden");
    document.getElementById("controlScreen").classList.remove("hidden");
});

document.getElementById("backToModeBtn").addEventListener("click", () => {
    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    document.getElementById("modeScreen").classList.remove("hidden");
    // 重置游戏状态
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
    boss6Phase = "none";
    boss8Phase = "none";
    boss9Phase = "none";
    boss6Triggered = false;
    boss7Triggered = false;
    boss9Triggered = false;
    gameStarted = false;
    shield_hits = 0;
    invincible = false;
    invincibleEndTime = 0;
    player.x = WIDTH / 2;
    player.y = HEIGHT - 100;
    running = false;
    // 清空画布
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
});

// ==================== 鼠标移动跟踪 ====================
canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
});

// ==================== Boss1模式 - 熔岩飞轮 (Boss7) ====================
let boss1Running = false;
let boss1AnimationId = null;

function startBoss1Game() {
    console.log("startBoss1Game 被调用!");
    running = false; // 停止无尽模式
    // 隐藏所有游戏结束弹窗
    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    // 重置状态
    obstacles = [];
    bossBullets = [];
    particles = [];
    score = 0;
    shield_hits = 0;
    invincible = false;
    invincibleEndTime = 0;
    player.x = WIDTH / 2;
    player.y = HEIGHT - 100;
    boss7Phase = "none";
    boss7Triggered = false;
    boss7RotateAngle = 0;
    boss1Running = true;
    window.lastBoss1LogTime = 0;
    window.boss1PlayerHP = 1; // 吃到1个子弹就失败

    let boss7StartTime = Date.now();

    function boss1Loop() {
        if (!boss1Running) return;

        let now = Date.now();
        let dt = 1 / 60;

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        updatePlayer();

        // Debug: 每秒打印一次状态
        if (!window.lastBoss1LogTime || now - window.lastBoss1LogTime > 5000) {
            let boss7 = obstacles.find(o => o.type === "boss7");
            console.log("Boss1Loop状态 - boss7Phase:" + boss7Phase + " bossHP:" + (boss7?.hp || "N/A") + " playerHP:" + (window.boss1PlayerHP || 3));
            window.lastBoss1LogTime = now;
        }

        // Boss7触发
        if (boss7Phase === "none" && now - boss7StartTime >= 2000) {
            boss7Triggered = true;
            boss7Phase = "warning";
            boss7StartTime = now;
        }

        // Boss7阶段处理
        if (boss7Phase === "warning") {
            if (now - boss7StartTime >= 1000) {
                boss7Phase = "waiting_after_warning";
                boss7StartTime = now;
            }
        } else if (boss7Phase === "waiting_after_warning") {
            if (now - boss7StartTime >= 1000) {
                boss7Phase = "appearing";
                boss7StartTime = now;
                let rect = { x: (WIDTH - 294) / 2, y: -294, width: 294, height: 294 };
                obstacles.push({ rect, hp: 8000, type: "boss7", lastAttackTime: 0 });
            }
        } else if (boss7Phase === "appearing") {
            let boss7 = obstacles.find(o => o.type === "boss7");
            if (boss7 && boss7.rect.y < 210) {
                boss7.rect.y += 4;
            } else if (boss7) {
                boss7.rect.y = 210;
                boss7Phase = "active";
            }
        }

        // Boss7攻击 - 按用户要求实现
        for (let o of obstacles) {
            if (o.type === "boss7" && boss7Phase === "active" && o.rect.y >= 0) {
                // 初始化Boss7状态
                if (o.boss7State === undefined) {
                    o.boss7State = 1; // 1=第一阶段, 2=过渡期, 3=第二阶段
                    o.isMoving = false;
                    o.stayStartTime = now;
                    o.moveStartTime = 0;
                    o.targetX = o.rect.x;
                    o.startX = o.rect.x;
                    o.lastAttackTime = 0;
                    o.boss7RotateAngle = 0;
                }

                let hpMax = 8000;

                // 第一阶段：血量>50%
                if (o.boss7State === 1 && o.hp <= hpMax / 2) {
                    o.boss7State = 2; // 过渡阶段
                    o.isMoving = false;
                    o.stayStartTime = now;
                    continue;
                }

                // 过渡阶段：休息1秒后进入第二阶段
                if (o.boss7State === 2) {
                    if (now - o.stayStartTime >= 1000) {
                        o.boss7State = 3; // 第二阶段
                        o.boss7RotateAngle = 0;
                        o.stayStartTime = now;
                        o.isMoving = false;
                    }
                    continue; // 过渡阶段不攻击也不移动
                }

                // 移动逻辑：停留2秒，移动0.5秒(50-100像素)
                if (!o.isMoving) {
                    // 静止状态，2秒后开始移动
                    if (now - o.stayStartTime >= 2000) {
                        let moveDistance = 50 + Math.random() * 50;
                        let direction = Math.random() < 0.5 ? -1 : 1;
                        let newX = o.rect.x + direction * moveDistance;
                        newX = Math.max(0, Math.min(WIDTH - o.rect.width, newX));
                        o.targetX = newX;
                        o.startX = o.rect.x;
                        o.isMoving = true;
                        o.moveStartTime = now;
                    }
                } else {
                    // 移动状态，0.5秒内匀速移动
                    let elapsed = now - o.moveStartTime;
                    if (elapsed >= 500) {
                        o.rect.x = o.targetX;
                        o.isMoving = false;
                        o.stayStartTime = now;
                    } else {
                        let progress = elapsed / 500;
                        o.rect.x = o.startX + (o.targetX - o.startX) * progress;
                    }
                }

                // 攻击逻辑：静止时攻击，移动时不攻击
                if (!o.isMoving) {
                    // 第一阶段：12个方向固定发射子弹，间隔30像素，速度6
                    if (o.boss7State === 1) {
                        if (now - o.lastAttackTime >= 100) {
                            let bx = o.rect.x + o.rect.width / 2;
                            let by = o.rect.y + o.rect.height / 2;
                            let spd = 6;
                            let dirs = [
                                { vx: spd * 0.866, vy: -spd * 0.5 },   // -30°
                                { vx: spd * 0.5, vy: -spd * 0.866 },   // -60°
                                { vx: 0, vy: -spd },                    // -90°
                                { vx: -spd * 0.5, vy: -spd * 0.866 },  // -120°
                                { vx: -spd * 0.866, vy: -spd * 0.5 },  // -150°
                                { vx: spd * 0.866, vy: spd * 0.5 },    // 30°
                                { vx: spd * 0.5, vy: spd * 0.866 },    // 60°
                                { vx: 0, vy: spd },                     // 90°
                                { vx: -spd * 0.5, vy: spd * 0.866 },   // 120°
                                { vx: -spd * 0.866, vy: spd * 0.5 },   // 150°
                                { vx: -spd, vy: 0 },                    // 180°
                                { vx: spd, vy: 0 }                     // -180°
                            ];
                            for (let d of dirs) {
                                let len = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
                                let nx = d.vx / len;
                                let ny = d.vy / len;
                                bossBullets.push({ x: bx + nx * 30, y: by + ny * 30, radius: player.width / 12, vx: d.vx, vy: d.vy });
                                bossBullets.push({ x: bx + nx * 60, y: by + ny * 60, radius: player.width / 12, vx: d.vx, vy: d.vy });
                                bossBullets.push({ x: bx + nx * 90, y: by + ny * 90, radius: player.width / 12, vx: d.vx, vy: d.vy });
                            }
                            o.lastAttackTime = now;
                        }
                    }
                    // 第二阶段：12个方向旋转发射子弹，间隔30像素，速度6
                    else if (o.boss7State === 3) {
                        if (now - o.lastAttackTime >= 100) {
                            let bx = o.rect.x + o.rect.width / 2;
                            let by = o.rect.y + o.rect.height / 2;
                            let spd = 6;
                            let baseAngles = [
                                -Math.PI / 6, -Math.PI / 3, -Math.PI / 2, -2 * Math.PI / 3, -5 * Math.PI / 6,
                                Math.PI / 6, Math.PI / 3, Math.PI / 2, 2 * Math.PI / 3, 5 * Math.PI / 6,
                                Math.PI, -Math.PI
                            ];
                            o.boss7RotateAngle += 0.05;
                            for (let baseAngle of baseAngles) {
                                let angle = baseAngle + o.boss7RotateAngle;
                                let vx = Math.cos(angle) * spd;
                                let vy = Math.sin(angle) * spd;
                                let nx = vx / spd;
                                let ny = vy / spd;
                                bossBullets.push({ x: bx + nx * 30, y: by + ny * 30, radius: player.width / 12, vx: vx, vy: vy });
                                bossBullets.push({ x: bx + nx * 60, y: by + ny * 60, radius: player.width / 12, vx: vx, vy: vy });
                                bossBullets.push({ x: bx + nx * 90, y: by + ny * 90, radius: player.width / 12, vx: vx, vy: vy });
                            }
                            o.lastAttackTime = now;
                        }
                    }
                }
            }
        }

        // 更新子弹
        for (let b of bossBullets) {
            if (b.vx !== undefined && b.vy !== undefined) {
                b.x += b.vx;
                b.y += b.vy;
            } else {
                b.y += b.speed;
            }
        }
        bossBullets = bossBullets.filter(b => b.y < HEIGHT && b.y > -50 && b.x > -50 && b.x < WIDTH + 50);

        // Boss1模式子弹碰撞检测
        for (let i = bossBullets.length - 1; i >= 0; i--) {
            let b = bossBullets[i];
            let dx = b.x - player.centerx();
            let dy = b.y - player.centery();
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.radius + player.width / 4) { // 缩小碰撞半径，更容易躲避
                if (shield_hits > 0) {
                    shield_hits--;
                    bossBullets.splice(i, 1);
                } else {
                    window.boss1PlayerHP--;
                    bossBullets.splice(i, 1);
                    if (window.boss1PlayerHP <= 0) {
                        boss1Running = false;
                        document.getElementById("bossGameOver").classList.remove("hidden");
                        return;
                    }
                }
            }
        }
        lasers();

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        particles.forEach(p => p.draw());

        // 检查碰撞 - 玩家与Boss7的身体碰撞(不应该导致游戏结束，只扣血)
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];
            if (o.type === "boss7" && boss7Phase === "active" && o.rect.y >= 0) {
                let dx = player.centerx() - (o.rect.x + o.rect.width / 2);
                let dy = player.centery() - (o.rect.y + o.rect.height / 2);
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < player.width / 2 + o.rect.width / 2) {
                    // 玩家碰到Boss身体，弹开并扣血
                    window.boss1PlayerHP--;
                    // 将玩家移开
                    player.y = o.rect.y + o.rect.height + 10;
                    if (window.boss1PlayerHP <= 0) {
                        boss1Running = false;
                        boss7Phase = "defeated";
                        document.getElementById("bossGameOver").classList.remove("hidden");
                        return;
                    }
                }
                if (o.hp <= 0) {
                    boss1Running = false;
                    boss7Phase = "defeated";
                    document.getElementById("bossGameOver").classList.remove("hidden");
                    return;
                }
            }
        }

        drawObstacles();
        // 绘制玩家飞机（先绘制，这样不会被Boss子弹遮挡）
        ctx.drawImage(planeImg, player.x, player.y, player.width, player.height);
        // 绘制Boss子弹（在玩家飞机之后，这样子弹显示在飞机上层，不会被飞机图片遮挡）
        for (let b of bossBullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
            ctx.fill();
        }
        // 绘制Boss来袭文字（在最上层，不会被遮挡）
        if (boss7Phase === "warning") {
            ctx.fillStyle = "rgb(255,0,0)";
            ctx.font = "48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("终极boss来袭", WIDTH / 2, HEIGHT / 2);
            ctx.textAlign = "left";
        }

        boss1AnimationId = requestAnimationFrame(boss1Loop);
    }

    boss1Loop();
}

document.getElementById("boss1RestartBtn").addEventListener("click", () => {
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    startBoss1Game();
});

document.getElementById("boss1BackBtn").addEventListener("click", () => {
    boss1Running = false;
    if (boss1AnimationId) cancelAnimationFrame(boss1AnimationId);
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    document.getElementById("bossSelectScreen").classList.remove("hidden");
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
});

// ==================== Boss2模式 - 超时空战神 (Boss6) ====================
let boss2Running = false;
let boss2AnimationId = null;

function startBoss2Game() {
    running = false;
    // 隐藏所有游戏结束弹窗
    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    // 重置状态
    obstacles = [];
    bossBullets = [];
    particles = [];
    score = 0;
    shield_hits = 0;
    invincible = false;
    invincibleEndTime = 0;
    player.x = WIDTH / 2;
    player.y = HEIGHT - 100;
    boss6Phase = "none";
    boss6Triggered = false;
    boss2Running = true;
    window.boss2PlayerHP = 1; // 吃到1个子弹就失败
    window.lastBoss2LogTime = 0;

    let boss6StartTime = Date.now();

    function boss2Loop() {
        if (!boss2Running) return;

        let now = Date.now();
        let dt = 1 / 60;

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        updatePlayer();

        // 无敌时间检查
        if (invincible && Date.now() > invincibleEndTime) {
            invincible = false;
        }

        // Debug: 每秒打印状态
        if (!window.lastBoss2LogTime || now - window.lastBoss2LogTime > 2000) {
            let boss6 = obstacles.find(o => o.type === "boss6");
            console.log("Boss6状态 - phase:" + boss6Phase + " HP:" + (boss6?.hp || "N/A") + " playerHP:" + window.boss2PlayerHP + " bulletCount:" + bossBullets.length + " shield:" + shield_hits);
            window.lastBoss2LogTime = now;
        }

        // Boss6触发
        if (boss6Phase === "none" && now - boss6StartTime >= 2000) {
            boss6Triggered = true;
            boss6Phase = "warning";
            boss6StartTime = now;
        }

        // Boss6阶段处理
        if (boss6Phase === "warning") {
            if (now - boss6StartTime >= 1000) {
                boss6Phase = "waiting_after_warning";
                boss6StartTime = now;
            }
        } else if (boss6Phase === "waiting_after_warning") {
            if (now - boss6StartTime >= 1000) {
                boss6Phase = "appearing";
                boss6StartTime = now;
                let rect = { x: (WIDTH - 294) / 2, y: -294, width: 294, height: 294 };
                obstacles.push({ rect, hp: 10000, type: "boss6", lastAttackTime: 0 });
            }
        } else if (boss6Phase === "appearing") {
            let boss6 = obstacles.find(o => o.type === "boss6");
            if (boss6 && boss6.rect.y < 60) {
                boss6.rect.y += 4;
            } else if (boss6) {
                boss6.rect.y = 60;
                boss6Phase = "active";
            }
        }

        // Boss6攻击
        for (let o of obstacles) {
            if (o.type === "boss6" && boss6Phase === "active" && o.rect.y >= 0) {
                if (o.isMoving === undefined) {
                    o.isMoving = false;
                    o.stayStartTime = now;
                    o.moveStartTime = 0;
                    o.targetX = o.rect.x;
                    o.startX = o.rect.x;
                    o.boss6Phase = 1;
                    o.phaseTransitionTime = 0;
                    o.lastAttackTime = 0;
                    o.boss6SingleShotTime = 0;
                }
                let hpMax = 10000;
                if (o.boss6Phase === 1 && o.hp <= hpMax / 2) {
                    o.boss6Phase = 3;
                    o.phaseTransitionTime = now;
                }
                if (o.boss6Phase === 3) {
                    if (now - o.phaseTransitionTime >= 1000) {
                        o.boss6Phase = 2;
                        o.stayStartTime = now;
                        o.isMoving = false;
                    }
                    continue;
                }
                if (!o.isMoving) {
                    if (now - o.stayStartTime >= 5000) {
                        let moveDistance = 50 + Math.random() * 50;
                        let direction = Math.random() < 0.5 ? -1 : 1;
                        let newX = o.rect.x + direction * moveDistance;
                        newX = Math.max(0, Math.min(WIDTH - o.rect.width, newX));
                        o.targetX = newX;
                        o.startX = o.rect.x;
                        o.isMoving = true;
                        o.moveStartTime = now;
                    }
                } else {
                    let elapsed = now - o.moveStartTime;
                    if (elapsed >= 500) {
                        o.rect.x = o.targetX;
                        o.isMoving = false;
                        o.stayStartTime = now;
                    } else {
                        let progress = elapsed / 500;
                        o.rect.x = o.startX + (o.targetX - o.startX) * progress;
                    }
                }
                if (!o.isMoving) {
                    if (o.boss6Phase === 1) {
                        if (now - o.lastAttackTime >= 1000) {
                            let bx = o.rect.x + o.rect.width / 2;
                            let by = o.rect.y + o.rect.height / 2;
                            let spd = 6;
                            let dirs = [
                                { vx: spd * 0.866, vy: spd * 0.5 },
                                { vx: spd * 0.5, vy: spd * 0.866 },
                                { vx: 0, vy: spd },
                                { vx: -spd * 0.5, vy: spd * 0.866 },
                                { vx: -spd * 0.866, vy: spd * 0.5 }
                            ];
                            for (let d of dirs) {
                                let len = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
                                let nx = d.vx / len;
                                let ny = d.vy / len;
                                for (let j = 0; j < 3; j++) {
                                    let offset = j * 30;
                                    bossBullets.push({ x: bx + nx * offset, y: by + ny * offset, radius: player.width / 12, vx: d.vx, vy: d.vy });
                                }
                            }
                            o.lastAttackTime = now;
                        }
                        if (now - o.boss6SingleShotTime >= 500) {
                            let bx = o.rect.x + o.rect.width / 2;
                            let by = o.rect.y + o.rect.height / 2;
                            let dx = player.centerx() - bx;
                            let dy = player.centery() - by;
                            let dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > 0) {
                                bossBullets.push({ x: bx, y: by, radius: player.width / 12, vx: (dx / dist) * 1, vy: (dy / dist) * 1 });
                            }
                            o.boss6SingleShotTime = now;
                        }
                    } else if (o.boss6Phase === 2) {
                        if (now - o.lastAttackTime >= 1000) {
                            let bx = o.rect.x + o.rect.width / 2;
                            let by = o.rect.y + o.rect.height / 2;
                            let spd = 8;
                            let dirs = [
                                { vx: spd * 0.966, vy: spd * 0.259 },
                                { vx: spd * 0.866, vy: spd * 0.5 },
                                { vx: spd * 0.707, vy: spd * 0.707 },
                                { vx: spd * 0.5, vy: spd * 0.866 },
                                { vx: spd * 0.259, vy: spd * 0.966 },
                                { vx: 0, vy: spd },
                                { vx: -spd * 0.259, vy: spd * 0.966 },
                                { vx: -spd * 0.5, vy: spd * 0.866 },
                                { vx: -spd * 0.707, vy: spd * 0.707 },
                                { vx: -spd * 0.866, vy: spd * 0.5 }
                            ];
                            for (let d of dirs) {
                                let len = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
                                let nx = d.vx / len;
                                let ny = d.vy / len;
                                for (let j = 0; j < 6; j++) {
                                    let offset = j * 30;
                                    bossBullets.push({ x: bx + nx * offset, y: by + ny * offset, radius: player.width / 12, vx: d.vx, vy: d.vy });
                                }
                            }
                            o.lastAttackTime = now;
                        }
                        if (now - o.boss6SingleShotTime >= 500) {
                            let bx = o.rect.x + o.rect.width / 2;
                            let by = o.rect.y + o.rect.height / 2;
                            let dx = player.centerx() - bx;
                            let dy = player.centery() - by;
                            let dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > 0) {
                                bossBullets.push({ x: bx, y: by, radius: player.width / 12, vx: (dx / dist) * 2, vy: (dy / dist) * 2 });
                            }
                            o.boss6SingleShotTime = now;
                        }
                    }
                }
            }
        }

        // 更新子弹
        for (let b of bossBullets) {
            if (b.vx !== undefined && b.vy !== undefined) {
                b.x += b.vx;
                b.y += b.vy;
            } else {
                b.y += b.speed;
            }
        }
        bossBullets = bossBullets.filter(b => b.y < HEIGHT && b.y > -50 && b.x > -50 && b.x < WIDTH + 50);

        // Boss2模式子弹碰撞检测
        for (let i = bossBullets.length - 1; i >= 0; i--) {
            let b = bossBullets[i];
            let dx = b.x - player.centerx();
            let dy = b.y - player.centery();
            let dist = Math.sqrt(dx * dx + dy * dy);
            let collisionThreshold = b.radius + player.width / 4;
            if (dist < collisionThreshold) {
                console.log("Boss6子弹碰撞! dist:" + dist.toFixed(1) + " threshold:" + collisionThreshold.toFixed(1) + " shield_hits:" + shield_hits + " HP:" + window.boss2PlayerHP);
                if (shield_hits > 0) {
                    shield_hits--;
                    bossBullets.splice(i, 1);
                } else {
                    window.boss2PlayerHP--;
                    bossBullets.splice(i, 1);
                    console.log("扣血后HP:" + window.boss2PlayerHP);
                    if (window.boss2PlayerHP <= 0) {
                        boss2Running = false;
                        document.getElementById("boss2GameOver").classList.remove("hidden");
                        return;
                    }
                }
            }
        }
        lasers();

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        particles.forEach(p => p.draw());

        // 检查碰撞 - 玩家与Boss6的身体碰撞
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];
            if (o.type === "boss6" && boss6Phase === "active" && o.rect.y >= 0) {
                let dx = player.centerx() - (o.rect.x + o.rect.width / 2);
                let dy = player.centery() - (o.rect.y + o.rect.height / 2);
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < player.width / 2 + o.rect.width / 2) {
                    // 玩家碰到Boss身体，弹开并扣血
                    window.boss2PlayerHP--;
                    player.y = o.rect.y + o.rect.height + 10;
                    if (window.boss2PlayerHP <= 0) {
                        boss2Running = false;
                        boss6Phase = "defeated";
                        document.getElementById("boss2GameOver").classList.remove("hidden");
                        return;
                    }
                }
                if (o.hp <= 0) {
                    boss2Running = false;
                    boss6Phase = "defeated";
                    document.getElementById("boss2GameOver").classList.remove("hidden");
                    return;
                }
            }
        }

        drawObstacles();
        // 绘制玩家飞机（先绘制，这样不会被Boss子弹遮挡）
        if (!invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.drawImage(planeImg, player.x, player.y, player.width, player.height);
        }
        // 绘制Boss子弹（在玩家飞机之后，这样子弹显示在飞机上层，不会被飞机图片遮挡）
        for (let b of bossBullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
            ctx.fill();
        }
        // 绘制Boss来袭文字（在最上层，不会被遮挡）
        if (boss6Phase === "warning") {
            ctx.fillStyle = "rgb(255,0,0)";
            ctx.font = "48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("终极boss来袭", WIDTH / 2, HEIGHT / 2);
            ctx.textAlign = "left";
        }

        boss2AnimationId = requestAnimationFrame(boss2Loop);
    }

    boss2Loop();
}

// ==================== Boss3模式 - 荷鲁斯之眼 (Boss8) ====================
let boss3Running = false;
let boss3AnimationId = null;

// ==================== Boss4模式 - Boss9 ====================
let boss4Running = false;
let boss4AnimationId = null;

function startBoss3Game() {
    running = false;
    // 隐藏所有游戏结束弹窗
    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    // 重置状态
    obstacles = [];
    bossBullets = [];
    particles = [];
    score = 0;
    shield_hits = 0;
    invincible = false;
    invincibleEndTime = 0;
    player.x = WIDTH / 2;
    player.y = HEIGHT - 100;
    boss8Phase = "none";
    boss8Triggered = false;
    boss8StartTime = Date.now();
    boss3Running = true;
    window.boss3PlayerHP = 1;
    window.lastBoss3LogTime = 0;

    function boss3Loop() {
        if (!boss3Running) return;

        let now = Date.now();
        let dt = 1 / 60;

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        updatePlayer();

        // 无敌时间检查
        if (invincible && Date.now() > invincibleEndTime) {
            invincible = false;
        }

        // Debug: 每秒打印状态
        if (!window.lastBoss3LogTime || now - window.lastBoss3LogTime > 2000) {
            let boss8 = obstacles.find(o => o.type === "boss8");
            console.log("Boss8状态 - phase:" + boss8Phase + " HP:" + (boss8?.hp || "N/A") + " playerHP:" + window.boss3PlayerHP + " bulletCount:" + bossBullets.length + " shield:" + shield_hits);
            window.lastBoss3LogTime = now;
        }

        // Boss8触发
        if (boss8Phase === "none" && now - boss8StartTime >= 2000) {
            boss8Triggered = true;
            boss8Phase = "warning";
            boss8StartTime = now;
        }

        // Boss8阶段处理
        if (boss8Phase === "warning") {
            if (now - boss8StartTime >= 1000) {
                boss8Phase = "waiting_after_warning";
                boss8StartTime = now;
            }
        } else if (boss8Phase === "waiting_after_warning") {
            if (now - boss8StartTime >= 1000) {
                boss8Phase = "appearing";
                boss8StartTime = now;
                let rect = { x: (WIDTH - 294) / 2, y: -294, width: 294, height: 294 };
                obstacles.push({ rect, hp: 12000, type: "boss8", lastAttackTime: 0 });
            }
        } else if (boss8Phase === "appearing") {
            let boss8 = obstacles.find(o => o.type === "boss8");
            if (boss8 && boss8.rect.y < 253) {
                boss8.rect.y += 4;
            } else if (boss8) {
                boss8.rect.y = 253;
                boss8Phase = "active";
            }
        }

        // Boss8攻击
        for (let o of obstacles) {
            if (o.type === "boss8" && boss8Phase === "active" && o.rect.y >= 0) {
                if (o.isMoving === undefined) {
                    o.isMoving = false;
                    o.stayStartTime = now;
                    o.moveStartTime = 0;
                    o.targetX = o.rect.x;
                    o.startX = o.rect.x;
                    o.boss8Phase = 1;
                    o.phaseTransitionTime = 0;
                    o.lastSpikeTime = 0;
                    o.lastTrackTime = 0;
                    o.spikeDirUp = true;
                    o.moveCount = 0;
                }
                let hpMax = 12000;
                if (o.boss8Phase === 1 && o.hp <= hpMax / 2) {
                    o.boss8Phase = 3;
                    o.phaseTransitionTime = now;
                }
                if (o.boss8Phase === 3) {
                    if (now - o.phaseTransitionTime >= 1000) {
                        o.boss8Phase = 2;
                        o.stayStartTime = now;
                        o.isMoving = false;
                        o.moveCount = 0;
                    }
                    continue;
                }
                if (!o.isMoving) {
                    if (now - o.stayStartTime >= 5000) {
                        let moveDistance = 50 + Math.random() * 50;
                        let direction = Math.random() < 0.5 ? -1 : 1;
                        let newX = o.rect.x + direction * moveDistance;
                        newX = Math.max(0, Math.min(WIDTH - o.rect.width, newX));
                        o.targetX = newX;
                        o.startX = o.rect.x;
                        o.isMoving = true;
                        o.moveStartTime = now;
                        o.moveCount++;
                        o.spikeDirUp = !o.spikeDirUp;
                    }
                } else {
                    let elapsed = now - o.moveStartTime;
                    if (elapsed >= 500) {
                        o.rect.x = o.targetX;
                        o.isMoving = false;
                        o.stayStartTime = now;
                    } else {
                        let progress = elapsed / 500;
                        o.rect.x = o.startX + (o.targetX - o.startX) * progress;
                    }
                }
                // 攻击（静止时）
                if (!o.isMoving) {
                    let bx = o.rect.x + o.rect.width / 2;
                    let by = o.rect.y + o.rect.height / 2;

                    // 初始化激光旋转角度（随机初始位置，但不能在玩家方向30度范围内）
                    if (o.laserRotationTarget === undefined) {
                        let playerAngle = Math.atan2(player.y - by, player.centerx() - bx);
                        let validAngle = false;
                        let attempts = 0;
                        while (!validAngle && attempts < 100) {
                            o.laserRotation = Math.random() * Math.PI * 2;
                            validAngle = true;
                            for (let i = 0; i < 4; i++) {
                                let laserAngle = o.laserRotation + (i * Math.PI / 2);
                                let angleDiff = Math.abs(laserAngle - playerAngle);
                                angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
                                if (angleDiff < 30 * Math.PI / 180) {
                                    validAngle = false;
                                    break;
                                }
                            }
                            attempts++;
                        }
                        // 如果100次都没找到，就设置在飞机向左40度的位置
                        if (!validAngle) {
                            o.laserRotation = playerAngle - 40 * Math.PI / 180;
                        }
                        o.laserRotationTarget = o.laserRotation + (o.boss8Phase === 1 ? 10 : 45) * Math.PI / 180;
                        o.laserRotationCycleStart = now;
                        o.rotationDone = false;
                    }

                    // 激光旋转逻辑：呆1秒，旋转1秒到新位置
                    let cycleTime = now - o.laserRotationCycleStart;
                    let rotationStep = o.boss8Phase === 1 ? 10 : 45;

                    if (o.rotationDone) {
                        // 旋转完成后，停留1秒
                        if (cycleTime >= 1000) {
                            o.rotationDone = false;
                            o.laserRotation = o.laserRotationTarget;
                            o.laserRotationTarget = o.laserRotation + rotationStep * Math.PI / 180;
                            o.laserRotationCycleStart = now;
                        }
                    } else {
                        // 旋转阶段，1秒内旋转到目标角度
                        if (cycleTime >= 1000) {
                            o.laserRotation = o.laserRotationTarget;
                            o.rotationDone = true;
                            o.laserRotationCycleStart = now;
                        } else {
                            let progress = cycleTime / 1000;
                            o.laserRotation = o.laserRotation + (o.laserRotationTarget - o.laserRotation) * progress;
                        }
                    }

                    // 激光碰撞检测（Boss移动时不触发）
                    if (!o.isMoving && !invincible) {
                        let px = player.centerx();
                        let py = player.centery();
                        let playerRadius = player.width / 4;
                        let collisionWidth = 30;
                        for (let i = 0; i < 4; i++) {
                            let angle = o.laserRotation + (i * Math.PI / 2);
                            let cosA = Math.cos(angle);
                            let sinA = Math.sin(angle);
                            let dist = Math.abs(sinA * (px - bx) - cosA * (py - by));
                            if (dist < playerRadius + collisionWidth / 2) {
                                window.boss3PlayerHP--;
                                player.y = o.rect.y + o.rect.height + 10;
                                if (window.boss3PlayerHP <= 0) {
                                    boss3Running = false;
                                    boss8Phase = "defeated";
                                    document.getElementById("boss3GameOver").classList.remove("hidden");
                                    return;
                                }
                                break;
                            }
                        }
                    }

                    // 尖刺子弹（有限距离激光）
                    if (now - o.lastSpikeTime >= 1000) {
                        let spikeDirs = [];
                        if (o.spikeDirUp) {
                            for (let angle = 20; angle <= 160; angle += 20) {
                                let rad = angle * Math.PI / 180;
                                spikeDirs.push({ vx: Math.cos(rad), vy: -Math.sin(rad) });
                            }
                            for (let angle = -30; angle >= -150; angle -= 30) {
                                let rad = angle * Math.PI / 180;
                                spikeDirs.push({ vx: Math.cos(rad), vy: Math.abs(Math.sin(rad)) });
                            }
                        } else {
                            for (let angle = -30; angle >= -150; angle -= 30) {
                                let rad = angle * Math.PI / 180;
                                spikeDirs.push({ vx: Math.cos(rad), vy: Math.abs(Math.sin(rad)) });
                            }
                            for (let angle = 20; angle <= 160; angle += 20) {
                                let rad = angle * Math.PI / 180;
                                spikeDirs.push({ vx: Math.cos(rad), vy: -Math.sin(rad) });
                            }
                        }
                        for (let d of spikeDirs) {
                            let spikeSpeed = o.boss8Phase === 1 ? 10 : 12;
                            bossBullets.push({
                                x: bx, y: by,
                                vx: d.vx * spikeSpeed, vy: d.vy * spikeSpeed,
                                radius: player.width / 12,
                                isSpike: true,
                                spikeAngle: Math.atan2(d.vy, d.vx),
                                spikeLength: 100
                            });
                        }
                        o.lastSpikeTime = now;
                    }

                    // 追踪弹
                    if (o.boss8Phase === 1 && now - o.lastTrackTime >= 1000) {
                        let dx = player.centerx() - bx;
                        let dy = player.centery() - by;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            bossBullets.push({ x: bx, y: by, radius: player.width / 12, vx: (dx / dist) * 0.5, vy: (dy / dist) * 0.5 });
                        }
                        o.lastTrackTime = now;
                    } else if (o.boss8Phase === 2 && now - o.lastTrackTime >= 500) {
                        let dx = player.centerx() - bx;
                        let dy = player.centery() - by;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            for (let i = -1; i <= 1; i++) {
                                let perpX = -dy / dist * i * 15;
                                let perpY = dx / dist * i * 15;
                                bossBullets.push({ x: bx + perpX, y: by + perpY, radius: player.width / 12, vx: (dx / dist) * 0.8, vy: (dy / dist) * 0.8 });
                            }
                        }
                        o.lastTrackTime = now;
                    }
                }
            }
        }

        // 更新子弹
        for (let b of bossBullets) {
            if (b.vx !== undefined && b.vy !== undefined) {
                b.x += b.vx;
                b.y += b.vy;
            } else {
                b.y += b.speed;
            }
        }
        bossBullets = bossBullets.filter(b => b.y < HEIGHT && b.y > -50 && b.x > -50 && b.x < WIDTH + 50);

        // Boss3模式子弹碰撞检测
        for (let i = bossBullets.length - 1; i >= 0; i--) {
            let b = bossBullets[i];
            let dx = b.x - player.centerx();
            let dy = b.y - player.centery();
            let dist = Math.sqrt(dx * dx + dy * dy);
            let collisionThreshold = b.radius + player.width / 4;
            if (dist < collisionThreshold) {
                console.log("Boss8子弹碰撞! dist:" + dist.toFixed(1) + " threshold:" + collisionThreshold.toFixed(1) + " shield:" + shield_hits + " HP:" + window.boss3PlayerHP);
                if (shield_hits > 0) {
                    shield_hits--;
                    bossBullets.splice(i, 1);
                } else {
                    window.boss3PlayerHP--;
                    bossBullets.splice(i, 1);
                    console.log("扣血后HP:" + window.boss3PlayerHP);
                    if (window.boss3PlayerHP <= 0) {
                        boss3Running = false;
                        document.getElementById("boss3GameOver").classList.remove("hidden");
                        return;
                    }
                }
            }
        }
        lasers();

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        particles.forEach(p => p.draw());

        // 检查碰撞 - 玩家与Boss8的身体碰撞
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];
            if (o.type === "boss8" && boss8Phase === "active" && o.rect.y >= 0) {
                let dx = player.centerx() - (o.rect.x + o.rect.width / 2);
                let dy = player.centery() - (o.rect.y + o.rect.height / 2);
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < player.width / 2 + o.rect.width / 2) {
                    window.boss3PlayerHP--;
                    player.y = o.rect.y + o.rect.height + 10;
                    if (window.boss3PlayerHP <= 0) {
                        boss3Running = false;
                        boss8Phase = "defeated";
                        document.getElementById("boss3GameOver").classList.remove("hidden");
                        return;
                    }
                }
                if (o.hp <= 0) {
                    boss3Running = false;
                    boss8Phase = "defeated";
                    document.getElementById("boss3GameOver").classList.remove("hidden");
                    return;
                }
            }
        }

        drawObstacles();
        if (!invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.drawImage(planeImg, player.x, player.y, player.width, player.height);
        }

        // 绘制Boss8紫色激光（在玩家飞机之上，Boss移动时不发射）
        let boss8Obj = obstacles.find(o => o.type === "boss8");
        if (boss8Obj && boss8Obj.laserRotationTarget !== undefined && !boss8Obj.isMoving) {
            let bx = boss8Obj.rect.x + boss8Obj.rect.width / 2;
            let by = boss8Obj.rect.y + boss8Obj.rect.height / 2;
            let laserLength = 1000;
            let pulsePhase = now / 100;
            for (let i = 0; i < 4; i++) {
                let angle = boss8Obj.laserRotation + (i * Math.PI / 2);
                let cosA = Math.cos(angle);
                let sinA = Math.sin(angle);
                let endX = bx + cosA * laserLength;
                let endY = by + sinA * laserLength;

                // 外层发光
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(200, 100, 255, ${0.15 + 0.1 * Math.sin(pulsePhase + i)})`;
                ctx.lineWidth = boss8Obj.boss8Phase === 1 ? 30 + 5 * Math.sin(pulsePhase + i) : 32 + 5 * Math.sin(pulsePhase + i);
                ctx.stroke();

                // 中层
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(180, 120, 255, ${0.3 + 0.15 * Math.sin(pulsePhase + i)})`;
                ctx.lineWidth = boss8Obj.boss8Phase === 1 ? 20 + 3 * Math.sin(pulsePhase + i) : 22 + 3 * Math.sin(pulsePhase + i);
                ctx.stroke();

                // 核心
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(220, 180, 255, ${0.6 + 0.2 * Math.sin(pulsePhase + i)})`;
                ctx.lineWidth = boss8Obj.boss8Phase === 1 ? 8 + 2 * Math.sin(pulsePhase + i) : 10 + 2 * Math.sin(pulsePhase + i);
                ctx.stroke();
            }
        }

        for (let b of bossBullets) {
            if (b.isSpike) {
                let angle = b.spikeAngle;
                let len = b.spikeLength;
                let w = 10;
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(angle);
                ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
                ctx.beginPath();
                ctx.moveTo(len / 2, 0);
                ctx.lineTo(-len / 2, -w / 2);
                ctx.lineTo(-len / 2, w / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
                ctx.fill();
            }
        }
        if (boss8Phase === "warning") {
            ctx.fillStyle = "rgb(255,0,0)";
            ctx.font = "48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("终极boss来袭", WIDTH / 2, HEIGHT / 2);
            ctx.textAlign = "left";
        }

        boss3AnimationId = requestAnimationFrame(boss3Loop);
    }

    boss3Loop();
}

document.getElementById("boss2RestartBtn").addEventListener("click", () => {
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    startBoss2Game();
});

document.getElementById("boss2BackBtn").addEventListener("click", () => {
    boss2Running = false;
    if (boss2AnimationId) cancelAnimationFrame(boss2AnimationId);
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    document.getElementById("bossSelectScreen").classList.remove("hidden");
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
});

document.getElementById("boss3RestartBtn").addEventListener("click", () => {
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    startBoss3Game();
});

document.getElementById("boss3BackBtn").addEventListener("click", () => {
    boss3Running = false;
    if (boss3AnimationId) cancelAnimationFrame(boss3AnimationId);
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    document.getElementById("bossSelectScreen").classList.remove("hidden");
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
});

function startBoss4Game() {
    running = false;
    // 隐藏所有游戏结束弹窗
    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    obstacles = [];
    bossBullets = [];
    particles = [];
    score = 0;
    shield_hits = 0;
    invincible = false;
    invincibleEndTime = 0;
    player.x = WIDTH / 2;
    player.y = HEIGHT - 100;
    boss9Phase = "none";
    boss9Triggered = false;
    boss9StartTime = Date.now();
    boss4Running = true;
    window.boss4PlayerHP = 1;
    window.lastBoss4LogTime = 0;

    function boss4Loop() {
        if (!boss4Running) return;

        let now = Date.now();
        let dt = 1 / 60;

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        updatePlayer();

        if (invincible && Date.now() > invincibleEndTime) {
            invincible = false;
        }

        if (!window.lastBoss4LogTime || now - window.lastBoss4LogTime > 2000) {
            let boss9 = obstacles.find(o => o.type === "boss9");
            console.log("Boss9状态 - phase:" + boss9Phase + " HP:" + (boss9?.hp || "N/A") + " playerHP:" + window.boss4PlayerHP + " bulletCount:" + bossBullets.length + " shield:" + shield_hits);
            window.lastBoss4LogTime = now;
        }

        if (boss9Phase === "none" && now - boss9StartTime >= 2000) {
            boss9Triggered = true;
            boss9Phase = "warning";
            boss9StartTime = now;
        }

        if (boss9Phase === "warning") {
            if (now - boss9StartTime >= 1000) {
                boss9Phase = "waiting_after_warning";
                boss9StartTime = now;
            }
        } else if (boss9Phase === "waiting_after_warning") {
            if (now - boss9StartTime >= 1000) {
                boss9Phase = "appearing";
                boss9StartTime = now;
                let rect = { x: (WIDTH - 294) / 2, y: -294, width: 294, height: 294 };
                obstacles.push({ rect, hp: 12000, type: "boss9", lastAttackTime: 0 });
            }
        } else if (boss9Phase === "appearing") {
            let boss9 = obstacles.find(o => o.type === "boss9");
            if (boss9 && boss9.rect.y < 253) {
                boss9.rect.y += 4;
            } else if (boss9) {
                boss9.rect.y = 253;
                boss9Phase = "active";
            }
        }

        for (let o of obstacles) {
            if (o.type === "boss9" && boss9Phase === "active" && o.rect.y >= 0) {
                if (o.isMoving === undefined) {
                    o.isMoving = false;
                    o.stayStartTime = now;
                    o.moveStartTime = 0;
                    o.targetX = o.rect.x;
                    o.startX = o.rect.x;
                    o.boss9Phase = 1;
                    o.phaseTransitionTime = 0;
                    o.lastSpikeTime = 0;
                    o.lastTrackTime = 0;
                    o.spiralAngle = 0;
                    o.moveCount = 0;
                }
                let hpMax = 12000;
                if (o.boss9Phase === 1 && o.hp <= hpMax / 2) {
                    o.boss9Phase = 3;
                    o.phaseTransitionTime = now;
                }
                if (o.boss9Phase === 3) {
                    if (now - o.phaseTransitionTime >= 1000) {
                        o.boss9Phase = 2;
                        o.stayStartTime = now;
                        o.isMoving = false;
                        o.moveCount = 0;
                    }
                    continue;
                }
                if (!o.isMoving) {
                    if (now - o.stayStartTime >= 5000) {
                        let moveDistance = 50 + Math.random() * 50;
                        let direction = Math.random() < 0.5 ? -1 : 1;
                        let newX = o.rect.x + direction * moveDistance;
                        newX = Math.max(0, Math.min(WIDTH - o.rect.width, newX));
                        o.targetX = newX;
                        o.startX = o.rect.x;
                        o.isMoving = true;
                        o.moveStartTime = now;
                        o.moveCount++;
                        o.spikeDirUp = !o.spikeDirUp;
                    }
                } else {
                    let elapsed = now - o.moveStartTime;
                    if (elapsed >= 500) {
                        o.rect.x = o.targetX;
                        o.isMoving = false;
                        o.stayStartTime = now;
                    } else {
                        let progress = elapsed / 500;
                        o.rect.x = o.startX + (o.targetX - o.startX) * progress;
                    }
                }
                if (!o.isMoving) {
                    let bx = o.rect.x + o.rect.width / 2;
                    let by = o.rect.y + o.rect.height / 2;

                    if (o.laserRotationTarget === undefined) {
                        let playerAngle = Math.atan2(player.y - by, player.centerx() - bx);
                        let validAngle = false;
                        let attempts = 0;
                        while (!validAngle && attempts < 100) {
                            o.laserRotation = Math.random() * Math.PI * 2;
                            validAngle = true;
                            for (let i = 0; i < 4; i++) {
                                let laserAngle = o.laserRotation + (i * Math.PI / 2);
                                let angleDiff = Math.abs(laserAngle - playerAngle);
                                angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
                                if (angleDiff < 30 * Math.PI / 180) {
                                    validAngle = false;
                                    break;
                                }
                            }
                            attempts++;
                        }
                        if (!validAngle) {
                            o.laserRotation = playerAngle - 40 * Math.PI / 180;
                        }
                        o.laserRotationTarget = o.laserRotation + (o.boss9Phase === 1 ? 10 : 45) * Math.PI / 180;
                        o.laserRotationCycleStart = now;
                        o.rotationDone = false;
                    }

                    let cycleTime = now - o.laserRotationCycleStart;
                    let rotationStep = o.boss9Phase === 1 ? 10 : 45;

                    if (o.rotationDone) {
                        if (cycleTime >= 1000) {
                            o.rotationDone = false;
                            o.laserRotation = o.laserRotationTarget;
                            o.laserRotationTarget = o.laserRotation + rotationStep * Math.PI / 180;
                            o.laserRotationCycleStart = now;
                        }
                    } else {
                        if (cycleTime >= 1000) {
                            o.laserRotation = o.laserRotationTarget;
                            o.rotationDone = true;
                            o.laserRotationCycleStart = now;
                        } else {
                            let progress = cycleTime / 1000;
                            o.laserRotation = o.laserRotation + (o.laserRotationTarget - o.laserRotation) * progress;
                        }
                    }

                    if (!o.isMoving && !invincible) {
                        let px = player.centerx();
                        let py = player.centery();
                        let playerRadius = player.width / 4;
                        let collisionWidth = 30;
                        for (let i = 0; i < 4; i++) {
                            let angle = o.laserRotation + (i * Math.PI / 2);
                            let cosA = Math.cos(angle);
                            let sinA = Math.sin(angle);
                            let dist = Math.abs(sinA * (px - bx) - cosA * (py - by));
                            if (dist < playerRadius + collisionWidth / 2) {
                                window.boss4PlayerHP--;
                                player.y = o.rect.y + o.rect.height + 10;
                                if (window.boss4PlayerHP <= 0) {
                                    boss4Running = false;
                                    boss9Phase = "defeated";
                                    document.getElementById("boss4GameOver").classList.remove("hidden");
                                    return;
                                }
                                break;
                            }
                        }
                    }

                    if (now - o.lastSpikeTime >= 1000) {
                        let bulletCount = o.boss9Phase === 1 ? 12 : 20;
                        let spiralStep = o.boss9Phase === 1 ? 15 : 30;
                        let spikeSpeed = o.boss9Phase === 1 ? 2 : 3;
                        for (let i = 0; i < bulletCount; i++) {
                            let angle = (o.spiralAngle + i * spiralStep) * Math.PI / 180;
                            bossBullets.push({
                                x: bx, y: by,
                                vx: Math.cos(angle) * spikeSpeed,
                                vy: Math.sin(angle) * spikeSpeed,
                                radius: player.width / 12
                            });
                        }
                        o.spiralAngle = (o.spiralAngle + spiralStep) % 360;
                        o.lastSpikeTime = now;
                    }

                    if (o.boss9Phase === 1 && now - o.lastTrackTime >= 1000) {
                        let dx = player.centerx() - bx;
                        let dy = player.centery() - by;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            bossBullets.push({ x: bx, y: by, radius: player.width / 12, vx: (dx / dist) * 0.5, vy: (dy / dist) * 0.5 });
                        }
                        o.lastTrackTime = now;
                    } else if (o.boss9Phase === 2 && now - o.lastTrackTime >= 500) {
                        let dx = player.centerx() - bx;
                        let dy = player.centery() - by;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            for (let i = -1; i <= 1; i++) {
                                let perpX = -dy / dist * i * 15;
                                let perpY = dx / dist * i * 15;
                                bossBullets.push({ x: bx + perpX, y: by + perpY, radius: player.width / 12, vx: (dx / dist) * 0.8, vy: (dy / dist) * 0.8 });
                            }
                        }
                        o.lastTrackTime = now;
                    }
                }
            }
        }

        for (let b of bossBullets) {
            if (b.vx !== undefined && b.vy !== undefined) {
                b.x += b.vx;
                b.y += b.vy;
            } else {
                b.y += b.speed;
            }
        }
        bossBullets = bossBullets.filter(b => b.y < HEIGHT && b.y > -50 && b.x > -50 && b.x < WIDTH + 50);

        for (let i = bossBullets.length - 1; i >= 0; i--) {
            let b = bossBullets[i];
            let dx = b.x - player.centerx();
            let dy = b.y - player.centery();
            let dist = Math.sqrt(dx * dx + dy * dy);
            let collisionThreshold = b.radius + player.width / 4;
            if (dist < collisionThreshold) {
                if (shield_hits > 0) {
                    shield_hits--;
                    bossBullets.splice(i, 1);
                } else {
                    window.boss4PlayerHP--;
                    bossBullets.splice(i, 1);
                    if (window.boss4PlayerHP <= 0) {
                        boss4Running = false;
                        document.getElementById("boss4GameOver").classList.remove("hidden");
                        return;
                    }
                }
            }
        }
        lasers();

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        particles.forEach(p => p.draw());

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let o = obstacles[i];
            if (o.type === "boss9" && boss9Phase === "active" && o.rect.y >= 0) {
                let dx = player.centerx() - (o.rect.x + o.rect.width / 2);
                let dy = player.centery() - (o.rect.y + o.rect.height / 2);
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < player.width / 2 + o.rect.width / 2) {
                    window.boss4PlayerHP--;
                    player.y = o.rect.y + o.rect.height + 10;
                    if (window.boss4PlayerHP <= 0) {
                        boss4Running = false;
                        boss9Phase = "defeated";
                        document.getElementById("boss4GameOver").classList.remove("hidden");
                        return;
                    }
                }
                if (o.hp <= 0) {
                    boss4Running = false;
                    boss9Phase = "defeated";
                    document.getElementById("boss4GameOver").classList.remove("hidden");
                    return;
                }
            }
        }

        drawObstacles();
        if (!invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.drawImage(planeImg, player.x, player.y, player.width, player.height);
        }

        let boss9Obj = obstacles.find(o => o.type === "boss9");
        if (boss9Obj && boss9Obj.laserRotationTarget !== undefined && !boss9Obj.isMoving) {
            let bx = boss9Obj.rect.x + boss9Obj.rect.width / 2;
            let by = boss9Obj.rect.y + boss9Obj.rect.height / 2;
            let laserLength = 1000;
            let pulsePhase = now / 100;
            for (let i = 0; i < 4; i++) {
                let angle = boss9Obj.laserRotation + (i * Math.PI / 2);
                let cosA = Math.cos(angle);
                let sinA = Math.sin(angle);
                let endX = bx + cosA * laserLength;
                let endY = by + sinA * laserLength;

                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(200, 100, 255, ${0.15 + 0.1 * Math.sin(pulsePhase + i)})`;
                ctx.lineWidth = boss9Obj.boss9Phase === 1 ? 30 + 5 * Math.sin(pulsePhase + i) : 32 + 5 * Math.sin(pulsePhase + i);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(180, 120, 255, ${0.3 + 0.15 * Math.sin(pulsePhase + i)})`;
                ctx.lineWidth = boss9Obj.boss9Phase === 1 ? 20 + 3 * Math.sin(pulsePhase + i) : 22 + 3 * Math.sin(pulsePhase + i);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(220, 180, 255, ${0.6 + 0.2 * Math.sin(pulsePhase + i)})`;
                ctx.lineWidth = boss9Obj.boss9Phase === 1 ? 8 + 2 * Math.sin(pulsePhase + i) : 10 + 2 * Math.sin(pulsePhase + i);
                ctx.stroke();
            }
        }

        for (let b of bossBullets) {
            if (b.isSpike) {
                let angle = b.spikeAngle;
                let len = b.spikeLength;
                let w = 10;
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(angle);
                ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
                ctx.beginPath();
                ctx.moveTo(len / 2, 0);
                ctx.lineTo(-len / 2, -w / 2);
                ctx.lineTo(-len / 2, w / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 80, 80, 0.9)";
                ctx.fill();
            }
        }
        if (boss9Phase === "warning") {
            ctx.fillStyle = "rgb(255,0,0)";
            ctx.font = "48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("终极boss来袭", WIDTH / 2, HEIGHT / 2);
            ctx.textAlign = "left";
        }

        boss4AnimationId = requestAnimationFrame(boss4Loop);
    }

    boss4Loop();
}

document.getElementById("boss4RestartBtn").addEventListener("click", () => {
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    startBoss4Game();
});

document.getElementById("boss4BackBtn").addEventListener("click", () => {
    boss4Running = false;
    if (boss4AnimationId) cancelAnimationFrame(boss4AnimationId);
    document.getElementById("bossGameOver").classList.add("hidden");
    document.getElementById("boss2GameOver").classList.add("hidden");
    document.getElementById("boss3GameOver").classList.add("hidden");
    document.getElementById("boss4GameOver").classList.add("hidden");
    document.getElementById("bossSelectScreen").classList.remove("hidden");
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
});