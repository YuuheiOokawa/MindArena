export const NUMBER_BLUFF_DECLARATIONS = [
  { id: "gte-5", text: "私の数字は5以上だ" },
  { id: "odd", text: "私の数字は奇数だ" },
  { id: "greater-than-opponent", text: "私の数字は相手より大きい" },
  { id: "lte-3", text: "私の数字は3以下だ" },
] as const;

export type NumberBluffDeclarationId = (typeof NUMBER_BLUFF_DECLARATIONS)[number]["id"];

export function isDeclarationTrue(declarationId: NumberBluffDeclarationId, myNumber: number, opponentNumber: number): boolean {
  switch (declarationId) {
    case "gte-5":
      return myNumber >= 5;
    case "odd":
      return myNumber % 2 === 1;
    case "greater-than-opponent":
      return myNumber > opponentNumber;
    case "lte-3":
      return myNumber <= 3;
  }
}
