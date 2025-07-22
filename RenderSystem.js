// RenderSystem.js - Handles all rendering and drawing operations

class RenderSystem {
    constructor(grid) {
        this.grid = grid;
        this.ctx = grid.ctx;
        this.dirtyHexes = new Set(); // Track only hexes that need redrawing
        this.lastRenderTime = 0; // For frame rate throttling
        this.targetFPS = 60; // Target frame rate
        this.lastAnimationCount = 0; // Track if animations have changed
        
        // Initialize player position tracking
        this.lastPlayerPos = { q: 0, r: 0 };
        this.playerMoving = false;
        
        // Challenge mode properties
        this.showGoalIndicator = false;
        this.goalSide = 'right'; // 'left', 'right', 'top', 'bottom'
        this.goalColor = 'rgba(255, 215, 0, 0.6)'; // Gold color for goal

        // Initialize the new SpriteSystem
        this.spriteSystem = new SpriteSystem();
        
        // Register the player sprite
        this.spriteSystem.registerSprite('player', {
            frameTime: 150,
            animations: {
                north: { row: 0, frames: 4 },
                northeast: { row: 1, frames: 4 },
                southeast: { row: 2, frames: 4 },
                south: { row: 3, frames: 4 },
                southwest: { row: 4, frames: 4 },
                northwest: { row: 5, frames: 4 }
            },
            defaultDirection: 'south'
        });

        // Register monster sprites
        this.spriteSystem.registerSprite('monster', {
            frameTime: 200,
            animations: {
                idle: { row: 0, frames: 4 },
                chase: { row: 1, frames: 4 },
                attack: { row: 2, frames: 4 }
            },
            defaultDirection: 'idle'
        });

        // Register stone sprites
        this.spriteSystem.registerSprite('stone_earth', {
            frameTime: 0, // No animation
            animations: {
                idle: { row: 0, frames: 1 }
            },
            defaultDirection: 'idle'
        });

        this.spriteSystem.registerSprite('stone_water', {
            frameTime: 0,
            animations: {
                idle: { row: 0, frames: 1 }
            },
            defaultDirection: 'idle'
        });

        this.spriteSystem.registerSprite('stone_fire', {
            frameTime: 100,
            animations: {
                idle: { row: 0, frames: 4 }
            },
            defaultDirection: 'idle'
        });

        this.spriteSystem.registerSprite('stone_wind', {
            frameTime: 100,
            animations: {
                idle: { row: 0, frames: 4 }
            },
            defaultDirection: 'idle'
        });

        this.spriteSystem.registerSprite('stone_void', {
            frameTime: 0,
            animations: {
                idle: { row: 0, frames: 1 }
            },
            defaultDirection: 'idle'
        });
        
        // Add keydown listener for debug toggle (Press 'D') and config panel (Press 'C')
        window.addEventListener('keydown', (e) => {
            if (e.key === 'd' || e.key === 'D') {
                this.spriteConfig.debug = !this.spriteConfig.debug;
                console.log(`Sprite debug mode: ${this.spriteConfig.debug ? 'ON' : 'OFF'}`);
                
                // Show help popup when turning debug mode on
                if (this.spriteConfig.debug) {
                    this.showDebugHelp();
                }
                
                // Force full render to show debug info
                this.render();
            } else if (e.key === 'c' || e.key === 'C') {
                // Open sprite direction configuration panel
                this.showDirectionConfigPanel();
            }
        });
    }
    
