const flat = '♭';
const sharp = '♯';

const ROMAN_MAP = {
  '1': 'Ⅰ', '2': 'Ⅱ', '3': 'Ⅲ', '4': 'Ⅳ', '5': 'Ⅴ', '6': 'Ⅵ', '7': 'Ⅶ',
};

function convertRoot(root) {
  let cleanRoot = root.trim();
  if (!cleanRoot) return '';

  const degreeMatch = cleanRoot.match(/^([b♭#♯]?)([1-7])$/);
  if (degreeMatch) {
    let acc = degreeMatch[1];
    if (acc === 'b') acc = flat;
    if (acc === '#') acc = sharp;
    const num = degreeMatch[2];
    const roman = ROMAN_MAP[num] || num;
    return `${acc}${roman}`;
  }

  cleanRoot = cleanRoot.replace(/^([a-gA-G])([b♭#♯]?)/, (_, note, acc) => {
    let newAcc = acc;
    if (acc === 'b') newAcc = flat;
    if (acc === '#') newAcc = sharp;
    return note.toUpperCase() + newAcc;
  });

  return cleanRoot;
}

function convertChordSymbol(text) {
  let root = '';
  let quality = '';

  const degreeRootMatch = text.match(/^([b♭#♯]?[1-7])(.*)$/);
  const noteRootMatch = text.match(/^([a-gA-G][b♭#♯]?)(.*)$/);

  if (degreeRootMatch) {
    root = convertRoot(degreeRootMatch[1]);
    quality = degreeRootMatch[2];
  } else if (noteRootMatch) {
    root = convertRoot(noteRootMatch[1]);
    quality = noteRootMatch[2];
  } else {
    root = text;
    quality = '';
  }
  
  return `${root}${quality}`;
}

console.log('B7 ->', convertChordSymbol('B7'));
console.log('b7 ->', convertChordSymbol('b7'));
console.log('bb7 ->', convertChordSymbol('bb7'));
console.log('am7 ->', convertChordSymbol('am7'));
console.log('4m7 ->', convertChordSymbol('4m7'));
console.log('b3m7 ->', convertChordSymbol('b3m7'));
