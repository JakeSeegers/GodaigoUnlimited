// MonsterSystem.js - Handles monster behavior and interactions

class MonsterSystem {
    constructor(grid) {
        this.grid = grid;
        this.monsters = new Map(); // Store monsters with their positions
        this.monsterTypes = {
            CHASER: {
                name: 'Chaser',
                color: '#ff4444',
                speed: 1,
                description: 'A relentless monster that chases the player'
            }
        };
        this.movesPerAP = 1; // One move per AP used
        this.movesRemaining = 0; // Moves remaining for current AP
        this.detectedMonsters = new Set(); // Track which monsters have detected the player
        this.initialized = false; // Track if monsters have been scattered
        this.maxChaseSteps = 2; // Maximum number of steps a monster will chase
        this.perceptionRange = 2; // Range at which monsters can detect the player
        
        // Create monster sprite using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Draw the monster pixel art - cuter version
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(10, 6, 12, 12); // Head outline
        ctx.fillRect(6, 14, 20, 10); // Body outline
        
        // Gray body
        ctx.fillStyle = '#808080';
        ctx.fillRect(11, 7, 10, 10); // Head
        ctx.fillRect(7, 15, 18, 8); // Body
        
        // Red eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(13, 10, 2, 2); // Left eye
        ctx.fillRect(17, 10, 2, 2); // Right eye
        
        // White shine in eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(13, 10, 1, 1); // Left eye shine
        ctx.fillRect(17, 10, 1, 1); // Right eye shine
        
        // Convert canvas to image
        this.monsterSprite = new Image();
        this.monsterSprite.src = canvas.toDataURL();
        
        // Store last positions for movement direction
        this.lastPositions = new Map();
        
        // Track summoning sickness
        this.summoningSickness = new Map(); // Track which monsters have summoning sickness
    }

    // Initialize monsters by scattering them around the board - DISABLED
    initializeMonsters(count = 5) {
        // Monster system disabled - no monsters will be spawned
        this.initialized = true;
        return;
    }

    // Check if a position is a shrine
    isShrine(q, r) {
        return this.grid.megaTileSystem && this.grid.megaTileSystem.isShrine(q, r);
    }

    // Add a monster to the grid
    addMonster(q, r, type = 'CHASER') {
        // Check if this position is a shrine
        if (!this.isShrine(q, r)) {
            console.log("Cannot add monster: Position is not a shrine");
            return null;
        }

        // Check if there's already a monster at this position
        if (this.monsters.has(`${q},${r}`)) {
            console.log("Cannot add monster: Position already has a monster");
            return null;
        }

        const monster = {
            q, r,
            type: this.monsterTypes[type],
            lastMoveTime: 0,
            hasDetectedPlayer: false,
            isVisible: false, // Start hidden
            chaseSteps: 0,
            hasSummoningSickness: true,
            turnsWithSickness: 2
        };
        this.monsters.set(`${q},${r}`, monster);
        this.summoningSickness.set(`${q},${r}`, true);
        this.grid.markHexDirty(q, r);
        return monster;
    }

    // Called when player uses AP (movement, breaking stones, etc.)
    onAPUsed(apAmount) {
        this.movesRemaining = this.movesPerAP * apAmount; // One move per AP used
        this.updateMonsters();
    }

    // Called when player ends their turn
    onTurnEnd() {
        this.movesRemaining = 3; // Three moves when turn ends
        
        // Update summoning sickness at end of turn
        for (const monster of this.monsters.values()) {
            if (monster.hasSummoningSickness) {
                monster.turnsWithSickness--;
                if (monster.turnsWithSickness <= 0) {
                    monster.hasSummoningSickness = false;
                    this.summoningSickness.delete(`${monster.q},${monster.r}`);
                    this.grid.markHexDirty(monster.q, monster.r);
                    this.grid.updateStatus("A monster has recovered from its daze!");
                }
            }
        }
        
        this.updateMonsters();
        // Clear detected monsters set at end of turn
        this.detectedMonsters.clear();
    }

    // Move monsters towards the player
    updateMonsters() {
        const monsterArray = Array.from(this.monsters.values());
        let movesLeft = this.movesRemaining;
        
        while (movesLeft > 0) {
            // Each iteration represents one AP worth of movement
            for (const monster of monsterArray) {
                // Monsters with summoning sickness move at half speed
                if (monster.hasSummoningSickness) {
                    // Only move on even-numbered moves
                    if (movesLeft % 2 === 0) {
                        this.moveMonsterTowardsPlayer(monster);
                    }
                } else {
                    this.moveMonsterTowardsPlayer(monster);
                }
            }
            movesLeft--;
        }
        
        this.movesRemaining = 0; // Reset moves remaining after all moves are used
    }

