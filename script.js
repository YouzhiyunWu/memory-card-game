// 校徽翻牌游戏的JavaScript代码

// 游戏状态变量
let flippedCards = []; // 存储当前翻转的卡片
let matchedPairs = 0; // 已匹配的对数
let steps = 0; // 步数计数
let score = 100; // 初始分数
let isProcessing = false; // 防止连续点击的标志
let timerInterval = null; // 计时器间隔
let seconds = 0; // 计时秒数

// 特殊机制变量
let comboCount = 0; // 连续匹配成功次数
let doubledStepsRemaining = 0; // 电子科技大学得分翻倍剩余步数
let hasMatchedSCU = false; // 四川大学是否已经首次匹配成功
let hasMatchedUESTC = false; // 电子科技大学是否已经首次匹配成功

// 特殊错误匹配对列表（每对匹配失败时额外扣除2分）
const specialMismatchPairs = [
    {image1: 'UESTC.avif', image2: 'SCU.avif'}, // 电子科技大学与川大
    {image1: 'THU.avif', image2: 'PKU.webp'}, // 清华与北大
    {image1: 'SCUOT.avif', image2: 'SYSU.webp'}, // 华南理工和中山大学
    {image1: 'SJTU.webp', image2: 'FDU.webp'}, // 上交和复旦
    {image1: 'WHU.png', image2: 'HUOSAT.avif'}, // 武大和华中科技大学
    {image1: 'NKU.jpeg', image2: 'TUPU.avif'}, // 南开大学和天津大学
    {image1: 'SJTU.webp', image2: 'XJTU.avif'} // 上交和西交
];

// 确保特殊匹配对双向都能匹配
const tempPairs = [];
for (const pair of specialMismatchPairs) {
    tempPairs.push({image1: pair.image2, image2: pair.image1});
}
// 将临时数组中的元素合并到原数组
specialMismatchPairs.push(...tempPairs);
console.log('特殊配对数组初始化完成，长度为：', specialMismatchPairs.length);
console.log('特殊配对数组内容：', JSON.stringify(specialMismatchPairs));

// 图片列表 - 从Pictures目录中获取的最新图片
const pictures = [
    'BHU.jpg', 'BIT.jpg', 'BNU.jpg', 'CAU.avif', 'CQU.avif',
    'CSU.webp', 'DUOT.avif', 'ECNU.png', 'FDU.webp', 'HIT.avif',
    'HNU.avif', 'HUOSAT.avif', 'JLU.jpeg', 'LZU.webp', 'MUOC.avif',
    'NEU.avif', 'NJU.webp', 'NKU.jpeg', 'NUODT.avif', 'NWAFU.avif',
    'NWPU.avif', 'OUOC.avif', 'PKU.webp', 'RMU.webp', 'SCU.avif',
    'SCUOT.avif', 'SDU.avif', 'SEU.avif', 'SJTU.webp', 'SYSU.webp',
    'THU.avif', 'TJU.webp', 'TUPU.avif', 'UA.avif', 'UESTC.avif',
    'USTC.jpg', 'WHU.png', 'XJTU.avif', 'ZJU.webp'
];

// 尝试加载图片的多种格式
function loadImageWithFallback(imageName) {
    const baseName = imageName.replace(/\.[^/.]+$/, '');
    const originalExtension = imageName.split('.').pop().toLowerCase();
    
    // 首先尝试加载原始文件名
    return new Promise((resolve, reject) => {
        // 先尝试原始图片
        const originalImg = new Image();
        originalImg.onload = () => {
            resolve(`Pictures/${imageName}`);
        };
        originalImg.onerror = () => {
            // 原始图片加载失败，尝试其他格式
            const availableFormats = ['avif', 'webp', 'jpg', 'jpeg', 'png'];
            let formatIndex = 0;
            
            function tryNextFormat() {
                if (formatIndex >= availableFormats.length) {
                    // 所有格式都尝试过了，使用默认错误图片
                    resolve(null);
                    return;
                }
                
                const format = availableFormats[formatIndex];
                // 跳过与原始格式相同的格式
                if (format === originalExtension) {
                    formatIndex++;
                    tryNextFormat();
                    return;
                }
                
                const imagePath = `Pictures/${baseName}.${format}`;
                
                const img = new Image();
                img.onload = () => {
                    resolve(imagePath);
                };
                img.onerror = () => {
                    formatIndex++;
                    tryNextFormat();
                };
                
                img.src = imagePath;
            }
            
            tryNextFormat();
        };
        
        originalImg.src = `Pictures/${imageName}`;
    });
}

// 图片路径缓存，避免重复加载
const imagePathCache = {};

