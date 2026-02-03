import { createHash, randomBytes } from "node:crypto";

const PEOPLE = [
  "Morgan",
  "Riley",
  "Casey",
  "Quinn",
  "Avery",
  "Jordan",
  "Taylor",
] as const;

const OBJECTS = [
  "silver locket",
  "encrypted drive",
  "amber key",
  "iron codex",
] as const;

interface TransferVerb {
  action: "gave" | "stole";
  text: (source: string, object: string, target: string) => string;
}

interface SingleVerb {
  action: "placed" | "lost" | "found";
  text: (person: string, object: string) => string;
}

type Verb = TransferVerb | SingleVerb;

const TRANSFER_VERBS: TransferVerb[] = [
  {
    action: "gave",
    text: (s, o, t) => `${s} handed the ${o} to ${t} in the warehouse.`,
  },
  {
    action: "gave",
    text: (s, o, t) =>
      `According to logs, ${s} transferred possession to ${t}.`,
  },
  {
    action: "stole",
    text: (s, o, t) => `${t} took the ${o} while ${s} was distracted.`,
  },
];

const SINGLE_VERBS: SingleVerb[] = [
  {
    action: "placed",
    text: (s, o) => `${s} left the ${o} in a secure container.`,
  },
  {
    action: "lost",
    text: (s, o) => `${s} reported the ${o} missing from their possession.`,
  },
  {
    action: "found",
    text: (s, o) => `${s} discovered the missing ${o} under a desk.`,
  },
];

const VERBS: Verb[] = [...TRANSFER_VERBS, ...SINGLE_VERBS];

type Person = (typeof PEOPLE)[number];

type HolderValue = Person | "unknown";

export type ChallengeObject = (typeof OBJECTS)[number];

export interface ChallengeSession {
  answer: string;
  expires: number;
  seed: string;
}

export interface GeneratedChallenge {
  answer: Person;
  seed: string;
  text: string;
}

export const pick = <T>(arr: readonly T[], rngVal: number): T =>
  arr[Math.floor(rngVal * arr.length)];

export const pickNot = <T>(
  arr: readonly T[],
  exclude: T,
  rngVal: number
): T => {
  const filtered = arr.filter((x) => x !== exclude);
  return pick(filtered, rngVal);
};

const getRngValue = (state: Uint8Array): number => {
  const newState = createHash("sha256").update(state).digest();
  state.set(newState, 0);
  return newState.readUInt32BE(0) / 4_294_967_295;
};

const buildNarrativeHeader = (targetObject: ChallengeObject): string =>
  `CUSTODY CHAIN: ${targetObject.toUpperCase()}\n` +
  `Track possession of the ${targetObject} through the following sequence.\n\n`;

const buildNarrativeFooter = (
  targetObject: ChallengeObject,
  questionEvent: number
): string =>
  `\n\nQUESTION: Who possesses the ${targetObject} at the conclusion of event ${questionEvent}?`;

const buildNarrativeText = (
  transactions: readonly string[],
  targetObject: ChallengeObject,
  questionEvent: number
): string =>
  `${buildNarrativeHeader(targetObject)}${transactions.join("\n")}${buildNarrativeFooter(targetObject, questionEvent)}`;

const addDistractorNote = (transactions: string[]): void => {
  transactions.push(
    "   [Note: Weather conditions normal. No surveillance footage available.]"
  );
};

const isTransferVerb = (verb: Verb): verb is TransferVerb =>
  verb.action === "gave" || verb.action === "stole";

const handleTransferAction = (
  verb: TransferVerb,
  holder: { current: HolderValue },
  targetObject: ChallengeObject,
  rngVal: number
): string => {
  const source = holder.current as Person;
  const target = pickNot(PEOPLE, source, rngVal);
  holder.current = target;
  return verb.text(source, targetObject, target);
};

const handleFoundAction = (
  verb: SingleVerb,
  holder: { current: HolderValue },
  targetObject: ChallengeObject,
  state: Uint8Array
): string => {
  const rngVal = getRngValue(state);
  const finder = pick(PEOPLE, rngVal);
  holder.current = finder;
  return verb.text(finder, targetObject);
};

