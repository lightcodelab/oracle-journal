interface FormattedContentProps {
  content: string;
  className?: string;
}

export const FormattedContent = ({ content, className = "" }: FormattedContentProps) => {
  // Split content into paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim());

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
        return { type: 'labeled', label: match[1], content: match[2] };
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
        
        if (formatted.type === 'labeled') {
          return (
            <p key={idx} className="leading-relaxed">
              <span className="font-semibold">{formatted.label}</span>{' '}
              {formatted.content}
            </p>
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
