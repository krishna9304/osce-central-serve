export const socketEvents = {
  registerSocket: () => 'REG_SOC',
  registerSocketSuccess: () => 'REG_SOC_SUCCESS',
  chatCompletion: () => 'CHAT_COMPLETION',
  error: () => 'ERROR',
  receiveChatCompletion: (sessionId) => 'RECEIVE_CHAT_COMPLETION:' + sessionId,
  receiveFirstChatMessage: () => 'RECEIVE_FIRST_CHAT_MESSAGE',
  evaluationReportGenerationProgress: (sessionId) =>
    'EVALUATION_REPORT_GENERATION_PROGRESS:' + sessionId,
};
