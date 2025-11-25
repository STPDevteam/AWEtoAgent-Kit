export type RunLogger = {
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type WizardAnswers = Map<string, string | boolean>;

