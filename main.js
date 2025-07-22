// main.js - Modified to work with the start menu and modular structure

document.addEventListener('DOMContentLoaded', function() {
    // The game initialization is now handled by the start menu system
    // startMenu object is created in startMenu.js and will initialize
    // the game when a mode is selected
    
    // We'll still define the event handlers here, but they won't be active
    // until the game is initialized
    
    // Reference to the grid will now come from the start menu
    let grid = null;
    
    // Define a function to set up event handlers that the start menu will call
    window.setupGameEventHandlers = function(hexGrid) {
        // Store reference to the grid
        grid = hexGrid;
        
        // Initialize monsters - DISABLED
        // if (grid.monsterSystem) {
        //     grid.monsterSystem.initializeMonsters(5); // Scatter 5 monsters around the board
        // }
        
        // Movement mode
        document.getElementById('move-mode').addEventListener('click', function() {
            grid.mode = 'move';
            grid.selectedStone = null;
            grid.breakMode = false; // Exit break mode
            document.getElementById('stone-selector').style.display = 'none';
            document.getElementById('move-mode').classList.add('active');
            document.getElementById('place-mode').classList.remove('active');
            document.getElementById('break-mode').classList.remove('active');
            document.querySelectorAll('.stone-button').forEach(b => {
                b.classList.remove('selected');
            });
            grid.movementSystem.calculateMovableHexes();
            grid.updateStatus('Movement mode active. Click a highlighted hex to move.');
            grid.renderSystem.render();
        });

        // Placement mode
        document.getElementById('place-mode').addEventListener('click', function() {
            grid.mode = 'place';
            grid.breakMode = false; // Exit break mode
            document.getElementById('stone-selector').style.display = 'flex';
            document.getElementById('move-mode').classList.remove('active');
            document.getElementById('place-mode').classList.add('active');
            document.getElementById('break-mode').classList.remove('active');
            grid.updateStatus('Stone placement mode active. Select a stone and click an adjacent hex.');
            grid.renderSystem.render();
        });

        // Break mode
        let breakButtonClickCount = 0;
        let lastClickTime = 0;
        document.getElementById('break-mode').addEventListener('click', function() {
            const currentTime = Date.now();
            
            // Reset counter if more than 2 seconds have passed since last click
            if (currentTime - lastClickTime > 2000) {
                breakButtonClickCount = 0;
            }
            lastClickTime = currentTime;
            breakButtonClickCount++;

            // Check for cheat code (5 clicks within 2 seconds)
            if (breakButtonClickCount === 5) {
                breakButtonClickCount = 0; // Reset counter
                
                // Give all scrolls
                for (const elementType of ['earth', 'water', 'fire', 'wind', 'void']) {
                    // Fill stones to maximum capacity
                    stoneCounts[elementType] = stoneCapacity[elementType];
                    updateStoneCount(elementType);
                    
                    // Give all scrolls
                    for (let i = 1; i <= 5; i++) {
                        const scrollName = `${elementType.toUpperCase()}_SCROLL_${i}`;
                        if (grid.spellSystem.availableScrolls[elementType].has(scrollName)) {
                            grid.spellSystem.availableScrolls[elementType].delete(scrollName);
                            grid.spellSystem.collectedScrolls.add(scrollName);
                        }
                    }
                }
                
                // Update void AP display since we modified stone counts
                grid.movementSystem.updateAPDisplay();
                
                grid.updateStatus('🎮 Cheat activated: All scrolls unlocked and stones filled to maximum! 🎮');
                return;
            }

            // Toggle break mode
            if (grid.breakMode) {
                grid.breakMode = false;
                this.classList.remove('active');
                grid.updateStatus('Break mode deactivated.');
            } else {
                // Exit other modes first
                grid.mode = 'move'; // Set to move mode as a base
                grid.selectedStone = null;
                document.getElementById('stone-selector').style.display = 'none';
                document.getElementById('move-mode').classList.remove('active');
                document.getElementById('place-mode').classList.remove('active');
                
                // Enter break mode
                grid.breakMode = true;
                this.classList.add('active');
                
                // Show the player which stones can be broken
                const apInfo = grid.movementSystem.getTotalAvailableAP();
                const totalAP = apInfo.totalAP;
                
                // Find adjacent stones
                const adjacentHexes = grid.getNeighbors(grid.player.q, grid.player.r);
                let breakableCount = 0;
                
                for (const nb of adjacentHexes) {
                    const hex = grid.getHex(nb.q, nb.r);
                    if (hex && hex.revealed && hex.stone) {
                        const cost = grid.movementSystem.getBreakStoneCost(hex.stone);
                        if (cost <= totalAP) {
                            breakableCount++;
                            grid.markHexDirty(nb.q, nb.r);
                        }
                    }
                }
                
                if (breakableCount > 0) {
                    grid.updateStatus(`Break mode activated. Click an adjacent stone to break it (${breakableCount} breakable stones).`);
                } else {
                    grid.updateStatus('Break mode activated. No breakable stones in range or not enough AP.');
                }
            }
            
            // Render changes
            grid.renderSystem.render();
        });

        // Stone selection
        document.querySelectorAll('.stone-button').forEach(button => {
            button.addEventListener('click', function() {
                // Clear selections
                document.querySelectorAll('.stone-button').forEach(b => {
                    b.classList.remove('selected');
                });
                const stoneType = this.id.split('-')[1];
                if (stoneCounts[stoneType] > 0) {
                    grid.selectedStone = STONE_TYPES[stoneType.toUpperCase()];
                    grid.updateStatus(`Selected ${stoneType} stone for placement.`);
                    this.classList.add('selected');
                } else {
                    grid.selectedStone = null;
                    grid.updateStatus(`No ${stoneType} stones left in your pool.`);
                }
            });
        });

        // Add turn tracking for lose condition
        let turnCount = 0;
        let loseTurnLimit = 50;
        let hasLost = false;
        
        // Listen for level changes to reset turn count and update limit
        if (!grid._originalStartNewLevel) {
            grid._originalStartNewLevel = grid.spellSystem.startNewLevel.bind(grid.spellSystem);
            grid.spellSystem.startNewLevel = function(level) {
                turnCount = 0;
                loseTurnLimit = 50 - ((level - 1) * 5);
                hasLost = false;
                grid.isGameOver = false;
                grid.hasWon = false;
                grid._originalStartNewLevel(level);
            };
        }

        // End turn
        document.getElementById('end-turn').addEventListener('click', function() {
            if (hasLost || grid.isGameOver || grid.hasWon) return;
            turnCount++;
            document.getElementById('ap-count').textContent = '5';
            grid.movementSystem.resetVoidAPUsed(); // Reset void AP usage
            grid.movementSystem.calculateMovableHexes();
            // grid.monsterSystem.onTurnEnd(); // Trigger monster movement on turn end - DISABLED
            grid.renderSystem.render();
            grid.updateStatus(`Turn ended. Action Points restored. (Turn ${turnCount}/${loseTurnLimit})`);
            if (turnCount > loseTurnLimit) {
                hasLost = true;
                grid.isGameOver = true;
                // Show lose notification
                const notification = document.createElement('div');
                notification.style.position = 'fixed';
                notification.style.left = '50%';
                notification.style.top = '50%';
                notification.style.transform = 'translate(-50%, -50%)';
                notification.style.backgroundColor = '#2c3e50';
                notification.style.padding = '30px';
                notification.style.borderRadius = '10px';
                notification.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
                notification.style.zIndex = '1000';
                notification.style.color = 'white';
                notification.style.textAlign = 'center';
                notification.style.minWidth = '400px';
                notification.style.maxWidth = '600px';
                const title = document.createElement('h2');
                title.textContent = 'You lost the game!';
                title.style.margin = '10px 0 20px 0';
                notification.appendChild(title);
                const message = document.createElement('div');
                message.innerHTML = `You took too many turns.<br>Max allowed: ${loseTurnLimit} turns.`;
                message.style.fontSize = '18px';
                message.style.marginBottom = '20px';
                message.style.lineHeight = '1.5';
                notification.appendChild(message);
                // Add Start Over button
                const restartButton = document.createElement('button');
                restartButton.textContent = 'Start Over';
                restartButton.style.padding = '10px 30px';
                restartButton.style.fontSize = '16px';
                restartButton.style.backgroundColor = '#3498db';
                restartButton.style.border = 'none';
                restartButton.style.borderRadius = '5px';
                restartButton.style.color = 'white';
                restartButton.style.cursor = 'pointer';
                restartButton.style.transition = 'transform 0.2s, box-shadow 0.2s';
                restartButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                restartButton.onmouseover = () => {
                    restartButton.style.transform = 'translateY(-2px)';
                    restartButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                };
                restartButton.onmouseout = () => {
                    restartButton.style.transform = 'translateY(0)';
                    restartButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                };
                restartButton.onclick = () => {
                    window.location.reload();
                };
                notification.appendChild(restartButton);
                document.body.appendChild(notification);
            }
        });
        
        // Initialize stone counts
        Object.keys(stoneCounts).forEach(updateStoneCount);
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            // Press 'R' to reset stone counts
            if (event.key === 'r' || event.key === 'R') {
                Object.keys(stoneCounts).forEach(type => {
                    stoneCounts[type] = stoneCapacity[type];
                    updateStoneCount(type);
                });
                grid.updateStatus('Stone counts reset.');
                grid.movementSystem.updateAPDisplay(); // Update Void AP display
            }
            
            // Press 'B' to toggle break mode
            if (event.key === 'b' || event.key === 'B') {
                document.getElementById('break-mode').click();
            }
            
            // Press 'Escape' to return to the main menu
            if (event.key === 'Escape') {
                // Dispatch a custom event to trigger menu return
                const resetEvent = new Event('gameReset');
                document.dispatchEvent(resetEvent);
            }
            
            // Press 'Home' to center view on player
            if (event.key === 'Home') {
                grid.centerOnPlayer();
            }
        });
        
        // Add keyboard shortcut info to the UI if it doesn't exist
        if (!document.querySelector('.shortcuts-info')) {
            const shortcutsDiv = document.createElement('div');
            shortcutsDiv.className = 'shortcuts-info';
            shortcutsDiv.innerHTML = `
                <h4>Keyboard Shortcuts</h4>
                <ul>
                    <li><strong>R</strong> - Reset stone counts</li>
                    <li><strong>B</strong> - Toggle break mode</li>
                    <li><strong>Home</strong> - Center view on player</li>
                    <li><strong>Esc</strong> - Return to main menu</li>
                </ul>
            `;
            document.querySelector('.legend').appendChild(shortcutsDiv);
        }
        
        // Add break stone info to the legend if it doesn't exist
        if (!document.querySelector('.legend div[style*="border-top"]')) {
            const breakStoneInfo = document.createElement('div');
            breakStoneInfo.style.marginTop = '15px';
            breakStoneInfo.style.paddingTop = '10px';
            breakStoneInfo.style.borderTop = '1px solid #444';
            breakStoneInfo.innerHTML = `
                <h4>Breaking Stones</h4>
                <p>You can spend AP to break adjacent stones:</p>
                <ul style="padding-left: 20px; margin: 5px 0;">
                    <li>Void: 1 AP</li>
                    <li>Wind: 2 AP</li>
                    <li>Fire: 3 AP</li>
                    <li>Water: 4 AP</li>
                    <li>Earth: 5 AP</li>
                </ul>
            `;
            document.querySelector('.legend').appendChild(breakStoneInfo);
        }
        
        // Add a testing panel if it doesn't exist
        if (!document.getElementById('test-panel')) {
            const testPanel = document.createElement('div');
            testPanel.id = 'test-panel';
            testPanel.className = 'test-panel';
            testPanel.style.display = 'none';
            testPanel.innerHTML = `
                <h3>Stone Interaction Tests</h3>
                <div id="test-status">No tests running</div>
                <div id="test-progress">
                    <div class="test-bar"></div>
                </div>
                <button id="stop-tests">Stop Tests</button>
            `;
            document.querySelector('.game-container').appendChild(testPanel);
            
            // Add stop button functionality
            document.getElementById('stop-tests').addEventListener('click', function() {
                grid.updateStatus('Tests stopped by user.');
                document.getElementById('test-panel').style.display = 'none';
            });
        }
        
        // Enhance the grid's updateStatus method to update test panel
        const originalUpdateStatus = grid.updateStatus;
        grid.updateStatus = function(message) {
            originalUpdateStatus.call(this, message);
            
            // If message contains "Test" and "passed/failed", update test panel
            if (message.includes('Test ') && (message.includes('passed') || message.includes('failed'))) {
                const testNumber = message.match(/Test (\d+)/);
                if (testNumber) {
                    const num = parseInt(testNumber[1]);
                    document.getElementById('test-status').textContent = `Running tests (${num}/14)...`;
                    document.querySelector('.test-bar').style.width = `${(num / 14) * 100}%`;
                    
                    if (num === 14 && message.includes('passed')) {
                        document.getElementById('test-status').textContent = 'All tests completed!';
                        setTimeout(() => {
                            document.getElementById('test-panel').style.display = 'none';
                        }, 3000);
                    }
                }
            }
        };
        
        // Add void stone info to the legend if it doesn't exist
        if (!document.querySelector('.void-info')) {
            const voidInfoDiv = document.createElement('div');
            voidInfoDiv.className = 'void-info';
            voidInfoDiv.innerHTML = `
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444;">
                    <h4>Void Stone Special Ability</h4>
                    <p>Void stones in your pool act as additional Action Points. Each void stone provides +1 AP that can be used for movement.</p>
                </div>
            `;
            document.querySelector('.legend').appendChild(voidInfoDiv);
        }
        
        // Initialize void AP display
        grid.movementSystem.updateFullAPDisplay();
        
        // Setup panning controls
        setupPanningControls(grid);
    };
    
    // The StartMenu class will handle the rest of the game initialization
    // when a mode is selected from the menu.
    
    // Setup panning controls
    function setupPanningControls(grid) {
        const controlsContainer = document.querySelector('.player-info');
        
        // Create a container for navigation controls
        const navControls = document.createElement('div');
        navControls.className = 'nav-controls';
        navControls.style.display = 'flex';
        navControls.style.gap = '5px';
        
        // Center on player button
        const centerBtn = document.createElement('button');
        centerBtn.innerHTML = '⌖'; // Center symbol
        centerBtn.title = 'Center on Player (Home)';
        centerBtn.id = 'center-view-btn';
        centerBtn.addEventListener('click', () => grid.centerOnPlayer());
        
        // Add help text about panning
        const helpText = document.createElement('div');
        helpText.className = 'pan-help-text';
        helpText.textContent = 'Pan: Right-click + Drag or Shift + Drag';
        helpText.style.fontSize = '10px';
        helpText.style.opacity = '0.7';
        helpText.style.marginLeft = '10px';
        helpText.style.alignSelf = 'center';
        
        // Add to controls
        navControls.appendChild(centerBtn);
        navControls.appendChild(helpText);
        controlsContainer.appendChild(navControls);
        
        // Add to legend instead of cluttering main controls
        const legend = document.querySelector('.legend');
        const navSection = document.createElement('div');
        navSection.innerHTML = `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444;">
                <h4>Navigation Controls</h4>
                <ul style="padding-left: 20px; margin: 5px 0;">
                    <li>Pan the view: Right-click + Drag or Shift + Drag</li>
                    <li>Center on player: Press Home key or click ⌖ button</li>
                </ul>
            </div>
        `;
        legend.appendChild(navSection);
    }
});