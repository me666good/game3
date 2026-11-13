const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Mouse = Matter.Mouse;

const width = 420;
const height = 450;
const engine = Engine.create();

// 強化剛性防穿模
engine.positionIterations = 12;
engine.velocityIterations = 8;  

const world = engine.world;

const render = Render.create({
    element: document.getElementById('gift-box'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: 'transparent'
    }
});

// 這裡已經幫你把每張圖的比例都調好了！
const levels = [
    { level: 0, radius: 11, img: 'assets/1-star.png', scaleAdjust: 2.0 },
    { level: 1, radius: 16, img: 'assets/2-glassball.png', scaleAdjust: 2.0 },
    { level: 2, radius: 22, img: 'assets/3-cookie.png', scaleAdjust: 2.0 },
    { level: 3, radius: 29, img: 'assets/4-glove.png', scaleAdjust: 2.0 },
    { level: 4, radius: 37, img: 'assets/5-snowball.png', scaleAdjust: 2.0 },
    { level: 5, radius: 47, img: 'assets/6-deer.png', scaleAdjust: 1.85 },    
    { level: 6, radius: 58, img: 'assets/7-candy.png', scaleAdjust: 2.0 },
    { level: 7, radius: 71, img: 'assets/8-snowman.png', scaleAdjust: 2.0 }, 
    { level: 8, radius: 86, img: 'assets/9-ring.png', scaleAdjust: 2.45 },   
    { level: 9, radius: 103, img: 'assets/10-ball.png', scaleAdjust: 2.0 },
    { level: 10, radius: 122, img: 'assets/11-Santa.png', scaleAdjust: 2.0 }
];

const preloadedImages = {};
const evoBar = document.getElementById('evolution-bar');
if (evoBar) evoBar.innerHTML = '';

// 強制按照 levels 陣列的 1 到 11 順序生成圖鑑
levels.forEach((lvl) => {
    const evoImg = document.createElement('img');
    evoImg.src = lvl.img;
    evoImg.className = 'evo-item';
    if (evoBar) evoBar.appendChild(evoImg);
});

// 隱形邊界
const wallOptions = { isStatic: true, render: { visible: false }, friction: 0 };
const ground = Bodies.rectangle(width / 2, height + 25, width + 100, 50, wallOptions);
const leftWall = Bodies.rectangle(-25, height / 2, 50, height + 100, wallOptions);
const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height + 100, wallOptions);
Composite.add(world, [ground, leftWall, rightWall]);

function createItem(x, y, levelIndex) {
    const config = levels[levelIndex];
    const scale = config.actualScale || 0.1;
    
    return Bodies.circle(x, y, config.radius, {
        restitution: 0.1,    
        friction: 0.05,      
        inertia: Infinity,   // 永遠正面
        render: {
            sprite: { texture: config.img, xScale: scale, yScale: scale }
        },
        customLevel: config.level,
        isMerging: false
    });
}

const mouse = Mouse.create(render.canvas);
let canDrop = true;
let isGameOver = false;
let gameOverTimer = 0;
const gameOverLineY = 70;
let currentPreviewLevel = Math.floor(Math.random() * 3);

Events.on(render, 'afterRender', function() {
    const context = render.context;
    
    context.beginPath();
    context.setLineDash([10, 10]);
    context.moveTo(0, gameOverLineY);
    context.lineTo(width, gameOverLineY);
    context.strokeStyle = "rgba(255, 50, 50, 0.6)";
    context.lineWidth = 2;
    context.stroke();
    context.setLineDash([]);

    if (canDrop && !isGameOver) {
        const config = levels[currentPreviewLevel];
        const r = config.radius;
        const dropX = Math.max(r, Math.min(width - r, mouse.position.x || width/2));
        
        context.beginPath();
        context.setLineDash([6, 6]);
        context.moveTo(dropX, 30);
        context.lineTo(dropX, height);
        context.strokeStyle = "rgba(255, 255, 255, 0.4)";
        context.lineWidth = 2;
        context.stroke();
        context.setLineDash([]);

        const previewImg = preloadedImages[currentPreviewLevel];
        if (previewImg && previewImg.complete) {
            context.globalAlpha = 0.6;
            const visualSize = r * config.scaleAdjust;
            context.drawImage(previewImg, dropX - visualSize/2, 30 - visualSize/2, visualSize, visualSize);
            context.globalAlpha = 1.0;
        }
    }
});

Events.on(engine, 'beforeUpdate', () => {
    if (mouse.button === 0 && canDrop && !isGameOver) {
        canDrop = false;
        const r = levels[currentPreviewLevel].radius;
        const dropX = Math.max(r, Math.min(width - r, mouse.position.x));
        
        const newItem = createItem(dropX, 30, currentPreviewLevel);
        Composite.add(world, newItem);
        currentPreviewLevel = Math.floor(Math.random() * 3);
        setTimeout(() => { canDrop = true; }, 700);
    }
});

// 重置遊戲函數：清除動態物件並恢復狀態
function restartGame() {
    // 移除畫面上所有動態的掉落物 (保留牆壁和地板)
    const bodies = Composite.allBodies(world);
    const dynamicBodies = bodies.filter(body => !body.isStatic);
    Composite.remove(world, dynamicBodies);

    // 重置遊戲狀態
    isGameOver = false;
    gameOverTimer = 0;
    canDrop = true;
    currentPreviewLevel = Math.floor(Math.random() * 3);

    // 移除動態生成的通關/結束畫面
    const winOverlay = document.getElementById('win-overlay');
    if (winOverlay) winOverlay.remove();
    
    const gameOverOverlay = document.getElementById('game-over-overlay');
    if (gameOverOverlay) gameOverOverlay.remove();

    // 隱藏 HTML 原本舊版的 Game Over 畫面 (以防萬一)
    const oldHtmlGameOver = document.getElementById('game-over');
    if (oldHtmlGameOver) oldHtmlGameOver.style.display = 'none';
}

