export function chunkText(text: string, maxLength: number = 950): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let current = text;
  
  while (current.length > maxLength) {
    let splitIndex = current.lastIndexOf('\n', maxLength);
    
    if (splitIndex === -1 || splitIndex < maxLength - 200) {
      splitIndex = current.lastIndexOf(' ', maxLength);
    }
    
    if (splitIndex === -1 || splitIndex === 0) {
      splitIndex = maxLength;
    }
    
    chunks.push(current.substring(0, splitIndex).trim());
    current = current.substring(splitIndex).trim();
  }
  
  if (current.length > 0) {
    chunks.push(current);
  }
  
  return chunks;
}