    // Modified renderSingleHex to use the new sprite system
    renderSingleHex(hex, x, y) {
        // First draw the hex background
        let fillColor = '#2a2a2a';
        const isMovable = (this.grid.mode === 'move' && this.grid.movableHexes.some(h => h.q === hex.q && h.r === hex.r));
        if (isMovable) {
            const moveCost = this.grid.movementSystem.getMovementCostFrom(this.grid.player.q, this.grid.player.r, hex.q, hex.r);
            fillColor = (moveCost === 0) ? '#1a3a2a' : '#1a2a3a';
        } else if (this.grid.mode === 'place' &&
                   this.grid.getNeighbors(this.grid.player.q, this.grid.player.r).some(n => n.q === hex.q && n.r === hex.r) &&
                   !hex.stone) {
            fillColor = '#3a2a3a';
        }
        const hasWindNeighbor = this.grid.waterMimicry.hasAdjacentStoneType(hex.q, hex.r, STONE_TYPES.WIND.name);
        if (hasWindNeighbor) {
            fillColor = this.blendColors(fillColor, STONE_TYPES.WIND.color, 0.2);
        }
        
        // Draw the base hex with filled background
        this.drawHex(x, y, this.grid.hexSize, fillColor);
        
        // Draw movable hex outline and cost ONLY if it's really movable
        if (isMovable) {
            // Find the stored movable hex info which has the correct cost
            const movableHexInfo = this.grid.movableHexes.find(h => h.q === hex.q && h.r === hex.r);
            if (movableHexInfo) {
                this.drawHex(x, y, this.grid.hexSize, 'transparent', '#00ff00', 2);
                this.drawMovementCost(x, y, movableHexInfo.cost);
            }
        }
        
        // Draw the player sprite if this is the player's hex
        if (hex.q === this.grid.player.q && hex.r === this.grid.player.r) {
            // Update player animation based on movement
            const direction = this.getDirectionFromMovement(
                this.lastPlayerPos.q, this.lastPlayerPos.r,
                this.grid.player.q, this.grid.player.r
            );
            
            this.spriteSystem.updateAnimation('player', direction, this.playerMoving);
            this.spriteSystem.drawSprite(this.ctx, 'player', x, y);
            
            // Update last position
            this.lastPlayerPos = { q: this.grid.player.q, r: this.grid.player.r };
        }
        
        // Draw monster if present - DISABLED
        // const monster = this.grid.monsterSystem.monsters.get(`${hex.q},${hex.r}`);
        // if (monster && monster.isVisible) {
        //     // Update monster animation based on state
        //     const animation = monster.hasDetectedPlayer ? 'chase' : 'idle';
        //     this.spriteSystem.updateAnimation('monster', animation, true);
        //     this.spriteSystem.drawSprite(this.ctx, 'monster', x, y);
        // }
        
        // Draw stone if present
        if (hex.stone) {
            const stoneType = hex.stone.toLowerCase();
            const spriteId = `stone_${stoneType}`;
            this.spriteSystem.updateAnimation(spriteId, 'idle', false);
            this.spriteSystem.drawSprite(this.ctx, spriteId, x, y);
        }
        
        // Draw water mimicry indicator if needed
        this.drawWaterMimicryIndicator(hex, x, y);
    }
    
    // Modified getDirectionFromMovement to return string direction names
    getDirectionFromMovement(fromQ, fromR, toQ, toR) {
        // If no movement, use the current direction from sprite state
        if (fromQ === toQ && fromR === toR) {
            const state = this.spriteSystem.getAnimationState('player');
            return state ? state.currentDirection : 'south';
        }
        
        // Convert hex coordinates to pixel space to get proper angles
        const fromPix = this.grid.hexMath.axialToPixel(fromQ, fromR);
        const toPix = this.grid.hexMath.axialToPixel(toQ, toR);
        
        // Calculate angle in degrees
        const angle = Math.atan2(toPix.y - fromPix.y, toPix.x - fromPix.x) * 180 / Math.PI;
        
        // Map angle to direction (adjusted for correct angles in hex grid)
        if (angle >= -30 && angle < 30) return 'northeast';
        if (angle >= 30 && angle < 90) return 'southeast';
        if (angle >= 90 && angle < 150) return 'south';
        if (angle >= 150 || angle < -150) return 'southwest';
        if (angle >= -150 && angle < -90) return 'northwest';
        if (angle >= -90 && angle < -30) return 'north';
        
        return 'south'; // Default
    }
    
    // Original render method for full renders
    render() {
        // Mark all hexes as dirty to force a full redraw
        for (const [key, hex] of this.grid.hexes) {
            if (hex.revealed) {
                this.dirtyHexes.add(key);
            }
        }
        this.renderOptimized();
    }
    
