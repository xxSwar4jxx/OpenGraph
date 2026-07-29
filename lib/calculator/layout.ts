export interface CalcKey {
  label: string;
  insert?: string; // appended to display as-is
  action?: "equals" | "clear" | "backspace" | "toggle-sign";
  wide?: boolean;
}

export const BASIC_KEYS: CalcKey[][] = [
  [
    { label: "C", action: "clear" },
    { label: "±", action: "toggle-sign" },
    { label: "%", insert: "%" },
    { label: "÷", insert: "/" },
  ],
  [
    { label: "7", insert: "7" }, { label: "8", insert: "8" }, { label: "9", insert: "9" },
    { label: "×", insert: "*" },
  ],
  [
    { label: "4", insert: "4" }, { label: "5", insert: "5" }, { label: "6", insert: "6" },
    { label: "−", insert: "-" },
  ],
  [
    { label: "1", insert: "1" }, { label: "2", insert: "2" }, { label: "3", insert: "3" },
    { label: "+", insert: "+" },
  ],
  [
    { label: "0", insert: "0", wide: true }, { label: ".", insert: "." },
    { label: "=", action: "equals" },
  ],
];

export const SCIENTIFIC_KEYS: CalcKey[][] = [
  [
    { label: "sin", insert: "sin(" }, { label: "cos", insert: "cos(" },
    { label: "tan", insert: "tan(" }, { label: "π", insert: "pi" },
  ],
  [
    { label: "ln", insert: "ln(" }, { label: "log", insert: "log(" },
    { label: "√", insert: "sqrt(" }, { label: "e", insert: "e" },
  ],
  [
    { label: "(", insert: "(" }, { label: ")", insert: ")" },
    { label: "x²", insert: "^2" }, { label: "xʸ", insert: "^" },
  ],
  [
    { label: "1/x", insert: "^(-1)" }, { label: "|x|", insert: "abs(" },
    { label: "n!", insert: "!" }, { label: "Ans", insert: "ans" },
  ],
];
