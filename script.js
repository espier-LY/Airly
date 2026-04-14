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

// ==================== 游戏状态 ====================
let obstacles = [];
let powerups = [];
let particles = [];

let score = 0;
let last_gold_trigger_time = -1;

let laser_count = 3;
let laser_color_mode = 0;
let powerup_count = 0;

let rage_mode = false;
let rage_end_time = 0;

let shield_hits = 0;

let running = true;

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

        let rect = {
            x: Math.random() * (WIDTH - 65),
            y: Math.random() * -300,
            width: 65,
            height: 65
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

            return { rect, hp, type };
        }
    }

    // ===== fallback（和 python 一样）=====
    let rect = {
        x: Math.random() * (WIDTH - 65),
        y: -65,
        width: 65,
        height: 65
    };

    let hp = 60;
    if (type === "gold") hp = 180;
    if (type === "red") hp = 360;

    return { rect, hp, type };
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
    if (Math.random() < 1 / 30) {
        if (Math.random() < 1 / 5) obstacles.push(createObstacle("red"));
        else obstacles.push(createObstacle("normal"));
    }

    const sec = Math.floor(Date.now() / 1000);

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

            if (o.type === "gold") {
                powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "arrow"));
                score += 20;
            } else if (o.type === "red") {
                if (Math.random() < 1 / 6) {
                    powerups.push(new PowerUp(o.rect.x + 5, o.rect.y + 5, "shield"));
                }
                score += 50;
            } else {
                score += 10;
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
        else img = meteoriteImg;

        ctx.drawImage(img, o.rect.x, o.rect.y, o.rect.width, o.rect.height);

        // 血条（严格对应 plane.py）
        let hp_max = 60;
        if (o.type === "gold") hp_max = 180;
        if (o.type === "red") hp_max = 360;

        let hp_ratio = Math.min(Math.max(o.hp / hp_max, 0), 1);

        ctx.fillStyle = "rgb(120,0,0)";
        ctx.fillRect(o.rect.x, o.rect.y - 10, o.rect.width, 6);

        ctx.fillStyle = "rgb(0,255,0)";
        ctx.fillRect(o.rect.x, o.rect.y - 10, Math.floor(o.rect.width * hp_ratio), 6);
    }
}

// ==================== 游戏结束检查 ====================
function checkGameOver() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        if (collide(o.rect, {
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
                document.getElementById("gameOver").classList.remove("hidden");
                document.getElementById("finalScore").textContent = score;
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

    checkGameOver();

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
    if (shield_hits > 0) {
    ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
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