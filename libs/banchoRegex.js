module.exports = {
    match: function (string) {
        for (let regexName in this.regexes) {
            if (this.regexes[regexName].regex.test(string)) {
                let found = this.regexes[regexName]
                return {
                    name: regexName,
                    regex: found.regex,
                    result: found.exec(found.regex, string)
                }
            }
        }
        return null;
    },
    regexes: {
        roomTitle: {
            regex: /^Room name: (.+), History: https:\/\/osu\.ppy\.sh\/mp\/(\d+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    title: match[1],
                    id: match[2]
                }
            }
        },
        refereeChangedTitle: {
            regex: /^Room name updated to "(.+)"$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    title: match[1],
                }
            }
        },
        teamModeWinConditions: {
            regex: /^Team mode: (\w+), Win condition: (\w+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    teamMode: match[1],
                    winCondition: match[2]
                }
            }
        },
        activeMods: {
            regex: /^Active mods: (.+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                let mods = match[1].split(', ');
                return {
                    mods: mods,
                    freemod: mods.includes("Freemod")
                }
            }
        },
        playersAmount: {
            regex: /^Players: (\d+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    playersAmount: parseInt(match[1])
                }
            }
        },
        playerChangedBeatmap: {
            regex: /^Beatmap changed to: (.+) \(https:\/\/osu\.ppy\.sh\/b\/(\d+)\)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    mapName: match[1],
                    id: match[2]
                }
            }
        },
        playerChangedTeam: {
            regex: /^(.+) changed to (Blue|Red)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1],
                    team: match[2].toLowerCase()
                }
            }
        },
        refereeChangedBeatmap: {
            regex: /^Changed beatmap to https:\/\/osu\.ppy\.sh\/b\/(\d+) (.+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    beatmapId: match[1],
                    mapName: match[2]
                }
            }
        },
        refereeChangedMode: {
            regex: /^Changed match mode to (Osu|Taiko|CatchTheBeat|OsuMania)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    mode: match[1]
                }
            }
        },
        beatmapFromSettings: {
            regex: /^Beatmap: https:\/\/osu\.ppy\.sh\/b\/(\d+) (.+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    beatmapId: match[1],
                    mapName: match[2]
                }
            }
        },
        invalidBeatmapId: {
            regex: /^Invalid map ID provided$/,
            exec: function () {
                return {}
            }
        },
        playerChangingBeatmap: {
            regex: /^Host is changing map...$/,
            exec: function () {
                return {}
            }
        },
        refereeChangedMods: {
            regex: /^(Enabled (.+)|Disabled all mods), (disabled|enabled) FreeMod$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                let mods = [];
                let freemod = false;
                if (match[1] === "Enabled "){
                    mods = match[2].split(', ');
                } 
                if (match[3] === "enabled"){
                    freemod = true;
                }
                return {
                    mods: mods,
                    freemod: freemod
                }
            }
        },
        playerJoined: {
            regex: /^(.+) joined in slot (\d+)( for team (blue|red))?\.$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1],
                    slot: parseInt(match[2]) - 1,
                    team: match[4] ? match[4] ===  "blue" ? "blue" : "red" : null
                }
            }
        },
        playerMoved: {
            regex: /^(.+) moved to slot (\d+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1],
                    slot: parseInt(match[2]) - 1
                }
            }
        },
        playerLeft: {
            regex: /^(.+) left the game\.$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1]
                }
            }
        },
        playerBecameTheHost: {
            regex: /^(.+) became the host\.$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1]
                }
            }
        },
        allPlayersReady: {
            regex: /All players are ready/,
            exec: function () {
                return {}
            }
        },
        matchStarted: {
            regex: /The match has started!/,
            exec: function () {
                return {}
            }
        },
        matchAborted: {
            regex: /Aborted the match/,
            exec: function () {
                return {}
            }
        },
        playerFinished: {
            regex: /^(.+) finished playing \(Score: (\d+), (FAIL|PASS)ED\)\.$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1],
                    score: parseInt(match[2]),
                    pass: match[3] === "PASS"
                }
            }
        },
        matchFinished: {
            regex: /The match has finished!/,
            exec: function () {
                return {}
            }
        },
        passwordRemoved: {
            regex: /Removed the match password/,
            exec: function () {
                return {}
            }
        },
        passwordChanged: {
            regex: /Changed the match password/,
            exec: function () {
                return {}
            }
        },
        refereeAdded: {
            regex: /^Added (.+) to the match referees$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1]
                }
            }
        },
        refereeRemoved: {
            regex: /^Removed (.+) from the match referees$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1]
                }
            }
        },
        userNotFound: {
            regex: /User not found/,
            exec: function () {
                return {}
            }
        },
        userNotFoundUsername: {
            regex: /^User not found: (.+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    username: match[1]
                }
            }
        },
        slotsLocked: {
            regex: /slotsLocked/,
            exec: function () {
                return {}
            }
        },
        slotsUnlocked: {
            regex: /Unlocked the match/,
            exec: function () {
                return {}
            }
        },
        matchSize: {
            regex: /^Changed match to size (\d+)$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    size: parseInt(match[1])
                }
            }
        },
        matchSettings: {
            regex: /^Changed match settings to ((\d+) slots, )?(HeadToHead|TagCoop|TeamVs|TagTeamVs)(, (Score|Accuracy|Combo|ScoreV2))?$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    size: parseInt(match[2]),
                    teamMode: match[3],
                    winCondition: match[5]
                }
            }
        },
        settingsPlayerData: {
            regex: /^Slot (\d+).+((Not Ready)|(Ready    )).+https:\/\/osu.ppy.sh\/u\/(\d+) (.+) \[(.+)\]$/,
            exec: function (regex, string) {
                let match = regex.exec(string);
                return {
                    slot: parseInt(match[1]) - 1,
                    ready: match[2] === "Ready    ",
                    userId: match[5],
                    username: match[6],
                    attribute: match[7],
                }
            }
        },
        hostCleared: {
            regex: /Cleared match host/,
            exec: function () {
                return {}
            }
        },

    }
}