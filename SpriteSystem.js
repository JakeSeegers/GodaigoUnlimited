class SpriteSystem {
    constructor() {
        this.sprites = new Map();
        this.animationStates = new Map();
        this.debug = false;
        this.lastUpdateTime = performance.now();
    }

    registerSprite(id, config) {
        this.sprites.set(id, config);
        this.animationStates.set(id, {
            currentDirection: config.defaultDirection,
            currentFrame: 0,
            lastFrameTime: performance.now(),
            isMoving: false
        });
    }

    updateAnimation(id, direction, isMoving) {
        const sprite = this.sprites.get(id);
        if (!sprite) return;

        const currentState = this.animationStates.get(id) || {
            currentFrame: 0,
            lastFrameTime: 0,
            currentDirection: direction,
            isMoving: false
        };

        const now = performance.now();
        const elapsed = now - currentState.lastFrameTime;
        const animation = sprite.animations[direction];
        
        if (!animation) return;

        // Always update animations, even when not moving
        if (elapsed >= sprite.frameTime) {
            // If direction changed or movement state changed, reset frame
            if (currentState.currentDirection !== direction || currentState.isMoving !== isMoving) {
                currentState.currentFrame = 0;
            } else {
                currentState.currentFrame = (currentState.currentFrame + 1) % animation.frames;
            }
            currentState.lastFrameTime = now;
        }

        // Update state
        currentState.currentDirection = direction;
        currentState.isMoving = isMoving;
        this.animationStates.set(id, currentState);
    }

    // Force animation updates even when the player isn't moving
    update() {
        const now = performance.now();
        if (now - this.lastUpdateTime > 100) { // Update every 100ms
            this.lastUpdateTime = now;
            
            // Update all animations
            for (const [id, state] of this.animationStates.entries()) {
                const sprite = this.sprites.get(id);
                if (!sprite) continue;
                
                this.updateAnimation(id, state.currentDirection, state.isMoving);
            }
        }
    }

    drawSprite(ctx, id, x, y) {
        const sprite = this.sprites.get(id);
        const state = this.animationStates.get(id);
        
        if (!sprite || !state) return;

        ctx.save();
        ctx.translate(x, y);

        // Draw the sprite based on its type
        switch (id) {
            case 'player':
                this.drawPlayer(ctx, state);
                break;
            case 'monster':
                this.drawMonster(ctx, state);
                break;
            case 'stone_earth':
                this.drawEarthStone(ctx);
                break;
            case 'stone_water':
                this.drawWaterStone(ctx);
                break;
            case 'stone_fire':
                this.drawFireStone(ctx, state);
                break;
            case 'stone_wind':
                this.drawWindStone(ctx, state);
                break;
            case 'stone_void':
                this.drawVoidStone(ctx);
                break;
        }

        // Draw debug info if enabled
        if (this.debug) {
            this.drawDebugInfo(ctx, id, state);
        }

        ctx.restore();
    }

    // Player sprite drawing
    drawPlayer(ctx, state) {
        const size = 24;
        const frame = state.currentFrame;
        const direction = state.currentDirection;

        // Draw body
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Draw eyes based on direction
        const eyeOffset = size * 0.2;
        const eyeSize = size * 0.1;
        
        ctx.fillStyle = '#ffffff';
        switch (direction) {
            case 'north':
                ctx.fillRect(-eyeOffset, -eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(eyeOffset - eyeSize, -eyeOffset, eyeSize, eyeSize);
                break;
            case 'south':
                ctx.fillRect(-eyeOffset, eyeOffset - eyeSize, eyeSize, eyeSize);
                ctx.fillRect(eyeOffset - eyeSize, eyeOffset - eyeSize, eyeSize, eyeSize);
                break;
            case 'northeast':
            case 'southeast':
                ctx.fillRect(eyeOffset - eyeSize, -eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(eyeOffset - eyeSize, eyeOffset - eyeSize, eyeSize, eyeSize);
                break;
            case 'northwest':
            case 'southwest':
                ctx.fillRect(-eyeOffset, -eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(-eyeOffset, eyeOffset - eyeSize, eyeSize, eyeSize);
                break;
        }
        
        // Add subtle animation based on frame number
        const bounceOffset = Math.sin(frame * (Math.PI / 2)) * size * 0.05;
        if (state.isMoving) {
            // Draw motion lines when moving
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Draw lines in the opposite direction of movement
            switch (direction) {
                case 'north':
                    for (let i = 0; i < 3; i++) {
                        const offset = size * 0.5 + i * 5;
                        ctx.moveTo(-size * 0.2, offset + bounceOffset);
                        ctx.lineTo(size * 0.2, offset + bounceOffset);
                    }
                    break;
                case 'south':
                    for (let i = 0; i < 3; i++) {
                        const offset = -size * 0.5 - i * 5;
                        ctx.moveTo(-size * 0.2, offset - bounceOffset);
                        ctx.lineTo(size * 0.2, offset - bounceOffset);
                    }
                    break;
                case 'northeast':
                    for (let i = 0; i < 3; i++) {
                        const offset = i * 5;
                        ctx.moveTo(-size * 0.4 - offset, size * 0.2 + offset + bounceOffset);
                        ctx.lineTo(-size * 0.2 - offset, size * 0.4 + offset + bounceOffset);
                    }
                    break;
                case 'southeast':
                    for (let i = 0; i < 3; i++) {
                        const offset = i * 5;
                        ctx.moveTo(-size * 0.4 - offset, -size * 0.2 - offset - bounceOffset);
                        ctx.lineTo(-size * 0.2 - offset, -size * 0.4 - offset - bounceOffset);
                    }
                    break;
                case 'southwest':
                    for (let i = 0; i < 3; i++) {
                        const offset = i * 5;
                        ctx.moveTo(size * 0.4 + offset, -size * 0.2 - offset - bounceOffset);
                        ctx.lineTo(size * 0.2 + offset, -size * 0.4 - offset - bounceOffset);
                    }
                    break;
                case 'northwest':
                    for (let i = 0; i < 3; i++) {
                        const offset = i * 5;
                        ctx.moveTo(size * 0.4 + offset, size * 0.2 + offset + bounceOffset);
                        ctx.lineTo(size * 0.2 + offset, size * 0.4 + offset + bounceOffset);
                    }
                    break;
            }
            ctx.stroke();
        } else {
            // Draw subtle breathing animation when idle
            ctx.scale(1, 1 + bounceOffset * 0.03);
        }
    }

    // Monster sprite drawing
    drawMonster(ctx, state) {
        const size = 20;
        const frame = state.currentFrame;
        const isChasing = state.currentDirection === 'chase';
        const isAttacking = state.currentDirection === 'attack';

        // Draw body
        ctx.fillStyle = isChasing ? '#ff4444' : '#808080';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Draw eyes
        ctx.fillStyle = isChasing ? '#ff0000' : '#ff4444';
        const eyeSize = size * 0.1;
        ctx.fillRect(-size * 0.2, -eyeSize, eyeSize, eyeSize);
        ctx.fillRect(size * 0.2 - eyeSize, -eyeSize, eyeSize, eyeSize);

        // Add animation effects
        if (isChasing) {
            // Add motion lines
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-size * 0.3, 0);
            ctx.lineTo(-size * 0.4, 0);
            ctx.moveTo(size * 0.3, 0);
            ctx.lineTo(size * 0.4, 0);
            ctx.stroke();
        }

        if (isAttacking) {
            // Add attack effect
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(size * 0.3, -size * 0.1, size * 0.2, size * 0.2);
        }
    }

    // Earth stone drawing - make it look solid and impassable
    drawEarthStone(ctx) {
        const size = 16;
        
        // Draw base
        ctx.fillStyle = '#8B4513'; // Darker brown
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw texture to make it look like solid rock
        ctx.strokeStyle = '#654321'; // Darker outline
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add rocky texture
        ctx.fillStyle = '#a05a2c'; // Lighter spots
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size * 0.7;
            const spotSize = 2 + Math.random() * 3;
            
            const px = Math.cos(angle) * distance;
            const py = Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(px, py, spotSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add a symbol in the center
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▲', 0, 0); // Earth symbol
    }

    drawWaterStone(ctx) {
        const size = 16;
        ctx.fillStyle = '#1E90FF';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0000FF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Fire stone drawing - Add animation for fire
    drawFireStone(ctx, state) {
        const size = 16;
        const frame = state.currentFrame;
        
        // Base stone
        ctx.fillStyle = '#c43a3a'; // Darker red
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Flame effect based on animation frame
        ctx.fillStyle = `rgba(255, ${100 + frame * 40}, 0, 0.8)`;
        
        // Draw flickering flames
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6 * Math.PI * 2) + (frame * 0.2);
            const flameHeight = size * 0.6 + Math.sin(angle + frame) * size * 0.3;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(
                Math.cos(angle) * size * 0.7, 
                Math.sin(angle) * size * 0.7,
                Math.cos(angle) * flameHeight, 
                Math.sin(angle) * flameHeight
            );
            ctx.quadraticCurveTo(
                Math.cos(angle + 0.1) * size * 0.5, 
                Math.sin(angle + 0.1) * size * 0.5,
                0, 0
            );
            ctx.fill();
        }
        
        // Add a slight glow effect
        ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a symbol in the center
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♦', 0, 0); // Fire symbol
    }

    drawWindStone(ctx, state) {
        const size = 16;
        const frame = state.currentFrame;
        
        // Base stone
        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4682B4';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Animated wind effect
        const windSize = size * (1 + frame * 0.1);
        ctx.strokeStyle = `rgba(135, 206, 235, ${0.3 + frame * 0.2})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + (frame * Math.PI / 8);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(angle) * windSize,
                Math.sin(angle) * windSize
            );
            ctx.stroke();
        }
    }

    drawVoidStone(ctx) {
        const size = 16;
        ctx.fillStyle = '#2F4F4F';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Debug drawing
    drawDebugInfo(ctx, id, state) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${id}: ${state.currentDirection} (${state.currentFrame})`, -30, -30);
    }

    // Get current animation state
    getAnimationState(id) {
        return this.animationStates.get(id);
    }
} 