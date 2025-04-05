const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');

let score = 0;
let player;
let bullets = [];
let enemies = [];
let keys = {}; // 存储按键状态
let gameLoopInterval;
let enemySpawnInterval;
let gameOver = false;
let bulletCooldown = 0; // 子弹冷却计时
const BULLET_COOLDOWN_FRAMES = 10; // 发射子弹的最小间隔帧数

// --- 配置 ---
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const PLAYER_SPEED = 5;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 15;
const BULLET_SPEED = 7;
const ENEMY_WIDTH = 35;
const ENEMY_HEIGHT = 35;
const ENEMY_SPEED = 2;
const ENEMY_SPAWN_RATE = 1000; // 敌人生成间隔 (毫秒)

// --- 玩家对象 ---
function createPlayer() {
    return {
        x: canvas.width / 2 - PLAYER_WIDTH / 2,
        y: canvas.height - PLAYER_HEIGHT - 20,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: PLAYER_SPEED,
        color: 'cyan'
    };
}

// --- 子弹对象 ---
function createBullet(x, y) {
    return {
        x: x,
        y: y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: BULLET_SPEED,
        color: 'yellow'
    };
}

// --- 敌人对象 ---
function createEnemy() {
    return {
        x: Math.random() * (canvas.width - ENEMY_WIDTH), // 随机 x 坐标
        y: -ENEMY_HEIGHT, // 从画布顶端外开始
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        speed: ENEMY_SPEED + Math.random() * 1, // 速度稍有随机性
        color: 'red'
    };
}

// --- 绘图函数 ---
function drawRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawPlayer() {
    drawRect(player.x, player.y, player.width, player.height, player.color);
    // 可以用更复杂的图形或图片代替
    // ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function drawBullets() {
    bullets.forEach(bullet => {
        drawRect(bullet.x, bullet.y, bullet.width, bullet.height, bullet.color);
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        drawRect(enemy.x, enemy.y, enemy.width, enemy.height, enemy.color);
        // 可以用更复杂的图形或图片代替
        // ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

function drawScore() {
    scoreElement.textContent = score;
}

// --- 更新函数 ---
function updatePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    // 可以在这里添加上下移动 (如果需要)
    // if (keys['ArrowUp'] && player.y > 0) { ... }
    // if (keys['ArrowDown'] && player.y < canvas.height - player.height) { ... }

    // 处理射击 (带冷却)
    if (keys[' '] || keys['Spacebar']) { // 兼容不同浏览器/键盘的空格键名
        if (bulletCooldown <= 0) {
            // 在玩家中间顶部发射子弹
            const bulletX = player.x + player.width / 2 - BULLET_WIDTH / 2;
            const bulletY = player.y;
            bullets.push(createBullet(bulletX, bulletY));
            bulletCooldown = BULLET_COOLDOWN_FRAMES; // 重置冷却
        }
    }

    // 更新子弹冷却
    if (bulletCooldown > 0) {
        bulletCooldown--;
    }
}

function updateBullets() {
    // 从后往前遍历，方便安全删除元素
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        // 移除飞出屏幕的子弹
        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    // 从后往前遍历，方便安全删除元素
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        // 移除飞出屏幕底部的敌人 (也可以在这里结束游戏或扣分)
        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
        }
    }
}

// --- 碰撞检测 ---
function checkCollisions() {
    // 1. 子弹与敌人碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            const bullet = bullets[i];
            const enemy = enemies[j];

            // 简单的 AABB (Axis-Aligned Bounding Box) 碰撞检测
            if (bullet && enemy &&
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y)
            {
                // 碰撞发生
                bullets.splice(i, 1); // 移除子弹
                enemies.splice(j, 1); // 移除敌人
                score += 10;        // 增加分数
                break; // 当前子弹已消失，跳出内层循环
            }
        }
    }

    // 2. 敌人与玩家碰撞
    for (let i = enemies.length - 1; i >= 0; i--) {
         const enemy = enemies[i];
         if (player.x < enemy.x + enemy.width &&
             player.x + player.width > enemy.x &&
             player.y < enemy.y + enemy.height &&
             player.y + player.height > enemy.y)
         {
             // 碰撞发生
             setGameOver();
             break; // 游戏结束，无需再检测
         }
    }
}

// --- 游戏主循环 ---
function gameLoop() {
    if (gameOver) return;

    // 1. 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 更新游戏状态
    updatePlayer();
    updateBullets();
    updateEnemies();

    // 3. 碰撞检测
    checkCollisions();

    // 4. 绘制所有元素
    drawPlayer();
    drawBullets();
    drawEnemies();

    // 5. 更新得分显示
    drawScore();

    // 6. 请求下一帧
    requestAnimationFrame(gameLoop);
}

// --- 控制函数 ---
function spawnEnemy() {
    if (!gameOver) {
        enemies.push(createEnemy());
    }
}

function setGameOver() {
    gameOver = true;
    clearInterval(enemySpawnInterval); // 停止生成敌人
    // 显示结束画面
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'block';
}

function restartGame() {
    // 隐藏结束画面
    gameOverScreen.style.display = 'none';
    // 重置游戏状态
    score = 0;
    bullets = [];
    enemies = [];
    keys = {};
    gameOver = false;
    bulletCooldown = 0;
    player = createPlayer(); // 重新创建玩家
    // 清除旧的定时器（如果存在）并重新开始
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_RATE);
    // 重新启动游戏循环
    requestAnimationFrame(gameLoop);
}

// --- 事件监听 ---
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    // 阻止空格键滚动页面
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// --- 初始化游戏 ---
function initGame() {
    player = createPlayer();
    score = 0;
    bullets = [];
    enemies = [];
    keys = {};
    gameOver = false;
    bulletCooldown = 0;
    drawScore(); // 初始化分数显示
    gameOverScreen.style.display = 'none'; // 确保结束画面是隐藏的

    // 启动敌人生成
    clearInterval(enemySpawnInterval); // 清除可能存在的旧计时器
    enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_RATE);

    // 启动游戏循环
    requestAnimationFrame(gameLoop);
}

// --- 开始游戏 ---
initGame(); // 页面加载完成后开始游戏