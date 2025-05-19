const URL = "./my-pose-model/";
const game = document.getElementById("gameCanvas");

let model, webcam, ctx, labelContainer, maxPredictions;

async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        const size = 200;
        const flip = true;
        webcam = new tmPose.Webcam(size, size, flip);
        await webcam.setup();
        await webcam.play();
        window.requestAnimationFrame(loop);

        const canvas = document.getElementById("canvas");
        canvas.width = size;
        canvas.height = size;
        ctx = canvas.getContext("2d");

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        startGame();
    } catch (error) {
        alert("Erro ao iniciar o modelo ou webcam: " + error);
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }

    drawPose(pose);
}

function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }
}


function startGame() {
    const ctx_game = game.getContext("2d");
    alert("Jogo iniciado! Use a webcam para jogar.");

    const size = 50;

    const snake = [ 
        {x: 150, y: 150}, 
    ];

    const randomPosition = () => {
        const maxCells = 500 / size; 

        const x = Math.floor(Math.random() * maxCells) * size ;
        const y = Math.floor(Math.random() * maxCells) * size ;

        return { x, y };
    };


    const food = randomPosition(); 

    const foodImg = new Image();
    foodImg.src = "assets/food.svg";


    let direction, loopId

    const drawSnake = () => {
        ctx_game.fillStyle = "#ddd"; 

        snake.forEach((position, index) => {
            if (index === snake.length - 1) {
                ctx_game.fillStyle = "#161616"; 
            } else {
                ctx_game.fillStyle = "#ddd";
            }
            ctx_game.fillRect(position.x, position.y, size, size); 
        });
    }

    const moveSnake = () => {
        if (!direction ) return
        const head = snake[snake.length - 1];
        if (direction === "right") {
            snake.push({ x: head.x + size, y: head.y });
        }
        if (direction === "left") {
            snake.push({ x: head.x - size, y: head.y });
        }
        if (direction === "down") {
            snake.push({ x: head.x, y: head.y + size });
        }
        if (direction === "up") {
            snake.push({ x: head.x, y: head.y - size });
        }
        
        snake.shift()
    }


    document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" && direction !== "down") {
            direction = "up";
        } else if (event.key === "ArrowDown" && direction !== "up") {
            direction = "down";
        } else if (event.key === "ArrowLeft" && direction !== "right") {
            direction = "left";
        } else if (event.key === "ArrowRight" && direction !== "left") {
            direction = "right";
        }
    });

    const checkEat = () => {
        const head = snake[snake.length - 1];
        if (head.x === food.x && head.y === food.y) {
            snake.push(head)
            newPos = randomPosition();
            while (snake.find(s => s.x === newPos.x && s.y === newPos.y)) {
                newPos = randomPosition();
            }
            food.x = newPos.x;
            food.y = newPos.y;
        }
    }

    const checkCollision = () => {
        const head = snake[snake.length - 1];
        const notHead = snake.length - 2

        const selfCollision = snake.find((position, index) => {
            if (index < notHead){
                return position.x === head.x && position.y === head.y;
            }
        })

        if (head.x < 0 || head.x >= 500 || head.y < 0 || head.y >= 500 || selfCollision) {
            alert("Game Over!");
            return;
        }
    }


    
    const drawFood = () => {
        ctx_game.drawImage(foodImg, food.x, food.y, size, size);
    };

    const drawGrid = () => {
        ctx_game.lineWidth = 0.5;
        ctx_game.strokeStyle = "#191919";

        for (let i = 0; i < 500; i += size) {
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

    const gameLoop = () => {
        clearInterval(loopId);
        ctx_game.clearRect(0, 0, 500, 500);

        drawGrid();
        drawFood();
        moveSnake();
        drawSnake();
        checkEat();
        checkCollision();

        loopId =  setTimeout(() => {
            gameLoop();
        }, 500)
    }

    gameLoop();

}
