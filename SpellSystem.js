// SpellSystem.js - Handles spell patterns and activation
class SpellSystem {
    constructor(grid) {
        this.grid = grid;
        this.SPELL_AP_COST = 2; // AP cost for casting any spell
        
        // Track which scrolls the player has found
        this.collectedScrolls = new Set();
        
        // Track which scrolls are still available to find
        this.availableScrolls = {
            earth: new Set(['EARTH_SCROLL_1', 'EARTH_SCROLL_2', 'EARTH_SCROLL_3', 'EARTH_SCROLL_4', 'EARTH_SCROLL_5']),
            water: new Set(['WATER_SCROLL_1', 'WATER_SCROLL_2', 'WATER_SCROLL_3', 'WATER_SCROLL_4', 'WATER_SCROLL_5']),
            fire: new Set(['FIRE_SCROLL_1', 'FIRE_SCROLL_2', 'FIRE_SCROLL_3', 'FIRE_SCROLL_4', 'FIRE_SCROLL_5']),
            wind: new Set(['WIND_SCROLL_1', 'WIND_SCROLL_2', 'WIND_SCROLL_3', 'WIND_SCROLL_4', 'WIND_SCROLL_5']),
            void: new Set(['VOID_SCROLL_1', 'VOID_SCROLL_2', 'VOID_SCROLL_3', 'VOID_SCROLL_4', 'VOID_SCROLL_5'])
        };

        // Track activated scroll types for win condition
        this.activatedScrollTypes = new Set();

        // Add cheat tracking
        this.breakButtonClickCount = 0;
        this.lastBreakClickTime = 0;
        this.cheatsRevealed = false;

        // Base patterns that work for all elements
        const basePatterns = [
            // Horizontal pattern (left and right)
            [
                { q: -1, r: 0 }, // Stone to the left
                { q: 1, r: 0 }   // Stone to the right
            ],
            // Vertical pattern (above and below)
            [
                { q: 0, r: -1 }, // Stone above
                { q: 0, r: 1 }   // Stone below
            ],
            // Diagonal pattern (northwest and southeast)
            [
                { q: -1, r: -1 }, // Stone to the northwest
                { q: 1, r: 1 }    // Stone to the southeast
            ],
            // Additional diagonal pattern (northeast and southwest)
            [
                { q: 1, r: -1 }, // Stone to the northeast
                { q: -1, r: 1 }  // Stone to the southwest
            ]
        ];

        // Level 2 patterns
        const level2Patterns = [
            // Far East and Far West pattern
            [
                { q: -2, r: 1 },  // Far West stone
                { q: 2, r: -1 }   // Far East stone
            ],
            // Far diagonal pattern
            [
                { q: -1, r: 2 },  // Far Southwest stone
                { q: 1, r: -2 }   // Far Northeast stone
            ],
            // Close diagonal pattern
            [
                { q: -1, r: -1 }, // Northwest stone
                { q: 1, r: 1 }    // Southeast stone
            ]
        ];

        // Level 3 patterns
        const level3Patterns = [
            // Original pattern
            [
                { q: -1, r: 0 },  // Left
                { q: 0, r: 1 },   // Below
                { q: 1, r: -1 }   // Northeast
            ],
            // Rotated 60 degrees
            [
                { q: -1, r: -1 }, // Northwest
                { q: 0, r: 1 },   // Below
                { q: 1, r: 0 }    // Right
            ],
            // Rotated 120 degrees
            [
                { q: -1, r: 0 },  // Left
                { q: 0, r: -1 },  // Above
                { q: 1, r: 1 }    // Southeast
            ],
            // Rotated 180 degrees
            [
                { q: 1, r: 0 },   // Right
                { q: 0, r: -1 },  // Above
                { q: -1, r: 1 }   // Southwest
            ],
            // Rotated 240 degrees
            [
                { q: 1, r: 1 },   // Southeast
                { q: 0, r: -1 },  // Above
                { q: -1, r: 0 }   // Left
            ],
            // Rotated 300 degrees
            [
                { q: 1, r: 0 },   // Right
                { q: 0, r: 1 },   // Below
                { q: -1, r: -1 }  // Northwest
            ]
        ];

        // Level 4 patterns
        const level4Patterns = [
            // Three stone pattern 1
            [
                { q: -2, r: 1 },  // Far West stone
                { q: 1, r: -2 },  // Far Northeast stone
                { q: 1, r: 1 }    // Southeast stone
            ],
            // Three stone pattern 2 (inferred mirror pattern)
            [
                { q: 2, r: -1 },  // Far East stone
                { q: -1, r: 2 },  // Far Southwest stone
                { q: -1, r: -1 }  // Northwest stone
            ]
        ];

        // Level 5 patterns
        const level5Patterns = [
            // Original pattern
            [
                { q: 2, r: 0, type: 'earth' },
                { q: 4, r: -1, type: 'earth' }
            ],
            // First inferred pattern
            [
                { q: -2, r: 2, type: 'earth' },  // Far Southwest
                { q: -1, r: 0, type: 'earth' },  // Left
                { q: 1, r: 0, type: 'earth' },   // Right
                { q: 2, r: -2, type: 'earth' }   // Far Northeast
            ],
            // Second inferred pattern
            [
                { q: -2, r: -1, type: 'earth' }, // Far West-Northwest
                { q: -1, r: 1, type: 'earth' },  // Southwest
                { q: 1, r: -1, type: 'earth' },  // Northeast
                { q: 2, r: 1, type: 'earth' }    // Far East-Southeast
            ]
        ];

        // Create patterns for all elements
        this.patterns = {
            // Level 1 scrolls for all elements
            EARTH_SCROLL_1: {
                name: "Earth Scroll I",
                description: "Stand between two earth stones in any of three configurations to gain +1 earth stone (Costs 2 AP)",
                level: 1,
                patterns: basePatterns.map(pattern => 
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.EARTH.name
                    }))
                )
            },
            WATER_SCROLL_1: {
                name: "Water Scroll I",
                description: "Stand between two water stones in any of three configurations to gain +1 water stone (Costs 2 AP)",
                level: 1,
                patterns: basePatterns.map(pattern => 
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WATER.name
                    }))
                )
            },
            FIRE_SCROLL_1: {
                name: "Fire Scroll I",
                description: "Stand between two fire stones in any of four configurations to gain +1 fire stone (Costs 2 AP)",
                level: 1,
                patterns: basePatterns.map(pattern => 
                    pattern.map(pos => ({
                        ...pos,
                        type: 'fire'
                    }))
                )
            },
            WIND_SCROLL_1: {
                name: "Wind Scroll I",
                description: "Stand between two wind stones in any of three configurations to gain +1 wind stone (Costs 2 AP)",
                level: 1,
                patterns: basePatterns.map(pattern => 
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WIND.name
                    }))
                )
            },
            VOID_SCROLL_1: {
                name: "Void Scroll I",
                description: "Stand between two void stones in any of three configurations to gain +1 void stone (Costs 2 AP)",
                level: 1,
                patterns: basePatterns.map(pattern => 
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.VOID.name
                    }))
                )
            },

            // Level 2 scrolls (already defined)
            EARTH_SCROLL_2: {
                name: "Earth Scroll II",
                description: "Stand between Far East and Far West stones, Far Southwest and Far Northeast stones, or Northwest and Southeast stones to gain +2 earth stones (Costs 2 AP)",
                level: 2,
                patterns: level2Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.EARTH.name
                    }))
                )
            },
            WATER_SCROLL_2: {
                name: "Water Scroll II",
                description: "Stand between Far East and Far West stones, Far Southwest and Far Northeast stones, or Northwest and Southeast stones to gain +2 water stones (Costs 2 AP)",
                level: 2,
                patterns: level2Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WATER.name
                    }))
                )
            },
            FIRE_SCROLL_2: {
                name: "Fire Scroll II",
                description: "Stand between Far East and Far West stones, Far Southwest and Far Northeast stones, or Northwest and Southeast stones to gain +2 fire stones (Costs 2 AP)",
                level: 2,
                patterns: level2Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.FIRE.name
                    }))
                )
            },
            WIND_SCROLL_2: {
                name: "Wind Scroll II",
                description: "Stand between Far East and Far West stones, Far Southwest and Far Northeast stones, or Northwest and Southeast stones to gain +2 wind stones (Costs 2 AP)",
                level: 2,
                patterns: level2Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WIND.name
                    }))
                )
            },
            VOID_SCROLL_2: {
                name: "Void Scroll II",
                description: "Stand between Far East and Far West stones, Far Southwest and Far Northeast stones, or Northwest and Southeast stones to gain +2 void stones (Costs 2 AP)",
                level: 2,
                patterns: level2Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.VOID.name
                    }))
                )
            },

            // Level 3 scrolls
            EARTH_SCROLL_3: {
                name: "Earth Scroll III",
                description: "Stand between three earth stones in specific patterns to gain +3 earth stones (Costs 2 AP)",
                level: 3,
                patterns: level3Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.EARTH.name
                    }))
                )
            },
            WATER_SCROLL_3: {
                name: "Water Scroll III",
                description: "Stand between three water stones in specific patterns to gain +3 water stones (Costs 2 AP)",
                level: 3,
                patterns: level3Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WATER.name
                    }))
                )
            },
            FIRE_SCROLL_3: {
                name: "Fire Scroll III",
                description: "Stand between three fire stones in specific patterns to gain +3 fire stones (Costs 2 AP)",
                level: 3,
                patterns: level3Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.FIRE.name
                    }))
                )
            },
            WIND_SCROLL_3: {
                name: "Wind Scroll III",
                description: "Stand between three wind stones in specific patterns to gain +3 wind stones (Costs 2 AP)",
                level: 3,
                patterns: level3Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WIND.name
                    }))
                )
            },
            VOID_SCROLL_3: {
                name: "Void Scroll III",
                description: "Stand between three void stones in specific patterns to gain +3 void stones (Costs 2 AP)",
                level: 3,
                patterns: [
                    // Original pattern
                    [
                        { q: -1, r: 0, type: 'void' },  // Left
                        { q: 0, r: 1, type: 'void' },   // Below
                        { q: 1, r: -1, type: 'void' }   // Northeast
                    ],
                    // Rotated 60 degrees
                    [
                        { q: -1, r: -1, type: 'void' }, // Northwest
                        { q: 0, r: 1, type: 'void' },   // Below
                        { q: 1, r: 0, type: 'void' }    // Right
                    ],
                    // Rotated 120 degrees
                    [
                        { q: -1, r: 0, type: 'void' },  // Left
                        { q: 0, r: -1, type: 'void' },  // Above
                        { q: 1, r: 1, type: 'void' }    // Southeast
                    ],
                    // Rotated 180 degrees
                    [
                        { q: 1, r: 0, type: 'void' },   // Right
                        { q: 0, r: -1, type: 'void' },  // Above
                        { q: -1, r: 1, type: 'void' }   // Southwest
                    ],
                    // Rotated 240 degrees
                    [
                        { q: 1, r: 1, type: 'void' },   // Southeast
                        { q: 0, r: -1, type: 'void' },  // Above
                        { q: -1, r: 0, type: 'void' }   // Left
                    ],
                    // Rotated 300 degrees
                    [
                        { q: 1, r: 0, type: 'void' },   // Right
                        { q: 0, r: 1, type: 'void' },   // Below
                        { q: -1, r: -1, type: 'void' }  // Northwest
                    ]
                ]
            },

            // Level 4 scrolls
            EARTH_SCROLL_4: {
                name: "Earth Scroll IV",
                description: "Stand between three earth stones in a level 4 pattern to gain +4 earth stones (Costs 2 AP)",
                level: 4,
                patterns: level4Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.EARTH.name
                    }))
                )
            },
            WATER_SCROLL_4: {
                name: "Water Scroll IV",
                description: "Stand between three water stones in a level 4 pattern to gain +4 water stones (Costs 2 AP)",
                level: 4,
                patterns: level4Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WATER.name
                    }))
                )
            },
            FIRE_SCROLL_4: {
                name: "Fire Scroll IV",
                description: "Stand between three fire stones in a level 4 pattern to gain +4 fire stones (Costs 2 AP)",
                level: 4,
                patterns: level4Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.FIRE.name
                    }))
                )
            },
            WIND_SCROLL_4: {
                name: "Wind Scroll IV",
                description: "Stand between three wind stones in a level 4 pattern to gain +4 wind stones (Costs 2 AP)",
                level: 4,
                patterns: level4Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.WIND.name
                    }))
                )
            },
            VOID_SCROLL_4: {
                name: "Void Scroll IV",
                description: "Stand between three void stones in a level 4 pattern to gain +4 void stones (Costs 2 AP)",
                level: 4,
                patterns: level4Patterns.map(pattern =>
                    pattern.map(pos => ({
                        ...pos,
                        type: STONE_TYPES.VOID.name
                    }))
                )
            },

            // Level 5 scrolls
            EARTH_SCROLL_5: {
                name: "Earth Scroll V",
                description: "Stand between four earth stones in a level 5 pattern to gain +5 earth stones (Costs 2 AP)",
                level: 5,
                patterns: [
                    // Original pattern
                    [
                        { q: -2, r: 1, type: 'earth' },  // Far Southwest
                        { q: 0, r: -1, type: 'earth' },  // Above
                        { q: 0, r: 1, type: 'earth' },   // Below
                        { q: 2, r: -1, type: 'earth' }   // Far Northeast
                    ],
                    // Rotated 60 degrees
                    [
                        { q: -1, r: -1, type: 'earth' }, // Northwest
                        { q: -1, r: 1, type: 'earth' },  // Southwest
                        { q: 1, r: -1, type: 'earth' },  // Northeast
                        { q: 1, r: 1, type: 'earth' }    // Southeast
                    ],
                    // Rotated 120 degrees
                    [
                        { q: -1, r: 0, type: 'earth' },  // Left
                        { q: 1, r: 0, type: 'earth' },   // Right
                        { q: -1, r: 2, type: 'earth' },  // Far Southwest
                        { q: 1, r: -2, type: 'earth' }   // Far Northeast
                    ],
                    // Rotated 180 degrees
                    [
                        { q: 2, r: -1, type: 'earth' },  // Far Northeast
                        { q: 0, r: 1, type: 'earth' },   // Below
                        { q: 0, r: -1, type: 'earth' },  // Above
                        { q: -2, r: 1, type: 'earth' }   // Far Southwest
                    ],
                    // Rotated 240 degrees
                    [
                        { q: 1, r: 1, type: 'earth' },   // Southeast
                        { q: 1, r: -1, type: 'earth' },  // Northeast
                        { q: -1, r: 1, type: 'earth' },  // Southwest
                        { q: -1, r: -1, type: 'earth' }  // Northwest
                    ],
                    // Rotated 300 degrees
                    [
                        { q: 1, r: 0, type: 'earth' },   // Right
                        { q: -1, r: 0, type: 'earth' },  // Left
                        { q: 1, r: -2, type: 'earth' },  // Far Northeast
                        { q: -1, r: 2, type: 'earth' }   // Far Southwest
                    ]
                ]
            },
            WATER_SCROLL_5: {
                name: "Water Scroll V",
                description: "Stand between four water stones in a level 5 pattern to gain +5 water stones (Costs 2 AP)",
                level: 5,
                patterns: [
                    // Original pattern
                    [
                        { q: -2, r: 1, type: 'water' },  // Far Southwest
                        { q: 0, r: -1, type: 'water' },  // Above
                        { q: 0, r: 1, type: 'water' },   // Below
                        { q: 2, r: -1, type: 'water' }   // Far Northeast
                    ],
                    // Rotated 60 degrees
                    [
                        { q: -1, r: -1, type: 'water' }, // Northwest
                        { q: -1, r: 1, type: 'water' },  // Southwest
                        { q: 1, r: -1, type: 'water' },  // Northeast
                        { q: 1, r: 1, type: 'water' }    // Southeast
                    ],
                    // Rotated 120 degrees
                    [
                        { q: -1, r: 0, type: 'water' },  // Left
                        { q: 1, r: 0, type: 'water' },   // Right
                        { q: -1, r: 2, type: 'water' },  // Far Southwest
                        { q: 1, r: -2, type: 'water' }   // Far Northeast
                    ],
                    // Rotated 180 degrees
                    [
                        { q: 2, r: -1, type: 'water' },  // Far Northeast
                        { q: 0, r: 1, type: 'water' },   // Below
                        { q: 0, r: -1, type: 'water' },  // Above
                        { q: -2, r: 1, type: 'water' }   // Far Southwest
                    ],
                    // Rotated 240 degrees
                    [
                        { q: 1, r: 1, type: 'water' },   // Southeast
                        { q: 1, r: -1, type: 'water' },  // Northeast
                        { q: -1, r: 1, type: 'water' },  // Southwest
                        { q: -1, r: -1, type: 'water' }  // Northwest
                    ],
                    // Rotated 300 degrees
                    [
                        { q: 1, r: 0, type: 'water' },   // Right
                        { q: -1, r: 0, type: 'water' },  // Left
                        { q: 1, r: -2, type: 'water' },  // Far Northeast
                        { q: -1, r: 2, type: 'water' }   // Far Southwest
                    ]
                ]
            },
            FIRE_SCROLL_5: {
                name: "Fire Scroll V",
                description: "Stand between four fire stones in a level 5 pattern to gain +5 fire stones (Costs 2 AP)",
                level: 5,
                patterns: [
                    // Original pattern
                    [
                        { q: -2, r: 1, type: 'fire' },  // Far Southwest
                        { q: 0, r: -1, type: 'fire' },  // Above
                        { q: 0, r: 1, type: 'fire' },   // Below
                        { q: 2, r: -1, type: 'fire' }   // Far Northeast
                    ],
                    // Rotated 60 degrees
                    [
                        { q: -1, r: -1, type: 'fire' }, // Northwest
                        { q: -1, r: 1, type: 'fire' },  // Southwest
                        { q: 1, r: -1, type: 'fire' },  // Northeast
                        { q: 1, r: 1, type: 'fire' }    // Southeast
                    ],
                    // Rotated 120 degrees
                    [
                        { q: -1, r: 0, type: 'fire' },  // Left
                        { q: 1, r: 0, type: 'fire' },   // Right
                        { q: -1, r: 2, type: 'fire' },  // Far Southwest
                        { q: 1, r: -2, type: 'fire' }   // Far Northeast
                    ],
                    // Rotated 180 degrees
                    [
                        { q: 2, r: -1, type: 'fire' },  // Far Northeast
                        { q: 0, r: 1, type: 'fire' },   // Below
                        { q: 0, r: -1, type: 'fire' },  // Above
                        { q: -2, r: 1, type: 'fire' }   // Far Southwest
                    ],
                    // Rotated 240 degrees
                    [
                        { q: 1, r: 1, type: 'fire' },   // Southeast
                        { q: 1, r: -1, type: 'fire' },  // Northeast
                        { q: -1, r: 1, type: 'fire' },  // Southwest
                        { q: -1, r: -1, type: 'fire' }  // Northwest
                    ],
                    // Rotated 300 degrees
                    [
                        { q: 1, r: 0, type: 'fire' },   // Right
                        { q: -1, r: 0, type: 'fire' },  // Left
                        { q: 1, r: -2, type: 'fire' },  // Far Northeast
                        { q: -1, r: 2, type: 'fire' }   // Far Southwest
                    ]
                ]
            },
            WIND_SCROLL_5: {
                name: "Wind Scroll V",
                description: "Stand between four wind stones in a level 5 pattern to gain +5 wind stones (Costs 2 AP)",
                level: 5,
                patterns: [
                    // Original pattern
                    [
                        { q: -2, r: 1, type: 'wind' },  // Far Southwest
                        { q: 0, r: -1, type: 'wind' },  // Above
                        { q: 0, r: 1, type: 'wind' },   // Below
                        { q: 2, r: -1, type: 'wind' }   // Far Northeast
                    ],
                    // Rotated 60 degrees
                    [
                        { q: -1, r: -1, type: 'wind' }, // Northwest
                        { q: -1, r: 1, type: 'wind' },  // Southwest
                        { q: 1, r: -1, type: 'wind' },  // Northeast
                        { q: 1, r: 1, type: 'wind' }    // Southeast
                    ],
                    // Rotated 120 degrees
                    [
                        { q: -1, r: 0, type: 'wind' },  // Left
                        { q: 1, r: 0, type: 'wind' },   // Right
                        { q: -1, r: 2, type: 'wind' },  // Far Southwest
                        { q: 1, r: -2, type: 'wind' }   // Far Northeast
                    ],
                    // Rotated 180 degrees
                    [
                        { q: 2, r: -1, type: 'wind' },  // Far Northeast
                        { q: 0, r: 1, type: 'wind' },   // Below
                        { q: 0, r: -1, type: 'wind' },  // Above
                        { q: -2, r: 1, type: 'wind' }   // Far Southwest
                    ],
                    // Rotated 240 degrees
                    [
                        { q: 1, r: 1, type: 'wind' },   // Southeast
                        { q: 1, r: -1, type: 'wind' },  // Northeast
                        { q: -1, r: 1, type: 'wind' },  // Southwest
                        { q: -1, r: -1, type: 'wind' }  // Northwest
                    ],
                    // Rotated 300 degrees
                    [
                        { q: 1, r: 0, type: 'wind' },   // Right
                        { q: -1, r: 0, type: 'wind' },  // Left
                        { q: 1, r: -2, type: 'wind' },  // Far Northeast
                        { q: -1, r: 2, type: 'wind' }   // Far Southwest
                    ]
                ]
            },
            VOID_SCROLL_5: {
                name: "Void Scroll V",
                description: "Stand between four void stones in a level 5 pattern to gain +5 void stones (Costs 2 AP)",
                level: 5,
                patterns: [
                    // Original pattern
                    [
                        { q: -2, r: 1, type: 'void' },  // Far Southwest
                        { q: 0, r: -1, type: 'void' },  // Above
                        { q: 0, r: 1, type: 'void' },   // Below
                        { q: 2, r: -1, type: 'void' }   // Far Northeast
                    ],
                    // Rotated 60 degrees
                    [
                        { q: -1, r: -1, type: 'void' }, // Northwest
                        { q: -1, r: 1, type: 'void' },  // Southwest
                        { q: 1, r: -1, type: 'void' },  // Northeast
                        { q: 1, r: 1, type: 'void' }    // Southeast
                    ],
                    // Rotated 120 degrees
                    [
                        { q: -1, r: 0, type: 'void' },  // Left
                        { q: 1, r: 0, type: 'void' },   // Right
                        { q: -1, r: 2, type: 'void' },  // Far Southwest
                        { q: 1, r: -2, type: 'void' }   // Far Northeast
                    ],
                    // Rotated 180 degrees
                    [
                        { q: 2, r: -1, type: 'void' },  // Far Northeast
                        { q: 0, r: 1, type: 'void' },   // Below
                        { q: 0, r: -1, type: 'void' },  // Above
                        { q: -2, r: 1, type: 'void' }   // Far Southwest
                    ],
                    // Rotated 240 degrees
                    [
                        { q: 1, r: 1, type: 'void' },   // Southeast
                        { q: 1, r: -1, type: 'void' },  // Northeast
                        { q: -1, r: 1, type: 'void' },  // Southwest
                        { q: -1, r: -1, type: 'void' }  // Northwest
                    ],
                    // Rotated 300 degrees
                    [
                        { q: 1, r: 0, type: 'void' },   // Right
                        { q: -1, r: 0, type: 'void' },  // Left
                        { q: 1, r: -2, type: 'void' },  // Far Northeast
                        { q: -1, r: 2, type: 'void' }   // Far Southwest
                    ]
                ]
            }
        };

        // Create inventory button
        this.createInventoryButton();
    }

    // Create cheat buttons container
    createCheatButtons() {
        const container = document.createElement('div');
        container.id = 'cheat-buttons';
        container.style.position = 'fixed';
        container.style.right = '20px';
        container.style.top = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'row';
        container.style.gap = '10px';
        container.style.zIndex = '9999';

        // Add scan button first - always visible
        const scanButton = document.createElement('button');
        scanButton.id = 'scan-button';
        scanButton.textContent = '🔍 Scan';
        this.styleCheatButton(scanButton);
        scanButton.onclick = () => {
            const playerQ = this.grid.player.q;
            const playerR = this.grid.player.r;
            const range = 2;

            console.group('Stone Position Scan Results:');
            console.log(`Player position: (${playerQ}, ${playerR})`);

            // Get all hexes within range
            const nearbyStones = [];
            for (let q = -range; q <= range; q++) {
                for (let r = Math.max(-range, -q-range); r <= Math.min(range, -q+range); r++) {
                    const hex = this.grid.getHex(playerQ + q, playerR + r);
                    if (hex && hex.stone) {
                        nearbyStones.push({
                            type: hex.stone,
                            relativePos: {q, r},
                            absolutePos: {q: hex.q, r: hex.r}
                        });
                    }
                }
            }

            // Log stones by type
            const stonesByType = {};
            nearbyStones.forEach(stone => {
                if (!stonesByType[stone.type]) {
                    stonesByType[stone.type] = [];
                }
                stonesByType[stone.type].push(stone);
            });

            Object.entries(stonesByType).forEach(([type, stones]) => {
                console.group(`${type.toUpperCase()} Stones (${stones.length})`);
                stones.forEach(stone => {
                    console.log(`Relative position: (${stone.relativePos.q},${stone.relativePos.r})`);
                    console.log(`Absolute position: (${stone.absolutePos.q},${stone.absolutePos.r})`);
                });
                console.groupEnd();
            });

            // Check for potential patterns
            console.group('Pattern Check:');
            Object.entries(this.patterns).forEach(([name, pattern]) => {
                // Check both _SCROLL_ patterns and level 5 patterns
                if (name.includes('_SCROLL_') || name.endsWith('_5')) {
                    if (this.checkPattern(name)) {
                        console.log(`✓ Valid pattern found: ${name}`);
                        console.log('Pattern details:', pattern.patterns[0]);
                    }
                }
            });
            console.groupEnd();
            console.groupEnd();
        };
        container.appendChild(scanButton);

        // Rest of cheat buttons - hidden initially
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.display = 'none';
        hiddenContainer.style.position = 'fixed';
        hiddenContainer.style.top = '10px';
        hiddenContainer.style.left = '10px';
        hiddenContainer.style.flexDirection = 'column';
        hiddenContainer.style.gap = '10px';

        // Add stones cheat button
        const addStonesButton = document.createElement('button');
        addStonesButton.textContent = '💎 Fill Inventory';
        this.styleCheatButton(addStonesButton);
        addStonesButton.onclick = () => {
            Object.keys(stoneCounts).forEach(type => {
                stoneCounts[type] = stoneCapacity[type];
                updateStoneCount(type);
            });
            this.grid.updateStatus("🎮 CHEAT ACTIVATED: All stones filled!");
        };
        hiddenContainer.appendChild(addStonesButton);

        // Add scrolls cheat button
        const addScrollsButton = document.createElement('button');
        addScrollsButton.textContent = '📜 Add All Scrolls';
        this.styleCheatButton(addScrollsButton);
        addScrollsButton.onclick = () => {
            Object.values(this.availableScrolls).forEach(scrollSet => {
                scrollSet.forEach(scroll => {
                    this.collectedScrolls.add(scroll);
                    scrollSet.delete(scroll);
                });
            });
            this.grid.updateStatus("🎮 CHEAT ACTIVATED: All scrolls unlocked!");
        };
        hiddenContainer.appendChild(addScrollsButton);

        // Next level cheat button
        const nextLevelButton = document.createElement('button');
        nextLevelButton.textContent = '⬆️ Next Level';
        this.styleCheatButton(nextLevelButton);
        nextLevelButton.onclick = () => {
            const nextLevel = (this.grid.currentLevel || 1) + 1;
            this.startNewLevel(nextLevel);
            this.grid.updateStatus(`🎮 CHEAT ACTIVATED: Advanced to Level ${nextLevel}!`);
        };
        hiddenContainer.appendChild(nextLevelButton);

        document.body.appendChild(container);
        document.body.appendChild(hiddenContainer);

        // Add click handler to inventory button to reveal other cheats
        const inventoryButton = document.getElementById('scroll-inventory-button');
        if (inventoryButton) {
            inventoryButton.addEventListener('click', () => {
                const now = Date.now();
                if (now - this.lastBreakClickTime < 500) {
                    this.breakButtonClickCount++;
                    if (this.breakButtonClickCount >= 5 && !this.cheatsRevealed) {
                        this.cheatsRevealed = true;
                        hiddenContainer.style.display = 'flex';
                        this.grid.updateStatus("🎮 CHEAT MODE ACTIVATED!");
                    }
                } else {
                    this.breakButtonClickCount = 1;
                }
                this.lastBreakClickTime = now;
            });
        }
    }

    // Style helper for cheat buttons
    styleCheatButton(button) {
        Object.assign(button.style, {
            padding: '12px 20px',
            backgroundColor: '#ff4081',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            opacity: '1',
            transform: 'none',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            width: '200px',
            textAlign: 'center',
            margin: '5px'
        });

        // Add hover effects
        button.onmouseover = () => {
            button.style.backgroundColor = '#f50057';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        };
        button.onmouseout = () => {
            button.style.backgroundColor = '#ff4081';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        };
    }

    // Update the scan method to be more detailed
    scanNearbyStones() {
        const playerQ = this.grid.player.q;
        const playerR = this.grid.player.r;
        const range = 2; // Scan within 2 hexes
        
        console.group('Stone Position Scan Results:');
        console.log(`Player position: (${playerQ}, ${playerR})`);
        
        // Get all hexes within range
        const nearbyStones = [];
        for (let q = -range; q <= range; q++) {
            for (let r = Math.max(-range, -q-range); r <= Math.min(range, -q+range); r++) {
                const hex = this.grid.getHex(playerQ + q, playerR + r);
                if (hex && hex.stone) {
                    nearbyStones.push({
                        type: hex.stone,
                        relativePos: {q, r},
                        absolutePos: {q: hex.q, r: hex.r},
                        direction: this.getDirectionDescription(q, r)
                    });
                }
            }
        }

        // Group stones by type
        const stonesByType = {};
        nearbyStones.forEach(stone => {
            if (!stonesByType[stone.type]) {
                stonesByType[stone.type] = [];
            }
            stonesByType[stone.type].push(stone);
        });

        // Log results by type
        Object.entries(stonesByType).forEach(([type, stones]) => {
            console.group(`${type.toUpperCase()} Stones (${stones.length})`);
            stones.forEach(stone => {
                console.log(`Position: (${stone.relativePos.q},${stone.relativePos.r}) - ${stone.direction}`);
                console.log(`  Absolute: (${stone.absolutePos.q},${stone.absolutePos.r})`);
            });
            console.groupEnd();
        });

        // Check for potential spell patterns
        console.group('Potential Spell Patterns:');
        Object.entries(this.patterns).forEach(([name, pattern]) => {
            if (this.checkPattern(name)) {
                console.log(`✓ Valid pattern found: ${name}`);
            }
        });
        console.groupEnd();

        console.groupEnd();
    }

    // Helper to get human-readable direction
    getDirectionDescription(q, r) {
        if (q === 0 && r === -1) return "Above";
        if (q === 1 && r === -1) return "Northeast";
        if (q === 1 && r === 0) return "Right";
        if (q === 0 && r === 1) return "Below";
        if (q === -1 && r === 1) return "Southwest";
        if (q === -1 && r === 0) return "Left";
        if (q === 1 && r === -2) return "Far Northeast";
        if (q === 2 && r === -2) return "Far East-Northeast";
        if (q === 2 && r === -1) return "Far East";
        if (q === 2 && r === 0) return "Far East-Southeast";
        if (q === 1 && r === 1) return "Southeast";
        if (q === 0 && r === 2) return "Far Below";
        if (q === -1 && r === 2) return "Far Southwest";
        if (q === -2 && r === 2) return "Far West-Southwest";
        if (q === -2 && r === 1) return "Far West";
        if (q === -2 && r === 0) return "Far West-Northwest";
        if (q === -1 && r === -1) return "Northwest";
        if (q === 0 && r === -2) return "Far Above";
        
        return `${q},${r}`;
    }

    // Check if a spell pattern matches at the player's position
    checkPattern(patternName) {
        const pattern = this.patterns[patternName];
        if (!pattern) return false;

        // Check each possible pattern orientation
        return pattern.patterns.some(patternVariant => {
            return patternVariant.every(req => {
                const hex = this.grid.getHex(this.grid.player.q + req.q, this.grid.player.r + req.r);
                // For level 5 patterns, we need to check both the stone type and if it's revealed
                if (pattern.level === 5) {
                    return hex && hex.revealed && hex.stone === req.type;
                }
                // For other patterns, just check if the stone exists and matches type
                return hex && hex.stone === req.type;
            });
        });
    }

    // Update validation method
    validatePatternPositions(pattern, elementType) {
        console.group(`Validating ${elementType.toUpperCase()} scroll pattern:`);
        
        // Get positions from the pattern being shown
        const positions = pattern.map(pos => `(${pos.q},${pos.r})`);
        console.log('Pattern positions:', positions);
        
        // Find the corresponding scroll pattern by checking all scroll levels
        let scrollPattern = null;
        for (let level = 1; level <= 5; level++) {
            const scrollName = `${elementType.toUpperCase()}_SCROLL_${level}`;
            const pattern = this.patterns[scrollName];
            if (pattern && pattern.patterns.some(p => 
                p.length === pattern.length && 
                p.every(pos => pattern.some(p2 => p2.q === pos.q && p2.r === pos.r))
            )) {
                scrollPattern = pattern;
                break;
            }
        }
        
        if (scrollPattern) {
            console.log(`This is a level ${scrollPattern.level} ${elementType} scroll pattern`);
            console.log(`It requires ${pattern.length} ${elementType} stones at the specified positions`);
            
            // Check if this pattern matches any valid scroll pattern
            const isValid = Object.entries(this.patterns).some(([name, scroll]) => {
                if (!name.startsWith(elementType.toUpperCase()) || !name.includes('_SCROLL_')) return false;
                return scroll.patterns.some(p => 
                    p.length === pattern.length && 
                    p.every(pos => pattern.some(p2 => p2.q === pos.q && p2.r === pos.r))
                );
            });
            
            if (isValid) {
                console.log('✓ This is a valid scroll pattern');
                // Add visual feedback for valid patterns
                const patternContainer = document.querySelector('.pattern-container');
                if (patternContainer) {
                    patternContainer.style.border = '2px solid #27ae60';
                    patternContainer.style.boxShadow = '0 0 10px rgba(39, 174, 96, 0.3)';
                }
            } else {
                console.log('✗ This pattern does not match any known scroll patterns');
                // Add visual feedback for invalid patterns
                const patternContainer = document.querySelector('.pattern-container');
                if (patternContainer) {
                    patternContainer.style.border = '2px solid #e74c3c';
                    patternContainer.style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.3)';
                }
            }
        }
        
        console.groupEnd();
    }

    // Helper to create pattern visualization
    createPatternVisualization(patterns, elementType) {
        const container = document.createElement('div');
        container.style.fontFamily = 'monospace';
        container.style.marginTop = '10px';
        container.style.marginBottom = '10px';
        container.style.backgroundColor = '#1a1a1a';
        container.style.padding = '10px';
        container.style.borderRadius = '5px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.gap = '15px';

        // Only show first pattern since they're omnidirectional
        const pattern = patterns[0];
        if (!pattern) return container;
        
        // Add note about omnidirectional patterns
        const noteText = document.createElement('div');
        noteText.textContent = 'Patterns are omnidirectional';
        noteText.style.color = '#95a5a6';
        noteText.style.fontSize = '14px';
        noteText.style.marginBottom = '10px';
        container.appendChild(noteText);

        // Create pattern container
        const patternContainer = document.createElement('div');
        patternContainer.style.width = '200px';
        patternContainer.style.height = '200px';
        patternContainer.style.position = 'relative';
        patternContainer.style.backgroundColor = '#2c3e50';
        patternContainer.style.display = 'flex';
        patternContainer.style.justifyContent = 'center';
        patternContainer.style.alignItems = 'center';
        patternContainer.style.overflow = 'hidden';

        // Create hex grid container
        const gridContainer = document.createElement('div');
        gridContainer.style.position = 'absolute';
        gridContainer.style.width = '150px';
        gridContainer.style.height = '150px';
        gridContainer.style.left = '50%';
        gridContainer.style.top = '50%';
        gridContainer.style.transform = 'translate(-50%, -50%)';

        // Constants for hex sizing and spacing
        const hexSize = 20;
        const hexWidth = hexSize * 2;
        const hexHeight = Math.sqrt(3) * hexSize;
        const horizontalSpacing = hexWidth * 3/4;
        const verticalSpacing = hexHeight;
        const centerX = 75;
        const centerY = 75;

        // Create background hexes
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                const s = -q - r;
                if (Math.abs(s) <= 2) {
                    const hex = document.createElement('div');
                    hex.style.position = 'absolute';
                    hex.style.width = hexWidth + 'px';
                    hex.style.height = hexHeight + 'px';
                    hex.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
                    hex.style.backgroundColor = '#34495e';

                    const x = centerX + (q * horizontalSpacing);
                    const y = centerY + (r * verticalSpacing) + (q * verticalSpacing / 2);
                    hex.style.transform = `translate(${x - hexWidth/2}px, ${y - hexHeight/2}px)`;
                    gridContainer.appendChild(hex);
                }
            }
        }

        // Add stones based on pattern
        pattern.forEach(pos => {
            const stoneHex = document.createElement('div');
            stoneHex.style.position = 'absolute';
            stoneHex.style.width = hexWidth + 'px';
            stoneHex.style.height = hexHeight + 'px';
            stoneHex.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
            stoneHex.style.backgroundColor = this.grid.megaTileSystem.tileTypes[elementType].color;

            const x = centerX + (pos.q * horizontalSpacing);
            const y = centerY + (pos.r * verticalSpacing) + (pos.q * verticalSpacing / 2);
            stoneHex.style.transform = `translate(${x - hexWidth/2}px, ${y - hexHeight/2}px)`;

            const stoneType = document.createElement('div');
            stoneType.textContent = elementType.charAt(0).toUpperCase();
            stoneType.style.position = 'absolute';
            stoneType.style.top = '50%';
            stoneType.style.left = '50%';
            stoneType.style.transform = 'translate(-50%, -50%)';
            stoneType.style.color = 'white';
            stoneType.style.fontWeight = 'bold';
            stoneHex.appendChild(stoneType);

            gridContainer.appendChild(stoneHex);
        });

        // Add player indicator
        const playerHex = document.createElement('div');
        playerHex.style.position = 'absolute';
        playerHex.style.width = hexWidth * 0.6 + 'px';
        playerHex.style.height = hexWidth * 0.6 + 'px';
        playerHex.style.backgroundColor = 'white';
        playerHex.style.borderRadius = '50%';
        playerHex.style.left = centerX + 'px';
        playerHex.style.top = centerY + 'px';
        playerHex.style.transform = 'translate(-50%, -50%)';
        gridContainer.appendChild(playerHex);

        patternContainer.appendChild(gridContainer);
        container.appendChild(patternContainer);

        // Validate pattern positions
        this.validatePatternPositions(pattern, elementType);

        return container;
    }

    // Show notification when a scroll is found
    showScrollFoundNotification(scrollInfo) {
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

        // Create scroll icon with glow effect
        const scrollIcon = document.createElement('div');
        scrollIcon.textContent = '📜';
        scrollIcon.style.fontSize = '64px';
        scrollIcon.style.marginBottom = '20px';
        scrollIcon.style.animation = 'glow 2s infinite';
        notification.appendChild(scrollIcon);

        // Add glow animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes glow {
                0% { text-shadow: 0 0 10px rgba(255,255,255,0.5); }
                50% { text-shadow: 0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(255,215,0,0.6); }
                100% { text-shadow: 0 0 10px rgba(255,255,255,0.5); }
            }
        `;
        document.head.appendChild(style);

        // Create title with element color
        const title = document.createElement('h2');
        title.textContent = 'New Scroll Discovered!';
        title.style.margin = '10px 0 20px 0';
        title.style.color = this.grid.megaTileSystem.tileTypes[scrollInfo.elementType].color;
        title.style.textShadow = '0 0 10px rgba(255,255,255,0.3)';
        notification.appendChild(title);

        // Create scroll name with larger font
        const scrollName = document.createElement('div');
        scrollName.textContent = scrollInfo.displayName;
        scrollName.style.fontSize = '24px';
        scrollName.style.fontWeight = 'bold';
        scrollName.style.marginBottom = '15px';
        scrollName.style.color = '#ecf0f1';
        notification.appendChild(scrollName);

        // Add divider
        const divider = document.createElement('div');
        divider.style.width = '80%';
        divider.style.height = '2px';
        divider.style.margin = '15px auto';
        divider.style.background = this.grid.megaTileSystem.tileTypes[scrollInfo.elementType].color;
        divider.style.opacity = '0.5';
        notification.appendChild(divider);

        // Create detailed description section
        const descriptionTitle = document.createElement('div');
        descriptionTitle.textContent = 'Scroll Effect:';
        descriptionTitle.style.fontSize = '18px';
        descriptionTitle.style.color = '#3498db';
        descriptionTitle.style.marginBottom = '10px';
        notification.appendChild(descriptionTitle);

        // Create description with pattern details
        const description = document.createElement('div');
        description.textContent = scrollInfo.description;
        description.style.fontSize = '16px';
        description.style.color = '#bdc3c7';
        description.style.lineHeight = '1.4';
        description.style.marginBottom = '20px';
        notification.appendChild(description);

        // Add AP cost info
        const apCost = document.createElement('div');
        apCost.textContent = `Activation Cost: ${this.SPELL_AP_COST} AP`;
        apCost.style.fontSize = '14px';
        apCost.style.color = '#e74c3c';
        apCost.style.marginBottom = '20px';
        notification.appendChild(apCost);

        // Add pattern visualization after the description
        const patternVisual = this.createPatternVisualization(
            this.patterns[scrollInfo.name].patterns,
            scrollInfo.elementType
        );
        patternVisual.style.marginBottom = '20px';
        notification.insertBefore(patternVisual, apCost);

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Got it!';
        closeButton.style.padding = '10px 30px';
        closeButton.style.fontSize = '16px';
        closeButton.style.backgroundColor = this.grid.megaTileSystem.tileTypes[scrollInfo.elementType].color;
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.style.transition = 'transform 0.2s, box-shadow 0.2s';
        closeButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

        closeButton.onmouseover = () => {
            closeButton.style.transform = 'translateY(-2px)';
            closeButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        closeButton.onmouseout = () => {
            closeButton.style.transform = 'translateY(0)';
            closeButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        };

        closeButton.onclick = () => {
            document.body.removeChild(notification);
            document.head.removeChild(style);
        };
        notification.appendChild(closeButton);

        document.body.appendChild(notification);
    }

    // Modified onMegaTileRevealed to show notification
    onMegaTileRevealed(elementType) {
        if (!this.availableScrolls[elementType] || this.availableScrolls[elementType].size === 0) {
            return null; // No more scrolls available for this element
        }

        // Convert Set to Array for random selection
        const availableScrollsArray = Array.from(this.availableScrolls[elementType]);
        
        // Select random scroll
        const randomIndex = Math.floor(Math.random() * availableScrollsArray.length);
        const selectedScroll = availableScrollsArray[randomIndex];
        
        // Remove from available and add to collected
        this.availableScrolls[elementType].delete(selectedScroll);
        this.collectedScrolls.add(selectedScroll);
        
        // Get scroll info and show notification
        const scrollInfo = this.patterns[selectedScroll];
        const info = {
            name: selectedScroll,
            displayName: scrollInfo.name,
            description: scrollInfo.description,
            level: scrollInfo.level,
            elementType
        };
        
        this.showScrollFoundNotification(info);
        return info;
    }

    // Check if player has collected a specific scroll
    hasScroll(scrollName) {
        return this.collectedScrolls.has(scrollName);
    }

    // Get all collected scrolls of a specific element type
    getCollectedScrolls(elementType) {
        return Array.from(this.collectedScrolls)
            .filter(scroll => scroll.startsWith(elementType.toUpperCase()))
            .map(scrollName => ({
                name: scrollName,
                ...this.patterns[scrollName]
            }));
    }

    // Modified activateSpell to properly handle all levels
    activateSpell() {
        const apInfo = this.grid.movementSystem.getTotalAvailableAP();
        const totalAvailableAP = apInfo.regularAP + (apInfo.voidAP - this.grid.movementSystem.voidAPUsed);
        
        if (totalAvailableAP < this.SPELL_AP_COST) {
            this.grid.updateStatus(`Not enough AP to cast spell! Need ${this.SPELL_AP_COST} AP.`);
            return false;
        }

        // Check all spell patterns and collect matches
        const matchingSpells = [];
        for (const [spellName, spell] of Object.entries(this.patterns)) {
            // Only check _SCROLL_ patterns
            if (spellName.includes('_SCROLL_') && this.collectedScrolls.has(spellName)) {
                if (this.checkPattern(spellName)) {
                    matchingSpells.push({ name: spellName, spell });
                }
            }
        }

        if (matchingSpells.length === 0) {
            this.grid.updateStatus("No valid spell pattern found or you haven't collected the required scroll.");
            return false;
        }

        // Sort matching spells by level (highest first)
        matchingSpells.sort((a, b) => b.spell.level - a.spell.level);

        // If multiple spells match, show selection popup
        if (matchingSpells.length > 1) {
            this.showSpellSelectionPopup(matchingSpells, (selectedSpell) => {
                this.executeSpell(selectedSpell.name, selectedSpell.spell, apInfo);
            });
            return true;
        }

        // If only one spell matches, execute it directly
        return this.executeSpell(matchingSpells[0].name, matchingSpells[0].spell, apInfo);
    }

    // Modified showSpellSelectionPopup to show scroll collection status
    showSpellSelectionPopup(matchingSpells, callback) {
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = '#2c3e50';
        popup.style.padding = '20px';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        popup.style.zIndex = '1000';
        popup.style.color = 'white';
        popup.style.minWidth = '300px';

        const title = document.createElement('h3');
        title.textContent = 'Select Scroll to Activate';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        title.style.textAlign = 'center';
        popup.appendChild(title);

        // Sort spells by level
        matchingSpells.sort((a, b) => b.spell.level - a.spell.level);

        // Create buttons for each matching spell
        matchingSpells.forEach(({ name, spell }) => {
            const button = document.createElement('button');
            const elementType = name.split('_')[0].toLowerCase();
            
            // Only show and enable buttons for collected scrolls
            button.textContent = `${spell.name} (+${spell.level} ${elementType} stones)`;
            button.style.display = 'block';
            button.style.width = '100%';
            button.style.padding = '10px';
            button.style.marginBottom = '10px';
            button.style.backgroundColor = this.hasScroll(name) ? '#34495e' : '#95a5a6';
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.style.color = 'white';
            button.style.cursor = this.hasScroll(name) ? 'pointer' : 'not-allowed';
            
            if (this.hasScroll(name)) {
                button.onmouseover = () => button.style.backgroundColor = '#3498db';
                button.onmouseout = () => button.style.backgroundColor = '#34495e';
                button.onclick = () => {
                    document.body.removeChild(popup);
                    callback({ name, spell });
                };
            }
            
            popup.appendChild(button);
        });

        document.body.appendChild(popup);
    }

    // Execute the selected spell
    executeSpell(spellName, spell, apInfo) {
        // Calculate AP usage
        let costRemaining = this.SPELL_AP_COST;
        let newRegularAP = apInfo.regularAP;
        let newVoidAPUsed = this.grid.movementSystem.voidAPUsed;

        // First use regular AP
        if (newRegularAP >= costRemaining) {
            newRegularAP -= costRemaining;
            costRemaining = 0;
        } else {
            costRemaining -= newRegularAP;
            newRegularAP = 0;
        }

        // Then use void AP if needed
        if (costRemaining > 0) {
            newVoidAPUsed += costRemaining;
            costRemaining = 0;
        }

        // Update AP displays
        document.getElementById('ap-count').textContent = newRegularAP;
        this.grid.movementSystem.voidAPUsed = newVoidAPUsed;
        this.grid.movementSystem.updateAPDisplay();
        
        // Get element type from the spell name
        const elementType = spellName.split('_')[0].toLowerCase();
        
        // Add stones based on scroll level
        if (elementType && spell.level) {
            stoneCounts[elementType] = Math.min(
                stoneCapacity[elementType],
                stoneCounts[elementType] + spell.level
            );
            updateStoneCount(elementType);
            this.grid.updateStatus(`Spell activated: Added +${spell.level} ${elementType} stones!`);

            // Track activated scroll type
            this.activatedScrollTypes.add(elementType);

            // Check win condition
            if (this.activatedScrollTypes.size === 5) {
                // Create level completion notification
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

                // Get current level and calculate next level
                const currentLevel = this.grid.currentLevel || 1;
                const nextLevel = currentLevel + 1;

                // Create title with rainbow animation
                const title = document.createElement('h2');
                title.textContent = `Level ${currentLevel} Complete!`;
                title.style.margin = '10px 0 20px 0';
                title.style.animation = 'rainbow 2s linear infinite';
                
                // Add rainbow animation
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes rainbow {
                        0% { color: #ff0000; }
                        20% { color: #00ff00; }
                        40% { color: #0000ff; }
                        60% { color: #ff00ff; }
                        80% { color: #ffff00; }
                        100% { color: #ff0000; }
                    }
                `;
                document.head.appendChild(style);

                // Create message
                const message = document.createElement('div');
                message.innerHTML = `
                    You have mastered all five elements!<br><br>
                    <strong>Level ${nextLevel} Challenges:</strong><br>
                    • Board size: ${nextLevel * 2}x larger<br>
                    • Monster perception: +${nextLevel - 1} range<br>
                    • ${nextLevel} of each elemental mega-tile<br>
                `;
                message.style.fontSize = '18px';
                message.style.marginBottom = '20px';
                message.style.lineHeight = '1.5';

                // Create next level button
                const nextLevelButton = document.createElement('button');
                nextLevelButton.textContent = 'Start Level ' + nextLevel;
                nextLevelButton.style.padding = '10px 30px';
                nextLevelButton.style.fontSize = '16px';
                nextLevelButton.style.backgroundColor = '#3498db';
                nextLevelButton.style.border = 'none';
                nextLevelButton.style.borderRadius = '5px';
                nextLevelButton.style.color = 'white';
                nextLevelButton.style.cursor = 'pointer';
                nextLevelButton.style.transition = 'transform 0.2s, box-shadow 0.2s';
                nextLevelButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

                nextLevelButton.onmouseover = () => {
                    nextLevelButton.style.transform = 'translateY(-2px)';
                    nextLevelButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                };
                nextLevelButton.onmouseout = () => {
                    nextLevelButton.style.transform = 'translateY(0)';
                    nextLevelButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                };

                nextLevelButton.onclick = () => {
                    document.body.removeChild(notification);
                    document.head.removeChild(style);
                    
                    // Start new level with increased difficulty
                    this.startNewLevel(nextLevel);
                };

                // Assemble notification
                notification.appendChild(title);
                notification.appendChild(message);
                notification.appendChild(nextLevelButton);
                document.body.appendChild(notification);
            }
        }
        
        // Add visual effect
        this.createSpellEffect();

        // Update movable hexes after AP change
        this.grid.movementSystem.calculateMovableHexes();
        return true;
    }

    // Start a new level with increased difficulty
    startNewLevel(level) {
        // Store the new level
        this.grid.currentLevel = level;
        
        // Reset scroll tracking
        this.activatedScrollTypes.clear();
        this.collectedScrolls.clear();
        
        // Reset available scrolls
        this.availableScrolls = {
            earth: new Set(['EARTH_SCROLL_1', 'EARTH_SCROLL_2', 'EARTH_SCROLL_3', 'EARTH_SCROLL_4', 'EARTH_SCROLL_5']),
            water: new Set(['WATER_SCROLL_1', 'WATER_SCROLL_2', 'WATER_SCROLL_3', 'WATER_SCROLL_4', 'WATER_SCROLL_5']),
            fire: new Set(['FIRE_SCROLL_1', 'FIRE_SCROLL_2', 'FIRE_SCROLL_3', 'FIRE_SCROLL_4', 'FIRE_SCROLL_5']),
            wind: new Set(['WIND_SCROLL_1', 'WIND_SCROLL_2', 'WIND_SCROLL_3', 'WIND_SCROLL_4', 'WIND_SCROLL_5']),
            void: new Set(['VOID_SCROLL_1', 'VOID_SCROLL_2', 'VOID_SCROLL_3', 'VOID_SCROLL_4', 'VOID_SCROLL_5'])
        };

        // Reset stone counts
        Object.keys(stoneCounts).forEach(type => {
            stoneCounts[type] = stoneCapacity[type];
            updateStoneCount(type);
        });

        // Increase grid size
        this.grid.radius = 12 * level; // Double the radius for each level

        // Reset player position to center
        this.grid.player.q = 0;
        this.grid.player.r = 0;

        // Update monster perception range - DISABLED
        // if (this.grid.monsterSystem) {
        //     this.grid.monsterSystem.perceptionRange = 2 + (level - 1); // Base range + level bonus
        // }

        // Reinitialize the grid with new size
        this.grid.createGrid();

        // Reinitialize mega-tiles with increased counts
        if (this.grid.megaTileSystem) {
            this.grid.megaTileSystem.tilesPerType = level; // One of each type per level
            this.grid.megaTileSystem.initializeMegaTiles();
        }

        // Reset monsters - DISABLED
        // if (this.grid.monsterSystem) {
        //     this.grid.monsterSystem.monsters.clear();
        //     this.grid.monsterSystem.initialized = false;
        //     this.grid.monsterSystem.initializeMonsters(5 * level); // More monsters per level
        // }

        // Reset movement system
        this.grid.movementSystem.resetVoidAPUsed();
        document.getElementById('ap-count').textContent = '5';

        // Center view on player
        this.grid.centerOnPlayer();

        // Update status
        this.grid.updateStatus(`Level ${level} started! The world has grown larger and more dangerous...`);

        // Recalculate movable hexes and render
        this.grid.movementSystem.calculateMovableHexes();
        this.grid.renderSystem.render();
    }

    // Create a visual effect for spell activation
    createSpellEffect() {
        const ctx = this.grid.canvas.getContext('2d');
        const playerPos = this.grid.hexMath.axialToPixel(
            this.grid.player.q, 
            this.grid.player.r
        );
        
        // Add to animation manager
        this.grid.animationManager.addAnimation(new SpellAnimation(
            this.grid,
            playerPos.x + this.grid.canvas.width / 2,
            playerPos.y + this.grid.canvas.height / 2
        ));
    }

    // Debug method to highlight valid spell positions
    debugShowPattern(patternName) {
        const pattern = this.patterns[patternName];
        if (!pattern) return;

        const playerQ = this.grid.player.q;
        const playerR = this.grid.player.r;

        // Show the required positions and what stones are needed
        pattern.patterns.forEach(patternVariant => {
            patternVariant.forEach(req => {
                const hex = this.grid.getHex(playerQ + req.q, playerR + req.r);
                if (hex) {
                    this.grid.markHexDirty(hex.q, hex.r);
                    // If the hex doesn't have the right stone, show what's needed
                    if (!hex.stone || hex.stone !== req.type) {
                        const pos = this.grid.hexMath.axialToPixel(hex.q, hex.r);
                        const ctx = this.grid.canvas.getContext('2d');
                        ctx.save();
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.font = '12px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('Need Earth', pos.x + this.grid.canvas.width / 2, pos.y + this.grid.canvas.height / 2);
                        ctx.restore();
                    }
                }
            });
        });

        this.grid.renderSystem.renderOptimized();
    }

    // Create the inventory button
    createInventoryButton() {
        // Create container for buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.right = '20px';
        buttonContainer.style.top = '20px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.zIndex = '1000';

        // Create scroll button
        const scrollButton = document.createElement('button');
        scrollButton.id = 'scroll-inventory-button';
        scrollButton.textContent = '📜 Scrolls';
        scrollButton.style.padding = '10px 20px';
        scrollButton.style.backgroundColor = '#2c3e50';
        scrollButton.style.color = 'white';
        scrollButton.style.border = 'none';
        scrollButton.style.borderRadius = '5px';
        scrollButton.style.cursor = 'pointer';
        scrollButton.style.fontSize = '16px';
        scrollButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

        // Create scan button
        const scanButton = document.createElement('button');
        scanButton.id = 'scan-button';
        scanButton.textContent = '🔍 Scan';
        scanButton.style.padding = '10px 20px';
        scanButton.style.backgroundColor = '#2c3e50';
        scanButton.style.color = 'white';
        scanButton.style.border = 'none';
        scanButton.style.borderRadius = '5px';
        scanButton.style.cursor = 'pointer';
        scanButton.style.fontSize = '16px';
        scanButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

        // Hover effects for both buttons
        const hoverEffect = (button) => {
            button.onmouseover = () => {
                button.style.backgroundColor = '#34495e';
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            };
            button.onmouseout = () => {
                button.style.backgroundColor = '#2c3e50';
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            };
        };

        hoverEffect(scrollButton);
        hoverEffect(scanButton);

        // Click handlers
        scrollButton.onclick = () => this.showScrollInventory();
        scanButton.onclick = () => {
            const playerQ = this.grid.player.q;
            const playerR = this.grid.player.r;
            const range = 2;

            console.group('Stone Position Scan Results:');
            console.log(`Player position: (${playerQ}, ${playerR})`);

            // Get all hexes within range
            const nearbyStones = [];
            for (let q = -range; q <= range; q++) {
                for (let r = Math.max(-range, -q-range); r <= Math.min(range, -q+range); r++) {
                    const hex = this.grid.getHex(playerQ + q, playerR + r);
                    if (hex && hex.stone) {
                        nearbyStones.push({
                            type: hex.stone,
                            relativePos: {q, r},
                            absolutePos: {q: hex.q, r: hex.r}
                        });
                    }
                }
            }

            // Log stones by type
            const stonesByType = {};
            nearbyStones.forEach(stone => {
                if (!stonesByType[stone.type]) {
                    stonesByType[stone.type] = [];
                }
                stonesByType[stone.type].push(stone);
            });

            Object.entries(stonesByType).forEach(([type, stones]) => {
                console.group(`${type.toUpperCase()} Stones (${stones.length})`);
                stones.forEach(stone => {
                    console.log(`Relative position: (${stone.relativePos.q},${stone.relativePos.r})`);
                    console.log(`Absolute position: (${stone.absolutePos.q},${stone.absolutePos.r})`);
                });
                console.groupEnd();
            });

            // Check for potential patterns
            console.group('Pattern Check:');
            Object.entries(this.patterns).forEach(([name, pattern]) => {
                // Check both _SCROLL_ patterns and level 5 patterns
                if (name.includes('_SCROLL_') || name.endsWith('_5')) {
                    if (this.checkPattern(name)) {
                        console.log(`✓ Valid pattern found: ${name}`);
                        console.log('Pattern details:', pattern.patterns[0]);
                    }
                }
            });
            console.groupEnd();
            console.groupEnd();
        };

        // Add buttons to container
        buttonContainer.appendChild(scrollButton);
        buttonContainer.appendChild(scanButton);

        // Add container to document
        document.body.appendChild(buttonContainer);
    }

    // Show the scroll inventory popup
    showScrollInventory() {
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = '#2c3e50';
        popup.style.padding = '20px';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        popup.style.zIndex = '1001';
        popup.style.minWidth = '400px';
        popup.style.maxHeight = '80vh';
        popup.style.overflowY = 'auto';
        popup.style.color = 'white';

        // Add title
        const title = document.createElement('h2');
        title.textContent = '📜 Scroll Collection';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.color = '#3498db';
        popup.appendChild(title);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.right = '10px';
        closeButton.style.top = '10px';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => document.body.removeChild(popup);
        popup.appendChild(closeButton);

        // Create sections for each element type
        const elementTypes = ['earth', 'water', 'fire', 'wind', 'void'];
        const elementEmojis = {
            'earth': '🏔️',
            'water': '🌊',
            'fire': '🔥',
            'wind': '💨',
            'void': '✨'
        };

        elementTypes.forEach(elementType => {
            const scrolls = this.getCollectedScrolls(elementType);
            if (scrolls.length > 0) {
                // Create element section
                const section = document.createElement('div');
                section.style.marginBottom = '20px';

                // Add element header
                const header = document.createElement('h3');
                header.textContent = `${elementEmojis[elementType]} ${elementType.charAt(0).toUpperCase() + elementType.slice(1)} Scrolls`;
                header.style.color = this.grid.megaTileSystem.tileTypes[elementType].color;
                header.style.borderBottom = `2px solid ${this.grid.megaTileSystem.tileTypes[elementType].color}`;
                header.style.paddingBottom = '5px';
                section.appendChild(header);

                // Add scrolls
                scrolls.forEach(scroll => {
                    const scrollDiv = document.createElement('div');
                    scrollDiv.style.backgroundColor = '#34495e';
                    scrollDiv.style.padding = '15px';
                    scrollDiv.style.marginBottom = '10px';
                    scrollDiv.style.borderRadius = '5px';
                    scrollDiv.style.borderLeft = `4px solid ${this.grid.megaTileSystem.tileTypes[elementType].color}`;

                    const scrollName = document.createElement('div');
                    scrollName.textContent = scroll.name;
                    scrollName.style.fontSize = '16px';
                    scrollName.style.fontWeight = 'bold';
                    scrollName.style.color = '#ecf0f1';
                    scrollName.style.marginBottom = '10px';
                    scrollDiv.appendChild(scrollName);

                    // Add pattern visualization
                    const patternVisual = this.createPatternVisualization(
                        scroll.patterns,
                        elementType
                    );
                    scrollDiv.appendChild(patternVisual);

                    const scrollDescription = document.createElement('div');
                    scrollDescription.textContent = scroll.description;
                    scrollDescription.style.fontSize = '14px';
                    scrollDescription.style.color = '#bdc3c7';
                    scrollDescription.style.marginTop = '10px';
                    scrollDiv.appendChild(scrollDescription);

                    section.appendChild(scrollDiv);
                });

                popup.appendChild(section);
            }
        });

        // If no scrolls collected yet
        if (this.collectedScrolls.size === 0) {
            const noScrolls = document.createElement('div');
            noScrolls.textContent = 'No scrolls collected yet. Explore the world to find magical scrolls!';
            noScrolls.style.textAlign = 'center';
            noScrolls.style.color = '#bdc3c7';
            noScrolls.style.padding = '20px';
            popup.appendChild(noScrolls);
        }

        document.body.appendChild(popup);
    }
}

// Animation for spell activation
class SpellAnimation extends Animation {
    constructor(grid, centerX, centerY, duration = 1000) {
        super(duration);
        this.grid = grid;
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = 0;
        this.maxRadius = grid.hexSize * 4;
    }

    update(now) {
        const progress = super.update(now);
        
        // Create expanding circle effect
        const ctx = this.grid.canvas.getContext('2d');
        ctx.save();
        
        // Draw expanding circle
        ctx.beginPath();
        this.radius = this.maxRadius * progress;
        ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        
        // Create gradient
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (1 - progress) + ')');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
        
        // Force render update
        this.grid.renderSystem.renderOptimized();
    }
} 