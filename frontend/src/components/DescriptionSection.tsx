import { useState } from "react";

const DescriptionSection: React.FC<{ description: string }> = ({
  description,
}) => {
  const [readMore, setReadMore] = useState(false);
  const maxChars = 95;
  const isLong = description.length > maxChars;
  const displayedText =
    readMore || !isLong ? description : description.slice(0, maxChars) + "…";

  return (
    <div className="rounded-lg">
      <p className="text-sm">{displayedText}</p>
      {isLong && (
        <button
          onClick={() => setReadMore(!readMore)}
          className="text-teal-500 mt-2 focus:outline-none text-sm"
        >
          {readMore ? "Read Less" : "Read More"}
        </button>
      )}
    </div>
  );
};

export default DescriptionSection;
