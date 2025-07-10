// maximum-different.ts

type Item = string;
type Color = string;

// Map of each item to the list of colors it can take
type ItemColorMap = Map<Item, Color[]>;

// Map to track which color is currently assigned to which item
const match: Map<Color, Item> = new Map();

function canAssign(
    item: Item,
    visited: Set<Color>,
    itemColorMap: ItemColorMap,
): boolean {
    for (const color of itemColorMap.get(item) || []) {
        if (visited.has(color)) continue;
        visited.add(color);

        // If this color is not taken, or we can reassign the item currently using it
        if (!match.has(color) || canAssign(match.get(color)!, visited, itemColorMap)) {
            match.set(color, item);
            return true;
        }
    }
    return false;
}

function getMaxDistinctAssignments(itemColorMap: ItemColorMap): Map<Item, Color> {
    match.clear();

    for (const item of itemColorMap.keys()) {
        canAssign(item, new Set(), itemColorMap);
    }

    // Reverse mapping to return item → color
    const result: Map<Item, Color> = new Map();
    for (const [color, item] of match.entries()) {
        result.set(item, color);
    }
    return result;
}

const data2: ItemColorMap = new Map([
    ['item1', ['red', 'blue']],
    ['item2', ['blue', 'green']],
    ['item3', ['green', 'red']],
    ['item4', ['yellow']],
    ['item5', ['red', 'yellow']],
]);
const data222: ItemColorMap = new Map([
    ['item1', ['red', 'blue', 'green']],
    ['item2', ['blue', 'white']],  
]);
const data: ItemColorMap = new Map([
    ['item1', ['red'] ],
    ['item2', ['red'] ],
    ['item3', ['green', 'black']],
    ['item4', ['green', 'red']],
 ]);


for (const [item, colors] of data) {
    console.log(`${item} → ${colors}`);
}


const result = getMaxDistinctAssignments(data);
console.log("Distinct assignments:");
for (const [item, color] of result.entries()) {
    console.log(`${item} → ${color}`);
}
console.log(result.size);
 