    // Move a single monster towards the player
    moveMonsterTowardsPlayer(monster) {
        // Check if player is within detection radius (2 hexes)
        const distance = this.heuristic(
            { q: monster.q, r: monster.r },
            { q: this.grid.player.q, r: this.grid.player.r }
        );

        // Check if monster's mega tile is revealed
        const megaTile = this.grid.megaTileSystem.getMegaTileForHex(monster.q, monster.r);
        if (megaTile && megaTile.revealed) {
            monster.isVisible = true;
        } else {
            monster.isVisible = false; // Hide if mega tile is not revealed
        }
        
        // If monster has already detected player and hasn't exceeded step limit
        if (monster.hasDetectedPlayer && monster.chaseSteps < this.maxChaseSteps) {
            monster.isVisible = true; // Always visible when chasing
            const path = this.findPathToPlayer(monster.q, monster.r);
            if (path && path.length > 1) {
                const nextPos = path[1];
                this.moveMonster(monster, nextPos.q, nextPos.r);
                monster.chaseSteps++; // Increment chase steps
            }
        }
        // If monster has exceeded step limit, stop chasing but stay visible and move randomly
        else if (monster.hasDetectedPlayer && monster.chaseSteps >= this.maxChaseSteps) {
            monster.hasDetectedPlayer = false;
            monster.chaseSteps = 0;
            this.moveMonsterRandomly(monster);
        }
        // If monster hasn't detected player yet, check if player is in range
        else if (distance <= this.perceptionRange) {
            monster.hasDetectedPlayer = true;
            monster.isVisible = true; // Become visible when detecting player
            monster.chaseSteps = 0; // Reset chase steps when detecting player
            this.detectedMonsters.add(`${monster.q},${monster.r}`);
            // Show alert message when monster first spots player
            this.grid.updateStatus("A monster has spotted you! 👻");
        }
        // If monster is visible but not chasing, move randomly
        else if (monster.isVisible) {
            this.moveMonsterRandomly(monster);
        }
    }

    // Move a monster in a random direction
    moveMonsterRandomly(monster) {
        const neighbors = this.grid.getNeighbors(monster.q, monster.r);
        if (neighbors.length > 0) {
            // Filter out positions with stones
            const validNeighbors = neighbors.filter(nb => {
                const hex = this.grid.getHex(nb.q, nb.r);
                return hex && !hex.stone;
            });
            
            if (validNeighbors.length > 0) {
                // Pick a random valid neighbor
                const randomIndex = Math.floor(Math.random() * validNeighbors.length);
                const nextPos = validNeighbors[randomIndex];
                this.moveMonster(monster, nextPos.q, nextPos.r);
            }
        }
    }

    // Find path to player using A* pathfinding
    findPathToPlayer(startQ, startR) {
        const start = { q: startQ, r: startR };
        const goal = { q: this.grid.player.q, r: this.grid.player.r };
        
        const openSet = new Set([`${start.q},${start.r}`]);
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(`${start.q},${start.r}`, 0);
        fScore.set(`${start.q},${start.r}`, this.heuristic(start, goal));
        
        while (openSet.size > 0) {
            let current = null;
            let lowestF = Infinity;
            
            // Find node with lowest fScore in openSet
            for (const pos of openSet) {
                const f = fScore.get(pos);
                if (f < lowestF) {
                    lowestF = f;
                    current = pos;
                }
            }
            
            if (current === `${goal.q},${goal.r}`) {
                return this.reconstructPath(cameFrom, current);
            }
            
            openSet.delete(current);
            closedSet.add(current);
            
            const [currentQ, currentR] = current.split(',').map(Number);
            const neighbors = this.grid.getNeighbors(currentQ, currentR);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeGScore = gScore.get(current) + 1;
                
                if (!openSet.has(neighborKey)) {
                    openSet.add(neighborKey);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
                    cameFrom.set(neighborKey, current);
                } else if (tentativeGScore < gScore.get(neighborKey)) {
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
                    cameFrom.set(neighborKey, current);
                }
            }
        }
        