// 图片预加载函数
async function preloadImages() {
    const promises = [];
    
    for (const image of pictures) {
        const promise = loadImageWithFallback(image).then(imagePath => {
            if (imagePath) {
                imagePathCache[image] = imagePath;
                console.log(`图片预加载成功: ${imagePath}`);
                return true;
            } else {
                console.error(`图片预加载失败: ${image}`);
                return false;
            }
        });
        
        promises.push(promise);
    }
    
    return Promise.all(promises);
}

// 获取图片路径（从缓存或直接使用）
function getImagePath(imageName) {
    if (imagePathCache[imageName]) {
        return imagePathCache[imageName];
    }
    
    // 如果没有缓存，返回原始路径
    return `Pictures/${imageName}`;
}

// 游戏板大小
let BOARD_SIZE = 10;
let TOTAL_CARDS;

// 动态创建音频元素
let flipSound, matchSound, winSound, loseSound;

// 初始化音频元素
function initSounds() {
    try {
        flipSound = new Audio('audio/flip.wav');
        matchSound = new Audio('audio/match.mp3');
        winSound = new Audio('audio/win.wav');
        loseSound = new Audio('audio/lose.wav');
        
        // 添加错误处理
        [flipSound, matchSound, winSound, loseSound].forEach((sound, index) => {
            const soundNames = ['flip', 'match', 'win', 'lose'];
            if (sound) {
                sound.addEventListener('error', (error) => {
                    console.log(`音效 ${soundNames[index]} 加载失败:`, error);
                });
            }
        });
    } catch (error) {
        console.log('音频初始化失败:', error);
    }
}

// 更新总卡片数
TOTAL_CARDS = BOARD_SIZE * BOARD_SIZE;

// 页面加载完成后初始化菜单、设置和音效
document.addEventListener('DOMContentLoaded', async () => {
    initMenu();
    initSettings();
    loadSettings();
    initSounds();
    preloadSounds();
    
    // 预加载图片
    preloadImages().then(() => {
        console.log('所有图片预加载完成');
    });
});

// 初始化菜单
function initMenu() {
    // 开始游戏按钮
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('menu-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        initGame();
    });
    
    // 规则按钮
    document.getElementById('rules-btn').addEventListener('click', () => {
        document.getElementById('menu-container').style.display = 'none';
        document.getElementById('rules-container').style.display = 'flex';
    });
    
    // 设置按钮
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('menu-container').style.display = 'none';
        document.getElementById('settings-container').style.display = 'flex';
    });
    
    // 退出按钮
    document.getElementById('exit-btn').addEventListener('click', () => {
        if (confirm('确定要退出游戏吗？')) {
            window.close();
        }
    });
}

// 初始化设置
function initSettings() {
    // 规则界面返回按钮
    document.getElementById('rules-back-btn').addEventListener('click', () => {
        document.getElementById('rules-container').style.display = 'none';
        document.getElementById('menu-container').style.display = 'flex';
    });
    
    // 音量控制
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    
    volumeSlider.addEventListener('input', () => {
        const volume = volumeSlider.value;
        volumeValue.textContent = `${volume}%`;
        localStorage.setItem('volume', volume / 100);
    });
    
    // 背景颜色切换
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按钮的active类
            colorButtons.forEach(btn => btn.classList.remove('active'));
            // 为当前按钮添加active类
            button.classList.add('active');
            
            // 设置背景颜色
            const color = button.dataset.color;
            if (color === 'white') {
                document.body.style.backgroundColor = '#f0f0f0';
                document.body.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            } else {
                document.body.style.backgroundColor = '#333';
                document.body.style.backgroundImage = 'none';
            }
            localStorage.setItem('bgColor', color);
            
            // 更新游戏容器的背景颜色
            const gameContainer = document.getElementById('game-container');
            if (color === 'black') {
                gameContainer.style.backgroundColor = '#444';
                gameContainer.style.color = 'white';
                gameContainer.querySelector('h1').style.color = 'white';
                gameContainer.querySelector('.steps').style.color = 'white';
                gameContainer.querySelector('.time').style.color = 'white';
            } else {
                gameContainer.style.backgroundColor = 'white';
                gameContainer.style.color = 'black';
                gameContainer.querySelector('h1').style.color = '#333';
                gameContainer.querySelector('.steps').style.color = '#555';
                gameContainer.querySelector('.time').style.color = '#555';
            }
        });
    });
    
    // 难度选择
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的active类
            difficultyBtns.forEach(b => b.classList.remove('active'));
            // 为当前按钮添加active类
            btn.classList.add('active');
            
            // 设置游戏板大小
            BOARD_SIZE = parseInt(btn.dataset.size);
            TOTAL_CARDS = BOARD_SIZE * BOARD_SIZE;
            localStorage.setItem('boardSize', BOARD_SIZE);
        });
    });
    
    // 返回按钮
    document.getElementById('back-btn').addEventListener('click', () => {
        document.getElementById('settings-container').style.display = 'none';
        document.getElementById('menu-container').style.display = 'flex';
    });
}

