const URL = "./my-pose-model/";
const game = document.getElementById("gameCanvas");
const scoreDisplay = document.querySelector('.score--value');
const endScore = document.querySelector('.score--final');
const gameOverContainer = document.querySelector('.game-over-container');

let model, webcam, ctx, labelContainer, maxPredictions;
let direction, loopId;
const snake = [{ x: 150, y: 150 }];

// Tamanho de cada célula
const size = 50;
// Pontuação
let score = 0;

// Comida e imagem são globais
const food = { x: 0, y: 0 };
const foodImg = new Image();
foodImg.src = "assets/food.svg";

function randomPosition() {
    const maxCells = 500 / size;
    const x = Math.floor(Math.random() * maxCells) * size;
    const y = Math.floor(Math.random() * maxCells) * size;
    return { x, y };
}

function setFood() {
    let pos;
    do {
        pos = randomPosition();
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food.x = pos.x;
    food.y = pos.y;
}

function updateScore(points) {
    score += points;
    scoreDisplay.innerText = score.toString().padStart(2, '0');
}

function drawGrid(ctx_game) {
    ctx_game.lineWidth = 0.5;
    ctx_game.strokeStyle = "#191919";
    for (let i = 0; i <= 500; i += size) {
        ctx_game.beginPath();
        ctx_game.moveTo(i, 0);
        ctx_game.lineTo(i, 500);
        ctx_game.stroke();
        ctx_game.beginPath();
        ctx_game.moveTo(0, i);
        ctx_game.lineTo(500, i);
        ctx_game.stroke();
    }
}

function drawSnake(ctx_game) {
    snake.forEach((pos, idx) => {
        ctx_game.fillStyle = idx === snake.length - 1 ? "#161616" : "#ddd";
        ctx_game.fillRect(pos.x, pos.y, size, size);
    });
}

function drawFood(ctx_game) {
    ctx_game.drawImage(foodImg, food.x, food.y, size, size);
}

function moveSnake() {
    if (!direction) return;
    const head = snake[snake.length - 1];
    const newHead = { x: head.x, y: head.y };
    if (direction === "right") newHead.x += size;
    if (direction === "left")  newHead.x -= size;
    if (direction === "down")  newHead.y += size;
    if (direction === "up")    newHead.y -= size;
    snake.push(newHead);
    snake.shift();
}

function checkCollision() {
    const head = snake[snake.length - 1];
    const self = snake.slice(0, -1).some(p => p.x === head.x && p.y === head.y);
    if (head.x < 0 || head.x >= 500 || head.y < 0 || head.y >= 500 || self) {
        gameOver();
        return true;
    }
    return false;
}

function checkEat() {
    const head = snake[snake.length - 1];
    if (head.x === food.x && head.y === food.y) {
        // Cresce
        snake.push({ x: head.x, y: head.y });
        setFood();
        updateScore(1);
    }
}

function gameLoop() {
    const ctx_game = game.getContext("2d");
    ctx_game.clearRect(0, 0, 500, 500);

    drawGrid(ctx_game);
    drawFood(ctx_game);
    moveSnake();

    if (checkCollision()) return;

    checkEat();
    drawSnake(ctx_game);

    // Próxima iteração
    loopId = setTimeout(gameLoop, 500);
}

function setDirectionFromPrediction(predictions) {
    const top = predictions.reduce((a, b) => a.probability > b.probability ? a : b);
    if (top.probability > 0.85) {
        if (top.className === "Cima"    && direction !== "down")  direction = "up";
        if (top.className === "Baixo"   && direction !== "up")    direction = "down";
        if (top.className === "Esquerda" && direction !== "right") direction = "left";
        if (top.className === "Direita" && direction !== "left")  direction = "right";
    }
}

async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    // Exibe probabilidades
    for (let i = 0; i < maxPredictions; i++) {
        const p = prediction[i];
        labelContainer.childNodes[i].innerHTML = `${p.className}: ${p.probability.toFixed(2)}`;
    }

    setDirectionFromPrediction(prediction);

    drawPose(pose);
}

async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        const camSize = 200;
        webcam = new tmPose.Webcam(camSize, camSize, true);
        await webcam.setup();
        await webcam.play();
        window.requestAnimationFrame(loop);

        const canvas = document.getElementById("canvas");
        canvas.width = camSize;
        canvas.height = camSize;
        ctx = canvas.getContext("2d");

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        setFood();
        startGame();
    } catch (err) {
        alert("Erro ao iniciar modelo ou webcam: " + err);
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        if (pose) {
            tmPose.drawKeypoints(pose.keypoints, 0.5, ctx);
            tmPose.drawSkeleton(pose.keypoints, 0.5, ctx);
        }
    }
}


document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp"    && direction !== "down")  direction = "up";
    if (e.key === "ArrowDown"  && direction !== "up")    direction = "down";
    if (e.key === "ArrowLeft"  && direction !== "right") direction = "left";
    if (e.key === "ArrowRight" && direction !== "left")  direction = "right";
});



function startGame() {
    alert("Jogo iniciado! Use a webcam ou as setas para jogar.");
    gameLoop();
}

function gameOver() {
    clearTimeout(loopId);
    direction = undefined;
    endScore.innerText = score.toString().padStart(2, '0');
    gameOverContainer.style.display = "flex";
}

function restartGame() {
    clearTimeout(loopId);
    snake.length = 1;
    snake[0] = { x: 150, y: 150 };
    direction = undefined;
    score = 0;
    scoreDisplay.innerText = score.toString().padStart(2, '0');
    gameOverContainer.style.display = "none";
    setFood();
    gameLoop();
}