    // Optimized render method
    renderOptimized() {
        const now = performance.now();
        const elapsed = now - this.lastRenderTime;
        const frameTime = 1000 / this.targetFPS;
        
        // Skip render if too soon and no urgent changes
        if (elapsed < frameTime && 
            this.grid.animationManager.animations.length === this.lastAnimationCount && 
            this.dirtyHexes.size < 5) {
            return;
        }
        
        this.lastRenderTime = now;
        this.lastAnimationCount = this.grid.animationManager.animations.length;
        
        // Force animation updates even when not moving
        this.spriteSystem.update();
        
        // Update player movement state
        const playerMoved = this.lastPlayerPos.q !== this.grid.player.q || this.lastPlayerPos.r !== this.grid.player.r;
        if (playerMoved) {
            this.playerMoving = true;
            this.lastPlayerPos = { q: this.grid.player.q, r: this.grid.player.r };
        } else {
            this.playerMoving = false;
        }
        
        // Always update player animation, even when not moving
        const direction = this.getDirectionFromMovement(
            this.lastPlayerPos.q, this.lastPlayerPos.r,
            this.grid.player.q, this.grid.player.r
        );
        this.spriteSystem.updateAnimation('player', direction, this.playerMoving);
        
        // Clear previous canvas to prevent artifacts
        this.ctx.clearRect(0, 0, this.grid.canvas.width, this.grid.canvas.height);
        
        // Apply zoom and pan
        const zoom = this.grid.panningSystem.zoom || 1.0;
        const centerX = this.grid.canvas.width / 2;
        const centerY = this.grid.canvas.height / 2;
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-centerX, -centerY);
        
        // Redraw all revealed hexes - more reliable than partial updates for this game
        for (const [key, hex] of this.grid.hexes) {
            if (hex.revealed) {
                const pix = this.grid.hexMath.axialToPixel(hex.q, hex.r);
                const x = centerX + pix.x;
                const y = centerY + pix.y;
                this.renderSingleHex(hex, x, y);
            }
        }
        
        // Draw water connections
        this.drawWaterConnections();
        
        // Draw goal indicator for challenge mode
        this.drawGoalIndicator(centerX, centerY);
        
        // Draw debug markers if debug mode is active
        this.grid.debugger.drawDebugMarkers(this.ctx, centerX, centerY);
        
