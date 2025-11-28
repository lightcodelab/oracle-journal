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

  const formatParagraph = (text: string) => {
    // Check if line starts with a bullet point indicator (-, •, *, or numbered list)
    const bulletPattern = /^[\-•*]\s+(.+)$/;
    const numberedPattern = /^\d+\.\s+(.+)$/;
    
    if (bulletPattern.test(text)) {
      const match = text.match(bulletPattern);
      return { type: 'bullet', content: match ? match[1] : text };
    }
    
    if (numberedPattern.test(text)) {
      const match = text.match(numberedPattern);
      return { type: 'numbered', content: match ? match[1] : text };
    }
    
    // Check for bold labels (text ending with colon)
    const labelPattern = /^([^:]+:)\s*(.*)$/;
    if (labelPattern.test(text)) {
      const match = text.match(labelPattern);
      if (match) {
        const label = match[1];
        const content = match[2];
        
        // Check if this is Mythic Moment - format as poetry
        if (label.includes('Mythic Moment')) {
          // Split by line breaks to create poem lines
          const lines = content.split('\n').filter(l => l.trim());
          return { type: 'mythic', label, lines };
        }
        
        return { type: 'labeled', label, content };
      }
    }
    
    return { type: 'normal', content: text };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {paragraphs.map((para, idx) => {
        const formatted = formatParagraph(para);
        
        if (formatted.type === 'bullet') {
          return (
            <li key={idx} className="ml-4 list-disc list-inside">
              {formatted.content}
            </li>
          );
        }
        
        if (formatted.type === 'numbered') {
          return (
            <li key={idx} className="ml-4 list-decimal list-inside">
              {formatted.content}
            </li>
          );
        }
        
        if (formatted.type === 'mythic') {
          return (
            <div key={idx} className="space-y-2">
              <p className="font-semibold mb-3">{formatted.label}</p>
              <div className="pl-8 space-y-1 italic leading-relaxed">
                {formatted.lines?.map((line, lineIdx) => (
                  <p key={lineIdx}>{line}</p>
                ))}
              </div>
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
