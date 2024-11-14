const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Game world settings
const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;
const FOOD_COUNT = 15000; // Increased initial food count
const MAX_FOOD = 500;  // Maximum food limit
const FOOD_SPAWN_INTERVAL = 100; // Spawn food every 1 second

// Theme settings
let isDarkMode = false;
const lightTheme = {
    background: '#f0f0f0',
    grid: '#ddd',
    border: '#000'
};
const darkTheme = {
    background: '#1a1a1a',
    grid: '#333',
    border: '#fff'
};

// Get current theme colors
function getThemeColors() {
    return isDarkMode ? darkTheme : lightTheme;
}

// Camera position
const camera = {
    x: 0,
    y: 0
};

// Set canvas size to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game objects
const players = []; // Array to hold all player cells

function createPlayerCell(x, y, radius, velocity = { x: 0, y: 0 }) {
    return {
        x,
        y,
        radius,
        velocity,
        speed: 5,
        score: radius * 2,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        splitCooldown: 0
    };
}

// Initialize first player cell
players.push(createPlayerCell(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 20));

// Handle spacebar for splitting
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        splitCells();
    }
});

function splitCells() {
    const currentLength = players.length;
    // Only split if we have less than 16 cells
    if (currentLength >= 16) return;

    // Loop through existing cells to split them
    for (let i = 0; i < currentLength; i++) {
        const cell = players[i];
        // Only split cells that are big enough and not in cooldown
        if (cell.radius >= 20 && cell.splitCooldown <= 0) {
            // Calculate split direction towards mouse
            const mouseWorld = screenToWorld(mouse.x, mouse.y);
            const dx = mouseWorld.x - cell.x;
            const dy = mouseWorld.y - cell.y;
            const angle = Math.atan2(dy, dx);
            
            // Create new cell
            const newRadius = cell.radius / Math.sqrt(2);
            cell.radius = newRadius;
            
            // Set split velocity
            const splitSpeed = 15;
            const newCell = createPlayerCell(
                cell.x,
                cell.y,
                newRadius,
                {
                    x: Math.cos(angle) * splitSpeed,
                    y: Math.sin(angle) * splitSpeed
                }
            );
            
            // Add cooldown to prevent immediate splitting
            cell.splitCooldown = 10;
            newCell.splitCooldown = 10;
            
            players.push(newCell);
        }
    }
}

const foods = [];

// Generate initial food
function generateFood() {
    return {
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        radius: 5,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
}

// Spawn new food periodically
setInterval(() => {
    if (foods.length < MAX_FOOD) {
        foods.push(generateFood());
    }
}, FOOD_SPAWN_INTERVAL);

for (let i = 0; i < FOOD_COUNT; i++) {
    foods.push(generateFood());
}

// Mouse movement
let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

// Convert screen coordinates to world coordinates
function screenToWorld(screenX, screenY) {
    return {
        x: screenX + camera.x,
        y: screenY + camera.y
    };
}

// Update camera position
function updateCamera() {
    // Center camera on player
    const centerX = players.reduce((sum, cell) => sum + cell.x, 0) / players.length;
    const centerY = players.reduce((sum, cell) => sum + cell.y, 0) / players.length;
    
    camera.x = centerX - canvas.width / 2;
    camera.y = centerY - canvas.height / 2;

    // Clamp camera to world bounds
    camera.x = Math.max(0, Math.min(camera.x, WORLD_WIDTH - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, WORLD_HEIGHT - canvas.height));
}

// Game loop
function update() {
    const worldMouse = screenToWorld(mouse.x, mouse.y);
    
    // Update all player cells
    players.forEach(cell => {
        // Decrease split cooldown
        if (cell.splitCooldown > 0) {
            cell.splitCooldown--;
        }

        // Apply split velocity
        if (cell.velocity.x !== 0 || cell.velocity.y !== 0) {
            cell.x += cell.velocity.x;
            cell.y += cell.velocity.y;
            
            // Slow down split velocity
            cell.velocity.x *= 0.95;
            cell.velocity.y *= 0.95;
            
            // Stop very small velocities
            if (Math.abs(cell.velocity.x) < 0.1) cell.velocity.x = 0;
            if (Math.abs(cell.velocity.y) < 0.1) cell.velocity.y = 0;
        } else {
            // Normal movement towards mouse
            const dx = worldMouse.x - cell.x;
            const dy = worldMouse.y - cell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speed = cell.speed * (20 / cell.radius); // Bigger cells move slower
                cell.x += (dx / distance) * speed;
                cell.y += (dy / distance) * speed;
            }
        }

        // Keep cell within world bounds
        cell.x = Math.max(cell.radius, Math.min(cell.x, WORLD_WIDTH - cell.radius));
        cell.y = Math.max(cell.radius, Math.min(cell.y, WORLD_HEIGHT - cell.radius));

        // Check collision with food
        foods.forEach((food, index) => {
            const dx = cell.x - food.x;
            const dy = cell.y - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < cell.radius + food.radius) {
                foods.splice(index, 1);
                cell.score += 10;
                cell.radius += 0.5;
                foods.push(generateFood());
                
                // Update total score
                const totalScore = players.reduce((sum, cell) => sum + cell.score, 0);
                scoreElement.textContent = `Score: ${Math.floor(totalScore)}`;
            }
        });
    });

    // Update camera to follow center of mass
    updateCamera();
}

function draw() {
    const theme = getThemeColors();
    
    // Clear canvas
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    const gridSize = 50;
    const offsetX = -camera.x % gridSize;
    const offsetY = -camera.y % gridSize;

    for (let x = offsetX; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = offsetY; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Save context state
    ctx.save();
    
    // Translate everything by camera position
    ctx.translate(-camera.x, -camera.y);

    // Draw foods
    foods.forEach(food => {
        // Only draw foods that are visible in the viewport
        if (food.x + food.radius > camera.x && 
            food.x - food.radius < camera.x + canvas.width &&
            food.y + food.radius > camera.y && 
            food.y - food.radius < camera.y + canvas.height) {
            ctx.beginPath();
            ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
            ctx.fillStyle = food.color;
            ctx.fill();
            ctx.closePath();
        }
    });

    // Draw all player cells
    players.forEach(cell => {
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
        ctx.fillStyle = cell.color;
        ctx.fill();
        ctx.closePath();
    });

    // Restore context state
    ctx.restore();

    // Draw world bounds indicator
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(
        -camera.x,
        -camera.y,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Theme toggle handler
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    themeToggle.addEventListener('change', () => {
        isDarkMode = themeToggle.checked;
        body.classList.toggle('dark-mode', isDarkMode);
    });

    // Chat functionality
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatToggle = document.getElementById('chat-toggle');
    let isChatVisible = false;

    // Toggle chat visibility
    chatToggle.addEventListener('click', () => {
        isChatVisible = !isChatVisible;
        chatContainer.classList.toggle('visible', isChatVisible);
        chatToggle.textContent = isChatVisible ? '← Chat' : 'Chat →';
    });

    // Send message function
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.textContent = `Player: ${message}`;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            chatInput.value = '';
        }
    }

    // Send message on button click
    chatSend.addEventListener('click', sendMessage);

    // Send message on Enter key
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Prevent game controls when typing in chat
    chatInput.addEventListener('keydown', (event) => {
        event.stopPropagation();
    });
});

gameLoop();