// 建立統一樣式的彈出視窗函數
function createPopup(id, titleText, subtitleText) {
    if (document.getElementById(id)) return; // 避免重複生成

    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.position = 'absolute';
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    
    // 響應式設計
    overlay.style.width = '80%';
    overlay.style.maxWidth = '320px';
    overlay.style.boxSizing = 'border-box';
    
    // 統一深綠色質感風格
    overlay.style.backgroundColor = 'rgba(36, 61, 48, 0.95)';
    overlay.style.border = '3px solid #f8d7da';
    overlay.style.color = '#f8d7da';
    overlay.style.padding = '35px 20px';
    overlay.style.borderRadius = '16px';
    overlay.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6)';
    overlay.style.textAlign = 'center';
    overlay.style.zIndex = '1000';
    overlay.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    overlay.innerHTML = `
        <h1 style="margin: 0 0 15px 0; font-size: clamp(24px, 6vw, 32px); letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); line-height: 1.2;">
            ${titleText}
        </h1>
        <p style="margin: 0 0 25px 0; font-size: clamp(14px, 4vw, 16px); color: #d4edda; letter-spacing: 1px; line-height: 1.5;">
            ${subtitleText}
        </p>
        <button class="restart-action-btn" style="
            background-color: #f8d7da; 
            color: #243d30; 
            border: none; 
            padding: 10px 24px; 
            font-size: 16px; 
            font-weight: bold; 
            border-radius: 8px; 
            cursor: pointer; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            transition: transform 0.2s;
        ">重新開始</button>
    `;
    
    const container = document.getElementById('gift-box') || document.body;
    container.style.position = 'relative'; 
    container.appendChild(overlay);

    // 綁定按鈕事件
    const restartBtn = overlay.querySelector('.restart-action-btn');
    restartBtn.addEventListener('click', () => {
        restartGame();
    });
    
    restartBtn.addEventListener('mouseover', () => { restartBtn.style.transform = 'scale(1.05)'; });
    restartBtn.addEventListener('mouseout', () => { restartBtn.style.transform = 'scale(1)'; });
}

Events.on(engine, 'afterUpdate', () => {
    if (isGameOver) return;
    let isOverflowing = false;
    const bodies = Composite.allBodies(world);
    
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!body.isStatic && body.customLevel !== undefined) {
            // 【修改這裡】放寬靜止判定(從 0.2 改為 0.5)，避免球微微擠壓晃動導致計時器一直重置
            if (body.position.y - body.circleRadius < gameOverLineY && body.velocity.y > -0.5 && body.velocity.y < 0.5) {
                isOverflowing = true;
                break;
            }
        }
    }

    if (isOverflowing) {
        gameOverTimer++;
        // 【修改這裡】原本是 90 (約等1.5秒)，現在改成 25 (不到半秒就會立刻判定滿出來)
        if (gameOverTimer > 25) {
            isGameOver = true;
            // 呼叫統一風格的遊戲結束畫面
            createPopup('game-over-overlay', '箱子滿啦！', '東西掉出來囉，<br>再挑戰一次吧！');
        }
    } else {
        // 如果東西掉下去了，重置計時器
        gameOverTimer = 0;
    }
});

Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.customLevel !== undefined && bodyA.customLevel === bodyB.customLevel && !bodyA.isMerging && !bodyB.isMerging) {
            bodyA.isMerging = true;
            bodyB.isMerging = true;
            const nextLevel = bodyA.customLevel + 1;

            if (nextLevel < levels.length) {
                Composite.remove(world, [bodyA, bodyB]);
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;
                
                const upgradedItem = createItem(midX, midY, nextLevel);
                Matter.Body.setVelocity(upgradedItem, { x: 0, y: -2 });
                Composite.add(world, upgradedItem);

                // 🌟 通關提示
                if (nextLevel === 10) {
                    setTimeout(() => {
                        isGameOver = true; 
                        // 呼叫統一風格的通關畫面
                        createPopup('win-overlay', '恭喜通關', '成功收集聖誕老人 🎅');
                    }, 600); 
                }
            }
        }
    });
});

Promise.all(levels.map((lvl, index) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = lvl.img;
        img.onload = () => {
            const maxDimension = Math.max(img.width, img.height);
            lvl.actualScale = (lvl.radius * lvl.scaleAdjust) / maxDimension;
            preloadedImages[index] = img;
            resolve();
        };
        img.onerror = () => {
            lvl.actualScale = (lvl.radius * 2) / 300;
            resolve();
        };
    });
})).then(() => {
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
});

// 隱藏密技：按數字鍵 0-9 或 q 切換掉落物，方便妳快速測試通關與失敗畫面
window.addEventListener('keydown', (e) => {
    if (!canDrop || isGameOver) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
        const level = parseInt(key);
        if (level < levels.length) currentPreviewLevel = level;
    } else if (key.toLowerCase() === 'q') {
        if (9 < levels.length) currentPreviewLevel = 9; 
    }
});