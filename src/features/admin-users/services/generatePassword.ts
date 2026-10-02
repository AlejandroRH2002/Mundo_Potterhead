const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_+?'];
function randomIndex(length: number): number {
 const limit = 256 - (256 % length);
 const byte = new Uint8Array(1);
 do { crypto.getRandomValues(byte); } while (byte[0] >= limit);
 return byte[0] % length;
}
export function generatePassword(): string {
 const characters = groups.map(group => group[randomIndex(group.length)]);
 const alphabet = groups.join('');
 while (characters.length < 24) characters.push(alphabet[randomIndex(alphabet.length)]);
 for (let index = characters.length - 1; index > 0; index--) {
  const other = randomIndex(index + 1);
  [characters[index], characters[other]] = [characters[other], characters[index]];
 }
 return characters.join('');
}
