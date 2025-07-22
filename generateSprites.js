// generateSprites.js - Generates sprite images for the game

class SpriteGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // Generate monster sprite sheet
    generateMonsterSprite() {
        this.canvas.width = 32 * 4; // 4 frames
        this.canvas.height = 32 * 3; // 3 animations (idle, chase, attack)

        // Draw idle animation (row 0)
        for (let frame = 0; frame < 4; frame++) {
            this.drawMonsterFrame(frame, 0);
        }

        // Draw chase animation (row 1)
        for (let frame = 0; frame < 4; frame++) {
            this.drawMonsterFrame(frame, 1, true);
        }

        // Draw attack animation (row 2)
        for (let frame = 0; frame < 4; frame++) {
            this.drawMonsterFrame(frame, 2, false, true);
        }

        return this.canvas.toDataURL('image/png');
    }

    // Draw a single monster frame
    drawMonsterFrame(frame, row, isChasing = false, isAttacking = false) {
        const x = frame * 32;
        const y = row * 32;

        // Save context
        this.ctx.save();
        this.ctx.translate(x, y);

        // Base color
        const baseColor = isChasing ? '#ff4444' : '#808080';
        const eyeColor = isChasing ? '#ff0000' : '#ff4444';

        // Draw body
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(10, 6, 12, 12); // Head outline
        this.ctx.fillRect(6, 14, 20, 10); // Body outline

        // Fill body
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(11, 7, 10, 10); // Head
        this.ctx.fillRect(7, 15, 18, 8); // Body

        // Draw eyes
        this.ctx.fillStyle = eyeColor;
        this.ctx.fillRect(13, 10, 2, 2); // Left eye
        this.ctx.fillRect(17, 10, 2, 2); // Right eye

        // Add animation effects
        if (isChasing) {
            // Add motion lines
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(6, 20);
            this.ctx.lineTo(2, 20);
            this.ctx.moveTo(26, 20);
            this.ctx.lineTo(30, 20);
            this.ctx.stroke();
        }

        if (isAttacking) {
            // Add attack effect
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(26, 10, 4, 4);
        }

        // Restore context
        this.ctx.restore();
    }

    // Generate stone sprites
    generateStoneSprite(type) {
        this.canvas.width = 32;
        this.canvas.height = 32;

        // Clear canvas
        this.ctx.clearRect(0, 0, 32, 32);

        // Draw stone based on type
        switch (type) {
            case 'earth':
                this.drawEarthStone();
                break;
            case 'water':
                this.drawWaterStone();
                break;
            case 'fire':
                this.drawFireStone();
                break;
            case 'wind':
                this.drawWindStone();
                break;
            case 'void':
                this.drawVoidStone();
                break;
        }

        return this.canvas.toDataURL('image/png');
    }

    // Draw earth stone
    drawEarthStone() {
        this.ctx.fillStyle = '#8B4513';
        this.ctx.beginPath();
        this.ctx.arc(16, 16, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Draw water stone
    drawWaterStone() {
        this.ctx.fillStyle = '#1E90FF';
        this.ctx.beginPath();
        this.ctx.arc(16, 16, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#0000FF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Draw fire stone
    drawFireStone() {
        this.ctx.fillStyle = '#FF4500';
        this.ctx.beginPath();
        this.ctx.arc(16, 16, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Draw wind stone
    drawWindStone() {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.beginPath();
        this.ctx.arc(16, 16, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#4682B4';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Draw void stone
    drawVoidStone() {
        this.ctx.fillStyle = '#2F4F4F';
        this.ctx.beginPath();
        this.ctx.arc(16, 16, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Generate animated fire stone sprite sheet
    generateFireStoneSprite() {
        this.canvas.width = 32 * 4; // 4 frames
        this.canvas.height = 32;

        for (let frame = 0; frame < 4; frame++) {
            this.drawFireStoneFrame(frame);
        }

        return this.canvas.toDataURL('image/png');
    }

    // Draw a single fire stone frame
    drawFireStoneFrame(frame) {
        const x = frame * 32;
        this.ctx.save();
        this.ctx.translate(x, 0);

        // Base stone
        this.drawFireStone();

        // Add flame effect
        const flameSize = 4 + frame * 2;
        this.ctx.fillStyle = `rgba(255, ${100 + frame * 50}, 0, 0.8)`;
        this.ctx.beginPath();
        this.ctx.arc(16, 16, flameSize, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    // Generate animated wind stone sprite sheet
    generateWindStoneSprite() {
        this.canvas.width = 32 * 4; // 4 frames
        this.canvas.height = 32;

        for (let frame = 0; frame < 4; frame++) {
            this.drawWindStoneFrame(frame);
        }

        return this.canvas.toDataURL('image/png');
    }

    // Draw a single wind stone frame
    drawWindStoneFrame(frame) {
        const x = frame * 32;
        this.ctx.save();
        this.ctx.translate(x, 0);

        // Base stone
        this.drawWindStone();

        // Add wind effect
        const windSize = 2 + frame;
        this.ctx.strokeStyle = `rgba(135, 206, 235, ${0.3 + frame * 0.2})`;
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + (frame * Math.PI / 8);
            this.ctx.beginPath();
            this.ctx.moveTo(16, 16);
            this.ctx.lineTo(
                16 + Math.cos(angle) * (12 + windSize),
                16 + Math.sin(angle) * (12 + windSize)
            );
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
}

// Create and export the sprites
function generateAllSprites() {
    const generator = new SpriteGenerator();
    
    // Generate monster sprite sheet
    const monsterSprite = generator.generateMonsterSprite();
    
    // Generate stone sprites
    const earthStone = generator.generateStoneSprite('earth');
    const waterStone = generator.generateStoneSprite('water');
    const fireStone = generator.generateFireStoneSprite();
    const windStone = generator.generateWindStoneSprite();
    const voidStone = generator.generateStoneSprite('void');
    
    // Return all sprites
    return {
        monster: monsterSprite,
        stone_earth: earthStone,
        stone_water: waterStone,
        stone_fire: fireStone,
        stone_wind: windStone,
        stone_void: voidStone
    };
} 