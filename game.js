const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

const player = {
    width: 60,
    height: 20,
    x: canvas.width / 2 - 30,
    y: canvas.height - 70,
    speed: 280,
    color: "#5be8ff"
};

const bulletTemplate = {
    width: 6,
    height: 16,
    speed: 480,
    color: "#fdfb8b"
};

const enemyConfig = {
    rows: 5,
    cols: 10,
    width: 40,
    height: 28,
    hSpacing: 58,
    vSpacing: 46,
    offsetTop: 70,
    offsetLeft: 80
};

let bullets = [];
let enemies = [];
let enemyDirection = 1;
let enemySpeed = 50;
let enemyDropDistance = 24;
let lastTime = performance.now();
let bulletCooldown = 0;
let gameState = "playing"; // playing | win | lose
let keys = { ArrowLeft: false, ArrowRight: false, Space: false };
let initialEnemyCount = enemyConfig.rows * enemyConfig.cols;

function createEnemies() {
    enemies = [];
    for (let row = 0; row < enemyConfig.rows; row += 1) {
        for (let col = 0; col < enemyConfig.cols; col += 1) {
            const x = enemyConfig.offsetLeft + col * enemyConfig.hSpacing;
            const y = enemyConfig.offsetTop + row * enemyConfig.vSpacing;
            enemies.push({ x, y, width: enemyConfig.width, height: enemyConfig.height });
        }
    }
    enemyDirection = 1;
    enemySpeed = 50;
}

function resetGame() {
    createEnemies();
    bullets = [];
    player.x = canvas.width / 2 - player.width / 2;
    bulletCooldown = 0;
    gameState = "playing";
    lastTime = performance.now();
}

function handleKeyDown(event) {
    if (event.code === "Space") {
        event.preventDefault();
        keys.Space = true;
    } else if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
}

function handleKeyUp(event) {
    if (event.code === "Space") {
        keys.Space = false;
    } else if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
restartBtn.addEventListener("click", resetGame);

function update(dt) {
    if (gameState !== "playing") {
        return;
    }

    bulletCooldown = Math.max(0, bulletCooldown - dt);

    // Player horizontal movement with bounds clamp.
    let move = 0;
    if (keys.ArrowLeft) move -= 1;
    if (keys.ArrowRight) move += 1;
    player.x += move * player.speed * dt;
    player.x = Math.max(20, Math.min(canvas.width - player.width - 20, player.x));

    if (keys.Space && bulletCooldown === 0) {
        bullets.push({
            x: player.x + player.width / 2 - bulletTemplate.width / 2,
            y: player.y - bulletTemplate.height,
            width: bulletTemplate.width,
            height: bulletTemplate.height,
            speed: bulletTemplate.speed
        });
        bulletCooldown = 0.22;
    }

    for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed * dt;
        if (bullet.y + bullet.height < 0) {
            bullets.splice(i, 1);
        }
    }

    let hitEdge = false;
    const leftLimit = 16;
    const rightLimit = canvas.width - 16;

    for (const enemy of enemies) {
        enemy.x += enemyDirection * enemySpeed * dt;
        if (enemy.x <= leftLimit || enemy.x + enemy.width >= rightLimit) {
            hitEdge = true;
        }
    }

    if (hitEdge) {
        enemyDirection *= -1;
        enemySpeed = Math.min(enemySpeed * 1.1, 190);
        for (const enemy of enemies) {
            enemy.y += enemyDropDistance;
        }
    }

    // Bullet vs enemy collision
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const bullet = bullets[i];
        let bulletConsumed = false;
        for (let j = enemies.length - 1; j >= 0; j -= 1) {
            const enemy = enemies[j];
            const overlap =
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y;
            if (overlap) {
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                enemySpeed = Math.min(enemySpeed + 3, 220);
                bulletConsumed = true;
                break;
            }
        }
        if (bulletConsumed) continue;
    }

    // Lose if any enemy reaches player level
    for (const enemy of enemies) {
        if (enemy.y + enemy.height >= player.y) {
            gameState = "lose";
            break;
        }
    }

    if (enemies.length === 0) {
        gameState = "win";
    }

    updateStatus();
}

function updateStatus() {
    if (gameState === "win") {
        statusEl.textContent = "勝利！エイリアンを全滅させました";
    } else if (gameState === "lose") {
        statusEl.textContent = "侵略された！リスタートで再挑戦";
    } else {
        statusEl.textContent = `残りエイリアン: ${enemies.length}/${initialEnemyCount}`;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    backgroundGradient.addColorStop(0, "#02051a");
    backgroundGradient.addColorStop(1, "#03070f");
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const bullet of bullets) {
        ctx.fillStyle = bulletTemplate.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    for (const enemy of enemies) {
        ctx.fillStyle = "#ff6fae";
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = "#02010a";
        ctx.fillRect(enemy.x + 6, enemy.y + 6, enemy.width - 12, enemy.height - 12);
        ctx.fillStyle = "#ff6fae";
        ctx.fillRect(enemy.x + 10, enemy.y + 14, enemy.width - 20, enemy.height - 22);
    }

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillRect(player.x + player.width / 2 - 6, player.y - 12, 12, 12);

    if (gameState === "win" || gameState === "lose") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f2f5ff";
        ctx.font = "bold 48px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(gameState === "win" ? "YOU WIN" : "GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = "24px 'Segoe UI', sans-serif";
        ctx.fillText("リスタートボタンで再度プレイ", canvas.width / 2, canvas.height / 2 + 40);
    }
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

resetGame();
requestAnimationFrame(gameLoop);