// 加载用户设置
function loadSettings() {
    // 加载音量设置
    const volume = parseFloat(localStorage.getItem('volume') || '0.5');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    volumeSlider.value = volume * 100;
    volumeValue.textContent = `${Math.round(volume * 100)}%`;
    
    // 加载背景颜色设置
    const bgColor = localStorage.getItem('bgColor') || 'white';
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(button => {
        if (button.dataset.color === bgColor) {
            button.click();
        }
    });
    
    // 加载难度设置
    const boardSize = parseInt(localStorage.getItem('boardSize') || '10');
    BOARD_SIZE = boardSize;
    TOTAL_CARDS = BOARD_SIZE * BOARD_SIZE;
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    difficultyBtns.forEach(btn => {
        if (parseInt(btn.dataset.size) === boardSize) {
            btn.click();
        }
    });
}



// 初始化游戏函数
function initGame() {
    // 更新总卡片数
    TOTAL_CARDS = BOARD_SIZE * BOARD_SIZE;
    
    // 重置游戏状态
    flippedCards = [];
    matchedPairs = 0;
    steps = 0;
    score = 100; // 重置分数为初始值100
    seconds = 0;
    isProcessing = false;
    updateSteps();
    updateScore();
    updateTime();
    hideWinMessage();
    hideLoseMessage();
    
    // 重置计时器
    resetTimer();
    
    // 确保音效已初始化
    if (!flipSound) {
        initSounds();
    }
    
    // 创建游戏卡片数组
    const gameCards = generateGameCards();
    
    // 创建游戏板
    createGameBoard(gameCards);
    
    // 绑定重新开始按钮事件
    document.getElementById('restart-btn').addEventListener('click', initGame);
    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('menu-container').style.display = 'flex';
    });
    
    // 绑定失败界面的再玩一次按钮事件
    document.getElementById('play-again-btn-lose').addEventListener('click', () => {
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('menu-container').style.display = 'flex';
    });
    
    // 初始化音频元素
    initSounds();
    
    // 预加载音效
    preloadSounds();
    
    // 开始计时
    startTimer();
}

// 生成游戏卡片数组
function generateGameCards() {
    // 计算需要的图片对数
    const pairsNeeded = TOTAL_CARDS / 2;
    let cardImages = [];
    
    // 确保每张图片都成双成对出现
    // 首先随机选择足够的图片对
    while (cardImages.length < pairsNeeded) {
        // 随机选择一个图片
        const randomIndex = Math.floor(Math.random() * pictures.length);
        const selectedImage = pictures[randomIndex];
        
        // 每次添加一对相同的图片
        cardImages.push(selectedImage);
    }
    
    // 现在我们有了成对的图片，将它们复制一次以确保每张图片都有两张
    cardImages = [...cardImages, ...cardImages];
    
    // 打乱图片顺序
    shuffleArray(cardImages);
    
    // 创建卡片对象数组
    const gameCards = cardImages.map((image, index) => {
        return {
            id: index,
            image: image,
            isFlipped: false,
            isMatched: false
        };
    });
    
    return gameCards;
}

// 创建游戏板
function createGameBoard(gameCards) {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    // 设置游戏板的网格布局
    gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    
    gameCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.id = card.id;
        cardElement.dataset.image = card.image;
        
        // 创建卡片正面和背面
        const imagePath = getImagePath(card.image);
        cardElement.innerHTML = `
            <div class="card-back">?</div>
            <div class="card-front">
                <img src="${imagePath}" alt="Card ${card.id}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%25%22 height%3D%22100%25%22 viewBox%3D%220 0 100 100%22%3E%3Crect width%3D%22100%25%22 height%3D%22100%25%22 fill%3D%22%23f0f0f0%22%2F%3E%3Ctext x%3D%2250%25%22 y%3D%2250%25%22 font-family%3D%22Arial%2C sans-serif%22 font-size%3D%2212%22 text-anchor%3D%22middle%22 dy%3D%22.3em%22 fill%3D%22%23999%22%3E图片加载失败%3C%2Ftext%3E%3C%2Fsvg%3E'">
            </div>
        `;
        
        // 绑定点击事件
        cardElement.addEventListener('click', () => flipCard(cardElement));
        
        // 绑定触摸事件，防止误触
        let touchStartX = 0;
        let touchStartY = 0;
        let isTouching = false;
        
        cardElement.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isTouching = true;
        });
        
        cardElement.addEventListener('touchmove', (e) => {
            if (!isTouching) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            // 计算滑动距离
            const deltaX = Math.abs(touchX - touchStartX);
            const deltaY = Math.abs(touchY - touchStartY);
            
            // 如果滑动距离超过10px，认为是滑动操作，不执行翻牌
            if (deltaX > 10 || deltaY > 10) {
                isTouching = false;
            }
        });
        
        cardElement.addEventListener('touchend', (e) => {
            if (isTouching) {
                // 防止触摸事件触发点击事件
                e.preventDefault();
                flipCard(cardElement);
            }
            isTouching = false;
        });
        
        // 防止触摸事件冒泡
        cardElement.addEventListener('touchcancel', () => {
            isTouching = false;
        });
        
        gameBoard.appendChild(cardElement);
    });
}