        this.ctx.restore();
        this.dirtyHexes.clear();
    }
    
    // Draw water connections
    drawWaterConnections() {
        const connections = this.grid.waterMimicry.findWaterConnections();
        const centerX = this.grid.canvas.width / 2;
        const centerY = this.grid.canvas.height / 2;
        
        this.ctx.save(); // Save current context state
        
        // Use a wider line to make connections more visible
        this.ctx.lineWidth = 3;
        
        for (const conn of connections) {
            const fromPix = this.grid.hexMath.axialToPixel(conn.from.q, conn.from.r);
            const toPix = this.grid.hexMath.axialToPixel(conn.to.q, conn.to.r);
            
            const x1 = centerX + fromPix.x;
            const y1 = centerY + fromPix.y;
            const x2 = centerX + toPix.x;
            const y2 = centerY + toPix.y;
            
            // Draw connection line
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            
            // Set line style based on mimic type
            if (conn.mimicType) {
                if (conn.mimicType === STONE_TYPES.WIND.name) {
                    this.ctx.strokeStyle = '#ffff00'; // Yellow for wind
                } else if (conn.mimicType === STONE_TYPES.EARTH.name) {
                    this.ctx.strokeStyle = '#00ff00'; // Green for earth
                } else {
                    this.ctx.strokeStyle = STONE_TYPES.WATER.color;
                }
                this.ctx.setLineDash([5, 3]); // Dashed line for mimicry
            } else {
                this.ctx.strokeStyle = STONE_TYPES.WATER.color;
                this.ctx.setLineDash([]); // Solid line for no mimicry
            }
            
            this.ctx.globalAlpha = 0.7; // Make connections slightly more visible
            this.ctx.stroke();
        }
        
        this.ctx.restore(); // Restore context to previous state
    }

    // Draw water stone mimicry indicator
    drawWaterMimicryIndicator(hex, x, y) {
        let mimicked = this.grid.waterMimicry.getWaterMimicType(hex.q, hex.r);
        
        if (mimicked) {
            const stoneInfo = Object.values(STONE_TYPES).find(s => s.name === mimicked);
            this.ctx.globalAlpha = 0.5;
            this.drawHex(x, y, this.grid.hexSize / 3, stoneInfo.color);
            this.ctx.globalAlpha = 1.0;
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = stoneInfo.color;
            this.ctx.fillText(stoneInfo.symbol, x, y);
        }
    }
    
    // Draw the goal indicator for challenge mode
    drawGoalIndicator(centerX, centerY) {
        if (!this.showGoalIndicator) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Set drawing styles
        ctx.fillStyle = this.goalColor;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 2;
        
        // Choose which coordinates to use based on goal side
        let goalCoords = [];
        
        switch (this.goalSide) {
            case 'left':
                // Left edge
                for (let r = -this.grid.radius + 1; r <= this.grid.radius - 1; r++) {
                    const q = -this.grid.radius + 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
            case 'right':
                // Right edge
                for (let r = -this.grid.radius + 1; r <= this.grid.radius - 1; r++) {
                    const q = this.grid.radius - 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
            case 'top':
                // Top edge
                for (let q = -this.grid.radius + 1; q <= this.grid.radius - 1; q++) {
                    const r = -this.grid.radius + 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
            case 'bottom':
                // Bottom edge
                for (let q = -this.grid.radius + 1; q <= this.grid.radius - 1; q++) {
                    const r = this.grid.radius - 1;
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        goalCoords.push({ q, r });
                    }
                }
                break;
        }
        
        // Draw goal indicators
        for (const coord of goalCoords) {
            const pix = this.grid.hexMath.axialToPixel(coord.q, coord.r);
            const x = centerX + pix.x;
            const y = centerY + pix.y;
            
            // Draw a highlighted hexagon
            this.drawHex(x, y, this.grid.hexSize + 2, this.goalColor, 'rgba(255, 215, 0, 0.8)', 2);
            
            // Add a small star or flag in the center
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', x, y); // Star symbol
        }
        
        // Add a glowing effect that pulses
        const pulseSize = 1 + 0.1 * Math.sin(Date.now() / 200);
        
        // Add a "GOAL" label in the center of the goal area
        ctx.font = `bold ${Math.floor(16 * pulseSize)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
        
        // Position the label based on goal side
        let labelX = centerX;
        let labelY = centerY;
        
        switch (this.goalSide) {
            case 'left':
                labelX = centerX - (this.grid.radius * this.grid.hexSize * 1.5);
                break;
            case 'right':
                labelX = centerX + (this.grid.radius * this.grid.hexSize * 1.5);
                break;
            case 'top':
                labelY = centerY - (this.grid.radius * this.grid.hexSize * 1.5);
                break;
            case 'bottom':
                labelY = centerY + (this.grid.radius * this.grid.hexSize * 1.5);
                break;
        }
        
        // Draw glowing text
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = 10 * pulseSize;
        ctx.fillText('GOAL', labelX, labelY);
        
        ctx.restore();
    }
    
    // Draw a hexagon
    drawHex(x, y, size, color, strokeColor = '#444', lineWidth = 1) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (2 * Math.PI / 6) * i;
            const xPos = x + size * Math.cos(angle);
            const yPos = y + size * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(xPos, yPos);
            } else {
                this.ctx.lineTo(xPos, yPos);
            }
        }
        this.ctx.closePath();
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();
    }
    
    drawMovementCost(x, y, cost) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(cost.toString(), 0, 0);
        this.ctx.restore();
    }
    
    // Helper method to draw particle effects
    drawParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.grid.hexSize * 0.8;
            const size = 1 + Math.random() * 2;
            
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(px, py, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Blend two colors with a weight parameter
    blendColors(color1, color2, weight) {
        const parseColor = (color) => {
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return [r, g, b];
            } else {
                const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (match) {
                    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
                }
                return [0, 0, 0];
            }
        };
        const [r1, g1, b1] = parseColor(color1);
        const [r2, g2, b2] = parseColor(color2);
        const r = Math.round(r1 * (1 - weight) + r2 * weight);
        const g = Math.round(g1 * (1 - weight) + g2 * weight);
        const b = Math.round(b1 * (1 - weight) + b2 * weight);
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Helper method to update sprite configuration
    updateSpriteConfig(configUpdates) {
        // Log before state for debugging
        console.log("BEFORE update - Direction to row mapping:");
        for (const [dir, anim] of Object.entries(this.spriteConfig.animations)) {
            console.log(`${dir}: row ${anim.row}`);
        }
        
        // Merge the updates with the existing config
        if (configUpdates.animations) {
            for (const [direction, config] of Object.entries(configUpdates.animations)) {
                if (this.spriteConfig.animations[direction]) {
                    // Update existing animation configuration
                    this.spriteConfig.animations[direction] = {
                        ...this.spriteConfig.animations[direction],
                        ...config
                    };
                } else {
                    // Add new animation direction
                    this.spriteConfig.animations[direction] = config;
                }
            }
        }
        
        // Update other config properties
        if (configUpdates.defaultDirection !== undefined) {
            this.spriteConfig.defaultDirection = configUpdates.defaultDirection;
        }
        if (configUpdates.frameRate !== undefined) {
            this.spriteConfig.frameRate = configUpdates.frameRate;
            // Update frame time based on frame rate
            this.frameTime = 1000 / this.spriteConfig.frameRate;
        }
        if (configUpdates.debug !== undefined) {
            this.spriteConfig.debug = configUpdates.debug;
        }
        
        // Log after state for debugging
        console.log("AFTER update - Direction to row mapping:");
        for (const [dir, anim] of Object.entries(this.spriteConfig.animations)) {
            console.log(`${dir}: row ${anim.row}`);
        }
        
        // Force direction recalculation on next movement by resetting lastPlayerPos
        if (this.grid.player) {
            // This will force the direction to be recalculated on next render
            this.lastPlayerPos = { q: -999, r: -999 };
            console.log("Reset player position to force direction recalculation");
        }
        
        // Force a re-render to apply changes
        this.render();
        
        // Log the update if debug is enabled
        if (this.spriteConfig.debug) {
            console.log('Sprite configuration updated:', this.spriteConfig);
        }
        
        return this.spriteConfig;
    }

    // Show debug help popup
    showDebugHelp() {
        // Create a popup div if it doesn't exist
        let helpPopup = document.getElementById('sprite-debug-help');
        if (!helpPopup) {
            helpPopup = document.createElement('div');
            helpPopup.id = 'sprite-debug-help';
            helpPopup.style.position = 'absolute';
            helpPopup.style.top = '10px';
            helpPopup.style.right = '10px';
            helpPopup.style.width = '300px';
            helpPopup.style.padding = '15px';
            helpPopup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            helpPopup.style.color = 'white';
            helpPopup.style.borderRadius = '5px';
            helpPopup.style.zIndex = '1000';
            helpPopup.style.fontFamily = 'Arial, sans-serif';
            helpPopup.style.fontSize = '14px';
            helpPopup.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
            
            // Add a close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'X';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '5px';
            closeBtn.style.right = '5px';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'white';
            closeBtn.style.fontSize = '16px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = () => {
                helpPopup.style.display = 'none';
            };
            
            helpPopup.appendChild(closeBtn);
            
            document.body.appendChild(helpPopup);
        }
        
        // Update content and show
        helpPopup.innerHTML = `
            <h3 style="margin-top: 0; color: #58a4f4;">Sprite Debug Mode</h3>
            <p><strong>Press D:</strong> Toggle debug visualization</p>
            <p><strong>Press C:</strong> Open direction configuration panel</p>
            <p>Debug info shows current direction, row and frame, plus a spritesheet preview with the active row highlighted.</p>
            <p><strong>Console Commands:</strong></p>
            <code style="display: block; background: #333; padding: 8px; margin: 5px 0; border-radius: 3px;">
            // Update direction mapping<br>
            game.grid.renderSystem.updateSpriteConfig({<br>
              animations: {<br>
                north: { row: 0 },<br>
                // other directions...<br>
              }<br>
            });<br><br>
            
            // Toggle debug mode<br>
            game.grid.renderSystem.spriteConfig.debug = true;
            </code>
            <button id="close-debug-help" style="margin-top: 10px; padding: 5px 10px; background: #58a4f4; border: none; color: white; border-radius: 3px; cursor: pointer;">Close</button>
        `;
        
        // Add event listener to the close button
        const closeButton = document.getElementById('close-debug-help');
        if (closeButton) {
            closeButton.onclick = () => {
                helpPopup.style.display = 'none';
            };
        }
        
        helpPopup.style.display = 'block';
    }

    // Add this function to the RenderSystem class
    showDirectionConfigPanel() {
        // Create config panel if it doesn't exist
        let configPanel = document.getElementById('sprite-direction-config');
        if (!configPanel) {
            configPanel = document.createElement('div');
            configPanel.id = 'sprite-direction-config';
            configPanel.style.position = 'absolute';
            configPanel.style.left = '10px';
            configPanel.style.top = '10px';
            configPanel.style.width = '280px';
            configPanel.style.padding = '15px';
            configPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            configPanel.style.color = 'white';
            configPanel.style.borderRadius = '5px';
            configPanel.style.zIndex = '1000';
            configPanel.style.fontFamily = 'Arial, sans-serif';
            configPanel.style.fontSize = '14px';
            configPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
            
            document.body.appendChild(configPanel);
        }
        
        // Store the RenderSystem instance for later use by window functions
        const renderSystem = this;
        
        // Helper function to get current idle row from inputs
        window.getCurrentIdleRowFromInputs = function() {
            const defaultDirSelect = document.getElementById('default-direction');
            if (defaultDirSelect) {
                const selectedDir = defaultDirSelect.value;
                const rowInput = document.getElementById(`dir-row-${selectedDir}`);
                if (rowInput) {
                    return rowInput.value;
                }
            }
            return renderSystem.spriteConfig.animations[renderSystem.spriteConfig.defaultDirection].row;
        };
        
        // Generate panel content with inputs for each direction
        const directions = Object.keys(this.spriteConfig.animations);
        let html = `
            <h3 style="margin-top: 0; color: #58a4f4;">Sprite Direction Config</h3>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
        `;
        
        // Add row selector for each direction
        directions.forEach(dir => {
            const anim = this.spriteConfig.animations[dir];
            html += `
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">
                        <strong>${anim.label}</strong> (${dir})
                    </label>
                    <div style="display: flex; align-items: center;">
                        <span style="margin-right: 8px;">Row:</span>
                        <input 
                            type="number" 
                            id="dir-row-${dir}" 
                            value="${anim.row}" 
                            min="0" 
                            max="${this.directionCount - 1}" 
                            style="width: 50px; padding: 3px;"
                        >
                        <button 
                            onclick="testDirection('${dir}')" 
                            style="margin-left: 10px; padding: 3px 8px; background: #2c5a8c; border: none; color: white; border-radius: 3px; cursor: pointer;"
                        >Test</button>
                    </div>
                </div>
            `;
        });
        
        // Add default direction selector with row preview
        html += `
            <div style="margin: 15px 0; padding-top: 10px; border-top: 1px solid #444;">
                <label style="display: block; margin-bottom: 5px;">
                    <strong>Default (Idle) Direction:</strong>
                </label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <select id="default-direction" style="padding: 5px; flex-grow: 1;">
                        ${directions.map(dir => 
                            `<option value="${dir}" ${this.spriteConfig.defaultDirection === dir ? 'selected' : ''}>
                                ${this.spriteConfig.animations[dir].label} (${dir})
                            </option>`
                        ).join('')}
                    </select>
                    <button 
                        onclick="testIdleDirection()" 
                        style="padding: 3px 8px; background: #2c5a8c; border: none; color: white; border-radius: 3px; cursor: pointer;"
                    >Test Idle</button>
                </div>
                <div style="margin-top: 5px; font-size: 12px; color: #aaa;">
                    Using row: <span class="idle-row-display">${this.spriteConfig.animations[this.spriteConfig.defaultDirection].row}</span>
                </div>
            </div>
        `;
        
        // Add save and apply buttons
        html += `
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: space-between;">
                <button id="apply-sprite-config" onclick="window.applyDirectionConfig()" style="padding: 6px 12px; background: #58a4f4; border: none; color: white; border-radius: 3px; cursor: pointer;">Apply</button>
                <button id="save-sprite-config" onclick="window.saveDirectionConfig()" style="padding: 6px 12px; background: #4caf50; border: none; color: white; border-radius: 3px; cursor: pointer;">Save Config</button>
                <button id="close-sprite-config" onclick="document.getElementById('sprite-direction-config').style.display='none'" style="padding: 6px 12px; background: #f44336; border: none; color: white; border-radius: 3px; cursor: pointer;">Close</button>
            </div>
        `;
        
        configPanel.innerHTML = html;
        configPanel.style.display = 'block';
        
        // Alternative direct binding for Apply button - might work better in some browsers
        setTimeout(() => {
            const applyBtn = document.getElementById('apply-sprite-config');
            if (applyBtn) {
                // Remove the onclick attribute and use addEventListener instead
                applyBtn.removeAttribute('onclick');
                applyBtn.addEventListener('click', function() {
                    window.applyDirectionConfig();
                });
                console.log("Direct event listener added to Apply button");
            }
        }, 100);
        
        // Add helper functions to window scope
        // Function to apply direction configuration
        window.applyDirectionConfig = function() {
            // Collect values from inputs
            const directions = Object.keys(renderSystem.spriteConfig.animations);
            const updates = { animations: {} };
            
            console.log("Starting applyDirectionConfig with renderSystem:", renderSystem);
            
            directions.forEach(dir => {
                const rowInput = document.getElementById(`dir-row-${dir}`);
                if (rowInput) {
                    const newRow = parseInt(rowInput.value, 10);
                    console.log(`Row input for ${dir}: element=${rowInput}, value=${rowInput.value}, parsed=${newRow}`);
                    if (!isNaN(newRow) && newRow >= 0 && newRow < renderSystem.directionCount) {
                        updates.animations[dir] = { row: newRow };
                    }
                } else {
                    console.log(`Could not find row input for ${dir}`);
                }
            });
            
            // Update default direction
            const defaultDirSelect = document.getElementById('default-direction');
            if (defaultDirSelect) {
                updates.defaultDirection = defaultDirSelect.value;
                console.log(`Default direction select: element=${defaultDirSelect}, value=${defaultDirSelect.value}`);
            } else {
                console.log("Could not find default-direction select element");
            }
            
            // Log for debugging
            console.log("Applying sprite config updates:", updates);
            
            // Apply the updates
            try {
                renderSystem.updateSpriteConfig(updates);
                console.log("updateSpriteConfig called successfully");
            } catch (error) {
                console.error("Error in updateSpriteConfig:", error);
            }
            
            // Force a re-render to show changes
            try {
                renderSystem.render();
                console.log("render called successfully");
            } catch (error) {
                console.error("Error in render:", error);
            }
            
            // Update the idle row display in the UI
            if (defaultDirSelect) {
                const selectedDir = defaultDirSelect.value;
                const rowInput = document.getElementById(`dir-row-${selectedDir}`);
                const idleRowDisplay = document.querySelector('#sprite-direction-config .idle-row-display');
                if (rowInput && idleRowDisplay) {
                    idleRowDisplay.textContent = rowInput.value;
                    console.log(`Idle row display updated to ${rowInput.value}`);
                } else {
                    console.log("Could not update idle row display");
                }
            }
            
            console.log('Direction configuration applied!');
            console.log('Current sprite config:', JSON.stringify(renderSystem.spriteConfig, null, 2));
            
            // Add a visual feedback for the user
            const applyButton = document.getElementById('apply-sprite-config');
            if (applyButton) {
                const originalText = applyButton.textContent;
                applyButton.textContent = "Applied!";
                applyButton.style.backgroundColor = "#4caf50";
                setTimeout(() => {
                    applyButton.textContent = originalText;
                    applyButton.style.backgroundColor = "#58a4f4";
                }, 1000);
            }
        };
        
        // Function to save direction configuration
        window.saveDirectionConfig = function() {
            // Create a new config object from the current UI input values
            const config = {
                animations: {},
                defaultDirection: document.getElementById('default-direction')?.value || renderSystem.spriteConfig.defaultDirection
            };
            
            // Read current values directly from UI inputs
            for (const dir of Object.keys(renderSystem.spriteConfig.animations)) {
                const inputElement = document.getElementById(`dir-row-${dir}`);
                if (inputElement) {
                    const rowValue = parseInt(inputElement.value, 10);
                    if (!isNaN(rowValue)) {
                        config.animations[dir] = {
                            row: rowValue,
                            frames: renderSystem.spriteConfig.animations[dir].frames,
                            label: renderSystem.spriteConfig.animations[dir].label,
                            angleRange: renderSystem.spriteConfig.animations[dir].angleRange
                        };
                    }
                }
            }
            
            // Format as code that can be pasted into the source
            const configCode = `
// Sprite configuration - Updated ${new Date().toLocaleString()}
this.spriteConfig = {
    animations: {
${Object.entries(config.animations).map(([dir, anim]) => 
            `        ${dir}: { row: ${anim.row}, frames: ${anim.frames}, label: '${anim.label}', angleRange: ${JSON.stringify(anim.angleRange)} }`
        ).join(',\n')}
    },
    defaultDirection: '${config.defaultDirection}',
    frameRate: ${renderSystem.spriteConfig.frameRate},
    debug: false
};`;

            console.log('SAVED SPRITE CONFIGURATION:');
            console.log(configCode);
            
            // Also create a popup with the code
            alert('Sprite configuration saved to console! Press F12 to open console and copy the configuration.');
            
            return configCode;
        };
        
        // Add test direction function to window scope
        window.testDirection = function(direction) {
            const rowInput = document.getElementById(`dir-row-${direction}`);
            if (rowInput) {
                const newRow = parseInt(rowInput.value, 10);
                if (!isNaN(newRow) && newRow >= 0 && newRow < renderSystem.directionCount) {
                    // Temporarily set this direction for preview
                    const originalRow = renderSystem.spriteConfig.animations[direction].row;
                    renderSystem.spriteConfig.animations[direction].row = newRow;
                    
                    // Force player to face this direction temporarily
                    const originalDirection = renderSystem.currentDirection;
                    renderSystem.currentDirection = newRow;
                    renderSystem.playerMoving = true;
                    
                    // Render the change
                    renderSystem.render();
                    
                    // Reset after a short delay
                    setTimeout(() => {
                        renderSystem.currentDirection = originalDirection;
                        renderSystem.spriteConfig.animations[direction].row = originalRow;
                        renderSystem.render();
                    }, 1000);
                }
            }
        };
        
        // Add test idle direction function to window scope
        window.testIdleDirection = function() {
            const defaultDirSelect = document.getElementById('default-direction');
            if (defaultDirSelect) {
                const selectedDir = defaultDirSelect.value;
                if (renderSystem.spriteConfig.animations[selectedDir]) {
                    // Get the row number from the input field, not from the spriteConfig
                    const rowInput = document.getElementById(`dir-row-${selectedDir}`);
                    let newRow = renderSystem.spriteConfig.animations[selectedDir].row;
                    if (rowInput) {
                        const inputRow = parseInt(rowInput.value, 10);
                        if (!isNaN(inputRow) && inputRow >= 0 && inputRow < renderSystem.directionCount) {
                            newRow = inputRow;
                        }
                    }
                    
                    // Temporarily set idle animation
                    const originalDir = renderSystem.spriteConfig.defaultDirection;
                    renderSystem.spriteConfig.defaultDirection = selectedDir;
                    
                    // Force player to use this animation
                    const originalDirection = renderSystem.currentDirection;
                    renderSystem.currentDirection = newRow;
                    renderSystem.playerMoving = false;
                    
                    // Log for debugging
                    console.log(`Testing idle direction: ${selectedDir}, row: ${newRow}`);
                    
                    // Render the change
                    renderSystem.render();
                    
                    // Reset after a short delay
                    setTimeout(() => {
                        renderSystem.spriteConfig.defaultDirection = originalDir;
                        renderSystem.currentDirection = originalDirection;
                        renderSystem.render();
                    }, 1500);
                }
            }
        };
        
        // Add event listeners after panel is in DOM
        setTimeout(() => {
            const defaultDirSelect = document.getElementById('default-direction');
            if (defaultDirSelect) {
                defaultDirSelect.addEventListener('change', () => {
                    const idleRowDisplay = document.querySelector('#sprite-direction-config .idle-row-display');
                    if (idleRowDisplay) {
                        idleRowDisplay.textContent = window.getCurrentIdleRowFromInputs();
                    }
                });
            }
            
            // Add event listeners to all row inputs
            directions.forEach(dir => {
                const input = document.getElementById(`dir-row-${dir}`);
                if (input) {
                    input.addEventListener('change', () => {
                        const idleRowDisplay = document.querySelector('#sprite-direction-config .idle-row-display');
                        if (idleRowDisplay) {
                            idleRowDisplay.textContent = window.getCurrentIdleRowFromInputs();
                        }
                    });
                }
            });
        }, 100);
    }

    // Add a permanent fix function that can be called directly from the console
    fixSpriteDirections() {
        // Apply the configuration directly without UI
        const updates = {
            animations: {
                north: { row: 0 },
                northeast: { row: 1 },
                southeast: { row: 2 },
                south: { row: 3 },
                southwest: { row: 4 },
                northwest: { row: 5 }
            },
            defaultDirection: 'south'
        };
        
        // Apply the updates
        this.updateSpriteConfig(updates);
        
        console.log("Sprite directions permanently fixed!");
        console.log("Configuration:", JSON.stringify(this.spriteConfig, null, 2));
        
        return "Sprite directions fixed successfully! Player animations should now be working correctly.";
    }
}