var lang_common_config = {
  fluencyCalPerc: {
    wer: 5,
    cercal: 10,
    charCount: 10,
    wordCount: 10,
    repetitions: 10,
    pauseCount: 10,
    ins: 20,
    del: 15,
    sub: 5,
  },
  fluencyAndProsody: {
    passThresholdM4Plus: 3.0,
    passThresholdBelowM4: 2.6,
    // Weighted contribution of each fluency feature to the overall score.
    weights: {
      expression: 0.2,
      smoothness: 0.1,
      accuracy: 0.4,
      rate: 0.3,
    },
  },
};

export default lang_common_config;