// 翻转卡片函数
function flipCard(cardElement) {
    // 如果正在处理匹配、卡片已经翻转或已匹配，则不执行操作
    if (isProcessing || cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) {
        return;
    }
    
    // 播放翻牌音效
    playSound(flipSound);
    
    // 翻转卡片
    cardElement.classList.add('flipped');
    flippedCards.push(cardElement);
    
    // 如果翻转了两张卡片，检查是否匹配
    if (flippedCards.length === 2) {
        steps++;
        score--; // 每操作一步消耗1分
        updateSteps();
        updateScore();
        checkMatch();
    }
}

// 更新分数显示
function updateScore() {
    // 确保分数不会为负数
    score = Math.max(0, score);
    
    // 检查分数是否为0，如果是则显示失败界面
    if (score === 0) {
        setTimeout(showLoseMessage, 500);
        return;
    }
    
    // 如果游戏容器中没有分数显示元素，则创建一个
    let scoreElement = document.getElementById('score');
    if (!scoreElement) {
        const gameInfo = document.querySelector('.game-info');
        scoreElement = document.createElement('div');
        scoreElement.className = 'score';
        scoreElement.innerHTML = `分数：<span id="score">${score}</span>`;
        gameInfo.insertBefore(scoreElement, gameInfo.lastElementChild);
    }
    document.getElementById('score').textContent = score;
}

// 检查两张卡片是否匹配
function checkMatch() {
    isProcessing = true;
    
    const [card1, card2] = flippedCards;
    
    // 直接从dataset获取图片信息
    const image1 = card1.dataset.image;
    const image2 = card2.dataset.image;
    
    // 检查当前两张卡片是否为特殊配对
    const isSpecialPair = specialMismatchPairs.some(pair => {
        return (pair.image1 === image1 && pair.image2 === image2) || 
               (pair.image1 === image2 && pair.image2 === image1);
    });
    
    // 如果是特殊配对，立即扣除分数
    if (isSpecialPair) {
        score = Math.max(0, score - 2); // 确保分数不小于0
        updateScore();
    }
    
    if (image1 === image2) {
        // 匹配成功
        playSound(matchSound);
        
        // 增加连续匹配计数
        comboCount++;
        
        // 基础得分
        let pointsEarned = 10;
        
        // 连续匹配成功额外加分：每次额外获得(连击次数-1)*2的分数
        if (comboCount > 1) {
            pointsEarned += (comboCount - 1) * 2;
        }
        
        // 检查是否是电子科技大学匹配成功
        if (image1 === 'UESTC.avif') {
            // 设置已匹配过电子科技大学
            hasMatchedUESTC = true;
            
            // 电子科技大学匹配成功后十步得分翻倍
            doubledStepsRemaining = 10;
            console.log('电子科技大学匹配成功！接下来十步得分翻倍。');
            
            // 如果四川大学已经首次匹配成功，那么每次匹配电子科技大学时分数直接减半
            if (hasMatchedSCU) {
                score = Math.floor(score / 2);
                console.log('四川大学已匹配成功，电子科技大学匹配后分数减半:', score);
            }
        }
        
        // 检查是否是四川大学匹配成功
        if (image1 === 'SCU.avif') {
            // 首次匹配四川大学时，现有分数*1.5(向上取整)
            if (!hasMatchedSCU) {
                score = Math.ceil(score * 1.5);
                hasMatchedSCU = true;
                console.log('首次匹配四川大学成功！分数*1.5:', score);
            } 
            // 如果已经匹配过电子科技大学，之后每次匹配川大时分数减半
            else if (hasMatchedUESTC) {
                // 如果处于电子科技大学带来的得分翻倍效果内，立刻结束得分翻倍效果
                if (doubledStepsRemaining > 0) {
                    doubledStepsRemaining = 0;
                    console.log('四川大学匹配成功，结束电子科技大学带来的得分翻倍效果');
                }
                // 分数减半，无论是否在得分翻倍效果内
                score = Math.floor(score / 2);
                console.log('电子科技大学已匹配成功，四川大学匹配后分数减半:', score);
            }
        }
        
        // 如果得分翻倍效果正在进行中，则本次得分翻倍
        if (doubledStepsRemaining > 0) {
            pointsEarned *= 2;
            console.log('得分翻倍！剩余步数:', doubledStepsRemaining);
        }
        
        // 添加得分
        score += pointsEarned;
        updateScore();
        
        // 匹配成功后，添加matched类并隐藏卡片内容
        card1.classList.add('matched');
        card2.classList.add('matched');
        
        // 隐藏匹配成功的卡片内容
        setTimeout(() => {
            card1.style.opacity = '0.3'; // 半透明效果
            card2.style.opacity = '0.3';
            card1.querySelector('.card-front').style.display = 'none';
            card2.querySelector('.card-front').style.display = 'none';
            card1.querySelector('.card-back').style.display = 'none';
            card2.querySelector('.card-back').style.display = 'none';
        }, 300);
        
        matchedPairs++;
        flippedCards = [];
        
        // 检查是否所有卡片都匹配成功
        if (matchedPairs === TOTAL_CARDS / 2) {
            setTimeout(showWinMessage, 500);
        }
        
        // 匹配成功处理完成后，允许继续翻牌
        isProcessing = false;
    } else {
        // 匹配失败
        
        // 重置连续匹配计数
        comboCount = 0;
        
        // 匹配失败，翻转回去
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            isProcessing = false;
        }, 1000);
    }
    
    // 无论匹配成功还是失败，只要有得分翻倍的剩余步数，就消耗一步
    if (doubledStepsRemaining > 0) {
        doubledStepsRemaining--;
        console.log('消耗一步得分翻倍效果，剩余步数:', doubledStepsRemaining);
    }
}