const handleLostAction = (
  verb: SingleVerb,
  holder: { current: HolderValue },
  targetObject: ChallengeObject,
  state: Uint8Array
): string => {
  const rngVal = getRngValue(state);
  const person =
    holder.current === "unknown"
      ? pick(PEOPLE, rngVal)
      : (holder.current as Person);
  holder.current = "unknown";
  return verb.text(person, targetObject);
};

const handlePlacedAction = (
  verb: SingleVerb,
  holder: { current: HolderValue },
  targetObject: ChallengeObject
): string => verb.text(holder.current as string, targetObject);

const handleUnknownHolder = (
  holder: { current: HolderValue },
  targetObject: ChallengeObject,
  rngVal: number
): string => {
  const finder = pick(PEOPLE, rngVal);
  holder.current = finder;
  return `${finder} discovered the missing ${targetObject} under a desk.`;
};

const generateTransactionLine = (
  verb: Verb,
  holder: { current: HolderValue },
  targetObject: ChallengeObject,
  state: Uint8Array
): string => {
  const rngVal = getRngValue(state);

  if (holder.current === "unknown" && verb.action !== "found") {
    return handleUnknownHolder(holder, targetObject, rngVal);
  }

  if (isTransferVerb(verb)) {
    return handleTransferAction(verb, holder, targetObject, rngVal);
  }

  if (verb.action === "found") {
    return handleFoundAction(verb, holder, targetObject, state);
  }

  if (verb.action === "lost") {
    return handleLostAction(verb, holder, targetObject, state);
  }

  return handlePlacedAction(verb, holder, targetObject);
};

interface TransactionResult {
  holderAtQuestion: Person;
  transactions: string[];
}

const captureHolderAtQuestion = (
  holder: { current: HolderValue },
  state: Uint8Array
): Person => {
  if (holder.current === "unknown") {
    const rngVal = getRngValue(state);
    return pick(PEOPLE, rngVal);
  }
  return holder.current as Person;
};

const processTransaction = (
  i: number,
  targetObject: ChallengeObject,
  holder: { current: HolderValue },
  state: Uint8Array,
  transactions: string[]
): void => {
  const verb = pick(VERBS, getRngValue(state));
  const line = generateTransactionLine(verb, holder, targetObject, state);
  transactions.push(`${i + 1}. ${line}`);

  if (i % 3 === 0) {
    addDistractorNote(transactions);
  }
};

const generateTransactionLoop = (
  targetObject: ChallengeObject,
  holder: { current: HolderValue },
  state: Uint8Array,
  questionEvent: number
): TransactionResult => {
  const transactions: string[] = [];
  let holderAtQuestion: Person | null = null;

  for (let i = 0; i < 50; i += 1) {
    processTransaction(i, targetObject, holder, state, transactions);

    if (i + 1 === questionEvent) {
      holderAtQuestion = captureHolderAtQuestion(holder, state);
      console.log(holderAtQuestion);
    }
  }

  return {
    holderAtQuestion:
      holderAtQuestion ?? captureHolderAtQuestion(holder, state),
    transactions,
  };
};

export const generateChallenge = (seed?: Uint8Array): GeneratedChallenge => {
  const workingState = seed ? Uint8Array.from(seed) : randomBytes(32);
  const targetObject = pick(OBJECTS, getRngValue(workingState));
  const holder = {
    current: pick(PEOPLE, getRngValue(workingState)) as HolderValue,
  };
  const questionEvent = Math.floor(getRngValue(workingState) * 40) + 10;
  const { holderAtQuestion, transactions } = generateTransactionLoop(
    targetObject,
    holder,
    workingState,
    questionEvent
  );
  const text = buildNarrativeText(transactions, targetObject, questionEvent);

  return {
    answer: holderAtQuestion,
    seed: workingState.toString("hex"),
    text,
  };
};

export { PEOPLE, OBJECTS, type Person };
