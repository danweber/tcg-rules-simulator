
export var debug = 0;
export var debug_parens = 0;


export interface KeywordType {
	[key: string]: string
};

// do these rules still exist???

/*
export interface ConjunctionRules {
	[key: string]: (ParsedRules | string[]  );
}

export interface ParsedRules {
	[key: string]: ( string | any[] | ParsedRules | ConjunctionRules); // i need to fix this
}
*/


export let Keywords: KeywordType = {
	"HAND": "HAND",
	"START_OF_YOUR_TURN": "START OF YOUR TURN",
	"START_OF_YOUR_MAIN_PHASE" : "START OF YOUR MAIN PHASE",
	"ALL_TURNS": "ALL TURNS",
	"YOUR_TURN": "YOUR TURN",
	"OPPONENTS_TURN": "OPPONENT'S TURN",
	"MATERIAL_SAVE": "MATERIAL SAVE \\d",
	"ARMOR_PURGE": "ARMOR PURGE",
	"ON_PLAY": "ON PLAY",
	"ON_DELETION": "ON DELETION",
	"WHEN_DIGIVOLVING": "WHEN DIGIVOLVING",
	"WHEN_ATTACKING": "WHEN ATTACKING",
	"END_OF_ATTACK": "END OF ATTACK",
	"MAIN": "MAIN",
	"ONCE_PER_TURN": "ONCE PER TURN",

	"BARRIER": "BARRIER",
	"REBOOT": "REBOOT",
	"BLOCKER": "BLOCKER",
	"DRAW": "DRAW \\d+",
	"SECURITY_ATTACK": "SECURITY ATTACK [-0-9+]+",

	// unsorted
	"SECURITY": "SECURITY",
	"COUNTER": "COUNTER",
	"BLAST_DIGIVOLVE": "BLAST DIGIVOLVE",
	"ALLIANCE": "ALLIANCE",
	"BLITZ": "BLITZ",
	"FORTITUDE": "FORTITUDE",
	"JAMMING": "JAMMING",
	"PIERCING": "PIERCING",
	"RAID": "RAID",
	"RUSH": "RUSH",
	"DE-DIGIVOLVE" : "DE-DIGIVOLVE \\d",
	"RETALIATION" : "RETALIATION",

	"DIGIVOLVE": "DIGIVOLVE.*", ///eeeeh
	"ACE": "ACE.{1,3}Overflow \\(.\\d\\)",
	"DIGIXROS": "DIGIXROS -\\d", // see special code
	"RULE": "RULE.*",
	//TRAIT: "TRAIT \\.*?>", //? 
};


//export = Parse;


