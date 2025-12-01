interface FormattedContentProps {
  content: string;
  className?: string;
}

export const FormattedContent = ({ content, className = "" }: FormattedContentProps) => {
  // Replace em dashes with commas and remove spaces before commas
  const processedContent = content
    .replace(/—/g, ',')
    .replace(/\s+,/g, ',');
  
  // Split content into paragraphs
  const paragraphs = processedContent.split('\n').filter(p => p.trim());

  let isInMythicSection = false;
 
  const formatParagraph = (text: string, index: number, allParagraphs: string[]) => {
     // Check if line starts with a bullet point indicator (-, •, *, or numbered list)
     const bulletPattern = /^[\-•*]\s+(.+)$/;
     const numberedPattern = /^(\d+)\.\s+(.+)$/;
     const labelPattern = /^([^:]+:)\s*(.*)$/;
 
     if (bulletPattern.test(text)) {
       const match = text.match(bulletPattern);
       // Check if previous line was a numbered item to determine if this is a nested bullet
       const prevLine = index > 0 ? allParagraphs[index - 1] : '';
       const isNestedBullet = numberedPattern.test(prevLine);
       return { type: 'bullet', content: match ? match[1] : text, nested: isNestedBullet };
     }
 
     if (numberedPattern.test(text)) {
       const match = text.match(numberedPattern);
       // Collect any following bullet points as nested content
       const nestedBullets: string[] = [];
       let j = index + 1;
       while (j < allParagraphs.length && bulletPattern.test(allParagraphs[j])) {
         const bulletMatch = allParagraphs[j].match(bulletPattern);
         if (bulletMatch) nestedBullets.push(bulletMatch[1]);
         j++;
       }
       const numberIndex = match ? parseInt(match[1], 10) : undefined;
       const contentText = match ? match[2] : text;
       return { type: 'numbered', index: numberIndex, content: contentText, nestedBullets, skipNext: nestedBullets.length };
     }
 
      // Check for bold labels (text ending with colon)
      if (labelPattern.test(text)) {
        const match = text.match(labelPattern);
        if (match) {
          const label = match[1];
          const content = match[2];

          // Only treat as a label if the part before the colon looks like a proper section heading
          // (e.g. "Mythic Moment", "Reflective Transition", "The Distortion", etc.)
          const headingText = label.slice(0, -1).trim(); // remove trailing colon
          const looksLikeHeading = /^[A-Z][A-Za-z\s]+$/.test(headingText);

          if (!looksLikeHeading) {
            // It's just a regular sentence ending with a colon (e.g. inside the poem),
            // so keep it as normal text and stay in the current section (including Mythic Moment).
            if (isInMythicSection) {
              return { type: 'mythic-line', content: text };
            }
            return { type: 'normal', content: text };
          }

          // Start Mythic Moment section - label plus optional first line
          if (label.includes('Mythic Moment')) {
            isInMythicSection = true;
            const lines = content ? [content] : [];
            return { type: 'mythic', label, lines };
          }

          // Any other label exits Mythic Moment section
          isInMythicSection = false;
          return { type: 'labeled', label, content };
        }
      }
 
     // Inside Mythic Moment block: treat all lines as poetic lines until next label
     if (isInMythicSection) {
       return { type: 'mythic-line', content: text };
     }
 
     return { type: 'normal', content: text };
   };

  let skipCount = 0;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {paragraphs.map((para, idx) => {
        if (skipCount > 0) {
          skipCount--;
          return null;
        }
        
        const formatted = formatParagraph(para, idx, paragraphs);
        
        if (formatted.type === 'bullet' && !formatted.nested) {
          return (
            <li key={idx} className="ml-4 list-disc list-inside">
              {formatted.content}
            </li>
          );
        }
        
        if (formatted.type === 'bullet' && formatted.nested) {
          // Skip nested bullets as they're rendered with their parent numbered item
          return null;
        }
        
        if (formatted.type === 'numbered') {
          skipCount = formatted.skipNext || 0;
          return (
            <div key={idx} className="space-y-2">
              <p className="leading-relaxed">
                {formatted.index !== undefined && (
                  <span className="font-semibold mr-1">{formatted.index}.</span>
                )}
                {formatted.content}
              </p>
              {formatted.nestedBullets && formatted.nestedBullets.length > 0 && (
                <ul className="ml-8 space-y-1 list-disc list-inside">
                  {formatted.nestedBullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        }
        
        if (formatted.type === 'mythic') {
          const sentences = (formatted.lines || [])
            .flatMap((line) => line.match(/[^.!?]+[.!?]*/g) || [])
            .map((s) => s.trim())
            .filter(Boolean);

          return (
            <div key={idx} className="space-y-2">
              <p className="font-semibold mb-3">{formatted.label}</p>
              <div className="pl-8 space-y-1 italic leading-relaxed">
                {sentences.map((sentence, lineIdx) => (
                  <p key={lineIdx}>{sentence}</p>
                ))}
              </div>
            </div>
          );
        }

        if (formatted.type === 'mythic-line') {
          const sentences =
            formatted.content?.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) || [];

          return (
            <div key={idx} className="pl-8 italic leading-relaxed space-y-1">
              {sentences.map((sentence, lineIdx) => (
                <p key={lineIdx}>{sentence}</p>
              ))}
            </div>
          );
        }
        
        if (formatted.type === 'labeled') {
          return (
            <div key={idx} className="space-y-2">
              <p className="font-semibold">{formatted.label}</p>
              <p className="leading-relaxed">{formatted.content}</p>
            </div>
          );
        }
        
        return (
          <p key={idx} className="leading-relaxed">
            {formatted.content}
          </p>
        );
      })}
    </div>
  );
};
