import { convertRoughText, convertChordSymbol } from './src/utils/converter.js';

console.log("4m7:", convertChordSymbol("4m7"));
console.log("AM7:", convertChordSymbol("AM7"));
console.log("7m7-5:", convertChordSymbol("7m7-5"));
console.log("Bbaug:", convertChordSymbol("Bbaug"));
console.log("5m7(11):", convertChordSymbol("5m7(11)"));
console.log("4, 5, 3, 6:", convertRoughText("4, 5, 3, 6"));
console.log("4.5/4, 3.6:", convertRoughText("4.5/4, 3.6"));

console.log("lowercase am7:", convertChordSymbol("am7"));
console.log("lowercase bbaug:", convertChordSymbol("bbaug"));
console.log("slash chord 5/4:", convertChordSymbol("5/4"));
console.log("slash chord C/E:", convertChordSymbol("C/E"));
console.log("slash chord 4.5/4:", convertChordSymbol("4.5/4"));
