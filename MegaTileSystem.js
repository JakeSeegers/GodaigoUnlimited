// MegaTileSystem.js - Handles mega-tiles with shrines at their centers

class MegaTileSystem {
    constructor(grid) {
        this.grid = grid;
        this.megaTiles = [];
        this.revealedTiles = new Set(); // Track which mega-tiles have been revealed
        this.lastUsedShrine = null; // Track the last shrine used to prevent double-activation in the same turn
        
        // Mouse interaction state
        this.isDragging = false;
        this.lastMousePos = null;
        
        // Define elemental tile types
        this.tileTypes = {
            'earth': {
                color: '#69d83a',
                backgroundColor: '#233a23',
                shrineSymbol: '🏔️',
                glowColor: 'rgba(105, 216, 58, 0.5)',
                stoneType: STONE_TYPES.EARTH.name,
                rewardAmount: 5
            },
            'water': {
                color: '#5894f4',
                backgroundColor: '#1e2c4a',
                shrineSymbol: '🌊',
                glowColor: 'rgba(88, 148, 244, 0.5)',
                stoneType: STONE_TYPES.WATER.name,
                rewardAmount: 4
            },
            'fire': {
                color: '#ed1b43',
                backgroundColor: '#3a1a1a',
                shrineSymbol: '🔥',
                glowColor: 'rgba(237, 27, 67, 0.5)',
                stoneType: STONE_TYPES.FIRE.name,
                rewardAmount: 3
            },
            'wind': {
                color: '#ffce00',
                backgroundColor: '#3a3000',
                shrineSymbol: '💨',
                glowColor: 'rgba(255, 206, 0, 0.5)',
                stoneType: STONE_TYPES.WIND.name,
                rewardAmount: 2
            },
            'void': {
                color: '#9458f4',
                backgroundColor: '#2a1e3a',
                shrineSymbol: '✨',
                glowColor: 'rgba(148, 88, 244, 0.5)',
                stoneType: STONE_TYPES.VOID.name,
                rewardAmount: 1
            }
        };
        
        // Size of mega-tiles (radius in hexes from center)
        this.megaTileRadius = 2;
        
        // Proximity-based placement configuration
        this.placementConfig = {
            minDistance: 1,        // Minimum gap between mega tile boundaries (in hexes)
            maxDistance: 4,        // Maximum search distance for placement
            maxSearchRadius: 8,    // How far to look for placement spots
            proximityWeight: 2.0,  // How much to prioritize closeness
            preferCluster: true    // Whether to cluster tiles together
        };
    }
    
    // Initialize the mega-tile grid
    initializeMegaTiles() {
        this.megaTiles = [];
        this.revealedTiles = new Set();
        this.lastUsedShrine = null;
        
        // Get the current level and determine number of tiles per type
        const currentLevel = this.grid.currentLevel || 1;
        this.tilesPerType = currentLevel; // One of each type per level
        
        // Use proximity-based placement algorithm
        this.placeWithProximityAlgorithm(currentLevel);
        
        console.log(`Created ${this.megaTiles.length} mega-tiles for level ${currentLevel}`);
    }
    
    // Proximity-based placement algorithm
    placeWithProximityAlgorithm(currentLevel) {
        const tileTypes = Object.keys(this.tileTypes);
        const placedTiles = [];
        
        // Place first tile at origin or near center
        const firstPosition = { q: 0, r: 0 };
        if (this.canPlaceMegaTile(firstPosition.q, firstPosition.r, placedTiles)) {
            const firstType = tileTypes[0];
            this.createMegaTile(firstPosition.q, firstPosition.r, firstType);
            placedTiles.push({
                center: firstPosition,
                type: firstType,
                radius: this.megaTileRadius
            });
        }
        
        // Place remaining tiles using proximity algorithm
        let typeIndex = 1;
        for (let i = 1; i < tileTypes.length * this.tilesPerType; i++) {
            const tileType = tileTypes[typeIndex % tileTypes.length];
            
            const bestPosition = this.findNearestValidPosition(placedTiles);
            if (bestPosition) {
                this.createMegaTile(bestPosition.q, bestPosition.r, tileType);
                placedTiles.push({
                    center: bestPosition,
                    type: tileType,
                    radius: this.megaTileRadius
                });
                typeIndex++;
            } else {
                console.warn(`Could not find valid position for mega tile ${i}`);
                break;
            }
        }
    }
    