        return null; // No path found
    }

    // Heuristic function for A* (Manhattan distance)
    heuristic(a, b) {
        return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
    }

    // Reconstruct path from A* results
    reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }
        return path.map(pos => {
            const [q, r] = pos.split(',').map(Number);
            return { q, r };
        });
    }

    // Move a monster to a new position
    moveMonster(monster, newQ, newR) {
        // Check if the new position is within board boundaries
        if (newQ < -this.grid.radius || newQ > this.grid.radius || 
            newR < -this.grid.radius || newR > this.grid.radius ||
            Math.abs(newQ + newR) > this.grid.radius) {
            return; // Don't move if outside board boundaries
        }

        // Store last position before moving
        this.lastPositions.set(`${monster.q},${monster.r}`, { q: monster.q, r: monster.r });
        
        // Remove from old position
        this.monsters.delete(`${monster.q},${monster.r}`);
        this.grid.markHexDirty(monster.q, monster.r);
        
        // Update position
        monster.q = newQ;
        monster.r = newR;
        
        // Add to new position
        this.monsters.set(`${newQ},${newR}`, monster);
        this.grid.markHexDirty(newQ, newR);

        // Check if new position's mega tile is revealed
        const megaTile = this.grid.megaTileSystem.getMegaTileForHex(newQ, newR);
        if (megaTile && megaTile.revealed) {
            monster.isVisible = true;
        } else if (!monster.hasDetectedPlayer) {
            monster.isVisible = false;
        }
        
        // Check for collision with player
        if (newQ === this.grid.player.q && newR === this.grid.player.r) {
            this.handlePlayerCaught();
        }
    }

    // Handle when a monster catches the player
    handlePlayerCaught() {
        this.grid.gameOver("A monster caught you!");
        this.movesRemaining = 0; // Stop monster movement
    }

    // Draw monsters on the canvas
    drawMonsters(ctx, centerX, centerY) {
        for (const monster of this.monsters.values()) {
            // Skip drawing if monster is not visible
            if (!monster.isVisible) continue;

            const pix = this.grid.hexMath.axialToPixel(monster.q, monster.r);
            const x = centerX + pix.x;
            const y = centerY + pix.y;
            
            if (this.monsterSprite && this.monsterSprite.complete && this.monsterSprite.naturalWidth > 0) {
                // Calculate rotation angle based on movement direction
                let angle = 0;
                const lastPos = this.lastPositions.get(`${monster.q},${monster.r}`);
                
                if (monster.hasDetectedPlayer) {
                    // Calculate angle towards player when chasing
                    const dx = this.grid.player.q - monster.q;
                    const dy = this.grid.player.r - monster.r;
                    angle = Math.atan2(dy, dx) + Math.PI / 4;
                } else if (lastPos) {
                    // Calculate angle based on last movement
                    const dx = monster.q - lastPos.q;
                    const dy = monster.r - lastPos.r;
                    if (dx !== 0 || dy !== 0) {
                        angle = Math.atan2(dy, dx) + Math.PI / 4;
                    }
                }

                // Save the current context state
                ctx.save();
                
                // Translate to monster position
                ctx.translate(x, y);
                
                // Rotate the context
                ctx.rotate(angle);
                
                // Draw the sprite with summoning sickness effect
                const spriteSize = this.grid.hexSize * 1.5;
                if (monster.hasSummoningSickness) {
                    // Add visual effect for summoning sickness
                    ctx.globalAlpha = 0.6; // More transparent
                    ctx.filter = 'hue-rotate(180deg) saturate(50%)'; // More obvious effect
                }
                ctx.drawImage(this.monsterSprite, -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
                
                // Reset context modifications
                ctx.globalAlpha = 1;
                ctx.filter = 'none';
                
                // Restore the context
                ctx.restore();

                // Draw summoning sickness indicator (just the emoji, no counter)
                if (monster.hasSummoningSickness) {
                    ctx.fillStyle = '#8e44ad';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('💤', x, y - 25);
                }
                
                // Draw chase steps if actively chasing
                if (monster.hasDetectedPlayer) {
                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${this.maxChaseSteps - monster.chaseSteps}`, x, y + 15);
                }
                
                // Draw exclamation mark if just detected player
                if (monster.hasDetectedPlayer && !this.detectedMonsters.has(`${monster.q},${monster.r}`)) {
                    ctx.fillStyle = '#e74c3c';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('!', x, y - 25);
                }
            } else {
                // Fallback hexagon drawing (unchanged)
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (let i = 1; i <= 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const px = x + this.grid.hexSize * Math.cos(angle);
                    const py = y + this.grid.hexSize * Math.sin(angle);
                    ctx.lineTo(px, py);
                }
                ctx.closePath();
                
                ctx.fillStyle = monster.type.color;
                ctx.fill();
                
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
} 