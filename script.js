document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('player');
    const map = document.getElementById('map');
    const joystickBase = document.getElementById('joystick-base');
    const joystickThumb = document.getElementById('joystick-thumb');
    const currentRoomDisplay = document.getElementById('current-room');
    const eventMessageDisplay = document.getElementById('event-message');
    const taskButton = document.getElementById('task-button');
    const reportButton = document.getElementById('report-button');
    const deadBody = document.getElementById('dead-body');
    const meetingScreen = document.getElementById('meeting-screen');
    const playerList = document.getElementById('player-list');
    const skipVoteButton = document.getElementById('skip-vote-button');
    const meetingTimerDisplay = document.getElementById('meeting-timer');

    // マップの論理的なサイズ (CSSで設定した幅と高さと一致させる)
    const mapWidth = 4000;
    const mapHeight = 3000;

    // プレイヤーとマップの論理的な座標
    let playerX = mapWidth / 2;
    let playerY = mapHeight / 2;
    let velocityX = 0;
    let velocityY = 0;
    const playerSpeed = 5;

    // ゲームの状態
    let isMeeting = false;
    let isBodyFound = false;

    // プレイヤーリストと役割
    const players = [
        { id: 1, name: '赤', color: 'red', isImpostor: false, isAlive: true },
        { id: 2, name: '青', color: 'blue', isImpostor: false, isAlive: true },
        { id: 3, name: '緑', color: 'green', isImpostor: false, isAlive: true },
        { id: 4, name: '黄', color: 'yellow', isImpostor: false, isAlive: true },
        { id: 5, name: '紫', color: 'purple', isImpostor: true, isAlive: true } // インポスター
    ];
    let myPlayer = players.find(p => p.color === 'red'); // 自分のプレイヤー

    // 部屋とタスクの定義
    const rooms = {
        'Cafeteria': { x: 1000, y: 1500, width: 200, height: 200, task: 'ごみを捨てる' },
        'Electrical': { x: 1800, y: 2200, width: 250, height: 150, task: 'ワイヤーを修理' },
        'Medical': { x: 2500, y: 1800, width: 150, height: 100, task: 'スキャンを実行' },
        'Shields': { x: 3000, y: 1000, width: 150, height: 100, task: 'シールドを起動' },
        'Weapons': { x: 3500, y: 500, width: 200, height: 150, task: '小惑星を撃つ' },
        'Admin': { x: 1500, y: 500, width: 150, height: 100, task: 'カードをスワイプ' }
    };
    
    // タスクの進捗を管理
    const tasks = {};
    for (const room in rooms) {
        if (rooms[room].task) {
            tasks[rooms[room].task] = false; // 未完了
        }
    }

    // 死体の座標
    let deadBodyPos = { x: 0, y: 0 };
    let killedPlayer = null;

    // プレイヤーとマップの位置を更新し、マップをスクロールさせる関数
    function updatePositions() {
        if (isMeeting) return;

        const newPlayerX = playerX + velocityX;
        const newPlayerY = playerY + velocityY;
        
        // マップの境界をチェック
        if (newPlayerX > 0 && newPlayerX < mapWidth && newPlayerY > 0 && newPlayerY < mapHeight) {
            playerX = newPlayerX;
            playerY = newPlayerY;
        }

        // マップを移動させる (プレイヤーが中心にいるように見せる)
        const mapX = (window.innerWidth / 2) - playerX;
        const mapY = (window.innerHeight / 2) - playerY;
        map.style.transform = `translate(${mapX}px, ${mapY}px)`;
        if (killedPlayer) {
            deadBody.style.transform = `translate(${mapX}px, ${mapY}px)`;
        }
    }

    // 衝突判定と部屋名の更新
    function checkCollision() {
        let currentRoomName = '宇宙空間';
        let currentTask = null;

        for (const roomName in rooms) {
            const room = rooms[roomName];
            if (
                playerX >= room.x &&
                playerX <= room.x + room.width &&
                playerY >= room.y &&
                playerY <= room.y + room.height
            ) {
                currentRoomName = roomName;
                currentTask = rooms[roomName].task;
                break;
            }
        }
        currentRoomDisplay.textContent = `現在地: ${currentRoomName}`;
        
        // タスクの表示
        if (currentTask && !tasks[currentTask]) {
            eventMessageDisplay.textContent = `タスク: ${currentTask}`;
            taskButton.classList.remove('hidden');
        } else if (currentTask && tasks[currentTask]) {
            eventMessageDisplay.textContent = `タスク完了！`;
            taskButton.classList.add('hidden');
        } else {
            eventMessageDisplay.textContent = '';
            taskButton.classList.add('hidden');
        }

        // 死体との衝突判定
        if (killedPlayer && !isBodyFound && Math.abs(playerX - deadBodyPos.x) < 50 && Math.abs(playerY - deadBodyPos.y) < 50) {
            isBodyFound = true;
            reportButton.classList.remove('hidden');
            eventMessageDisplay.textContent = '死体を発見しました！';
        } else if (!isBodyFound) {
            reportButton.classList.add('hidden');
        }
    }

    // 勝利条件のチェック
    function checkWinCondition() {
        const completedTasks = Object.values(tasks).filter(isCompleted => isCompleted).length;
        const totalTasks = Object.keys(tasks).length;

        // クルーメイトの勝利判定
        if (completedTasks === totalTasks) {
            alert('🎉 全てのタスクが完了しました！クルーメイトの勝利です！ 🎉');
            resetGame();
            return;
        }

        const impostorsAlive = players.filter(p => p.isImpostor && p.isAlive).length;
        const crewmatesAlive = players.filter(p => !p.isImpostor && p.isAlive).length;

        // インポスターの勝利判定
        if (impostorsAlive >= crewmatesAlive) {
            alert('🔪 インポスターが多数派になりました！インポスターの勝利です！ 🔪');
            resetGame();
            return;
        }

        // インポスター追放によるクルーメイトの勝利
        if (impostorsAlive === 0) {
            alert('🎉 全てのインポスターを追放しました！クルーメイトの勝利です！ 🎉');
            resetGame();
        }
    }

    // 描画ループ
    function gameLoop() {
        updatePositions();
        checkCollision();
        requestAnimationFrame(gameLoop);
    }

    // ゲームのリセット関数
    function resetGame() {
        isMeeting = false;
        isBodyFound = false;
        
        // プレイヤーの位置を初期化
        playerX = mapWidth / 2;
        playerY = mapHeight / 2;
        velocityX = 0;
        velocityY = 0;
        player.style.backgroundColor = myPlayer.color;

        // プレイヤーの状態をリセット
        players.forEach(p => p.isAlive = true);
        killedPlayer = null;
        
        // タスクをリセット
        for (const task in tasks) {
            tasks[task] = false;
        }
        
        // UIをリセット
        taskButton.classList.add('hidden');
        reportButton.classList.add('hidden');
        meetingScreen.classList.add('hidden');
        deadBody.classList.add('hidden');
        currentRoomDisplay.textContent = '宇宙空間';
        eventMessageDisplay.textContent = '';
    }

    // 会議開始関数
    function startMeeting() {
        isMeeting = true;
        velocityX = 0;
        velocityY = 0;
        
        meetingScreen.classList.remove('hidden');
        player.style.left = '50%';
        player.style.top = '50%';
        map.style.transform = `translate(${window.innerWidth / 2 - mapWidth / 2}px, ${window.innerHeight / 2 - mapHeight / 2}px)`;
        
        // 投票UIを生成
        playerList.innerHTML = '';
        players.forEach(p => {
            if (p.isAlive) {
                const button = document.createElement('button');
                button.textContent = p.name;
                button.className = 'player-vote-button';
                if (p.isImpostor) {
                    button.classList.add('impostor'); // 開発用
                }
                button.addEventListener('click', () => {
                    handleVote(p.id);
                });
                playerList.appendChild(button);
            }
        });
        
        // 投票タイム開始（5分間の簡易シミュレーション）
        let timeLeft = 300; // 5分
        const timerInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            meetingTimerDisplay.textContent = `残り時間: ${minutes}分 ${seconds}秒`;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert('議論時間終了！');
                endMeeting();
            }
        }, 1000);
    }

    // 投票を処理する関数
    function handleVote(votedPlayerId) {
        // ここでは簡易的に、投票されたプレイヤーを追放
        const votedPlayer = players.find(p => p.id === votedPlayerId);
        
        if (votedPlayer) {
            votedPlayer.isAlive = false;
            alert(`${votedPlayer.name}が追放されました！${votedPlayer.isImpostor ? 'インポスターでした！' : 'クルーメイトでした...'}`);
            
            // 会議終了
            endMeeting();
        }
    }
    
    // 会議終了関数
    function endMeeting() {
        meetingScreen.classList.add('hidden');
        isMeeting = false;
        isBodyFound = false;
        killedPlayer = null;
        deadBody.classList.add('hidden');
        reportButton.classList.add('hidden');
        eventMessageDisplay.textContent = '会議が終了しました。';
        
        // 勝利判定
        checkWinCondition();
    }

    // イベントリスナー
    // タスクボタンのクリック
    taskButton.addEventListener('click', () => {
        const currentRoomName = currentRoomDisplay.textContent.replace('現在地: ', '');
        const currentTask = rooms[currentRoomName].task;
        if (currentTask) {
            tasks[currentTask] = true;
            eventMessageDisplay.textContent = `タスク「${currentTask}」を完了しました！`;
            taskButton.classList.add('hidden');
            checkWinCondition();
        }
    });

    // 報告ボタンのクリック
    reportButton.addEventListener('click', () => {
        if (isBodyFound) {
            startMeeting();
        }
    });
    
    // 投票スキップボタン
    skipVoteButton.addEventListener('click', () => {
        alert('投票はスキップされました。');
        endMeeting();
    });

    // --- キーボード操作 (前回とほぼ同じ) ---
    document.addEventListener('keydown', (e) => {
        if (isMeeting) return;
        const speed = playerSpeed;
        switch(e.key) {
            case 'ArrowUp': case 'w': velocityY = -speed; break;
            case 'ArrowDown': case 's': velocityY = speed; break;
            case 'ArrowLeft': case 'a': velocityX = -speed; break;
            case 'ArrowRight': case 'd': velocityX = speed; break;
        }
    });
    document.addEventListener('keyup', (e) => {
        if (isMeeting) return;
        switch(e.key) {
            case 'ArrowUp': case 'ArrowDown': case 'w': case 's': velocityY = 0; break;
            case 'ArrowLeft': case 'ArrowRight': case 'a': case 'd': velocityX = 0; break;
        }
    });

    // --- バーチャルスティック操作 (前回とほぼ同じ) ---
    let touchId = null;
    joystickBase.addEventListener('touchstart', (e) => {
        if (isMeeting) return;
        if (touchId === null) {
            touchId = e.changedTouches[0].identifier;
            joystickThumb.style.transition = 'none';
        }
    });
    joystickBase.addEventListener('touchmove', (e) => {
        if (isMeeting) return;
        if (touchId === null) return;
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
        if (!touch) return;
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = rect.width / 2 - joystickThumb.offsetWidth / 2;
        const angle = Math.atan2(deltaY, deltaX);
        const thumbX = Math.cos(angle) * Math.min(distance, maxDistance);
        const thumbY = Math.sin(angle) * Math.min(distance, maxDistance);
        joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
        velocityX = (thumbX / maxDistance) * playerSpeed;
        velocityY = (thumbY / maxDistance) * playerSpeed;
    });
    joystickBase.addEventListener('touchend', (e) => {
        if (isMeeting) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
                touchId = null;
                joystickThumb.style.transition = 'transform 0.1s ease-out';
                joystickThumb.style.transform = `translate(-50%, -50%)`;
                velocityX = 0;
                velocityY = 0;
                break;
            }
        }
    });
    
    // 初期化関数
    function init() {
        const crewmates = players.filter(p => !p.isImpostor);
        const impostors = players.filter(p => p.isImpostor);
        const playerToKill = crewmates[Math.floor(Math.random() * crewmates.length)];
        killedPlayer = playerToKill;
        deadBodyPos.x = rooms[Object.keys(rooms)[Math.floor(Math.random() * Object.keys(rooms).length)]].x;
        deadBodyPos.y = rooms[Object.keys(rooms)[Math.floor(Math.random() * Object.keys(rooms).length)]].y;
        deadBody.style.left = `${deadBodyPos.x}px`;
        deadBody.style.top = `${deadBodyPos.y}px`;
        deadBody.classList.remove('hidden');
    }

    init();
    gameLoop();
});
