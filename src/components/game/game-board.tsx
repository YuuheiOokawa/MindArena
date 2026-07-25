import { TrustOrBetrayBoard } from "./trust-or-betray-board";
import { NumberBluffBoard } from "./number-bluff-board";
import { MinorityChoiceBoard } from "./minority-choice-board";
import { FinalPredictionBoard } from "./final-prediction-board";

interface GameBoardProps {
  state: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  myId: string;
  opponentId: string;
  submitting: boolean;
  onSubmit: (actionType: string, actionData: unknown) => void;
}

/** The one place that switches on gameId to pick a board — every other layer stays generic. */
export function GameBoard({ state, myId, opponentId, submitting, onSubmit }: GameBoardProps) {
  switch (state.gameId) {
    case "trust-or-betray":
      return (
        <TrustOrBetrayBoard
          myId={myId}
          pendingActions={state.pendingActions}
          submitting={submitting}
          onChoose={(choice) => onSubmit("CHOOSE", { choice })}
        />
      );
    case "minority-choice":
      return (
        <MinorityChoiceBoard
          myId={myId}
          opponentId={opponentId}
          phase={state.phase}
          declarations={state.declarations}
          pendingActions={state.pendingActions}
          submitting={submitting}
          onDeclare={(choice) => onSubmit("DECLARE", { choice })}
          onChoose={(choice) => onSubmit("CHOOSE", { choice })}
        />
      );
    case "final-prediction":
      return (
        <FinalPredictionBoard
          myId={myId}
          pendingActions={state.pendingActions}
          submitting={submitting}
          onChoose={(move) => onSubmit("CHOOSE", { move })}
        />
      );
    case "number-bluff":
      return (
        <NumberBluffBoard
          myId={myId}
          opponentId={opponentId}
          phase={state.phase}
          pendingDeclarations={state.pendingDeclarations}
          pendingResponses={state.pendingResponses}
          submitting={submitting}
          onDeclare={(number, declarationId) => onSubmit("DECLARE", { number, declarationId })}
          onRespond={(believe) => onSubmit("RESPOND", { believe })}
        />
      );
    default:
      return null;
  }
}