    // Find the nearest valid position for a new mega tile
    findNearestValidPosition(placedTiles) {
        const candidates = [];
        
        // Generate candidate positions around existing tiles
        for (const existingTile of placedTiles) {
            const nearbyPositions = this.generateProximityCandidates(existingTile.center);
            
            for (const position of nearbyPositions) {
                if (this.canPlaceMegaTile(position.q, position.r, placedTiles)) {
                    const score = this.calculateProximityScore(position, placedTiles);
                    candidates.push({ position, score });
                }
            }
        }
        
        // Return the position with the best score (highest = closest)
        if (candidates.length === 0) return null;
        
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0].position;
    }
    
    // Generate candidate positions near an existing tile
    generateProximityCandidates(centerPos) {
        const candidates = [];
        const { minDistance, maxDistance } = this.placementConfig;
        
        // Calculate minimum center-to-center distance
        // minDistance is the gap between boundaries, so add the tile diameters
        const minCenterDistance = (this.megaTileRadius * 2) + minDistance + 1;
        const maxCenterDistance = minCenterDistance + maxDistance;
        
        // Generate positions in expanding rings
        for (let distance = minCenterDistance; distance <= maxCenterDistance; distance++) {
            const ringPositions = this.grid.hexMath.getHexRing(centerPos.q, centerPos.r, distance);
            candidates.push(...ringPositions);
        }
        
        return candidates;
    }
    
    // Calculate how good a position is based on proximity to existing tiles
    calculateProximityScore(position, placedTiles) {
        let score = 0;
        
        for (const tile of placedTiles) {
            const distance = this.grid.hexMath.getDistance(
                position.q, position.r, 
                tile.center.q, tile.center.r
            );
            
            // Closer tiles get higher scores (inverse relationship)
            if (distance > 0) {
                score += this.placementConfig.proximityWeight / distance;
            }
        }
        
        // Bonus for being within grid bounds
        const distanceFromCenter = this.grid.hexMath.getDistance(position.q, position.r, 0, 0);
        if (distanceFromCenter < this.grid.radius - this.megaTileRadius) {
            score += 0.5;
        }
        
        return score;
    }
    
    // Check if a mega tile can be placed at the given position
    canPlaceMegaTile(centerQ, centerR, placedTiles) {
        // Check grid boundaries
        if (Math.abs(centerQ) > this.grid.radius - this.megaTileRadius ||
            Math.abs(centerR) > this.grid.radius - this.megaTileRadius ||
            Math.abs(centerQ + centerR) > this.grid.radius - this.megaTileRadius) {
            return false;
        }
        
        // Check for overlap with existing tiles
        const requiredDistance = (this.megaTileRadius * 2) + this.placementConfig.minDistance;
        
        for (const existingTile of placedTiles) {
            const distance = this.grid.hexMath.getDistance(
                centerQ, centerR,
                existingTile.center.q, existingTile.center.r
            );
            
            if (distance < requiredDistance) {
                return false; // Too close to existing tile
            }
        }
        
        return true;
    }
    
    // Create a mega-tile centered at (q,r) with the given type
    createMegaTile(centerQ, centerR, type) {
        const hexes = this.getHexesInMegaTile(centerQ, centerR);
        
        const megaTile = {
            center: { q: centerQ, r: centerR },
            type: type,
            hexes: hexes,
            revealed: false,
            lastActivatedTurn: -1 // Track when this shrine was last activated
        };
        
        this.megaTiles.push(megaTile);
        
        // Mark all hexes as being part of this mega-tile
        for (const hex of hexes) {
            const hexObj = this.grid.getHex(hex.q, hex.r);
            if (hexObj) {
                hexObj.megaTileIndex = this.megaTiles.length - 1;
            }
        }
    }
    
    // Get all hexes that form a mega-tile centered at (q,r)
    getHexesInMegaTile(centerQ, centerR) {
        return this.grid.hexMath.getHexesInRange(centerQ, centerR, this.megaTileRadius);
    }
    
    // Check if a hex is part of a mega-tile
    isHexInMegaTile(q, r) {
        const hex = this.grid.getHex(q, r);
        return hex && hex.megaTileIndex !== undefined;
    }
    
    // Check if a hex is specifically a shrine (center of a mega-tile)
    isShrine(q, r) {
        for (const megaTile of this.megaTiles) {
            if (megaTile.center.q === q && megaTile.center.r === r) {
                return true;
            }
        }
        return false;
    }
    
    // Get the mega-tile that a hex belongs to
    getMegaTileForHex(q, r) {
        const hex = this.grid.getHex(q, r);
        if (hex && hex.megaTileIndex !== undefined) {
            return this.megaTiles[hex.megaTileIndex];
        }
        return null;
    }
    
    // Reveal a mega-tile when a player steps on any of its hexes
    revealMegaTile(q, r) {
        const megaTile = this.getMegaTileForHex(q, r);
        if (!megaTile || megaTile.revealed) return false;
        
        megaTile.revealed = true;
        this.revealedTiles.add(this.megaTiles.indexOf(megaTile));
        
        // Mark all hexes in this mega-tile as dirty for rendering
        for (const hex of megaTile.hexes) {
            this.grid.markHexDirty(hex.q, hex.r);
        }
        
        // Play reveal animation
        this.playMegaTileRevealAnimation(megaTile);
        
        // Update status with information about the discovered tile
        const tileInfo = this.tileTypes[megaTile.type];
        this.grid.updateStatus(`Discovered ${megaTile.type.charAt(0).toUpperCase() + megaTile.type.slice(1)} Tile with a ${tileInfo.shrineSymbol} Shrine in its center!`);

        // Make any monsters in this mega tile visible immediately
        if (this.grid.monsterSystem) {
            for (const monster of this.grid.monsterSystem.monsters.values()) {
                const monsterMegaTile = this.getMegaTileForHex(monster.q, monster.r);
                if (monsterMegaTile === megaTile) {
                    monster.isVisible = true;
                    this.grid.markHexDirty(monster.q, monster.r);
                }
            }
        }

        // Award a scroll of the matching element type
        if (this.grid.spellSystem) {
            this.grid.spellSystem.onMegaTileRevealed(megaTile.type);
        }
        
        return true;
    }
    
    // Check if a mega-tile is revealed
    isMegaTileRevealed(megaTile) {
        if (!megaTile) return false;
        return megaTile.revealed;
    }
    
    // Check if the player is on a shrine hex
    isPlayerOnShrine() {
        const { q, r } = this.grid.player;
        
        // Check if the player is at the center of a revealed mega-tile
        for (const megaTile of this.megaTiles) {
            if (megaTile.revealed && 
                megaTile.center.q === q && 
                megaTile.center.r === r) {
                return megaTile;
            }
        }
        
        return null;
    }
    
    // Handle player movement to check for mega-tile discovery
    handlePlayerMovement(q, r) {
        // Check if player moved onto a mega-tile hex
        this.revealMegaTile(q, r);
    }
    
    // Get the current game turn count (approximate based on AP and actions)
    getCurrentTurn() {
        // This is a simplification - in a real game you might track turn number directly
        return Date.now(); // Using timestamp as a unique identifier for turn
    }
    
    // Handle activation of a shrine when the player ends turn on it
    activateShrine(megaTile) {
        if (!megaTile || !megaTile.revealed) return false;
        
        // Get current turn
        const currentTurn = this.getCurrentTurn();
        
        // If this is the same shrine the player just activated, don't activate again
        // But make the window much smaller to prevent accidental double-activation
        if (this.lastUsedShrine === megaTile && 
            currentTurn - megaTile.lastActivatedTurn < 100) { // reduced from 1000ms to 100ms
            console.log("Shrine already activated recently");
            return false;
        }
        
        // Update the last activated turn and last used shrine
        megaTile.lastActivatedTurn = currentTurn;
        this.lastUsedShrine = megaTile;
        
        // Give player the stones for this tile type
        const tileInfo = this.tileTypes[megaTile.type];
        const stonesGained = this.givePlayerStones(tileInfo.stoneType, tileInfo.rewardAmount);
        
        // Only play activation effect if stones were gained
        if (stonesGained > 0) {
            // Play activation effect with the actual number of stones gained
            this.playShrineActivationEffect(megaTile, stonesGained);
        }
        
        return stonesGained > 0;
    }
    
    // Check if the player is ending their turn on a shrine
    checkForShrineActivation() {
        const shrineUnderPlayer = this.isPlayerOnShrine();
        if (shrineUnderPlayer) {
            return this.activateShrine(shrineUnderPlayer);
        }
        return false;
    }
    
    // Give the player stones, respecting the maximum capacity
    givePlayerStones(stoneType, amount) {
        const currentCount = stoneCounts[stoneType];
        const capacity = stoneCapacity[stoneType];
        
        // Calculate how many stones can be added without exceeding capacity
        const actualAmount = Math.min(amount, capacity - currentCount);
        
        if (actualAmount <= 0) {
            this.grid.updateStatus(`Shrine activated, but your ${stoneType} stone capacity is full!`);
            return 0;
        }
        
        // Add stones
        stoneCounts[stoneType] += actualAmount;
        
        // Update the UI
        updateStoneCount(stoneType);
        
        // Update void AP display if void stones were given
        if (stoneType === STONE_TYPES.VOID.name) {
            this.grid.movementSystem.updateAPDisplay();
        }
        
        this.grid.updateStatus(`Shrine activated! Gained ${actualAmount} ${stoneType} stone${actualAmount !== 1 ? 's' : ''}.`);
        
        return actualAmount;
    }
    
    // Play animation for mega-tile reveal
    playMegaTileRevealAnimation(megaTile) {
        // Create visual indicator
        const tileInfo = this.tileTypes[megaTile.type];
        
        // Get the center position for the animation
        const pix = this.grid.hexMath.axialToPixel(megaTile.center.q, megaTile.center.r);
        const centerX = this.grid.canvas.width / 2 + pix.x;
        const centerY = this.grid.canvas.height / 2 + pix.y;
        
        // Create a ripple effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ripple = document.createElement('div');
                ripple.style.position = 'absolute';
                ripple.style.left = `${centerX}px`;
                ripple.style.top = `${centerY}px`;
                ripple.style.width = `${this.grid.hexSize * this.megaTileRadius * 3}px`;
                ripple.style.height = `${this.grid.hexSize * this.megaTileRadius * 3}px`;
                ripple.style.borderRadius = '50%';
                ripple.style.backgroundColor = 'transparent';
                ripple.style.border = `3px solid ${tileInfo.color}`;
                ripple.style.transform = 'translate(-50%, -50%)';
                ripple.style.animation = `megatile-reveal 1.5s ease-out ${i * 0.2}s`;
                ripple.style.boxShadow = `0 0 15px ${tileInfo.glowColor}`;
                ripple.style.zIndex = '950';
                ripple.style.pointerEvents = 'none';
                
                document.querySelector('.game-container').appendChild(ripple);
                
                // Remove ripple after animation
                setTimeout(() => {
                    ripple.remove();
                }, 1500 + i * 200);
            }, i * 200);
        }
        
        // Add animation if not already present
        if (!document.getElementById('megatile-animations')) {
            const animStyle = document.createElement('style');
            animStyle.id = 'megatile-animations';
            animStyle.textContent = `
                @keyframes megatile-reveal {
                    0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }
                
                @keyframes shrine-activate {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(animStyle);
        }
    }
    
    // Play animation for shrine activation
    playShrineActivationEffect(megaTile, actualGainedAmount) {
        // Get the shrine info
        const tileInfo = this.tileTypes[megaTile.type];
        
        // Use the actual gained amount that was passed in
        
        // Create a notification at screen center
        const notification = document.createElement('div');
        notification.textContent = `${tileInfo.shrineSymbol} ${megaTile.type.charAt(0).toUpperCase() + megaTile.type.slice(1)} Shrine Activated! +${actualGainedAmount} stone${actualGainedAmount !== 1 ? 's' : ''} ${tileInfo.shrineSymbol}`;
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = tileInfo.color;
        notification.style.padding = '1rem 2rem';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '2000';
        notification.style.fontSize = '24px';
        notification.style.fontWeight = 'bold';
        notification.style.textShadow = `0 0 10px ${tileInfo.glowColor}`;
        notification.style.animation = 'shrine-activation 2s forwards';
        
        // Add animation if not already present
        if (!document.getElementById('shrine-animations')) {
            const animStyle = document.createElement('style');
            animStyle.id = 'shrine-animations';
            animStyle.textContent = `
                @keyframes shrine-activation {
                    0% { opacity: 0; transform: translate(-50%, -70%); }
                    20% { opacity: 1; transform: translate(-50%, -50%); }
                    80% { opacity: 1; transform: translate(-50%, -50%); }
                    100% { opacity: 0; transform: translate(-50%, -30%); }
                }
            `;
            document.head.appendChild(animStyle);
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
            notification.remove();
        }, 2000);
        
        // Get the center position for the animation
        const pix = this.grid.hexMath.axialToPixel(megaTile.center.q, megaTile.center.r);
        const centerX = this.grid.canvas.width / 2 + pix.x;
        const centerY = this.grid.canvas.height / 2 + pix.y;
        
        // Create a shrine activation effect
        const glow = document.createElement('div');
        glow.style.position = 'absolute';
        glow.style.left = `${centerX}px`;
        glow.style.top = `${centerY}px`;
        glow.style.width = `${this.grid.hexSize * 3}px`;
        glow.style.height = `${this.grid.hexSize * 3}px`;
        glow.style.borderRadius = '50%';
        glow.style.backgroundColor = tileInfo.glowColor;
        glow.style.transform = 'translate(-50%, -50%)';
        glow.style.animation = 'shrine-activate 1.5s ease-out';
        glow.style.boxShadow = `0 0 20px ${tileInfo.color}`;
        glow.style.zIndex = '950';
        glow.style.pointerEvents = 'none';
        
        document.querySelector('.game-container').appendChild(glow);
        
        // Remove glow after animation
        setTimeout(() => {
            glow.remove();
        }, 1500);
    }
    
    // Draw mega-tiles and shrines on the canvas - called by render system
    drawMegaTiles(ctx, centerX, centerY) {
        // First draw all non-shrine mega-tile hexes
        for (const megaTile of this.megaTiles) {
            const tileInfo = this.tileTypes[megaTile.type];
            
            // Draw the background color for all non-center hexes
            for (const hex of megaTile.hexes) {
                // Skip the center (shrine) hex - we'll draw it later
                if (hex.q === megaTile.center.q && hex.r === megaTile.center.r) continue;
                
                const pix = this.grid.hexMath.axialToPixel(hex.q, hex.r);
                const x = centerX + pix.x;
                const y = centerY + pix.y;
                
                // Draw the mega-tile background (respecting any stones that might be placed)
                const gridHex = this.grid.getHex(hex.q, hex.r);
                if (gridHex) {
                    // Use light brown for unrevealed tiles, glow color for revealed tiles
                    const color = megaTile.revealed ? tileInfo.glowColor : '#D2B48C';
                    this.drawMegaTileHex(ctx, x, y, color, gridHex.stone === null);
                }
            }
        }
        
        // Then draw the shrine hexes on top
        for (const megaTile of this.megaTiles) {
            if (!megaTile.revealed) continue;
            
            const tileInfo = this.tileTypes[megaTile.type];
            const center = megaTile.center;
            const pix = this.grid.hexMath.axialToPixel(center.q, center.r);
            const x = centerX + pix.x;
            const y = centerY + pix.y;
            
            // Draw the shrine (always active status - no longer tracking permanent activation)
            const isActive = this.grid.player.q === center.q && this.grid.player.r === center.r;
            this.drawShrineHex(ctx, x, y, megaTile, tileInfo, isActive);
        }
    }
    
    // Draw a single mega-tile hex
    drawMegaTileHex(ctx, x, y, fillColor, fullHex = true) {
        ctx.save();
        
        // If fullHex is true, draw a filled hex, otherwise just an outline
        if (fullHex) {
            // Draw a subtle hex background
            const size = this.grid.hexSize * 0.9; // Slightly smaller than normal hex
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (2 * Math.PI / 6) * i;
                const xPos = x + size * Math.cos(angle);
                const yPos = y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(xPos, yPos);
                } else {
                    ctx.lineTo(xPos, yPos);
                }
            }
            ctx.closePath();
            
            // Fill with semi-transparent color
            ctx.fillStyle = fillColor;
            ctx.fill();
        } else {
            // Just draw a subtle outline to indicate it's part of a mega-tile
            ctx.beginPath();
            const size = this.grid.hexSize * 0.95;
            for (let i = 0; i < 6; i++) {
                const angle = (2 * Math.PI / 6) * i;
                const xPos = x + size * Math.cos(angle);
                const yPos = y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(xPos, yPos);
                } else {
                    ctx.lineTo(xPos, yPos);
                }
            }
            ctx.closePath();
            
            // Just stroke with a dashed line
            ctx.strokeStyle = fillColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }
    
    // Draw a shrine hex (center of a mega-tile)
    drawShrineHex(ctx, x, y, megaTile, tileInfo, isPlayerOnShrine = false) {
        ctx.save();
        
        // Draw background hex with pulsing effect
        const pulseSize = isPlayerOnShrine ? 
            0.95 + 0.1 * Math.sin(Date.now() / 100) : // Faster pulse when player is on it
            0.9 + 0.1 * Math.sin(Date.now() / 200);   // Normal pulse
            
        const size = this.grid.hexSize * pulseSize;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (2 * Math.PI / 6) * i;
            const xPos = x + size * Math.cos(angle);
            const yPos = y + size * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(xPos, yPos);
            } else {
                ctx.lineTo(xPos, yPos);
            }
        }
        ctx.closePath();
        
        // Create gradient fill
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        if (isPlayerOnShrine) {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(0.5, tileInfo.glowColor);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.6, tileInfo.glowColor);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = tileInfo.color;
        ctx.lineWidth = isPlayerOnShrine ? 2 : 1;
        ctx.stroke();
        
        // Draw shrine symbol
        ctx.fillStyle = tileInfo.color;
        ctx.font = `${isPlayerOnShrine ? 'bold ' : ''}16px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tileInfo.shrineSymbol, x, y);
        
        // Add glow effect when player is on shrine
        if (isPlayerOnShrine) {
            ctx.shadowColor = tileInfo.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 200); // Pulsing opacity
            ctx.fillText(tileInfo.shrineSymbol, x, y);
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
    
    // Reset all mega-tiles (for new game)
    resetMegaTiles() {
        for (const megaTile of this.megaTiles) {
            megaTile.revealed = false;
            megaTile.lastActivatedTurn = -1;
        }
        this.revealedTiles.clear();
        this.lastUsedShrine = null;
    }
    
    // Shuffle array helper
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    // Reveal all mega-tiles (debug feature)
    revealAllMegaTiles() {
        for (const megaTile of this.megaTiles) {
            megaTile.revealed = true;
            
            // Mark all hexes in this mega-tile as dirty for rendering
            for (const hex of megaTile.hexes) {
                this.grid.markHexDirty(hex.q, hex.r);
            }
        }
        return this.megaTiles.length;
    }

    // Mouse event handlers
    handleMouseDown(event) {
        this.isDragging = true;
        this.lastMousePos = event;
    }

    handleMouseMove(event) {
        if (!this.isDragging || !this.lastMousePos) return;
        
        // Calculate the delta movement
        const dx = event.x - this.lastMousePos.x;
        const dy = event.y - this.lastMousePos.y;
        
        this.lastMousePos = event;
    }

    handleMouseUp(event) {
        this.isDragging = false;
        this.lastMousePos = null;
    }
}