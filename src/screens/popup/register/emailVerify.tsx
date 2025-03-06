import { useRegisterState } from '@/store';
import { useState, useRef, useEffect } from 'react';

function DigitCodeInput() {
  const [code, setCode] = useState('');
  const inputRef = useRef(null);

  const nextStage = useRegisterState(state => state.nextStage);


  // Auto-focus the hidden input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle input changes (only digits, max 6)
  const handleChange = (e) => {
    let { value } = e.target;
    value = value.replace(/\D/g, ''); // Remove any non-digit characters

    if (value.length > 6) {
      value = value.slice(0, 6);
    }

    if (value.length === 6) {
      nextStage();
      return;
    }

    setCode(value);
  };

  // Create 6 boxes, each showing one digit from the code
  const boxes = [];
  for (let i = 0; i < 6; i++) {
    boxes.push(
      <div
        key={i}
        className="w-10 h-10 border border-gray-300 rounded-lg text-xl flex items-center justify-center"
      >
        {code[i] || ''}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg mb-5 text-gray-800">
        Zadejte kód, který jsme vám poslali na e-mail
      </h2>

      {/*
        The “boxes” area. 
        - On click, focus the hidden input.
      */}
      <div
        className="flex justify-between mb-5 cursor-text"
        onClick={() => inputRef.current && inputRef.current.focus()}
      >
        {boxes}
      </div>

      {/* Hidden (or visually minimized) input */}
      <input
        ref={inputRef}
        type="text"
        className="pointer-events-none opacity-0 -left-[9999px] absolute"
        value={code}
        onChange={handleChange}
      />

      <div className="flex flex-col">
        <p className="text-sm font-bold">Nepřišel vám kód?</p>
        <span className="text-gray-500">Zkontrolujte složku spam</span>
      </div>
    </div>
  );
}

export default DigitCodeInput;