// 更新步数显示
function updateSteps() {
    document.getElementById('step-counter').textContent = steps;
}

// 计时器相关函数
function startTimer() {
    if (timerInterval) return;
    
    timerInterval = setInterval(() => {
        seconds++;
        updateTime();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    seconds = 0;
    updateTime();
}

function updateTime() {
    document.getElementById('seconds').textContent = formatTime(seconds);
}

function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// 音效播放函数
function playSound(sound) {
    // 检查音效元素是否存在
    if (!sound) {
        return;
    }
    // 获取音量设置
    const volume = parseFloat(localStorage.getItem('volume') || '0.5');
    try {
        // 设置音量
        sound.volume = volume;
        // 重置播放位置
        sound.currentTime = 0;
        // 播放音效
        sound.play().catch(err => {
            // 忽略音效播放错误
            console.log('音效播放失败:', err);
        });
    } catch (e) {
        // 忽略其他可能的错误
        console.log('音效处理错误:', e);
    }
}

// 预加载所有音效
function preloadSounds() {
    const sounds = [flipSound, matchSound, winSound, loseSound];
    sounds.forEach(sound => {
        if (sound) {
            // 添加错误事件监听器
            sound.addEventListener('error', (error) => {
                console.log('音效加载失败:', error);
            });
            // 尝试加载音效
            sound.load();
        }
    });
}

// 显示胜利消息
function showWinMessage() {
    // 停止计时
    stopTimer();
    
    // 播放胜利音效
    playSound(winSound);
    
    document.getElementById('final-steps').textContent = steps;
    document.getElementById('time-taken').textContent = formatTime(seconds);
    document.getElementById('final-score').textContent = score;
    document.getElementById('win-message').style.display = 'block';
}

// 显示失败消息
function showLoseMessage() {
    // 停止计时
    stopTimer();
    
    // 播放失败音效
    playSound(loseSound);
    
    document.getElementById('final-steps-lose').textContent = steps;
    document.getElementById('time-taken-lose').textContent = formatTime(seconds);
    document.getElementById('final-score-lose').textContent = score;
    document.getElementById('lose-message').style.display = 'block';
}

// 隐藏胜利消息
function hideWinMessage() {
    document.getElementById('win-message').style.display = 'none';
}

// 隐藏失败消息
function hideLoseMessage() {
    document.getElementById('lose-message').style.display = 'none';
}

// 洗牌函数 - Fisher-Yates算法
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}